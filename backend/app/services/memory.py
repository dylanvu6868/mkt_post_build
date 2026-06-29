"""Session memory — persists key context across requests per user+conversation.

Stores agent preferences, extracted facts, and conversation summaries
so the AI can remember context between sessions without re-asking.
"""

from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, DateTime, func, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import select, delete

from app.core.db import Base, async_session_maker


class SessionMemory(Base):
    __tablename__ = "session_memory"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    conversation_id: Mapped[int | None] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), nullable=True)
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="general")  # preference, fact, summary, context
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


async def save_memory(
    user_id: int,
    key: str,
    value: str,
    category: str = "general",
    conversation_id: int | None = None,
) -> None:
    """Save or update a memory entry (upsert by user_id + key)."""
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    async with async_session_maker() as session:
        stmt = pg_insert(SessionMemory).values(
            user_id=user_id,
            conversation_id=conversation_id,
            key=key,
            value=value,
            category=category,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["user_id", "key"],
            set_={"value": value, "category": category, "updated_at": func.now(), "is_active": True},
        )
        await session.execute(stmt)
        await session.commit()


async def get_memory(user_id: int, key: str | None = None) -> dict[str, str]:
    """Get memory entries for a user. If key is specified, return only that entry."""
    async with async_session_maker() as session:
        stmt = select(SessionMemory).where(
            SessionMemory.user_id == user_id,
            SessionMemory.is_active == True,  # noqa: E712
        )
        if key:
            stmt = stmt.where(SessionMemory.key == key)
        result = await session.execute(stmt)
        rows = result.scalars().all()
        return {r.key: r.value for r in rows}


async def get_memory_context(user_id: int, conversation_id: int | None = None) -> str:
    """Get formatted memory context for injection into system prompt."""
    memories = await get_memory(user_id)
    if not memories:
        return ""

    parts = []
    for k, v in memories.items():
        parts.append(f"- {k}: {v}")
    return "\n".join(parts)


async def delete_memory(user_id: int, key: str) -> None:
    """Deactivate a memory entry."""
    async with async_session_maker() as session:
        await session.execute(
            delete(SessionMemory).where(
                SessionMemory.user_id == user_id,
                SessionMemory.key == key,
            )
        )
        await session.commit()
