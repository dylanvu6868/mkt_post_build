from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class ContentHistory(Base):
    __tablename__ = "content_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    content_type: Mapped[str] = mapped_column(String(50))
    prompt: Mapped[str] = mapped_column(Text)
    output: Mapped[dict[str, Any] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
