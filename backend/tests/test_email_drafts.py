"""Tests for Vitba Mail Builder drafts (autosave) and unified history."""


async def _register(client, email="draft@example.com", promote=None, plan="pro"):
    resp = await client.post(
        "/auth/register",
        json={"name": "Draft", "email": email, "password": "secret123"},
    )
    data = resp.json()
    if promote is not None:
        await promote(data["user"]["id"], plan)
    return data["access_token"]


async def test_drafts_require_auth(client):
    resp = await client.get("/mcp/email/builder/drafts")
    assert resp.status_code in (401, 403)


async def test_draft_crud_flow(client, promote):
    token = await _register(client, promote=promote)
    headers = {"Authorization": f"Bearer {token}"}

    # Create
    resp = await client.post(
        "/mcp/email/builder/drafts",
        json={
            "subject": "Email chào mừng",
            "html_body": "<!DOCTYPE html><html><body>Xin chào</body></html>",
            "meta": {"purpose": "Email chào mừng khách mới"},
        },
        headers=headers,
    )
    assert resp.status_code == 201
    draft = resp.json()
    assert draft["subject"] == "Email chào mừng"
    assert draft["html_body"].startswith("<!DOCTYPE html>")
    draft_id = draft["id"]

    # List (no html_body for lightness)
    resp = await client.get("/mcp/email/builder/drafts", headers=headers)
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["id"] == draft_id
    assert "html_body" not in items[0]

    # Update
    resp = await client.patch(
        f"/mcp/email/builder/drafts/{draft_id}",
        json={"html_body": "<!DOCTYPE html><html><body>Đã sửa</body></html>"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert "Đã sửa" in resp.json()["html_body"]

    # Get single
    resp = await client.get(f"/mcp/email/builder/drafts/{draft_id}", headers=headers)
    assert resp.status_code == 200
    assert "Đã sửa" in resp.json()["html_body"]

    # Delete
    resp = await client.delete(f"/mcp/email/builder/drafts/{draft_id}", headers=headers)
    assert resp.status_code == 204
    resp = await client.get("/mcp/email/builder/drafts", headers=headers)
    assert resp.json() == []


async def test_draft_owner_isolation(client, promote):
    token_a = await _register(client, "owner-a@example.com", promote=promote)
    token_b = await _register(client, "owner-b@example.com", promote=promote)
    ha = {"Authorization": f"Bearer {token_a}"}
    hb = {"Authorization": f"Bearer {token_b}"}

    resp = await client.post(
        "/mcp/email/builder/drafts",
        json={"subject": "Của A", "html_body": "<p>a</p>"},
        headers=ha,
    )
    draft_id = resp.json()["id"]

    # B cannot see or touch A's draft
    assert (await client.get(f"/mcp/email/builder/drafts/{draft_id}", headers=hb)).status_code == 404
    assert (
        await client.patch(f"/mcp/email/builder/drafts/{draft_id}", json={"subject": "hack"}, headers=hb)
    ).status_code == 404
    assert (await client.delete(f"/mcp/email/builder/drafts/{draft_id}", headers=hb)).status_code == 404
    assert (await client.get("/mcp/email/builder/drafts", headers=hb)).json() == []


async def test_draft_prune_keeps_newest_10(client, promote):
    token = await _register(client, "prune@example.com", promote=promote)
    headers = {"Authorization": f"Bearer {token}"}
    for i in range(12):
        resp = await client.post(
            "/mcp/email/builder/drafts",
            json={"subject": f"Draft {i}", "html_body": "<p>x</p>"},
            headers=headers,
        )
        assert resp.status_code == 201
    items = (await client.get("/mcp/email/builder/drafts", headers=headers)).json()
    assert len(items) == 10
    subjects = {i["subject"] for i in items}
    assert "Draft 0" not in subjects and "Draft 1" not in subjects
    assert "Draft 11" in subjects


async def test_unified_history(client, promote):
    token = await _register(client, "unified@example.com", promote=promote)
    headers = {"Authorization": f"Bearer {token}"}

    # Requires auth
    assert (await client.get("/history/unified")).status_code in (401, 403)

    # Seed: one email draft + one landing page
    await client.post(
        "/mcp/email/builder/drafts",
        json={"subject": "Nháp unified", "html_body": "<p>u</p>", "meta": {"purpose": "test"}},
        headers=headers,
    )
    resp = await client.post(
        "/mcp/landing/pages",
        json={"title": "Trang unified", "slug": "trang-unified", "html_content": "<h1>hi</h1>"},
        headers=headers,
    )
    assert resp.status_code == 201
    page_id = resp.json()["id"]

    resp = await client.get("/history/unified", headers=headers)
    assert resp.status_code == 200
    items = resp.json()
    sources = {i["source"] for i in items}
    assert "email" in sources and "landing" in sources

    landing_item = next(i for i in items if i["source"] == "landing")
    assert landing_item["title"] == "Trang unified"
    assert landing_item["route"] == f"/hub/landing?open={page_id}"
    assert landing_item["status"] == "draft"

    email_item = next(i for i in items if i["source"] == "email")
    assert email_item["title"] == "Nháp unified"
    assert email_item["route"].startswith("/hub/email?draft=")

    # Source filter
    only_landing = (await client.get("/history/unified?source=landing", headers=headers)).json()
    assert {i["source"] for i in only_landing} == {"landing"}
