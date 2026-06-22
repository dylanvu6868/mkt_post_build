import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.campaign import Campaign
from app.models.email_campaign import EmailCampaign
from app.services.audit import log_action

RESEND_BASE = "https://api.resend.com"


def _headers() -> dict:
    return {"Authorization": f"Bearer {settings.resend_api_key}", "Content-Type": "application/json"}


async def send_email(
    session: AsyncSession, user_id: int,
    to: list[str], subject: str, html: str,
    from_email: str | None = None,
) -> dict:
    sender = from_email or "noreply@vitba.ai"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{RESEND_BASE}/emails",
            headers=_headers(),
            json={"from": sender, "to": to, "subject": subject, "html": html},
        )
        resp.raise_for_status()
        data = resp.json()

    campaign = Campaign(user_id=user_id, type="email", title=subject, content=html[:500], status="sent")
    session.add(campaign)
    await session.flush()

    ec = EmailCampaign(
        user_id=user_id, campaign_id=campaign.id, provider="resend",
        sent_count=len(to), status="sent", resend_batch_id=data.get("id"),
    )
    session.add(ec)
    await session.commit()

    await log_action(session, user_id, "email.send", "email_campaign", str(ec.id),
                     {"to_count": len(to), "subject": subject})
    return {"email_id": data.get("id"), "campaign_id": campaign.id}


async def send_batch(
    session: AsyncSession, user_id: int,
    recipients: list[dict], subject: str, html_template: str,
    from_email: str | None = None,
) -> dict:
    sender = from_email or "noreply@vitba.ai"
    emails = []
    for r in recipients:
        personalized = html_template
        for key, val in r.items():
            if key != "email":
                personalized = personalized.replace(f"{{{{{key}}}}}", str(val))
        emails.append({"from": sender, "to": [r["email"]], "subject": subject, "html": personalized})

    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{RESEND_BASE}/emails/batch", headers=_headers(), json=emails)
        resp.raise_for_status()
        data = resp.json()

    campaign = Campaign(user_id=user_id, type="email_batch", title=subject, status="sent")
    session.add(campaign)
    await session.flush()

    ec = EmailCampaign(
        user_id=user_id, campaign_id=campaign.id, provider="resend",
        sent_count=len(recipients), status="sent",
    )
    session.add(ec)
    await session.commit()

    await log_action(session, user_id, "email.batch_send", "email_campaign", str(ec.id),
                     {"count": len(recipients)})
    return {"batch_data": data, "campaign_id": campaign.id}


async def get_email_stats(session: AsyncSession, user_id: int, campaign_id: int | None = None) -> dict:
    q = select(EmailCampaign).where(EmailCampaign.user_id == user_id)
    if campaign_id:
        q = q.where(EmailCampaign.campaign_id == campaign_id)
    rows = (await session.execute(q)).scalars().all()
    total_sent = sum(r.sent_count for r in rows)
    total_open = sum(r.open_count for r in rows)
    total_click = sum(r.click_count for r in rows)
    return {
        "campaigns": len(rows),
        "total_sent": total_sent,
        "total_opened": total_open,
        "total_clicked": total_click,
        "open_rate": round(total_open / total_sent * 100, 1) if total_sent else 0,
        "click_rate": round(total_click / total_sent * 100, 1) if total_sent else 0,
    }
