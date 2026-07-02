import logging

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.campaign import Campaign
from app.models.email_campaign import EmailCampaign
from app.services.audit import log_action

logger = logging.getLogger(__name__)

RESEND_BASE = "https://api.resend.com"


def _headers() -> dict:
    return {"Authorization": f"Bearer {settings.resend_api_key}", "Content-Type": "application/json"}


def _sanitize_email_html(html: str) -> str:
    """Email client không chạy JS — dọn <script> và contenteditable còn sót từ
    chế độ live-edit để tránh lỗi hiển thị/spam-flag ở Gmail/Outlook."""
    import re
    html = re.sub(r"<script\b[\s\S]*?</script>", "", html, flags=re.IGNORECASE)
    html = re.sub(r"\scontenteditable=([\"'])(?:true)?\1", "", html, flags=re.IGNORECASE)
    return html


async def send_email(
    session: AsyncSession, user_id: int,
    to: list[str], subject: str, html: str,
    from_email: str | None = None,
    cc: list[str] | None = None,
    bcc: list[str] | None = None,
    smtp_config: dict | None = None,
) -> dict:
    from app.services.email_service import email_service
    if not email_service.enabled and not smtp_config:
        raise ValueError("Dịch vụ gửi email chưa được cấu hình (Thiếu RESEND_API_KEY hoặc SMTP settings).")
    html = _sanitize_email_html(html)

    # We can pass the whole `to` list to send_email if we modify it to support lists,
    # but for now let's just pass the whole list and handle it inside email_service.
    # We will assume email_service.send_email can take a list or single string.
    success = await email_service.send_email(
        to=to, subject=subject, html_content=html, 
        cc=cc, bcc=bcc, smtp_config=smtp_config, from_email=from_email
    )
    success_count = len(to) if success else 0

    if success_count == 0 and len(to) > 0:
        raise ValueError("Gửi email thất bại. Vui lòng kiểm tra lại cấu hình SMTP hoặc Resend.")

    campaign = Campaign(user_id=user_id, type="email", title=subject, content=html[:500], status="sent")
    session.add(campaign)
    await session.flush()

    ec = EmailCampaign(
        user_id=user_id, campaign_id=campaign.id, provider="resend" if email_service.use_resend else "smtp",
        sent_count=success_count, status="sent",
    )
    session.add(ec)
    await session.commit()

    await log_action(session, user_id, "email.send", "email_campaign", str(ec.id),
                     {"to_count": len(to), "success_count": success_count, "subject": subject})
    return {"campaign_id": campaign.id}


async def send_batch(
    session: AsyncSession, user_id: int,
    recipients: list[dict], subject: str, html_template: str,
    from_email: str | None = None,
    smtp_config: dict | None = None,
) -> dict:
    from app.services.email_service import email_service
    if not email_service.enabled and not smtp_config:
        raise ValueError("Dịch vụ gửi email chưa được cấu hình (Thiếu RESEND_API_KEY hoặc SMTP settings).")

    html_template = _sanitize_email_html(html_template)
    success_count = 0
    failed: list[str] = []
    for r in recipients:
        personalized = html_template
        for key, val in r.items():
            if key != "email":
                personalized = personalized.replace(f"{{{{{key}}}}}", str(val))

        success = await email_service.send_email(
            r["email"], subject, personalized,
            smtp_config=smtp_config, from_email=from_email,
        )
        if success:
            success_count += 1
        else:
            failed.append(r["email"])

    if success_count == 0 and len(recipients) > 0:
        raise ValueError("Gửi email batch thất bại. Vui lòng kiểm tra lại cấu hình SMTP/Resend.")

    campaign = Campaign(user_id=user_id, type="email_batch", title=subject, status="sent")
    session.add(campaign)
    await session.flush()

    ec = EmailCampaign(
        user_id=user_id, campaign_id=campaign.id,
        provider="smtp" if smtp_config else ("resend" if email_service.use_resend else "smtp"),
        sent_count=success_count, status="sent",
    )
    session.add(ec)
    await session.commit()

    await log_action(session, user_id, "email.batch_send", "email_campaign", str(ec.id),
                     {"count": len(recipients), "success_count": success_count})
    return {
        "batch_data": {},
        "campaign_id": campaign.id,
        "sent_count": success_count,
        "failed": failed,
    }


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
