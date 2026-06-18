"""add admin and banned to users

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-18 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_admin", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("users", sa.Column("is_banned", sa.Boolean(), server_default="false", nullable=False))


def downgrade() -> None:
    op.drop_column("users", "is_banned")
    op.drop_column("users", "is_admin")
