from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.plan_limits import get_history_retention_days
from app.models.content_history import ContentHistory
from app.models.project import Project
from app.models.user import User


async def save_to_history(
    session: AsyncSession,
    project_id: int,
    content_type: str,
    prompt: str,
    output: dict[str, Any],
    score: float | None = None,
) -> ContentHistory:
    entry = ContentHistory(
        project_id=project_id,
        content_type=content_type,
        prompt=prompt,
        output=output,
        score=score,
    )
    session.add(entry)
    await session.commit()
    await session.refresh(entry)
    return entry


async def list_history(
    session: AsyncSession, project_id: int, user_id: int, user: User
) -> list[ContentHistory]:
    query = (
        select(ContentHistory)
        .join(Project, ContentHistory.project_id == Project.id)
        .where(ContentHistory.project_id == project_id, Project.user_id == user_id)
    )
    retention_days = get_history_retention_days(user)
    if retention_days is not None:
        cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
        query = query.where(ContentHistory.created_at >= cutoff)

    result = await session.execute(query.order_by(ContentHistory.created_at.desc()))
    return list(result.scalars().all())


async def delete_history(
    session: AsyncSession, history_id: int, user_id: int
) -> bool:
    result = await session.execute(
        select(ContentHistory)
        .join(Project, ContentHistory.project_id == Project.id)
        .where(ContentHistory.id == history_id, Project.user_id == user_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        return False
    await session.delete(entry)
    await session.commit()
    return True
