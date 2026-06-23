import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.db import Base
import app.models  # noqa: F401
from app.models.user import User
from app.models.landing_page import LandingPage


# ── Helper ────────────────────────────────────────────────────────────


async def _register(client, email="landing@example.com"):
    resp = await client.post(
        "/auth/register",
        json={"name": "User", "email": email, "password": "secret123"},
    )
    return resp.json()["access_token"]


# ── Model unit test ───────────────────────────────────────────────────


@pytest.fixture
async def db():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
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


async def test_landing_page_crud(db):
    session, user = db
    page = LandingPage(
        title="Product Launch",
        slug="product-launch",
        html_content="<h1>Launch</h1>",
        css_content="h1{color:red}",
        user_id=user.id,
    )
    session.add(page)
    await session.commit()
    rows = (
        await session.execute(
            select(LandingPage).where(LandingPage.user_id == user.id)
        )
    ).scalars().all()
    assert len(rows) == 1
    assert rows[0].slug == "product-launch"
    assert rows[0].status == "draft"


# ── Endpoint tests ────────────────────────────────────────────────────


async def test_create_list_get(client):
    """Create a page, list pages, get by id."""
    token = await _register(client, "create@example.com")
    h = {"Authorization": f"Bearer {token}"}

    # create
    resp = await client.post(
        "/mcp/landing/pages",
        json={"title": "My Page", "slug": "my-page", "html_content": "<h1>Hi</h1>"},
        headers=h,
    )
    assert resp.status_code == 201
    pid = resp.json()["id"]
    assert resp.json()["slug"] == "my-page"

    # list
    resp = await client.get("/mcp/landing/pages", headers=h)
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["title"] == "My Page"

    # get by id
    resp = await client.get(f"/mcp/landing/pages/{pid}", headers=h)
    assert resp.status_code == 200
    assert resp.json()["html_content"] == "<h1>Hi</h1>"


async def test_duplicate_slug_400(client):
    """Creating a second page with the same slug returns 400."""
    token = await _register(client, "dup@example.com")
    h = {"Authorization": f"Bearer {token}"}

    await client.post(
        "/mcp/landing/pages",
        json={"title": "P1", "slug": "dup-slug", "html_content": "<p>1</p>"},
        headers=h,
    )
    resp = await client.post(
        "/mcp/landing/pages",
        json={"title": "P2", "slug": "dup-slug", "html_content": "<p>2</p>"},
        headers=h,
    )
    assert resp.status_code == 400


async def test_ownership_isolation(client):
    """User B cannot GET/PATCH/DELETE user A's page."""
    token_a = await _register(client, "owner_a@lp.com")
    token_b = await _register(client, "owner_b@lp.com")
    h_a = {"Authorization": f"Bearer {token_a}"}
    h_b = {"Authorization": f"Bearer {token_b}"}

    resp = await client.post(
        "/mcp/landing/pages",
        json={"title": "Secret", "slug": "secret-page", "html_content": "<p>x</p>"},
        headers=h_a,
    )
    pid = resp.json()["id"]

    # user B cannot see it
    assert (await client.get(f"/mcp/landing/pages/{pid}", headers=h_b)).status_code == 404
    # user B cannot patch it
    assert (await client.patch(f"/mcp/landing/pages/{pid}", json={"title": "Hacked"}, headers=h_b)).status_code == 404
    # user B cannot delete it
    assert (await client.delete(f"/mcp/landing/pages/{pid}", headers=h_b)).status_code == 404
    # user B cannot publish it
    assert (await client.patch(f"/mcp/landing/pages/{pid}/publish", headers=h_b)).status_code == 404
    # user B cannot export it
    assert (await client.get(f"/mcp/landing/pages/{pid}/export", headers=h_b)).status_code == 404


