from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class OauthAccount(Base):
    """Stores encrypted OAuth tokens for third-party providers (Meta, Google, GitHub, Vercel)."""
    __tablename__ = "oauth_accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(50), index=True)  # "meta" | "google" | "github" | "vercel"
    provider_user_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # AES-256 encrypted access token (use app.core.encryption.encrypt_token/decrypt_token)
    access_token_enc: Mapped[str] = mapped_column(String(2048))
    refresh_token_enc: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    scopes: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
