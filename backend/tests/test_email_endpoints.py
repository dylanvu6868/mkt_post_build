import pytest
from app.mcp.email.tokens import make_unsubscribe_token


async def _register(client, email="user@example.com"):
    resp = await client.post(
        "/auth/register",
        json={"name": "User", "email": email, "password": "secret123"},
    )
    return resp.json()["access_token"]


# ── Templates ──────────────────────────────────────────────────────────


async def test_template_crud(client):
    token = await _register(client)
    h = {"Authorization": f"Bearer {token}"}

    # create
    resp = await client.post(
        "/mcp/email/templates",
        json={"name": "Welcome", "subject": "Hi {{name}}", "html_body": "<p>Hello</p>"},
        headers=h,
    )
    assert resp.status_code == 201
    tid = resp.json()["id"]

    # list
    resp = await client.get("/mcp/email/templates", headers=h)
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["name"] == "Welcome"

    # get by id
    resp = await client.get(f"/mcp/email/templates/{tid}", headers=h)
    assert resp.status_code == 200
    assert resp.json()["html_body"] == "<p>Hello</p>"

    # patch
    resp = await client.patch(
        f"/mcp/email/templates/{tid}",
        json={"name": "Welcome v2"},
        headers=h,
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Welcome v2"

    # delete
    resp = await client.delete(f"/mcp/email/templates/{tid}", headers=h)
    assert resp.status_code == 204

    # confirm deleted
    resp = await client.get("/mcp/email/templates", headers=h)
    assert resp.json() == []


async def test_template_ownership_isolation(client):
    token_a = await _register(client, "a@example.com")
    token_b = await _register(client, "b@example.com")
    h_a = {"Authorization": f"Bearer {token_a}"}
    h_b = {"Authorization": f"Bearer {token_b}"}

    resp = await client.post(
        "/mcp/email/templates",
        json={"name": "Secret", "subject": "s", "html_body": "<p>x</p>"},
        headers=h_a,
    )
    tid = resp.json()["id"]

    # user B cannot see user A's template
    resp = await client.get(f"/mcp/email/templates/{tid}", headers=h_b)
    assert resp.status_code == 404


# ── Contacts ───────────────────────────────────────────────────────────


async def test_contact_create_and_list(client):
    token = await _register(client)
    h = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/mcp/email/contacts",
        json={"email": "alice@example.com", "name": "Alice", "tags": ["vip"]},
        headers=h,
    )
    assert resp.status_code == 201
    assert resp.json()["email"] == "alice@example.com"

    resp = await client.get("/mcp/email/contacts", headers=h)
    assert len(resp.json()) == 1


async def test_contact_csv_import(client):
    token = await _register(client)
    h = {"Authorization": f"Bearer {token}"}

    csv_bytes = b"email,name,tags\nbob@ex.com,Bob,vip\ncarl@ex.com,Carl,lead\n"
    resp = await client.post(
        "/mcp/email/contacts/import",
        files={"file": ("c.csv", csv_bytes, "text/csv")},
        headers=h,
    )
    assert resp.status_code == 201
    assert resp.json()["imported"] == 2

    resp = await client.get("/mcp/email/contacts", headers=h)
    assert len(resp.json()) == 2


async def test_contact_filter_by_tag(client):
    token = await _register(client)
    h = {"Authorization": f"Bearer {token}"}

    await client.post("/mcp/email/contacts", json={"email": "a@ex.com", "tags": ["vip"]}, headers=h)
    await client.post("/mcp/email/contacts", json={"email": "b@ex.com", "tags": ["lead"]}, headers=h)

    resp = await client.get("/mcp/email/contacts?tag=vip", headers=h)
    assert len(resp.json()) == 1
    assert resp.json()[0]["email"] == "a@ex.com"


async def test_contact_filter_by_status(client):
    token = await _register(client)
    h = {"Authorization": f"Bearer {token}"}

    resp = await client.post("/mcp/email/contacts", json={"email": "a@ex.com"}, headers=h)
    cid = resp.json()["id"]

    # default status is "active"
    resp = await client.get("/mcp/email/contacts?status=active", headers=h)
    assert len(resp.json()) == 1

    # update to unsubscribed
    await client.patch(f"/mcp/email/contacts/{cid}", json={"status": "unsubscribed"}, headers=h)
    resp = await client.get("/mcp/email/contacts?status=active", headers=h)
    assert len(resp.json()) == 0

    resp = await client.get("/mcp/email/contacts?status=unsubscribed", headers=h)
    assert len(resp.json()) == 1


# ── Lists ──────────────────────────────────────────────────────────────


async def test_list_crud_with_contacts(client):
    token = await _register(client)
    h = {"Authorization": f"Bearer {token}"}

    # create contacts
    r1 = await client.post("/mcp/email/contacts", json={"email": "x@ex.com"}, headers=h)
    r2 = await client.post("/mcp/email/contacts", json={"email": "y@ex.com"}, headers=h)
    cid1, cid2 = r1.json()["id"], r2.json()["id"]

    # create list
    resp = await client.post(
        "/mcp/email/lists", json={"name": "Newsletter"}, headers=h
    )
    assert resp.status_code == 201
    lid = resp.json()["id"]

    # add contacts
    resp = await client.post(
        f"/mcp/email/lists/{lid}/contacts",
        json={"contact_ids": [cid1, cid2]},
        headers=h,
    )
    assert resp.status_code == 200

    # list shows correct contact_count
    resp = await client.get("/mcp/email/lists", headers=h)
    assert resp.json()[0]["contact_count"] == 2

    # remove one contact
    resp = await client.request(
        "DELETE",
        f"/mcp/email/lists/{lid}/contacts",
        json={"contact_ids": [cid1]},
        headers=h,
    )
    assert resp.status_code == 200

    resp = await client.get("/mcp/email/lists", headers=h)
    assert resp.json()[0]["contact_count"] == 1

    # delete list
    resp = await client.delete(f"/mcp/email/lists/{lid}", headers=h)
    assert resp.status_code == 204


