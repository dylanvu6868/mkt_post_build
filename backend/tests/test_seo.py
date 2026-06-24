import pytest

from app.mcp.seo.analyzer import analyze_html, extract_keywords


# ── Helper ────────────────────────────────────────────────────────────
async def _register(client, email="seouser@example.com"):
    resp = await client.post(
        "/auth/register",
        json={"name": "SEO User", "email": email, "password": "secret123"},
    )
    data = resp.json()
    return data["access_token"], data["user"]["id"]


GOOD_HTML = """
<html><head>
    <title>Best Marketing Tips for 2026</title>
    <meta name="description" content="Discover the best marketing tips and strategies for growing your business in 2026 with AI.">
</head><body>
    <h1>Best Marketing Tips</h1>
    <p>Marketing is essential for business growth. Here are some tips for marketing success.</p>
    <h2>Tip 1: Use AI</h2>
    <p>AI can help you write better content and optimize your marketing campaigns effectively.</p>
    <img src="img.jpg" alt="Marketing tips illustration">
    <a href="/about">About us</a>
    <a href="https://example.com">External</a>
</body></html>
"""


# ── Pure-function analyzer tests ──────────────────────────────────────
def test_analyze_html_good_page():
    result = analyze_html(GOOD_HTML)
    assert result["score"] > 50
    assert result["title"]["exists"] is True
    assert result["meta_description"]["exists"] is True
    assert result["headings"]["h1_count"] == 1


def test_analyze_html_missing_title():
    html = "<html><head></head><body><p>No title</p></body></html>"
    result = analyze_html(html)
    assert result["title"]["exists"] is False
    assert result["score"] < 50
    assert any("title" in i["message"].lower() for i in result["issues"])


def test_extract_keywords():
    text = "marketing marketing marketing SEO SEO content"
    result = extract_keywords(text)
    assert result[0]["keyword"] == "marketing"
    assert result[0]["count"] == 3


# ── Endpoint tests ────────────────────────────────────────────────────
async def test_analyze_html_endpoint(client, promote):
    """POST /mcp/seo/analyze with html -> 200, returns score + audit_id, persists row."""
    token, uid = await _register(client)
    await promote(uid)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/mcp/seo/analyze",
        json={"html": GOOD_HTML},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "score" in data
    assert "audit_id" in data
    assert isinstance(data["audit_id"], int)

    # Verify persisted via GET /mcp/seo/audits
    audits_resp = await client.get("/mcp/seo/audits", headers=headers)
    assert audits_resp.status_code == 200
    audits = audits_resp.json()
    assert len(audits) == 1
    assert audits[0]["id"] == data["audit_id"]


async def test_analyze_missing_input(client, promote):
    """POST /mcp/seo/analyze with neither url nor html -> 400."""
    token, uid = await _register(client, "missing@example.com")
    await promote(uid)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/mcp/seo/analyze",
        json={},
        headers=headers,
    )
    assert resp.status_code == 400


async def test_keywords_endpoint(client, promote):
    """POST /mcp/seo/keywords with text -> ranked keyword list."""
    token, uid = await _register(client, "kwuser@example.com")
    await promote(uid)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/mcp/seo/keywords",
        json={"text": "marketing marketing marketing SEO SEO content"},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert data[0]["keyword"] == "marketing"
    assert data[0]["count"] == 3


async def test_audits_ownership(client, promote):
    """GET /mcp/seo/audits returns only the caller's audits."""
    token_a, uid_a = await _register(client, "owner_a@example.com")
    token_b, uid_b = await _register(client, "owner_b@example.com")
    await promote(uid_a)
    await promote(uid_b)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates an audit
    await client.post("/mcp/seo/analyze", json={"html": GOOD_HTML}, headers=headers_a)

    # User B should see zero audits
    resp_b = await client.get("/mcp/seo/audits", headers=headers_b)
    assert resp_b.status_code == 200
    assert resp_b.json() == []

    # User A should see one audit
    resp_a = await client.get("/mcp/seo/audits", headers=headers_a)
    assert resp_a.status_code == 200
    assert len(resp_a.json()) == 1


async def test_audit_detail_owner_vs_nonowner(client, promote):
    """GET /mcp/seo/audits/{id} -> 200 for owner, 404 for non-owner."""
    token_a, uid_a = await _register(client, "detail_a@example.com")
    token_b, uid_b = await _register(client, "detail_b@example.com")
    await promote(uid_a)
    await promote(uid_b)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates an audit
    resp = await client.post("/mcp/seo/analyze", json={"html": GOOD_HTML}, headers=headers_a)
    audit_id = resp.json()["audit_id"]

    # Owner can access
    detail_a = await client.get(f"/mcp/seo/audits/{audit_id}", headers=headers_a)
    assert detail_a.status_code == 200
    assert detail_a.json()["id"] == audit_id
    assert detail_a.json()["meta_data"] is not None

    # Non-owner gets 404
    detail_b = await client.get(f"/mcp/seo/audits/{audit_id}", headers=headers_b)
    assert detail_b.status_code == 404
