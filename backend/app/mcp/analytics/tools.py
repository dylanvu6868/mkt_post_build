from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.core.encryption import encrypt_token
from app.models.audit_log import AuditLog
from app.models.campaign import Campaign
from app.models.content_item import ContentItem
from app.models.email_campaign import EmailCampaign
from app.models.oauth_account import OauthAccount
from app.models.seo_audit import SeoAudit
from app.models.user import User
from app.services.audit import log_action
from app.core.tracing import trace_request

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


# ─── GA4 Connector ───────────────────────────────────────────────

@router.post("/ga4/connect")
async def ga4_connect(
    body: dict,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Store a GA4 property ID + OAuth refresh token (encrypted) for the user.

    The frontend obtains the GA4 OAuth token via Google Sign-In (already wired
    for auth); here we persist the property_id and an encrypted refresh token.
    """
    property_id = body.get("property_id", "").strip()
    refresh_token = body.get("refresh_token", "").strip()
    if not property_id:
        from fastapi import HTTPException
        raise HTTPException(400, "property_id là bắt buộc.")

    existing = (
        await session.execute(
            select(OauthAccount).where(OauthAccount.user_id == user.id, OauthAccount.provider == "ga4")
        )
    ).scalar_one_or_none()

    if existing:
        existing.provider_user_id = property_id
        if refresh_token:
            existing.refresh_token_enc = encrypt_token(refresh_token)
    else:
        acct = OauthAccount(
            user_id=user.id,
            provider="ga4",
            provider_user_id=property_id,
            access_token_enc=encrypt_token(refresh_token or property_id),
            refresh_token_enc=encrypt_token(refresh_token) if refresh_token else None,
        )
        session.add(acct)
    await session.commit()
    await log_action(session, user.id, "analytics.ga4_connect", "oauth_account", property_id)
    return {"connected": True, "property_id": property_id}


@router.get("/ga4/status")
async def ga4_status(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> dict:
    acct = (
        await session.execute(
            select(OauthAccount).where(OauthAccount.user_id == user.id, OauthAccount.provider == "ga4")
        )
    ).scalar_one_or_none()
    if acct is None:
        return {"connected": False}
    return {"connected": True, "property_id": acct.provider_user_id}


@router.delete("/ga4/disconnect")
async def ga4_disconnect(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> dict:
    from sqlalchemy import delete as sa_delete
    await session.execute(sa_delete(OauthAccount).where(OauthAccount.user_id == user.id, OauthAccount.provider == "ga4"))
    await session.commit()
    return {"disconnected": True}


# ─── UTM Builder ─────────────────────────────────────────────────

@router.post("/utm/build")
async def build_utm(body: dict, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> dict:
    """Generate a UTM-tagged URL from components."""
    base_url = body.get("url", "").strip()
    if not base_url:
        from fastapi import HTTPException
        raise HTTPException(400, "url là bắt buộc.")
    params = {}
    for k in ("utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"):
        v = body.get(k, "").strip()
        if v:
            params[k] = v
    sep = "&" if "?" in base_url else "?"
    full_url = f"{base_url}{sep}{urlencode(params)}"
    await log_action(session, user.id, "analytics.utm_build", None, None, {"url": full_url[:200]})
    return {"utm_url": full_url, "params": params}


# ─── ROI Calculator ──────────────────────────────────────────────

@router.post("/roi")
async def roi_calculate(
    body: dict,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Calculate ROAS + ROI from spend and revenue inputs.

    Input: {"spend": 5000000, "revenue": 15000000, "ad_spend": 3000000, "costs": 1000000}
    Returns roas, roi_pct, profit, breakdown.
    """
    from app.agents.insights import run_roi_agent
    spend = float(body.get("spend", 0))
    revenue = float(body.get("revenue", 0))
    ad_spend = float(body.get("ad_spend", spend))
    other_costs = float(body.get("costs", 0))

    total_cost = ad_spend + other_costs
    profit = revenue - total_cost
    roas = round(revenue / ad_spend, 2) if ad_spend > 0 else 0
    roi_pct = round((profit / total_cost) * 100, 1) if total_cost > 0 else 0

    # Optional AI commentary
    commentary = None
    if body.get("with_commentary"):
        try:
            with trace_request("analytics.roi", user_id=user.id, metadata={"roas": roas, "roi_pct": roi_pct}):
                result = await run_roi_agent({
                    "spend": spend, "revenue": revenue, "ad_spend": ad_spend,
                    "other_costs": other_costs, "roas": roas, "roi_pct": roi_pct, "profit": profit,
                    "campaign_name": body.get("campaign_name", ""),
                })
            commentary = result.commentary
        except Exception:
            pass

    await log_action(session, user.id, "analytics.roi", None, None,
                     {"spend": spend, "revenue": revenue, "roas": roas, "roi_pct": roi_pct})
    return {
        "roas": roas,
        "roi_pct": roi_pct,
        "profit": profit,
        "total_cost": total_cost,
        "revenue": revenue,
        "ad_spend": ad_spend,
        "other_costs": other_costs,
        "commentary": commentary,
    }