# ── Scheduling ─────────────────────────────────────────────────────────


async def _create_template_and_list(client, headers):
    """Helper: create a template and a list, return (template_id, list_id)."""
    t = await client.post(
        "/mcp/email/templates",
        json={"name": "T", "subject": "S", "html_body": "<p>b</p>"},
        headers=headers,
    )
    l = await client.post("/mcp/email/lists", json={"name": "L"}, headers=headers)
    return t.json()["id"], l.json()["id"]


async def test_schedule_and_cancel(client):
    token = await _register(client)
    h = {"Authorization": f"Bearer {token}"}
    tid, lid = await _create_template_and_list(client, h)

    # schedule
    resp = await client.post(
        "/mcp/email/schedule",
        json={"template_id": tid, "list_id": lid, "scheduled_at": "2099-01-01T00:00:00Z"},
        headers=h,
    )
    assert resp.status_code == 201
    sid = resp.json()["id"]
    assert resp.json()["status"] == "pending"

    # list scheduled
    resp = await client.get("/mcp/email/scheduled", headers=h)
    assert len(resp.json()) == 1

    # cancel
    resp = await client.post(
        f"/mcp/email/cancel-schedule?schedule_id={sid}", headers=h
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"


async def test_schedule_nonexistent_template_404(client):
    token = await _register(client)
    h = {"Authorization": f"Bearer {token}"}
    _, lid = await _create_template_and_list(client, h)

    resp = await client.post(
        "/mcp/email/schedule",
        json={"template_id": 99999, "list_id": lid, "scheduled_at": "2099-01-01T00:00:00Z"},
        headers=h,
    )
    assert resp.status_code == 404


async def test_schedule_nonexistent_list_404(client):
    token = await _register(client)
    h = {"Authorization": f"Bearer {token}"}
    tid, _ = await _create_template_and_list(client, h)

    resp = await client.post(
        "/mcp/email/schedule",
        json={"template_id": tid, "list_id": 99999, "scheduled_at": "2099-01-01T00:00:00Z"},
        headers=h,
    )
    assert resp.status_code == 404


async def test_cancel_non_pending_returns_400(client):
    token = await _register(client)
    h = {"Authorization": f"Bearer {token}"}
    tid, lid = await _create_template_and_list(client, h)

    resp = await client.post(
        "/mcp/email/schedule",
        json={"template_id": tid, "list_id": lid, "scheduled_at": "2099-01-01T00:00:00Z"},
        headers=h,
    )
    sid = resp.json()["id"]

    # cancel once
    await client.post(f"/mcp/email/cancel-schedule?schedule_id={sid}", headers=h)

    # cancel again -> 400
    resp = await client.post(
        f"/mcp/email/cancel-schedule?schedule_id={sid}", headers=h
    )
    assert resp.status_code == 400


# ── Regression: unsubscribe duplicate email across users ──────────────


async def test_unsubscribe_valid_token(client):
    """Valid HMAC token for an existing contact sets status = 'unsubscribed'."""
    token = await _register(client, "owner@example.com")
    h = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/mcp/email/contacts", json={"email": "sub@example.com"}, headers=h
    )
    assert resp.status_code == 201
    contact_id = resp.json()["id"]

    unsubscribe_token = make_unsubscribe_token(contact_id)
    resp = await client.post(f"/mcp/email/unsubscribe/{unsubscribe_token}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "unsubscribed"


async def test_unsubscribe_invalid_token_returns_400(client):
    """A tampered / garbage token must return 400."""
    resp = await client.post("/mcp/email/unsubscribe/notavalidtoken")
    assert resp.status_code == 400


async def test_unsubscribe_valid_token_nonexistent_contact_returns_404(client):
    """A valid (signed) token for a contact_id that doesn't exist → 404."""
    # contact_id 999999 almost certainly doesn't exist in the in-memory DB
    unsubscribe_token = make_unsubscribe_token(999999)
    resp = await client.post(f"/mcp/email/unsubscribe/{unsubscribe_token}")
    assert resp.status_code == 404


# ── Regression: add same contact to list twice is idempotent ──────────


async def test_add_same_contact_twice_is_idempotent(client):
    """Duplicate insert into composite-PK table raised IntegrityError (500)."""
    token = await _register(client)
    h = {"Authorization": f"Bearer {token}"}

    # Create a contact and a list
    r = await client.post("/mcp/email/contacts", json={"email": "c@ex.com"}, headers=h)
    cid = r.json()["id"]
    r = await client.post("/mcp/email/lists", json={"name": "L"}, headers=h)
    lid = r.json()["id"]

    # First add
    resp = await client.post(
        f"/mcp/email/lists/{lid}/contacts",
        json={"contact_ids": [cid]},
        headers=h,
    )
    assert resp.status_code == 200
    assert resp.json()["added"] == 1

    # Second add — must NOT 500, should be a no-op
    resp = await client.post(
        f"/mcp/email/lists/{lid}/contacts",
        json={"contact_ids": [cid]},
        headers=h,
    )
    assert resp.status_code == 200
    assert resp.json()["added"] == 0  # already present, nothing new added

    # contact_count must be 1, not 2
    resp = await client.get("/mcp/email/lists", headers=h)
    assert resp.json()[0]["contact_count"] == 1
