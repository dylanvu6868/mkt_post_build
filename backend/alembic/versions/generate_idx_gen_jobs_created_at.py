"""add index on generation_jobs.created_at

Revision ID: generate_idx_gen_jobs_created_at
Revises: 943c8a40b464
Create Date: 2026-06-27 12:00:00.000000

Note: This migration depends on 943c8a40b464 (drops image_generations table)
to avoid multiple-head conflict in Railway's alembic upgrade head.
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "generate_idx_gen_jobs_created_at"
down_revision: str | None = "943c8a40b464"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        "ix_generation_jobs_created_at",
        "generation_jobs",
        ["created_at"],
        postgresql_using="btree",
    )


def downgrade() -> None:
    op.drop_index("ix_generation_jobs_created_at", table_name="generation_jobs")
