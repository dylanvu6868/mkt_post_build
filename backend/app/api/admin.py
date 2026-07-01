import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.db import get_session

from app.models.ai_call_log import AICallLog
from app.models.audit_log import AuditLog
from app.models.content_history import ContentHistory
from app.models.conversation import Conversation, Message
from app.models.generation_job import GenerationJob
from app.models.project import Project
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/users")
async def list_users(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(
            User.id,
            User.name,
            User.email,
            User.oauth_provider,
            User.is_admin,
            User.is_banned,
            User.plan,
            User.plan_expires_at,
            User.created_at,
            func.count(Project.id.distinct()).label("project_count"),
        )
        .outerjoin(Project, Project.user_id == User.id)
        .group_by(User.id)
        .order_by(User.created_at.desc())
    )
    rows = result.all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "email": r.email,
            "oauth_provider": r.oauth_provider,
            "is_admin": r.is_admin,
            "is_banned": r.is_banned,
            "plan": r.plan,
            "plan_expires_at": r.plan_expires_at.isoformat() if r.plan_expires_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "project_count": r.project_count,
        }
        for r in rows
    ]


@router.patch("/users/{user_id}/ban")
async def toggle_ban(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(require_admin),
):
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot ban yourself")
    user.is_banned = not user.is_banned
    await session.commit()
    action = "banned" if user.is_banned else "unbanned"
    logger.info("Admin %s %s user_id=%s", admin.email, action, user_id)
    return {"id": user.id, "is_banned": user.is_banned}


VALID_PLANS = {"free", "lite", "pro", "max"}


