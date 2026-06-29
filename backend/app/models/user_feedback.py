from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class UserFeedback(Base):
    __tablename__ = "user_feedback"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message_id: Mapped[int | None] = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"), nullable=True)
    content_history_id: Mapped[int | None] = mapped_column(ForeignKey("content_history.id", ondelete="CASCADE"), nullable=True)
    rating: Mapped[str] = mapped_column(String(10), nullable=False)  # "up" or "down"
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)  # "accuracy", "quality", "speed", "other"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
