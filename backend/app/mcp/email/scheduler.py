"""Background worker that dispatches due ScheduledEmail rows via Resend."""

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models.scheduled_email import ScheduledEmail
from app.models.email_template import EmailTemplate
from app.models.email_contact import EmailContact
from app.models.email_list import email_list_contacts
from app.mcp.email import tools as email_tools
from app.mcp.email.tokens import make_unsubscribe_token

logger = logging.getLogger(__name__)


def _parse_due(scheduled_at: str) -> datetime | None:
    """Parse the stored ISO string; treat a naive datetime as UTC.

    Returns None if the value is None or unparseable.
    """
    try:
        dt = datetime.fromisoformat(scheduled_at)
    except (ValueError, TypeError):
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


async def process_due_scheduled_emails(
    session_maker: async_sessionmaker,
    now: datetime | None = None,
) -> dict[str, int]:
    """Find pending ScheduledEmail rows whose scheduled_at <= now, send each via
    send_batch, and mark sent/failed.

    Returns {"processed": int, "sent": int, "failed": int}.
    """
    now = now or datetime.now(timezone.utc)
    processed = sent = failed = 0

    async with session_maker() as session:
        rows = (
            await session.execute(
                select(ScheduledEmail).where(ScheduledEmail.status == "pending")
            )
        ).scalars().all()

        for sched in rows:
            due = _parse_due(sched.scheduled_at)
            if due is None or due > now:
                continue
            processed += 1
            try:
                tpl = await session.get(EmailTemplate, sched.template_id)
                if tpl is None:
                    sched.status = "failed"
                    failed += 1
                    await session.commit()
                    continue

                contacts = (
                    await session.execute(
                        select(EmailContact)
                        .join(
                            email_list_contacts,
                            EmailContact.id == email_list_contacts.c.contact_id,
                        )
                        .where(
                            email_list_contacts.c.list_id == sched.list_id,
                            EmailContact.status == "active",
                        )
                    )
                ).scalars().all()

                recipients = [
                    {
                        "email": c.email,
                        "name": c.name or "",
                        "unsubscribe_url": (
                            f"/mcp/email/unsubscribe/{make_unsubscribe_token(c.id)}"
                        ),
                    }
                    for c in contacts
                ]

                if recipients:
                    await email_tools.send_batch(
                        session,
                        sched.user_id,
                        recipients,
                        tpl.subject,
                        tpl.html_body,
                    )
                # no active recipients → schedule completed as a no-op
                # (status stays within the pending/sent/failed/cancelled enum)

                sched.status = "sent"
                sched.sent_at = now
                sent += 1
                await session.commit()

            except Exception:
                logger.exception("Failed to send scheduled email %s", sched.id)
                sched_id = sched.id
                await session.rollback()
                sched = await session.get(ScheduledEmail, sched_id)
                if sched is not None:
                    sched.status = "failed"
                    await session.commit()
                failed += 1

    return {"processed": processed, "sent": sent, "failed": failed}


async def scheduler_loop(interval_seconds: int = 60) -> None:
    """Infinite loop that calls process_due_scheduled_emails every interval_seconds.

    Imported lazily inside the startup hook so the worker is never instantiated
    during test collection.
    """
    import asyncio
    from app.core.db import async_session_maker

    while True:
        try:
            await process_due_scheduled_emails(async_session_maker)
        except Exception:
            logger.exception("scheduler_loop iteration failed")
        await asyncio.sleep(interval_seconds)
