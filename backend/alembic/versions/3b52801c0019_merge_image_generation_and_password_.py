"""merge image generation and password reset branches

Revision ID: 3b52801c0019
Revises: g8h9i0j1k2l3, c3d4e5f6a7b9
Create Date: 2026-06-21 14:53:08.303938

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3b52801c0019'
down_revision: Union[str, None] = ('g8h9i0j1k2l3', 'c3d4e5f6a7b9')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
