from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.audit_log import AuditLog
from app.models.campaign import Campaign
from app.models.content_item import ContentItem
from app.models.email_campaign import EmailCampaign
from app.models.seo_audit import SeoAudit
from app.models.user import User

router = APIRouter(prefix="/mcp/analytics", tags=["analytics"])

PERIOD_MAP = {"7d": 7, "30d": 30, "90d": 90}


def _cutoff(period: str) -> datetime:
    days = PERIOD_MAP.get(period, 30)
    return datetime.now(timezone.utc) - timedelta(days=days)


@router.get("/overview")
async def overview(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    campaigns = (await session.execute(select(func.count(Campaign.id)).where(Campaign.user_id == user.id))).scalar() or 0
    email_rows = (await session.execute(select(EmailCampaign).where(EmailCampaign.user_id == user.id))).scalars().all()
    total_sent = sum(r.sent_count for r in email_rows)
    total_open = sum(r.open_count for r in email_rows)
    total_click = sum(r.click_count for r in email_rows)
    content_count = (await session.execute(select(func.count(ContentItem.id)).where(ContentItem.user_id == user.id))).scalar() or 0
    content_published = (await session.execute(select(func.count(ContentItem.id)).where(ContentItem.user_id == user.id, ContentItem.status == "published"))).scalar() or 0
    avg_seo = (await session.execute(select(func.avg(SeoAudit.score)).where(SeoAudit.user_id == user.id))).scalar()

    return {
        "campaigns": campaigns,
        "emails_sent": total_sent,
        "open_rate": round(total_open / total_sent * 100, 1) if total_sent else 0,
        "click_rate": round(total_click / total_sent * 100, 1) if total_sent else 0,
        "content_total": content_count,
        "content_published": content_published,
        "avg_seo_score": round(avg_seo, 1) if avg_seo else 0,
    }


@router.get("/email")
async def email_analytics(period: str = "30d", user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    cutoff = _cutoff(period)
    rows = (await session.execute(
        select(EmailCampaign).where(EmailCampaign.user_id == user.id, EmailCampaign.created_at >= cutoff)
    )).scalars().all()
    total_sent = sum(r.sent_count for r in rows)
    total_open = sum(r.open_count for r in rows)
    total_click = sum(r.click_count for r in rows)
    return {
        "period": period,
        "campaigns": len(rows),
        "total_sent": total_sent,
        "total_opened": total_open,
        "total_clicked": total_click,
        "open_rate": round(total_open / total_sent * 100, 1) if total_sent else 0,
        "click_rate": round(total_click / total_sent * 100, 1) if total_sent else 0,
    }


@router.get("/content")
async def content_analytics(period: str = "30d", user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    cutoff = _cutoff(period)
    rows = (await session.execute(
        select(ContentItem).where(ContentItem.user_id == user.id, ContentItem.created_at >= cutoff)
    )).scalars().all()
    by_status: dict[str, int] = {}
    by_type: dict[str, int] = {}
    for item in rows:
        by_status[item.status] = by_status.get(item.status, 0) + 1
        by_type[item.content_type] = by_type.get(item.content_type, 0) + 1
    return {"period": period, "total": len(rows), "by_status": by_status, "by_type": by_type}


@router.get("/seo")
async def seo_analytics(period: str = "30d", user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    cutoff = _cutoff(period)
    rows = (await session.execute(
        select(SeoAudit).where(SeoAudit.user_id == user.id, SeoAudit.created_at >= cutoff).order_by(SeoAudit.created_at)
    )).scalars().all()
    avg = sum(r.score for r in rows) / len(rows) if rows else 0
    issue_counts: dict[str, int] = {}
    for r in rows:
        for iss in (r.issues or []):
            msg = iss.get("message", "")
            issue_counts[msg] = issue_counts.get(msg, 0) + 1
    top_issues = sorted(issue_counts.items(), key=lambda x: -x[1])[:10]
    return {"period": period, "audits": len(rows), "avg_score": round(avg, 1), "top_issues": [{"message": m, "count": c} for m, c in top_issues]}


@router.get("/activity")
async def activity(limit: int = 50, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(
        select(AuditLog).where(AuditLog.user_id == user.id).order_by(AuditLog.created_at.desc()).limit(limit)
    )).scalars().all()
    return [{"id": a.id, "action": a.action, "resource_type": a.resource_type, "resource_id": a.resource_id, "details": a.details, "created_at": str(a.created_at)} for a in rows]
