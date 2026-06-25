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

    Also dispatches due Content Calendar items via the Cross-Post Orchestrator.
    Imported lazily inside the startup hook so the worker is never instantiated
    during test collection.
    """
    import asyncio
    from app.core.db import async_session_maker

    while True:
        try:
            await process_due_scheduled_emails(async_session_maker)
            await process_due_calendar_items(async_session_maker)
        except Exception:
            logger.exception("scheduler_loop iteration failed")
        await asyncio.sleep(interval_seconds)


async def process_due_calendar_items(
    session_maker: async_sessionmaker,
    now: datetime | None = None,
) -> dict[str, int]:
    """Find approved ContentItem rows whose scheduled_date <= now and publish them
    via the Cross-Post Orchestrator. Returns {"processed": int, "published": int, "failed": int}.
    """
    from app.models.content_item import ContentItem
    from app.mcp.orchestrator import publish_scheduled_calendar_item

    now = now or datetime.now(timezone.utc)
    processed = published = failed = 0

    async with session_maker() as session:
        rows = (
            await session.execute(
                select(ContentItem).where(
                    ContentItem.status == "approved",
                    ContentItem.scheduled_date.is_not(None),
                )
            )
        ).scalars().all()

        for item in rows:
            due = item.scheduled_date
            if due is None:
                continue
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            if due > now:
                continue
            processed += 1
            try:
                result = await publish_scheduled_calendar_item(session, item)
                if "error" in result:
                    failed += 1
                else:
                    published += 1
            except Exception:
                logger.exception("Failed to publish calendar item %s", item.id)
                failed += 1
            await session.commit()

    return {"processed": processed, "published": published, "failed": failed}
