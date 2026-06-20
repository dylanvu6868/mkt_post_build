"""restructure plans: add free tier, migrate legacy lite (free) users to free

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-06-21

The old default tier was "lite" (which was free). The new model makes "free" the
default and "lite" a paid tier (99k). Existing "lite" users never paid, so they
migrate to "free". Users on "pro"/"max" are untouched.
"""
from alembic import op
import sqlalchemy as sa

revision: str = "a7b8c9d0e1f2"
down_revision: str | None = "f6a7b8c9d0e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # New users default to "free".
    op.alter_column(
        "users",
        "plan",
        existing_type=sa.String(20),
        server_default="free",
        existing_nullable=False,
    )
    # Legacy free users were stored as "lite" — move them to the new "free" tier.
    op.execute("UPDATE users SET plan = 'free' WHERE plan = 'lite'")


def downgrade() -> None:
    op.execute("UPDATE users SET plan = 'lite' WHERE plan = 'free'")
    op.alter_column(
        "users",
        "plan",
        existing_type=sa.String(20),
        server_default="lite",
        existing_nullable=False,
    )
