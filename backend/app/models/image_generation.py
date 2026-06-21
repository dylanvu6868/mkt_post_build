from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class ImageGeneration(Base):
    __tablename__ = "image_generations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    prompt: Mapped[str] = mapped_column()
    image_url: Mapped[str] = mapped_column()
    size: Mapped[str] = mapped_column(default="1024x1024")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
