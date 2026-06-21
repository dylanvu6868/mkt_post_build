"""add password reset fields

Revision ID: c3d4e5f6a7b9
Revises: b2c3d4e5f6a7
Create Date: 2026-06-21 05:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b9"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("reset_code", sa.String(6), nullable=True))
    op.add_column("users", sa.Column("reset_code_expires_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "reset_code_expires_at")
    op.drop_column("users", "reset_code")
