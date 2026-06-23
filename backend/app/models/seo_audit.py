from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class SeoAudit(Base):
    __tablename__ = "seo_audits"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    score: Mapped[int] = mapped_column(Integer, default=0)
    issues: Mapped[list[Any] | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    suggestions: Mapped[list[Any] | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    meta_data: Mapped[dict[str, Any] | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
