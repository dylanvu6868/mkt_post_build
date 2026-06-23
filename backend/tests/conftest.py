import os

os.environ.setdefault("ENVIRONMENT", "test")

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  register models on Base.metadata
from app.core.db import Base, get_session, get_session_maker
from app.main import app


@pytest_asyncio.fixture
async def session_maker():
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


@pytest_asyncio.fixture
async def client(session_maker):
    async def override_get_session():
        async with session_maker() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_session_maker] = lambda: session_maker
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def promote(session_maker):
    async def _promote(user_id: int, plan: str = "max"):
        from datetime import datetime, timedelta, timezone
        from app.models.user import User
        async with session_maker() as s:
            u = await s.get(User, user_id)
            u.plan = plan
            u.plan_expires_at = datetime.now(timezone.utc) + timedelta(days=365)
            await s.commit()
    return _promote