@router.patch("/users/{user_id}/plan")
async def update_user_plan(
    user_id: int,
    body: dict,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(require_admin),
):
    plan = body.get("plan", "").lower()
    if plan not in VALID_PLANS:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Must be one of: {', '.join(VALID_PLANS)}")
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    expires_at = None
    if plan != "free" and body.get("expires_at"):
        try:
            expires_at = datetime.fromisoformat(body["expires_at"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid expires_at format")

    user.plan = plan
    user.plan_expires_at = expires_at if plan != "free" else None
    await session.commit()
    logger.info("Admin %s changed user_id=%s plan to %s", admin.email, user_id, plan)
    return {"id": user.id, "plan": user.plan, "plan_expires_at": user.plan_expires_at.isoformat() if user.plan_expires_at else None}


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(require_admin),
):
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    await session.delete(user)
    await session.commit()
    logger.info("Admin %s deleted user_id=%s", admin.email, user_id)


@router.get("/analytics")
async def get_analytics(session: AsyncSession = Depends(get_session)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    total_users = (await session.execute(select(func.count(User.id)))).scalar() or 0
    users_today = (
        await session.execute(
            select(func.count(User.id)).where(User.created_at >= today_start)
        )
    ).scalar() or 0
    users_week = (
        await session.execute(
            select(func.count(User.id)).where(User.created_at >= week_ago)
        )
    ).scalar() or 0
    users_month = (
        await session.execute(
            select(func.count(User.id)).where(User.created_at >= month_ago)
        )
    ).scalar() or 0

    total_content = (
        await session.execute(select(func.count(ContentHistory.id)))
    ).scalar() or 0
    avg_score = (
        await session.execute(
            select(func.avg(ContentHistory.score)).where(ContentHistory.score.isnot(None))
        )
    ).scalar()

    type_dist_rows = (
        await session.execute(
            select(ContentHistory.content_type, func.count(ContentHistory.id))
            .group_by(ContentHistory.content_type)
        )
    ).all()
    type_distribution = {r[0]: r[1] for r in type_dist_rows}

    top_users_rows = (
        await session.execute(
            select(User.id, User.name, User.email, func.count(ContentHistory.id).label("count"))
            .join(Project, Project.user_id == User.id)
            .join(ContentHistory, ContentHistory.project_id == Project.id)
            .group_by(User.id)
            .order_by(func.count(ContentHistory.id).desc())
            .limit(10)
        )
    ).all()
    top_users = [
        {"id": r.id, "name": r.name, "email": r.email, "content_count": r.count}
        for r in top_users_rows
    ]

    jobs_by_status_rows = (
        await session.execute(
            select(GenerationJob.status, func.count(GenerationJob.id))
            .group_by(GenerationJob.status)
        )
    ).all()
    jobs_by_status = {r[0]: r[1] for r in jobs_by_status_rows}

    total_conversations = (
        await session.execute(select(func.count(Conversation.id)))
    ).scalar() or 0
    conversations_today = (
        await session.execute(
            select(func.count(Conversation.id)).where(Conversation.created_at >= today_start)
        )
    ).scalar() or 0
    total_messages = (
        await session.execute(select(func.count(Message.id)))
    ).scalar() or 0
    total_projects = (
        await session.execute(select(func.count(Project.id)))
    ).scalar() or 0
    content_today = (
        await session.execute(
            select(func.count(ContentHistory.id)).where(ContentHistory.created_at >= today_start)
        )
    ).scalar() or 0
    content_week = (
        await session.execute(
            select(func.count(ContentHistory.id)).where(ContentHistory.created_at >= week_ago)
        )
    ).scalar() or 0
    total_jobs = (
        await session.execute(select(func.count(GenerationJob.id)))
    ).scalar() or 0
    jobs_done = jobs_by_status.get("done", 0)
    jobs_error = jobs_by_status.get("error", 0)
    job_success_rate = round((jobs_done / total_jobs) * 100, 1) if total_jobs > 0 else None

    user_growth_rows = (
        await session.execute(
            select(
                func.date(User.created_at).label("day"),
                func.count(User.id).label("count"),
            )
            .where(User.created_at >= week_ago)
            .group_by(func.date(User.created_at))
            .order_by(func.date(User.created_at))
        )
    ).all()
    user_growth = [
        {"date": str(r.day), "count": r.count} for r in user_growth_rows
    ]

    content_daily_rows = (
        await session.execute(
            select(
                func.date(ContentHistory.created_at).label("day"),
                func.count(ContentHistory.id).label("count"),
                func.avg(ContentHistory.score).label("avg_score"),
            )
            .where(ContentHistory.created_at >= week_ago)
            .group_by(func.date(ContentHistory.created_at))
            .order_by(func.date(ContentHistory.created_at))
        )
    ).all()
    content_daily = [
        {
            "date": str(r.day),
            "count": r.count,
            "avg_score": round(r.avg_score, 1) if r.avg_score else None,
        }
        for r in content_daily_rows
    ]

    activities: list[dict] = []
    recent_users = (
        await session.execute(
            select(User.name, User.email, User.oauth_provider, User.created_at)
            .order_by(User.created_at.desc())
            .limit(5)
        )
    ).all()
    for u in recent_users:
        provider = f" qua {u.oauth_provider.capitalize()}" if u.oauth_provider else ""
        activities.append({
            "type": "register",
            "text": f"{u.name} đã đăng ký{provider}",
            "time": u.created_at.isoformat() if u.created_at else None,
        })

    recent_content = (
        await session.execute(
            select(ContentHistory.content_type, ContentHistory.score, ContentHistory.created_at, User.name)
            .join(Project, ContentHistory.project_id == Project.id)
            .join(User, Project.user_id == User.id)
            .order_by(ContentHistory.created_at.desc())
            .limit(5)
        )
    ).all()
    for c in recent_content:
        score_txt = f" (điểm {c.score:.0f}/100)" if c.score else ""
        activities.append({
            "type": "content",
            "text": f"{c.name} tạo {c.content_type.replace('_', ' ')}{score_txt}",
            "time": c.created_at.isoformat() if c.created_at else None,
        })

    recent_jobs = (
        await session.execute(
            select(GenerationJob.status, GenerationJob.content_type, GenerationJob.created_at, GenerationJob.error)
            .where(GenerationJob.status.in_(["done", "error"]))
            .order_by(GenerationJob.created_at.desc())
            .limit(5)
        )
    ).all()
    for j in recent_jobs:
        if j.status == "error":
            activities.append({
                "type": "error",
                "text": f"Job {j.content_type.replace('_', ' ')} thất bại",
                "time": j.created_at.isoformat() if j.created_at else None,
            })

    recent_audits = (
        await session.execute(
            select(AuditLog.action, AuditLog.created_at, AuditLog.user_id, User.name)
            .outerjoin(User, AuditLog.user_id == User.id)
            .order_by(AuditLog.created_at.desc())
            .limit(15)
        )
    ).all()
    for a in recent_audits:
        parts = a.action.split(".")
        category = parts[0] if parts else "system"
        user_name = a.name or "Khách"
        activities.append({
            "type": category,
            "text": f"{user_name} — {a.action}",
            "time": a.created_at.isoformat() if a.created_at else None,
        })

    activities.sort(key=lambda x: x["time"] or "", reverse=True)
    activities = activities[:10]

    tool_usage_rows = (
        await session.execute(
            select(AuditLog.action, func.count(AuditLog.id).label("count"))
            .where(AuditLog.created_at >= week_ago)
            .group_by(AuditLog.action)
            .order_by(func.count(AuditLog.id).desc())
            .limit(20)
        )
    ).all()
    tool_usage = [{"action": r.action, "count": r.count} for r in tool_usage_rows]

    return {
        "users": {
            "total": total_users,
            "today": users_today,
            "this_week": users_week,
            "this_month": users_month,
        },
        "content": {
            "total": total_content,
            "today": content_today,
            "this_week": content_week,
            "avg_score": round(avg_score, 1) if avg_score else None,
            "type_distribution": type_distribution,
        },
        "conversations": {
            "total": total_conversations,
            "today": conversations_today,
        },
        "messages": total_messages,
        "projects": total_projects,
        "jobs": jobs_by_status,
        "job_success_rate": job_success_rate,
        "top_users": top_users,
        "user_growth": user_growth,
        "content_daily": content_daily,
        "tool_usage": tool_usage,
        "activities": activities,
    }


@router.get("/content")
async def list_content(
    content_type: str | None = None,
    user_id: int | None = None,
    min_score: float | None = None,
    max_score: float | None = None,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    query = (
        select(
            ContentHistory.id,
            ContentHistory.content_type,
            ContentHistory.prompt,
            ContentHistory.score,
            ContentHistory.created_at,
            Project.name.label("project_name"),
            User.name.label("user_name"),
            User.email.label("user_email"),
        )
        .join(Project, ContentHistory.project_id == Project.id)
        .join(User, Project.user_id == User.id)
    )
    if content_type:
        query = query.where(ContentHistory.content_type == content_type)
    if user_id:
        query = query.where(User.id == user_id)
    if min_score is not None:
        query = query.where(ContentHistory.score >= min_score)
    if max_score is not None:
        query = query.where(ContentHistory.score <= max_score)
    query = query.order_by(ContentHistory.created_at.desc()).offset(offset).limit(limit)

    rows = (await session.execute(query)).all()
    return [
        {
            "id": r.id,
            "content_type": r.content_type,
            "prompt": r.prompt,
            "score": r.score,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "project_name": r.project_name,
            "user_name": r.user_name,
            "user_email": r.user_email,
        }
        for r in rows
    ]


@router.get("/plan-stats")
async def plan_stats(session: AsyncSession = Depends(get_session)):
    rows = (
        await session.execute(
            select(User.plan, func.count(User.id)).group_by(User.plan)
        )
    ).all()
    dist = {r[0] or "free": r[1] for r in rows}
    expired = (
        await session.execute(
            select(func.count(User.id)).where(
                User.plan != "free",
                User.plan_expires_at.isnot(None),
                User.plan_expires_at < datetime.now(timezone.utc),
            )
        )
    ).scalar() or 0
    return {"distribution": dist, "expired_subscriptions": expired}


@router.post("/bulk-plan")
async def bulk_set_plan(
    body: dict,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(require_admin),
):
    plan = body.get("plan", "").lower()
    if plan not in VALID_PLANS:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Must be one of: {', '.join(VALID_PLANS)}")

    trial_days = body.get("trial_days")
    user_ids: list[int] | None = body.get("user_ids")
    exclude_admins = body.get("exclude_admins", True)

    expires_at = None
    if plan != "free" and trial_days:
        try:
            expires_at = datetime.now(timezone.utc) + timedelta(days=int(trial_days))
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="trial_days must be an integer")

    query = select(User)
    if user_ids:
        query = query.where(User.id.in_(user_ids))
    if exclude_admins:
        query = query.where(User.is_admin == False)  # noqa: E712

    result = await session.execute(query)
    users = result.scalars().all()

    count = 0
    for u in users:
        u.plan = plan
        u.plan_expires_at = expires_at if plan != "free" else None
        count += 1

    await session.commit()
    logger.info(
        "Admin %s bulk-set %d users to plan=%s trial_days=%s",
        admin.email, count, plan, trial_days,
    )
    return {
        "updated": count,
        "plan": plan,
        "expires_at": expires_at.isoformat() if expires_at else None,
    }


@router.post("/bulk-reset-expired")
async def bulk_reset_expired(
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(require_admin),
):
    now = datetime.now(timezone.utc)
    result = await session.execute(
        select(User).where(
            User.plan != "free",
            User.plan_expires_at.isnot(None),
            User.plan_expires_at < now,
        )
    )
    users = result.scalars().all()
    count = 0
    for u in users:
        u.plan = "free"
        u.plan_expires_at = None
        count += 1
    await session.commit()
    logger.info("Admin %s reset %d expired users to free", admin.email, count)
    return {"reset": count}


@router.delete("/content/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content(
    content_id: int,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(require_admin),
):
    item = await session.get(ContentHistory, content_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Content not found")
    await session.delete(item)
    await session.commit()
    logger.info("Admin %s deleted content_id=%s", admin.email, content_id)


# ── AI Orchestration ──────────────────────────────────────────────

@router.get("/ai-orchestration/overview")
async def ai_overview(
    days: int = Query(7, ge=1, le=90),
    session: AsyncSession = Depends(get_session),
):
    """KPI overview: total calls, cost, tokens, latency, error rate."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    base = select(AICallLog).where(AICallLog.created_at >= since)

    rows = (await session.execute(
        select(
            func.count(AICallLog.id).label("total_calls"),
            func.sum(AICallLog.total_cost).label("total_cost"),
            func.sum(AICallLog.input_tokens).label("total_input_tokens"),
            func.sum(AICallLog.output_tokens).label("total_output_tokens"),
            func.avg(AICallLog.latency_ms).label("avg_latency_ms"),
            func.count(AICallLog.id).filter(AICallLog.status == "error").label("error_count"),
        ).where(AICallLog.created_at >= since)
    )).first()

    return {
        "period_days": days,
        "total_calls": rows.total_calls or 0,
        "total_cost": round(rows.total_cost or 0, 6),
        "total_input_tokens": rows.total_input_tokens or 0,
        "total_output_tokens": rows.total_output_tokens or 0,
        "avg_latency_ms": int(rows.avg_latency_ms or 0),
        "error_count": rows.error_count or 0,
        "error_rate": round((rows.error_count or 0) / max(rows.total_calls or 1, 1) * 100, 1),
    }


@router.get("/ai-orchestration/by-model")
async def ai_by_model(
    days: int = Query(7, ge=1, le=90),
    session: AsyncSession = Depends(get_session),
):
    """Breakdown by model: calls, cost, tokens, avg latency."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (await session.execute(
        select(
            AICallLog.model,
            AICallLog.provider,
            func.count(AICallLog.id).label("calls"),
            func.sum(AICallLog.total_cost).label("cost"),
            func.sum(AICallLog.input_tokens).label("input_tokens"),
            func.sum(AICallLog.output_tokens).label("output_tokens"),
            func.avg(AICallLog.latency_ms).label("avg_latency"),
        )
        .where(AICallLog.created_at >= since)
        .group_by(AICallLog.model, AICallLog.provider)
        .order_by(func.sum(AICallLog.total_cost).desc())
    )).all()

    return [
        {
            "model": r.model or "unknown",
            "provider": r.provider or "unknown",
            "calls": r.calls,
            "cost": round(r.cost or 0, 6),
            "input_tokens": r.input_tokens or 0,
            "output_tokens": r.output_tokens or 0,
            "avg_latency_ms": int(r.avg_latency or 0),
        }
        for r in rows
    ]


@router.get("/ai-orchestration/by-user")
async def ai_by_user(
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    """Top users by AI usage."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (await session.execute(
        select(
            AICallLog.user_id,
            User.name,
            User.email,
            func.count(AICallLog.id).label("calls"),
            func.sum(AICallLog.total_cost).label("cost"),
            func.sum(AICallLog.input_tokens + AICallLog.output_tokens).label("total_tokens"),
        )
        .outerjoin(User, AICallLog.user_id == User.id)
        .where(AICallLog.created_at >= since)
        .group_by(AICallLog.user_id, User.name, User.email)
        .order_by(func.sum(AICallLog.total_cost).desc())
        .limit(limit)
    )).all()

    return [
        {
            "user_id": r.user_id,
            "name": r.name or "Unknown",
            "email": r.email or "",
            "calls": r.calls,
            "cost": round(r.cost or 0, 6),
            "total_tokens": r.total_tokens or 0,
        }
        for r in rows
    ]


@router.get("/ai-orchestration/by-type")
async def ai_by_type(
    days: int = Query(7, ge=1, le=90),
    session: AsyncSession = Depends(get_session),
):
    """Breakdown by call type (chat, lab, generate, mcp)."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (await session.execute(
        select(
            AICallLog.call_type,
            func.count(AICallLog.id).label("calls"),
            func.sum(AICallLog.total_cost).label("cost"),
            func.avg(AICallLog.latency_ms).label("avg_latency"),
            func.count(AICallLog.id).filter(AICallLog.status == "error").label("errors"),
        )
        .where(AICallLog.created_at >= since)
        .group_by(AICallLog.call_type)
        .order_by(func.count(AICallLog.id).desc())
    )).all()

    return [
        {
            "call_type": r.call_type,
            "calls": r.calls,
            "cost": round(r.cost or 0, 6),
            "avg_latency_ms": int(r.avg_latency or 0),
            "errors": r.errors or 0,
        }
        for r in rows
    ]


