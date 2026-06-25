from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class MetaPage(Base):
    """Cached Facebook/Instagram pages a user manages."""
    __tablename__ = "meta_pages"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    page_id: Mapped[str] = mapped_column(String(128), index=True)  # Facebook page id
    name: Mapped[str] = mapped_column(String(255))
    category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Encrypted page access token (per-page token from Meta)
    access_token_enc: Mapped[str] = mapped_column(String(2048))
    picture_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    followers_count: Mapped[int | None] = mapped_column(nullable=True)
    is_instagram: Mapped[bool] = mapped_column(default=False, server_default="false")
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
