from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

email_list_contacts = Table(
    "email_list_contacts",
    Base.metadata,
    Column("list_id", Integer, ForeignKey("email_lists.id", ondelete="CASCADE"), primary_key=True),
    Column("contact_id", Integer, ForeignKey("email_contacts.id", ondelete="CASCADE"), primary_key=True),
)


class EmailList(Base):
    __tablename__ = "email_lists"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
