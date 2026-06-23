"""Tests for the scheduled-email background worker (app.mcp.email.scheduler).

Uses the shared `session_maker` fixture from conftest.py (in-memory SQLite,
StaticPool) and mocks app.mcp.email.scheduler.email_tools.send_batch so no
real network/Resend call is made. A fixed `now` is always passed to
process_due_scheduled_emails for determinism.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import insert

from app.models.user import User
from app.models.email_template import EmailTemplate
from app.models.email_list import EmailList, email_list_contacts
from app.models.email_contact import EmailContact
from app.models.scheduled_email import ScheduledEmail
from app.mcp.email.scheduler import _parse_due, process_due_scheduled_emails


NOW = datetime(2026, 7, 1, 12, 0, 0, tzinfo=timezone.utc)
PAST = "2026-07-01T10:00:00+00:00"     # before NOW -> due
FUTURE = "2026-07-01T18:00:00+00:00"   # after NOW -> not due


async def _seed_base(maker):
    """Create a user, template, and email list. Returns their ids."""
    async with maker() as session:
        user = User(name="Alice", email="alice@example.com", password_hash="x")
        session.add(user)
        await session.flush()

        tpl = EmailTemplate(
            user_id=user.id,
            name="Newsletter",
            subject="Hello {{name}}",
            html_body="<p>Hi {{name}}</p>",
        )
        session.add(tpl)
        await session.flush()

        elist = EmailList(user_id=user.id, name="Main List")
        session.add(elist)
        await session.flush()

        await session.commit()
        return user.id, tpl.id, elist.id


async def _add_contact(maker, user_id, list_id, email, name, status):
    async with maker() as session:
        contact = EmailContact(user_id=user_id, email=email, name=name, status=status)
        session.add(contact)
        await session.flush()
        await session.execute(
            insert(email_list_contacts).values(list_id=list_id, contact_id=contact.id)
        )
        await session.commit()
        return contact.id


async def _add_scheduled(maker, user_id, template_id, list_id, scheduled_at, status="pending"):
    async with maker() as session:
        sched = ScheduledEmail(
            user_id=user_id,
            template_id=template_id,
            list_id=list_id,
            scheduled_at=scheduled_at,
            status=status,
        )
        session.add(sched)
        await session.commit()
        return sched.id


# ── 1. Due pending -> sent ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_due_pending_email_is_sent(session_maker):
    maker = session_maker
    user_id, template_id, list_id = await _seed_base(maker)
    await _add_contact(maker, user_id, list_id, "bob@example.com", "Bob", "active")
    sched_id = await _add_scheduled(maker, user_id, template_id, list_id, PAST)

    mock_send = AsyncMock(return_value={"batch_data": {}, "campaign_id": 1})
    with patch("app.mcp.email.scheduler.email_tools.send_batch", mock_send):
        result = await process_due_scheduled_emails(maker, now=NOW)

    assert result == {"processed": 1, "sent": 1, "failed": 0}
    mock_send.assert_awaited_once()

    async with maker() as session:
        row = await session.get(ScheduledEmail, sched_id)
        assert row.status == "sent"
        assert row.sent_at is not None


# ── 2. Only ACTIVE contacts included, with unsubscribe_url ──────────────────


@pytest.mark.asyncio
async def test_recipients_are_active_only_with_unsubscribe_url(session_maker):
    maker = session_maker
    user_id, template_id, list_id = await _seed_base(maker)
    await _add_contact(maker, user_id, list_id, "active1@example.com", "Active One", "active")
    await _add_contact(maker, user_id, list_id, "active2@example.com", "Active Two", "active")
    await _add_contact(maker, user_id, list_id, "gone@example.com", "Unsubbed", "unsubscribed")
    await _add_scheduled(maker, user_id, template_id, list_id, PAST)

    mock_send = AsyncMock(return_value={"batch_data": {}, "campaign_id": 1})
    with patch("app.mcp.email.scheduler.email_tools.send_batch", mock_send):
        result = await process_due_scheduled_emails(maker, now=NOW)

    assert result == {"processed": 1, "sent": 1, "failed": 0}
    mock_send.assert_awaited_once()

    call_args = mock_send.call_args
    recipients = call_args.args[2]  # session, user_id, recipients, subject, html_body
    emails = {r["email"] for r in recipients}
    assert emails == {"active1@example.com", "active2@example.com"}
    assert "gone@example.com" not in emails
    for r in recipients:
        assert r.get("unsubscribe_url")


# ── 3. Not yet due -> skipped ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_future_scheduled_email_is_skipped(session_maker):
    maker = session_maker
    user_id, template_id, list_id = await _seed_base(maker)
    await _add_contact(maker, user_id, list_id, "bob@example.com", "Bob", "active")
    sched_id = await _add_scheduled(maker, user_id, template_id, list_id, FUTURE)

    mock_send = AsyncMock()
    with patch("app.mcp.email.scheduler.email_tools.send_batch", mock_send):
        result = await process_due_scheduled_emails(maker, now=NOW)

    assert result == {"processed": 0, "sent": 0, "failed": 0}
    mock_send.assert_not_called()

    async with maker() as session:
        row = await session.get(ScheduledEmail, sched_id)
        assert row.status == "pending"


# ── 4. Cancelled/sent rows ignored ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_cancelled_and_sent_rows_are_ignored(session_maker):
    maker = session_maker
    user_id, template_id, list_id = await _seed_base(maker)
    await _add_contact(maker, user_id, list_id, "bob@example.com", "Bob", "active")
    await _add_scheduled(maker, user_id, template_id, list_id, PAST, status="cancelled")
    await _add_scheduled(maker, user_id, template_id, list_id, PAST, status="sent")

    mock_send = AsyncMock()
    with patch("app.mcp.email.scheduler.email_tools.send_batch", mock_send):
        result = await process_due_scheduled_emails(maker, now=NOW)

    assert result == {"processed": 0, "sent": 0, "failed": 0}
    mock_send.assert_not_called()


# ── 5. Missing template -> failed ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_missing_template_marks_row_failed(session_maker):
    maker = session_maker
    user_id, template_id, list_id = await _seed_base(maker)
    await _add_contact(maker, user_id, list_id, "bob@example.com", "Bob", "active")
    sched_id = await _add_scheduled(maker, user_id, 999999, list_id, PAST)

    mock_send = AsyncMock()
    with patch("app.mcp.email.scheduler.email_tools.send_batch", mock_send):
        result = await process_due_scheduled_emails(maker, now=NOW)

    assert result == {"processed": 1, "sent": 0, "failed": 1}
    mock_send.assert_not_called()

    async with maker() as session:
        row = await session.get(ScheduledEmail, sched_id)
        assert row.status == "failed"


# ── 6. send_batch raises -> failed, no propagation ──────────────────────────


@pytest.mark.asyncio
async def test_send_batch_exception_marks_row_failed(session_maker):
    maker = session_maker
    user_id, template_id, list_id = await _seed_base(maker)
    await _add_contact(maker, user_id, list_id, "bob@example.com", "Bob", "active")
    sched_id = await _add_scheduled(maker, user_id, template_id, list_id, PAST)

    mock_send = AsyncMock(side_effect=RuntimeError("Resend API down"))
    with patch("app.mcp.email.scheduler.email_tools.send_batch", mock_send):
        result = await process_due_scheduled_emails(maker, now=NOW)  # must not raise

    assert result == {"processed": 1, "sent": 0, "failed": 1}
    mock_send.assert_awaited_once()

    async with maker() as session:
        row = await session.get(ScheduledEmail, sched_id)
        assert row.status == "failed"


# ── 7. No active recipients -> sent no-op ───────────────────────────────────


@pytest.mark.asyncio
async def test_no_active_recipients_marks_sent_without_calling_send_batch(session_maker):
    maker = session_maker
    user_id, template_id, list_id = await _seed_base(maker)
    await _add_contact(maker, user_id, list_id, "gone@example.com", "Unsubbed", "unsubscribed")
    sched_id = await _add_scheduled(maker, user_id, template_id, list_id, PAST)

    mock_send = AsyncMock()
    with patch("app.mcp.email.scheduler.email_tools.send_batch", mock_send):
        result = await process_due_scheduled_emails(maker, now=NOW)

    assert result == {"processed": 1, "sent": 1, "failed": 0}
    mock_send.assert_not_called()

    async with maker() as session:
        row = await session.get(ScheduledEmail, sched_id)
        assert row.status == "sent"


@pytest.mark.asyncio
async def test_zero_contacts_in_list_marks_sent_without_calling_send_batch(session_maker):
    maker = session_maker
    user_id, template_id, list_id = await _seed_base(maker)
    sched_id = await _add_scheduled(maker, user_id, template_id, list_id, PAST)

    mock_send = AsyncMock()
    with patch("app.mcp.email.scheduler.email_tools.send_batch", mock_send):
        result = await process_due_scheduled_emails(maker, now=NOW)

    assert result == {"processed": 1, "sent": 1, "failed": 0}
    mock_send.assert_not_called()

    async with maker() as session:
        row = await session.get(ScheduledEmail, sched_id)
        assert row.status == "sent"


# ── 8. _parse_due unit tests ────────────────────────────────────────────────


def test_parse_due_naive_iso_treated_as_utc():
    dt = _parse_due("2026-07-01T10:00:00")
    assert dt is not None
    assert dt.tzinfo == timezone.utc
    assert dt == datetime(2026, 7, 1, 10, 0, 0, tzinfo=timezone.utc)


def test_parse_due_garbage_string_returns_none():
    assert _parse_due("not-a-real-date") is None
    assert _parse_due(None) is None
