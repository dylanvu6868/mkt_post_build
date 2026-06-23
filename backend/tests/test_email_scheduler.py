"""TDD tests for the scheduled-email background worker.

All tests pass a fixed `now` to process_due_scheduled_emails so they are
deterministic and independent of wall-clock time.
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.db import Base
import app.models  # noqa: F401  — register all ORM models
from app.models.user import User
from app.models.email_template import EmailTemplate
from app.models.email_contact import EmailContact
from app.models.email_list import EmailList, email_list_contacts
from app.models.scheduled_email import ScheduledEmail
from app.mcp.email.scheduler import _parse_due, process_due_scheduled_emails


# ── Fixtures ────────────────────────────────────────────────────────────────


@pytest.fixture
async def session_maker_mem():
    """In-memory SQLite session_maker (same pattern as conftest / test_email_models)."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    yield maker
    await engine.dispose()


@pytest.fixture
async def seeded(session_maker_mem):
    """Seed a user, template, list, and two active contacts; return (maker, ids)."""
    maker = session_maker_mem
    async with maker() as session:
        user = User(name="Alice", email="alice@example.com", password_hash="x")
        session.add(user)
        await session.flush()

        tpl = EmailTemplate(
            user_id=user.id,
            name="Newsletter",
            subject="Hello {{name}}",
            html_body="<p>Hi {{name}}, unsubscribe: {{unsubscribe_url}}</p>",
        )
        session.add(tpl)
        await session.flush()

        email_list = EmailList(user_id=user.id, name="Main List")
        session.add(email_list)
        await session.flush()

        c1 = EmailContact(user_id=user.id, email="bob@example.com", name="Bob", status="active")
        c2 = EmailContact(user_id=user.id, email="carol@example.com", name="Carol", status="active")
        c3 = EmailContact(user_id=user.id, email="dave@example.com", name="Dave", status="unsubscribed")
        c4 = EmailContact(user_id=user.id, email="eve@example.com", name="Eve", status="bounced")
        session.add_all([c1, c2, c3, c4])
        await session.flush()

        await session.execute(
            insert(email_list_contacts).values([
                {"list_id": email_list.id, "contact_id": c1.id},
                {"list_id": email_list.id, "contact_id": c2.id},
                {"list_id": email_list.id, "contact_id": c3.id},
                {"list_id": email_list.id, "contact_id": c4.id},
            ])
        )
        await session.commit()

        yield maker, {
            "user_id": user.id,
            "template_id": tpl.id,
            "list_id": email_list.id,
            "contact_ids": [c1.id, c2.id, c3.id, c4.id],
        }


