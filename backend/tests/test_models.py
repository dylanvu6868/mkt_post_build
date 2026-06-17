from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.db import Base
import app.models  # noqa: F401  registers all models on Base.metadata
from app.models.project import Project
from app.models.user import User


async def test_user_and_project_persist_and_relate():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async with maker() as session:
        user = User(name="Alice", email="alice@example.com", password_hash="x")
        session.add(user)
        await session.commit()
        await session.refresh(user)

        project = Project(user_id=user.id, name="Launch")
        session.add(project)
        await session.commit()

        rows = (await session.execute(select(Project).where(Project.user_id == user.id))).scalars().all()
        assert len(rows) == 1
        assert rows[0].name == "Launch"
        assert user.id is not None
        assert user.created_at is not None

    await engine.dispose()