async def test_publish_and_public_serve(client):
    """Publish a page, then fetch it via the public /p/{slug} route (no auth)."""
    token = await _register(client, "pub@example.com")
    h = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/mcp/landing/pages",
        json={"title": "Public", "slug": "pub-page", "html_content": "<h1>Welcome</h1>"},
        headers=h,
    )
    pid = resp.json()["id"]

    # before publishing, public route returns 404
    resp = await client.get("/p/pub-page")
    assert resp.status_code == 404

    # publish
    resp = await client.patch(f"/mcp/landing/pages/{pid}/publish", headers=h)
    assert resp.status_code == 200
    assert resp.json()["status"] == "published"

    # now public route returns 200 with html
    resp = await client.get("/p/pub-page")
    assert resp.status_code == 200
    assert "<h1>Welcome</h1>" in resp.text


async def test_unpublished_slug_public_404(client):
    """A draft page is NOT served via the public route."""
    token = await _register(client, "draft@example.com")
    h = {"Authorization": f"Bearer {token}"}

    await client.post(
        "/mcp/landing/pages",
        json={"title": "Draft", "slug": "draft-page", "html_content": "<p>wip</p>"},
        headers=h,
    )
    resp = await client.get("/p/draft-page")
    assert resp.status_code == 404


async def test_preview(client):
    """POST /mcp/landing/preview returns rendered HTML."""
    token = await _register(client, "preview@example.com")
    h = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/mcp/landing/preview",
        json={"html_content": "<h1>Preview</h1>", "css_content": "h1{color:blue}"},
        headers=h,
    )
    assert resp.status_code == 200
    assert "<h1>Preview</h1>" in resp.text
    assert "h1{color:blue}" in resp.text


async def test_export(client):
    """GET /mcp/landing/pages/{id}/export returns HTML with Content-Disposition."""
    token = await _register(client, "export@example.com")
    h = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/mcp/landing/pages",
        json={"title": "Export Me", "slug": "export-page", "html_content": "<p>export</p>"},
        headers=h,
    )
    pid = resp.json()["id"]

    resp = await client.get(f"/mcp/landing/pages/{pid}/export", headers=h)
    assert resp.status_code == 200
    assert "export-page" in resp.headers["content-disposition"]
    assert "<p>export</p>" in resp.text


async def test_generate_no_provider_503(client, monkeypatch):
    """When LLM provider is unavailable, generate returns 503."""
    token = await _register(client, "gen503@example.com")
    h = {"Authorization": f"Bearer {token}"}

    import app.llm.factory as factory_mod
    monkeypatch.setattr(factory_mod, "provider_available", lambda: False)

    resp = await client.post(
        "/mcp/landing/generate",
        json={"purpose": "launch", "product": "Widget", "tone": "casual", "cta": "Buy now"},
        headers=h,
    )
    assert resp.status_code == 503


async def test_generate_success_mocked(client, monkeypatch):
    """Happy path: mocked LLM returns HTML; endpoint returns it."""
    token = await _register(client, "gen200@example.com")
    h = {"Authorization": f"Bearer {token}"}

    import app.llm.factory as factory_mod

    monkeypatch.setattr(factory_mod, "provider_available", lambda: True)

    fake_response = MagicMock()
    fake_response.content = "<html><body>Generated</body></html>"

    fake_llm = MagicMock()
    fake_llm.ainvoke = AsyncMock(return_value=fake_response)

    monkeypatch.setattr(factory_mod, "get_chat_model", lambda tier: fake_llm)

    resp = await client.post(
        "/mcp/landing/generate",
        json={"purpose": "launch", "product": "Widget", "tone": "casual", "cta": "Buy now"},
        headers=h,
    )
    assert resp.status_code == 200
    assert resp.json()["html"] == "<html><body>Generated</body></html>"


async def test_delete_page(client):
    """Delete a page and confirm it's gone."""
    token = await _register(client, "del@example.com")
    h = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/mcp/landing/pages",
        json={"title": "Gone", "slug": "gone-page", "html_content": "<p>bye</p>"},
        headers=h,
    )
    pid = resp.json()["id"]

    resp = await client.delete(f"/mcp/landing/pages/{pid}", headers=h)
    assert resp.status_code == 204

    resp = await client.get(f"/mcp/landing/pages/{pid}", headers=h)
    assert resp.status_code == 404
