"""Tests for analytics dashboard aggregation endpoints."""

import pytest

from app.models.campaign import Campaign
from app.models.content_item import ContentItem
from app.models.email_campaign import EmailCampaign
from app.models.seo_audit import SeoAudit


async def _register(client, email="user@example.com"):
    resp = await client.post(
        "/auth/register",
        json={"name": "U", "email": email, "password": "secret123"},
    )
    assert resp.status_code == 201
    data = resp.json()
    return data["access_token"], data["user"]["id"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# -------------------------------------------------------------------
# /mcp/analytics/overview
# -------------------------------------------------------------------


@pytest.mark.asyncio
async def test_overview(client, session_maker, promote):
    token, uid = await _register(client)
    await promote(uid)

    async with session_maker() as s:
        s.add_all([
            Campaign(user_id=uid, type="social", title="C1"),
            Campaign(user_id=uid, type="email", title="C2"),
            EmailCampaign(user_id=uid, sent_count=100, open_count=40, click_count=10, status="sent"),
            EmailCampaign(user_id=uid, sent_count=200, open_count=60, click_count=20, status="sent"),
            ContentItem(user_id=uid, title="Blog A", content_type="blog", status="published"),
            ContentItem(user_id=uid, title="Blog B", content_type="blog", status="draft"),
            ContentItem(user_id=uid, title="Social C", content_type="social", status="published"),
            SeoAudit(user_id=uid, score=80, url="https://a.com"),
            SeoAudit(user_id=uid, score=60, url="https://b.com"),
        ])
        await s.commit()

    r = await client.get("/mcp/analytics/overview", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert body["campaigns"] == 2
    assert body["emails_sent"] == 300
    # open_rate = (40+60)/300 * 100 = 33.3
    assert body["open_rate"] == 33.3
    # click_rate = (10+20)/300 * 100 = 10.0
    assert body["click_rate"] == 10.0
    assert body["content_total"] == 3
    assert body["content_published"] == 2
    # avg_seo_score = (80+60)/2 = 70.0
    assert body["avg_seo_score"] == 70.0


@pytest.mark.asyncio
async def test_overview_zero_data(client, session_maker, promote):
    """Division-by-zero safety: brand-new user with no data should get 0 rates, not 500."""
    token, uid = await _register(client)
    await promote(uid)
    r = await client.get("/mcp/analytics/overview", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert body["campaigns"] == 0
    assert body["emails_sent"] == 0
    assert body["open_rate"] == 0
    assert body["click_rate"] == 0
    assert body["content_total"] == 0
    assert body["content_published"] == 0
    assert body["avg_seo_score"] == 0


# -------------------------------------------------------------------
# /mcp/analytics/email
# -------------------------------------------------------------------


@pytest.mark.asyncio
async def test_email_analytics(client, session_maker, promote):
    token, uid = await _register(client)
    await promote(uid)

    async with session_maker() as s:
        s.add_all([
            EmailCampaign(user_id=uid, sent_count=100, open_count=40, click_count=10, status="sent"),
            EmailCampaign(user_id=uid, sent_count=50, open_count=25, click_count=5, status="sent"),
        ])
        await s.commit()

    r = await client.get("/mcp/analytics/email?period=30d", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert body["period"] == "30d"
    assert body["campaigns"] == 2
    assert body["total_sent"] == 150
    assert body["total_opened"] == 65
    assert body["total_clicked"] == 15
    # open_rate = 65/150 * 100 = 43.3
    assert body["open_rate"] == 43.3
    # click_rate = 15/150 * 100 = 10.0
    assert body["click_rate"] == 10.0


@pytest.mark.asyncio
async def test_email_analytics_zero_data(client, session_maker, promote):
    """Division-by-zero safety for /email endpoint."""
    token, uid = await _register(client)
    await promote(uid)
    r = await client.get("/mcp/analytics/email", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert body["total_sent"] == 0
    assert body["open_rate"] == 0
    assert body["click_rate"] == 0


@pytest.mark.asyncio
async def test_email_analytics_period_filter(client, session_maker, promote):
    """Rows created with server_default are in-window; we confirm they are counted.

    Note: created_at uses server_default=func.now() which in SQLite returns the
    current time; we cannot easily backdate rows to test exclusion without raw SQL.
    This test verifies in-window aggregation works correctly with period=7d.
    """
    token, uid = await _register(client)
    await promote(uid)

    async with session_maker() as s:
        s.add_all([
            EmailCampaign(user_id=uid, sent_count=50, open_count=20, click_count=5, status="sent"),
        ])
        await s.commit()

    r = await client.get("/mcp/analytics/email?period=7d", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    # The row was just created, so it falls within the 7d window
    assert body["campaigns"] == 1
    assert body["total_sent"] == 50


# -------------------------------------------------------------------
# /mcp/analytics/content
# -------------------------------------------------------------------


@pytest.mark.asyncio
async def test_content_analytics(client, session_maker, promote):
    token, uid = await _register(client)
    await promote(uid)

    async with session_maker() as s:
        s.add_all([
            ContentItem(user_id=uid, title="A", content_type="blog", status="published"),
            ContentItem(user_id=uid, title="B", content_type="blog", status="draft"),
            ContentItem(user_id=uid, title="C", content_type="social", status="published"),
            ContentItem(user_id=uid, title="D", content_type="social", status="review"),
        ])
        await s.commit()

    r = await client.get("/mcp/analytics/content", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 4
    assert body["by_status"] == {"published": 2, "draft": 1, "review": 1}
    assert body["by_type"] == {"blog": 2, "social": 2}


# -------------------------------------------------------------------
# /mcp/analytics/seo
# -------------------------------------------------------------------


@pytest.mark.asyncio
async def test_seo_analytics(client, session_maker, promote):
    token, uid = await _register(client)
    await promote(uid)

    async with session_maker() as s:
        s.add_all([
            SeoAudit(
                user_id=uid, score=80, url="https://a.com",
                issues=[
                    {"message": "Missing alt text"},
                    {"message": "Slow page speed"},
                ],
            ),
            SeoAudit(
                user_id=uid, score=60, url="https://b.com",
                issues=[
                    {"message": "Missing alt text"},
                    {"message": "Missing alt text"},
                    {"message": "No meta description"},
                ],
            ),
        ])
        await s.commit()

    r = await client.get("/mcp/analytics/seo", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert body["audits"] == 2
    assert body["avg_score"] == 70.0

    # top_issues should be sorted by count desc
    issues = body["top_issues"]
    assert len(issues) == 3
    assert issues[0]["message"] == "Missing alt text"
    assert issues[0]["count"] == 3
    assert issues[1]["count"] >= 1  # "Slow page speed" or "No meta description"


# -------------------------------------------------------------------
# /mcp/analytics/activity
# -------------------------------------------------------------------


@pytest.mark.asyncio
async def test_activity_from_real_mutation(client, session_maker, promote):
    """Create a calendar item (which writes an AuditLog) and verify it shows in /activity."""
    token, uid = await _register(client)
    await promote(uid)

    # Perform a real mutation that writes an audit log
    create_resp = await client.post(
        "/mcp/calendar/items",
        headers=_auth(token),
        json={"title": "Test Item", "content_type": "blog"},
    )
    assert create_resp.status_code == 201

    r = await client.get("/mcp/analytics/activity", headers=_auth(token))
    assert r.status_code == 200
    logs = r.json()
    assert len(logs) >= 1
    assert logs[0]["action"] == "calendar.item_create"
    assert logs[0]["resource_type"] == "content_item"


# -------------------------------------------------------------------
# Ownership scoping: user B cannot see user A's data
# -------------------------------------------------------------------


@pytest.mark.asyncio
async def test_ownership_scoping(client, session_maker, promote):
    """User B sees zeros/empty, not user A's data."""
    token_a, uid_a = await _register(client, email="userA@example.com")
    token_b, uid_b = await _register(client, email="userB@example.com")
    await promote(uid_a)
    await promote(uid_b)

    # Seed data only for user A
    async with session_maker() as s:
        s.add_all([
            Campaign(user_id=uid_a, type="social", title="A's campaign"),
            EmailCampaign(user_id=uid_a, sent_count=100, open_count=40, click_count=10, status="sent"),
            ContentItem(user_id=uid_a, title="A's post", content_type="blog", status="published"),
            SeoAudit(user_id=uid_a, score=90, url="https://a.com"),
        ])
        await s.commit()

    # User B should see nothing
    r = await client.get("/mcp/analytics/overview", headers=_auth(token_b))
    assert r.status_code == 200
    body = r.json()
    assert body["campaigns"] == 0
    assert body["emails_sent"] == 0
    assert body["content_total"] == 0
    assert body["avg_seo_score"] == 0

    r = await client.get("/mcp/analytics/email", headers=_auth(token_b))
    assert r.status_code == 200
    assert r.json()["total_sent"] == 0

    r = await client.get("/mcp/analytics/content", headers=_auth(token_b))
    assert r.status_code == 200
    assert r.json()["total"] == 0
    assert r.json()["by_status"] == {}
    assert r.json()["by_type"] == {}

    r = await client.get("/mcp/analytics/seo", headers=_auth(token_b))
    assert r.status_code == 200
    assert r.json()["audits"] == 0

    r = await client.get("/mcp/analytics/activity", headers=_auth(token_b))
    assert r.status_code == 200
    assert r.json() == []

    # Verify user A still sees their data
    r = await client.get("/mcp/analytics/overview", headers=_auth(token_a))
    assert r.status_code == 200
    assert r.json()["campaigns"] == 1
    assert r.json()["emails_sent"] == 100
