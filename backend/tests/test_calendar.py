import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.db import Base
import app.models  # noqa: F401
from app.models.user import User
from app.models.content_item import ContentItem


# ---------------------------------------------------------------------------
# Model-level tests (per-test in-memory engine, no HTTP)
# ---------------------------------------------------------------------------

@pytest.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as session:
        user = User(name="Test", email="test@example.com", password_hash="x")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        yield session, user
    await engine.dispose()


async def test_content_item_crud(db):
    session, user = db
    item = ContentItem(
        title="Blog post #1", content_type="blog", body="Content here",
        status="draft", tags=["seo", "marketing"], user_id=user.id,
    )
    session.add(item)
    await session.commit()
    rows = (await session.execute(select(ContentItem).where(ContentItem.user_id == user.id))).scalars().all()
    assert len(rows) == 1
    assert rows[0].status == "draft"
    assert "seo" in rows[0].tags


async def test_status_transition(db):
    session, user = db
    item = ContentItem(title="T", content_type="social", body="B", user_id=user.id)
    session.add(item)
    await session.commit()
    assert item.status == "draft"
    item.status = "review"
    await session.commit()
    assert item.status == "review"


# ---------------------------------------------------------------------------
# Endpoint tests (use `client` fixture from conftest)
# ---------------------------------------------------------------------------

async def _register(client, email="caluser@example.com"):
    resp = await client.post(
        "/auth/register",
        json={"name": "CalUser", "email": email, "password": "secret123"},
    )
    assert resp.status_code == 201
    data = resp.json()
    return data["access_token"], data["user"]["id"]


async def _create_item(client, headers, **overrides):
    payload = {"title": "Blog post", "content_type": "blog", "body": "Hello world"}
    payload.update(overrides)
    resp = await client.post("/mcp/calendar/items", json=payload, headers=headers)
    return resp


# -- CRUD + ownership -------------------------------------------------------

