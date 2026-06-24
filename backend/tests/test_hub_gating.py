"""Tests for Marketing Hub plan-gating (require_hub_tool dependency)."""

import pytest
from datetime import datetime, timezone

from app.models.audit_log import AuditLog


async def _register(client, email="gating@example.com"):
    resp = await client.post(
        "/auth/register",
        json={"name": "User", "email": email, "password": "secret123"},
    )
    assert resp.status_code == 201
    data = resp.json()
    return data["access_token"], data["user"]["id"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Free user: all hub endpoints return 403
# ---------------------------------------------------------------------------

async def test_free_user_email_403(client):
    token, _ = await _register(client, "free_email@example.com")
    r = await client.get("/mcp/email/templates", headers=_auth(token))
    assert r.status_code == 403


async def test_free_user_calendar_403(client):
    token, _ = await _register(client, "free_cal@example.com")
    r = await client.get("/mcp/calendar/items", headers=_auth(token))
    assert r.status_code == 403


async def test_free_user_seo_403(client):
    token, _ = await _register(client, "free_seo@example.com")
    r = await client.get("/mcp/seo/audits", headers=_auth(token))
    assert r.status_code == 403


async def test_free_user_analytics_403(client):
    token, _ = await _register(client, "free_analytics@example.com")
    r = await client.get("/mcp/analytics/overview", headers=_auth(token))
    assert r.status_code == 403


async def test_free_user_landing_403(client):
    token, _ = await _register(client, "free_landing@example.com")
    r = await client.get("/mcp/landing/pages", headers=_auth(token))
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# Lite user: email/seo/calendar → 200; analytics + landing → 403
# ---------------------------------------------------------------------------

async def test_lite_user_email_200(client, promote):
    token, uid = await _register(client, "lite_email@example.com")
    await promote(uid, "lite")
    r = await client.get("/mcp/email/templates", headers=_auth(token))
    assert r.status_code == 200


async def test_lite_user_seo_200(client, promote):
    token, uid = await _register(client, "lite_seo@example.com")
    await promote(uid, "lite")
    r = await client.get("/mcp/seo/audits", headers=_auth(token))
    assert r.status_code == 200


async def test_lite_user_calendar_200(client, promote):
    token, uid = await _register(client, "lite_cal@example.com")
    await promote(uid, "lite")
    r = await client.get("/mcp/calendar/items", headers=_auth(token))
    assert r.status_code == 200


async def test_lite_user_analytics_403(client, promote):
    token, uid = await _register(client, "lite_analytics@example.com")
    await promote(uid, "lite")
    r = await client.get("/mcp/analytics/overview", headers=_auth(token))
    assert r.status_code == 403


async def test_lite_user_landing_403(client, promote):
    token, uid = await _register(client, "lite_landing@example.com")
    await promote(uid, "lite")
    r = await client.get("/mcp/landing/pages", headers=_auth(token))
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# Pro user: all five → 200
# ---------------------------------------------------------------------------

async def test_pro_user_email_200(client, promote):
    token, uid = await _register(client, "pro_email@example.com")
    await promote(uid, "pro")
    r = await client.get("/mcp/email/templates", headers=_auth(token))
    assert r.status_code == 200


async def test_pro_user_calendar_200(client, promote):
    token, uid = await _register(client, "pro_cal@example.com")
    await promote(uid, "pro")
    r = await client.get("/mcp/calendar/items", headers=_auth(token))
    assert r.status_code == 200


async def test_pro_user_seo_200(client, promote):
    token, uid = await _register(client, "pro_seo@example.com")
    await promote(uid, "pro")
    r = await client.get("/mcp/seo/audits", headers=_auth(token))
    assert r.status_code == 200


async def test_pro_user_analytics_200(client, promote):
    token, uid = await _register(client, "pro_analytics@example.com")
    await promote(uid, "pro")
    r = await client.get("/mcp/analytics/overview", headers=_auth(token))
    assert r.status_code == 200


async def test_pro_user_landing_200(client, promote):
    token, uid = await _register(client, "pro_landing@example.com")
    await promote(uid, "pro")
    r = await client.get("/mcp/landing/pages", headers=_auth(token))
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# Public routes: no auth required
# ---------------------------------------------------------------------------

async def test_unsubscribe_bad_token_400_not_403(client):
    """POST /mcp/email/unsubscribe/<bad-token> returns 400, not 401/403."""
    r = await client.post("/mcp/email/unsubscribe/notavalidtoken")
    assert r.status_code == 400


async def test_public_landing_missing_slug_404_not_403(client):
    """GET /p/<missing-slug> returns 404, not 403 (route is public)."""
    r = await client.get("/p/this-slug-does-not-exist-xyz123")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Daily email send cap (lite = 100/day)
# ---------------------------------------------------------------------------

async def test_daily_email_cap_429(client, promote, session_maker):
    """Seeding 100 email.send audit rows for a lite user triggers 429 on next send."""
    token, uid = await _register(client, "emailcap@example.com")
    await promote(uid, "lite")

    today = datetime.now(timezone.utc)

    # Seed 100 audit log rows (the lite cap)
    async with session_maker() as s:
        for _ in range(100):
            s.add(AuditLog(
                user_id=uid,
                action="email.send",
                resource_type="email_campaign",
                resource_id=None,
                created_at=today,
            ))
        await s.commit()

    # Next send attempt must 429 (cap check fires before any Resend call)
    r = await client.post(
        "/mcp/email/send",
        json={"to": ["x@example.com"], "subject": "Hi", "html": "<p>hi</p>"},
        headers=_auth(token),
    )
    assert r.status_code == 429


# ---------------------------------------------------------------------------
# Daily landing generate cap (pro = 20/day)
# ---------------------------------------------------------------------------

async def test_daily_landing_cap_429(client, promote, session_maker):
    """Seeding 20 landing.generate audit rows for a pro user triggers 429 on next generate."""
    token, uid = await _register(client, "landingcap@example.com")
    await promote(uid, "pro")

    today = datetime.now(timezone.utc)

    # Seed 20 audit log rows (the pro cap)
    async with session_maker() as s:
        for _ in range(20):
            s.add(AuditLog(
                user_id=uid,
                action="landing.generate",
                resource_type="landing_page",
                resource_id=None,
                created_at=today,
            ))
        await s.commit()

    # Next generate attempt must 429 (cap check fires before LLM call)
    r = await client.post(
        "/mcp/landing/generate",
        json={"purpose": "sell", "product": "Widget", "tone": "casual", "cta": "Buy"},
        headers=_auth(token),
    )
    assert r.status_code == 429
