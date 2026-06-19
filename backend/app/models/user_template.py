from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class UserTemplate(Base):
    __tablename__ = "user_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content_type: Mapped[str] = mapped_column(String(50), index=True)
    template_text: Mapped[str] = mapped_column(Text)

    __table_args__ = (
        UniqueConstraint("user_id", "content_type", name="uq_user_content_type"),
    )