@router.get("/ai-orchestration/daily-trend")
async def ai_daily_trend(
    days: int = Query(30, ge=1, le=90),
    session: AsyncSession = Depends(get_session),
):
    """Daily calls, cost, and tokens for charting."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (await session.execute(
        select(
            func.date(AICallLog.created_at).label("day"),
            func.count(AICallLog.id).label("calls"),
            func.sum(AICallLog.total_cost).label("cost"),
            func.sum(AICallLog.input_tokens + AICallLog.output_tokens).label("tokens"),
            func.count(AICallLog.id).filter(AICallLog.status == "error").label("errors"),
        )
        .where(AICallLog.created_at >= since)
        .group_by(func.date(AICallLog.created_at))
        .order_by(func.date(AICallLog.created_at))
    )).all()

    return [
        {
            "day": str(r.day),
            "calls": r.calls,
            "cost": round(r.cost or 0, 6),
            "tokens": r.tokens or 0,
            "errors": r.errors or 0,
        }
        for r in rows
    ]


@router.get("/ai-orchestration/recent-calls")
async def ai_recent_calls(
    limit: int = Query(50, ge=1, le=200),
    call_type: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    session: AsyncSession = Depends(get_session),
):
    """Recent individual AI calls with full details."""
    q = (
        select(
            AICallLog.id, AICallLog.created_at, AICallLog.call_type,
            AICallLog.model, AICallLog.provider, AICallLog.endpoint,
            AICallLog.tool_name, AICallLog.input_tokens, AICallLog.output_tokens,
            AICallLog.total_cost, AICallLog.latency_ms, AICallLog.status,
            AICallLog.error_message, AICallLog.input_preview, AICallLog.output_preview,
            AICallLog.user_id, AICallLog.trace_id, AICallLog.conversation_id,
            User.name.label("user_name"), User.email.label("user_email"),
        )
        .outerjoin(User, AICallLog.user_id == User.id)
    )
    if call_type:
        q = q.where(AICallLog.call_type == call_type)
    if status_filter:
        q = q.where(AICallLog.status == status_filter)
    q = q.order_by(AICallLog.created_at.desc()).limit(limit)
    rows = (await session.execute(q)).all()

    return [
        {
            "id": r.id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "call_type": r.call_type,
            "model": r.model,
            "provider": r.provider,
            "endpoint": r.endpoint,
            "tool_name": r.tool_name,
            "input_tokens": r.input_tokens or 0,
            "output_tokens": r.output_tokens or 0,
            "total_cost": round(r.total_cost or 0, 6),
            "latency_ms": r.latency_ms or 0,
            "status": r.status,
            "error_message": r.error_message,
            "input_preview": r.input_preview,
            "output_preview": r.output_preview,
            "user_id": r.user_id,
            "user_name": r.user_name,
            "user_email": r.user_email,
            "trace_id": r.trace_id,
            "conversation_id": r.conversation_id,
        }
        for r in rows
    ]


@router.get("/ai-orchestration/by-observation")
async def ai_by_observation(
    days: int = Query(7, ge=1, le=90),
    session: AsyncSession = Depends(get_session),
):
    """Breakdown by observation type: GENERATION, SPAN, TOOL, RETRIEVER, AGENT."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (await session.execute(
        select(
            AICallLog.observation_type,
            func.count(AICallLog.id).label("calls"),
            func.sum(AICallLog.total_cost).label("cost"),
            func.avg(AICallLog.latency_ms).label("avg_latency"),
            func.count(AICallLog.id).filter(AICallLog.status == "error").label("errors"),
        )
        .where(AICallLog.created_at >= since)
        .where(AICallLog.observation_type.is_not(None))
        .group_by(AICallLog.observation_type)
        .order_by(func.count(AICallLog.id).desc())
    )).all()

    return [
        {
            "observation_type": r.observation_type,
            "calls": r.calls,
            "cost": round(r.cost or 0, 6),
            "avg_latency_ms": int(r.avg_latency or 0),
            "errors": r.errors or 0,
        }
        for r in rows
    ]


