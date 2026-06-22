from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class MetaPage(Base):
    __tablename__ = "meta_pages"
    __table_args__ = (UniqueConstraint("user_id", "page_id", name="uq_user_page"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    page_id: Mapped[str] = mapped_column(String(100))
    page_name: Mapped[str | None] = mapped_column(String(255))
    page_access_token_enc: Mapped[str] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(100))
    followers_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