# Fixed reference time (aware UTC)
NOW = datetime(2025, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
PAST = "2025-06-01T11:00:00+00:00"   # 1 hour before NOW  — due
FUTURE = "2025-06-01T13:00:00+00:00" # 1 hour after NOW   — not due yet


# ── _parse_due helper ────────────────────────────────────────────────────────


def test_parse_due_aware():
    dt = _parse_due("2025-06-01T11:00:00+00:00")
    assert dt is not None
    assert dt.tzinfo is not None


def test_parse_due_naive_treated_as_utc():
    dt = _parse_due("2025-06-01T11:00:00")
    assert dt is not None
    assert dt.tzinfo == timezone.utc


def test_parse_due_bad_string_returns_none():
    assert _parse_due("not-a-date") is None
    assert _parse_due(None) is None


# ── Core sending logic ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_past_due_sends_to_active_contacts_only(seeded):
    """Past-due pending email: send_batch called once with the 2 active contacts."""
    maker, ids = seeded

    async with maker() as session:
        sched = ScheduledEmail(
            user_id=ids["user_id"],
            template_id=ids["template_id"],
            list_id=ids["list_id"],
            scheduled_at=PAST,
            status="pending",
        )
        session.add(sched)
        await session.commit()
        sched_id = sched.id

    mock_send = AsyncMock(return_value={"batch_data": {}, "campaign_id": 1})

    with patch("app.mcp.email.scheduler.email_tools.send_batch", mock_send):
        result = await process_due_scheduled_emails(maker, now=NOW)

    assert result == {"processed": 1, "sent": 1, "failed": 0}
    mock_send.assert_called_once()

    # Verify only 2 active contacts reached send_batch
    call_args = mock_send.call_args
    recipients = call_args.args[2]  # positional: session, user_id, recipients, subject, html_body
    assert len(recipients) == 2
    recipient_emails = {r["email"] for r in recipients}
    assert recipient_emails == {"bob@example.com", "carol@example.com"}

    # Verify row updated
    async with maker() as session:
        row = await session.get(ScheduledEmail, sched_id)
        assert row.status == "sent"
        assert row.sent_at is not None


@pytest.mark.asyncio
async def test_future_dated_not_processed(seeded):
    """Future-dated pending email should be skipped."""
    maker, ids = seeded

    async with maker() as session:
        sched = ScheduledEmail(
            user_id=ids["user_id"],
            template_id=ids["template_id"],
            list_id=ids["list_id"],
            scheduled_at=FUTURE,
            status="pending",
        )
        session.add(sched)
        await session.commit()
        sched_id = sched.id

    mock_send = AsyncMock()

    with patch("app.mcp.email.scheduler.email_tools.send_batch", mock_send):
        result = await process_due_scheduled_emails(maker, now=NOW)

    assert result == {"processed": 0, "sent": 0, "failed": 0}
    mock_send.assert_not_called()

    async with maker() as session:
        row = await session.get(ScheduledEmail, sched_id)
        assert row.status == "pending"


@pytest.mark.asyncio
async def test_missing_template_marks_failed(seeded):
    """A scheduled email pointing at a deleted template becomes failed."""
    maker, ids = seeded

    async with maker() as session:
        sched = ScheduledEmail(
            user_id=ids["user_id"],
            template_id=99999,  # non-existent
            list_id=ids["list_id"],
            scheduled_at=PAST,
            status="pending",
        )
        session.add(sched)
        await session.commit()
        sched_id = sched.id

    mock_send = AsyncMock()

    with patch("app.mcp.email.scheduler.email_tools.send_batch", mock_send):
        result = await process_due_scheduled_emails(maker, now=NOW)

    assert result == {"processed": 1, "sent": 0, "failed": 1}
    mock_send.assert_not_called()

    async with maker() as session:
        row = await session.get(ScheduledEmail, sched_id)
        assert row.status == "failed"


@pytest.mark.asyncio
async def test_cancelled_row_ignored(seeded):
    """Rows with status != 'pending' are never processed."""
    maker, ids = seeded

    async with maker() as session:
        for status in ("cancelled", "sent"):
            sched = ScheduledEmail(
                user_id=ids["user_id"],
                template_id=ids["template_id"],
                list_id=ids["list_id"],
                scheduled_at=PAST,
                status=status,
            )
            session.add(sched)
        await session.commit()

    mock_send = AsyncMock()

    with patch("app.mcp.email.scheduler.email_tools.send_batch", mock_send):
        result = await process_due_scheduled_emails(maker, now=NOW)

    assert result == {"processed": 0, "sent": 0, "failed": 0}
    mock_send.assert_not_called()


@pytest.mark.asyncio
async def test_unsubscribed_bounced_excluded(seeded):
    """Only 'active' contacts in the list are included in recipients."""
    maker, ids = seeded

    async with maker() as session:
        sched = ScheduledEmail(
            user_id=ids["user_id"],
            template_id=ids["template_id"],
            list_id=ids["list_id"],
            scheduled_at=PAST,
            status="pending",
        )
        session.add(sched)
        await session.commit()

    mock_send = AsyncMock(return_value={"batch_data": {}, "campaign_id": 1})

    with patch("app.mcp.email.scheduler.email_tools.send_batch", mock_send):
        await process_due_scheduled_emails(maker, now=NOW)

    # dave (unsubscribed) and eve (bounced) must NOT appear
    recipients = mock_send.call_args.args[2]
    emails = {r["email"] for r in recipients}
    assert "dave@example.com" not in emails
    assert "eve@example.com" not in emails


@pytest.mark.asyncio
async def test_recipients_carry_unsubscribe_url(seeded):
    """Each recipient dict must have an unsubscribe_url containing a token."""
    maker, ids = seeded

    async with maker() as session:
        sched = ScheduledEmail(
            user_id=ids["user_id"],
            template_id=ids["template_id"],
            list_id=ids["list_id"],
            scheduled_at=PAST,
            status="pending",
        )
        session.add(sched)
        await session.commit()

    mock_send = AsyncMock(return_value={"batch_data": {}, "campaign_id": 1})

    with patch("app.mcp.email.scheduler.email_tools.send_batch", mock_send):
        await process_due_scheduled_emails(maker, now=NOW)

    recipients = mock_send.call_args.args[2]
    for r in recipients:
        assert "unsubscribe_url" in r
        assert r["unsubscribe_url"].startswith("/mcp/email/unsubscribe/")
        # Token must be non-trivial (at least 10 chars)
        token = r["unsubscribe_url"].split("/mcp/email/unsubscribe/")[1]
        assert len(token) > 10
