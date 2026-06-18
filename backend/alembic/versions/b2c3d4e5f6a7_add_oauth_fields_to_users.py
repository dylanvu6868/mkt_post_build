"""add oauth fields to users

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-18 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "password_hash", existing_type=sa.String(255), nullable=True)
    op.add_column("users", sa.Column("oauth_provider", sa.String(50), nullable=True))
    op.add_column("users", sa.Column("oauth_id", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "oauth_id")
    op.drop_column("users", "oauth_provider")
    op.alter_column("users", "password_hash", existing_type=sa.String(255), nullable=False)
