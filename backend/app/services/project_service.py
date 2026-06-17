from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project


async def create_project(session: AsyncSession, user_id: int, name: str) -> Project:
    project = Project(user_id=user_id, name=name)
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


async def list_projects(session: AsyncSession, user_id: int) -> list[Project]:
    result = await session.execute(
        select(Project)
        .where(Project.user_id == user_id)
        .order_by(Project.created_at.desc())
    )
    return list(result.scalars().all())
