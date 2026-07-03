"""add landing_leads table for lead/order capture

Revision ID: e1f2a3b4c5d6
Revises: d7e8f9a0b1c2
Create Date: 2026-07-04 10:00:00.000000
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "e1f2a3b4c5d6"
down_revision: str | None = "d7e8f9a0b1c2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "landing_leads",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "landing_page_id",
            sa.Integer(),
            sa.ForeignKey("landing_pages.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column(
            "data",
            sa.JSON().with_variant(postgresql.JSONB(), "postgresql"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_landing_leads_landing_page_id", "landing_leads", ["landing_page_id"])
    op.create_index("ix_landing_leads_user_id", "landing_leads", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_landing_leads_user_id", table_name="landing_leads")
    op.drop_index("ix_landing_leads_landing_page_id", table_name="landing_leads")
    op.drop_table("landing_leads")
