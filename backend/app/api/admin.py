import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.db import get_session

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

    activities.sort(key=lambda x: x["time"] or "", reverse=True)
    activities = activities[:10]

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
