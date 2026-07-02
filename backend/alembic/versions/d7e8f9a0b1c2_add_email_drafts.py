"""add email_drafts table for Vitba Mail Builder autosave

Revision ID: d7e8f9a0b1c2
Revises: generate_idx_gen_jobs_created_at
Create Date: 2026-07-02 12:00:00.000000
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "d7e8f9a0b1c2"
down_revision: str | None = "generate_idx_gen_jobs_created_at"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "email_drafts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("subject", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("html_body", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "meta",
            sa.JSON().with_variant(postgresql.JSONB(), "postgresql"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_email_drafts_user_id", "email_drafts", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_email_drafts_user_id", table_name="email_drafts")
    op.drop_table("email_drafts")