async def test_create_list_get(client, promote):
    token, uid = await _register(client)
    await promote(uid)
    headers = {"Authorization": f"Bearer {token}"}

    # create
    resp = await _create_item(client, headers)
    assert resp.status_code == 201
    item_id = resp.json()["id"]
    assert resp.json()["status"] == "draft"

    # list
    listing = await client.get("/mcp/calendar/items", headers=headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1
    assert listing.json()[0]["id"] == item_id

    # get by id
    detail = await client.get(f"/mcp/calendar/items/{item_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["title"] == "Blog post"


async def test_ownership_isolation(client, promote):
    token_a, uid_a = await _register(client, "owner_a@example.com")
    token_b, uid_b = await _register(client, "owner_b@example.com")
    await promote(uid_a)
    await promote(uid_b)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    resp = await _create_item(client, headers_a, title="A's item")
    item_id = resp.json()["id"]

    # user B cannot see user A's item
    detail = await client.get(f"/mcp/calendar/items/{item_id}", headers=headers_b)
    assert detail.status_code == 404


# -- Status transitions -----------------------------------------------------

async def test_status_valid_transition(client, promote):
    token, uid = await _register(client, "transition@example.com")
    await promote(uid)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await _create_item(client, headers)
    item_id = resp.json()["id"]

    # draft -> review (valid)
    patch = await client.patch(
        f"/mcp/calendar/items/{item_id}/status",
        json={"status": "review"},
        headers=headers,
    )
    assert patch.status_code == 200
    assert patch.json()["status"] == "review"


async def test_status_invalid_transition(client, promote):
    token, uid = await _register(client, "badtrans@example.com")
    await promote(uid)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await _create_item(client, headers)
    item_id = resp.json()["id"]

    # draft -> published (invalid, must go through review+approved first)
    patch = await client.patch(
        f"/mcp/calendar/items/{item_id}/status",
        json={"status": "published"},
        headers=headers,
    )
    assert patch.status_code == 400


async def test_status_unknown_value(client, promote):
    token, uid = await _register(client, "unknown@example.com")
    await promote(uid)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await _create_item(client, headers)
    item_id = resp.json()["id"]

    patch = await client.patch(
        f"/mcp/calendar/items/{item_id}/status",
        json={"status": "nonexistent"},
        headers=headers,
    )
    assert patch.status_code == 400


async def test_archived_is_terminal(client, promote):
    token, uid = await _register(client, "archived@example.com")
    await promote(uid)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await _create_item(client, headers)
    item_id = resp.json()["id"]

    # draft -> archived (valid)
    first = await client.patch(
        f"/mcp/calendar/items/{item_id}/status",
        json={"status": "archived"},
        headers=headers,
    )
    assert first.status_code == 200
    # archived -> draft (invalid, archived is terminal)
    patch = await client.patch(
        f"/mcp/calendar/items/{item_id}/status",
        json={"status": "draft"},
        headers=headers,
    )
    assert patch.status_code == 400


# -- Overview ---------------------------------------------------------------

async def test_overview(client, promote):
    token, uid = await _register(client, "overview@example.com")
    await promote(uid)
    headers = {"Authorization": f"Bearer {token}"}

    await _create_item(client, headers, title="A", content_type="blog")
    await _create_item(client, headers, title="B", content_type="social")
    resp2 = await _create_item(client, headers, title="C", content_type="blog")
    # move one to review
    item_c_id = resp2.json()["id"]
    await client.patch(
        f"/mcp/calendar/items/{item_c_id}/status",
        json={"status": "review"},
        headers=headers,
    )

    ov = await client.get("/mcp/calendar/overview", headers=headers)
    assert ov.status_code == 200
    data = ov.json()
    assert data["total"] == 3
    assert data["by_status"]["draft"] == 2
    assert data["by_status"]["review"] == 1
    assert data["by_type"]["blog"] == 2
    assert data["by_type"]["social"] == 1


# -- Filters ----------------------------------------------------------------

async def test_filter_by_status(client, promote):
    token, uid = await _register(client, "filterstatus@example.com")
    await promote(uid)
    headers = {"Authorization": f"Bearer {token}"}

    await _create_item(client, headers, title="Draft1")
    resp2 = await _create_item(client, headers, title="Review1")
    item_id = resp2.json()["id"]
    await client.patch(
        f"/mcp/calendar/items/{item_id}/status",
        json={"status": "review"},
        headers=headers,
    )

    listing = await client.get("/mcp/calendar/items?status=draft", headers=headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1
    assert listing.json()[0]["title"] == "Draft1"


async def test_filter_by_content_type(client, promote):
    token, uid = await _register(client, "filtertype@example.com")
    await promote(uid)
    headers = {"Authorization": f"Bearer {token}"}

    await _create_item(client, headers, title="Blog1", content_type="blog")
    await _create_item(client, headers, title="Social1", content_type="social")

    listing = await client.get("/mcp/calendar/items?content_type=social", headers=headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1
    assert listing.json()[0]["title"] == "Social1"


# -- Delete -----------------------------------------------------------------

async def test_delete_then_get_404(client, promote):
    token, uid = await _register(client, "deleter@example.com")
    await promote(uid)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await _create_item(client, headers)
    item_id = resp.json()["id"]

    delete = await client.delete(f"/mcp/calendar/items/{item_id}", headers=headers)
    assert delete.status_code == 204

    get = await client.get(f"/mcp/calendar/items/{item_id}", headers=headers)
    assert get.status_code == 404


# -- Ownership mutation tests (Fix 1) -----------------------------------------

async def test_patch_ownership_404(client, promote):
    token_a, uid_a = await _register(client, "patch_owner_a@example.com")
    token_b, uid_b = await _register(client, "patch_owner_b@example.com")
    await promote(uid_a)
    await promote(uid_b)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    resp = await _create_item(client, headers_a, title="A's protected item")
    item_id = resp.json()["id"]

    # user B cannot PATCH user A's item fields
    patch_fields = await client.patch(
        f"/mcp/calendar/items/{item_id}",
        json={"title": "hacked"},
        headers=headers_b,
    )
    assert patch_fields.status_code == 404

    # user B cannot PATCH user A's item status
    patch_status = await client.patch(
        f"/mcp/calendar/items/{item_id}/status",
        json={"status": "review"},
        headers=headers_b,
    )
    assert patch_status.status_code == 404


async def test_delete_ownership_404(client, promote):
    token_a, uid_a = await _register(client, "del_owner_a@example.com")
    token_b, uid_b = await _register(client, "del_owner_b@example.com")
    await promote(uid_a)
    await promote(uid_b)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    resp = await _create_item(client, headers_a, title="A's undeletable item")
    item_id = resp.json()["id"]

    # user B cannot DELETE user A's item
    delete = await client.delete(f"/mcp/calendar/items/{item_id}", headers=headers_b)
    assert delete.status_code == 404

    # confirm user A can still GET the item -- it was NOT deleted
    get = await client.get(f"/mcp/calendar/items/{item_id}", headers=headers_a)
    assert get.status_code == 200
    assert get.json()["title"] == "A's undeletable item"


# -- published_date tests (Fix 2) ---------------------------------------------

async def test_published_date_stamped(client, promote):
    token, uid = await _register(client, "pubdate@example.com")
    await promote(uid)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await _create_item(client, headers, title="Publish me")
    item_id = resp.json()["id"]

    # non-published item should have published_date = None
    detail = await client.get(f"/mcp/calendar/items/{item_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["published_date"] is None

    # walk the full chain: draft -> review -> approved -> published
    for target_status in ("review", "approved", "published"):
        step = await client.patch(
            f"/mcp/calendar/items/{item_id}/status",
            json={"status": target_status},
            headers=headers,
        )
        assert step.status_code == 200

    # now GET and confirm published_date is stamped
    detail2 = await client.get(f"/mcp/calendar/items/{item_id}", headers=headers)
    assert detail2.status_code == 200
    assert detail2.json()["published_date"] is not None