@router.get("/ai-orchestration/by-tool")
async def ai_by_tool(
    days: int = Query(7, ge=1, le=90),
    session: AsyncSession = Depends(get_session),
):
    """Breakdown by tool_name — which lab tools / endpoints are used most."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (await session.execute(
        select(
            AICallLog.tool_name,
            AICallLog.endpoint,
            func.count(AICallLog.id).label("calls"),
            func.sum(AICallLog.total_cost).label("cost"),
            func.avg(AICallLog.latency_ms).label("avg_latency"),
            func.count(AICallLog.id).filter(AICallLog.status == "error").label("errors"),
            func.avg(AICallLog.input_tokens).label("avg_input"),
            func.avg(AICallLog.output_tokens).label("avg_output"),
        )
        .where(AICallLog.created_at >= since)
        .where(AICallLog.tool_name.is_not(None))
        .group_by(AICallLog.tool_name, AICallLog.endpoint)
        .order_by(func.count(AICallLog.id).desc())
    )).all()

    return [
        {
            "tool_name": r.tool_name,
            "endpoint": r.endpoint,
            "calls": r.calls,
            "cost": round(r.cost or 0, 6),
            "avg_latency_ms": int(r.avg_latency or 0),
            "errors": r.errors or 0,
            "avg_input_tokens": int(r.avg_input or 0),
            "avg_output_tokens": int(r.avg_output or 0),
        }
        for r in rows
    ]


@router.get("/ai-orchestration/traces")
async def ai_traces(
    limit: int = Query(30, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    """Recent traces — grouped calls by trace_id."""
    rows = (await session.execute(
        select(
            AICallLog.trace_id,
            func.min(AICallLog.created_at).label("started_at"),
            func.count(AICallLog.id).label("call_count"),
            func.sum(AICallLog.total_cost).label("total_cost"),
            func.sum(AICallLog.input_tokens).label("total_input"),
            func.sum(AICallLog.output_tokens).label("total_output"),
            func.max(AICallLog.latency_ms).label("max_latency"),
            func.count(AICallLog.id).filter(AICallLog.status == "error").label("errors"),
            func.min(AICallLog.call_type).label("call_type"),
            func.min(AICallLog.user_id).label("user_id"),
        )
        .where(AICallLog.trace_id.is_not(None))
        .group_by(AICallLog.trace_id)
        .order_by(func.min(AICallLog.created_at).desc())
        .limit(limit)
    )).all()

    user_ids = [r.user_id for r in rows if r.user_id]
    user_map: dict[int, str] = {}
    if user_ids:
        users_q = (await session.execute(
            select(User.id, User.name).where(User.id.in_(user_ids))
        )).all()
        user_map = {u.id: u.name for u in users_q}

    return [
        {
            "trace_id": r.trace_id,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "call_count": r.call_count,
            "total_cost": round(r.total_cost or 0, 6),
            "total_input": r.total_input or 0,
            "total_output": r.total_output or 0,
            "max_latency_ms": r.max_latency or 0,
            "errors": r.errors or 0,
            "call_type": r.call_type,
            "user_id": r.user_id,
            "user_name": user_map.get(r.user_id, "Unknown") if r.user_id else None,
        }
        for r in rows
    ]


# ── Plan Limits Management ─────────────────────────────────────────────────
from app.core.plan_limits import PLAN_LIMITS, HISTORY_RETENTION_DAYS

@router.get("/plan-limits")
async def get_plan_limits():
    """Return current plan limits for all plans."""
    result = {}
    for plan, limits in PLAN_LIMITS.items():
        result[plan] = {
            **{k: (list(v) if isinstance(v, set) else v) for k, v in limits.items()},
            "history_retention_days": HISTORY_RETENTION_DAYS.get(plan),
        }
    return result


@router.patch("/plan-limits/{plan_name}")
async def update_plan_limits(
    plan_name: str,
    body: dict,
    admin: User = Depends(require_admin),
):
    """Update specific limits for a plan (runtime only — resets on redeploy)."""
    if plan_name not in PLAN_LIMITS:
        raise HTTPException(status_code=404, detail=f"Plan '{plan_name}' not found.")
    allowed_keys = {
        "daily_generations", "max_projects", "max_kb_files",
        "max_brand_profiles", "daily_lab_uses",
        "daily_email_sends", "daily_landing_generates",
        "hub_tools",
    }
    for key, value in body.items():
        if key not in allowed_keys:
            raise HTTPException(status_code=400, detail=f"Field '{key}' is not adjustable.")
        if key == "hub_tools":
            PLAN_LIMITS[plan_name]["hub_tools"] = set(value) if isinstance(value, list) else value
        else:
            PLAN_LIMITS[plan_name][key] = int(value)
    logger.info("Admin %s updated plan=%s limits: %s", admin.email, plan_name, body)
    return {"plan": plan_name, "updated": list(body.keys())}
