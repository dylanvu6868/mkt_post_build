"""add user_feedback + session_memory tables

Revision ID: f1a2b3c4d5e6
Revises: o1a2b3c4d5e6
Create Date: 2026-06-25 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = ('943c8a40b464', 'o1a2b3c4d5e6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user_feedback',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('message_id', sa.Integer(), sa.ForeignKey('messages.id', ondelete='CASCADE'), nullable=True),
        sa.Column('content_history_id', sa.Integer(), sa.ForeignKey('content_history.id', ondelete='CASCADE'), nullable=True),
        sa.Column('rating', sa.String(10), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_user_feedback_user_id', 'user_feedback', ['user_id'])

    op.create_table(
        'session_memory',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('conversation_id', sa.Integer(), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=True),
        sa.Column('key', sa.String(100), nullable=False),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('category', sa.String(50), server_default='general'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('user_id', 'key', name='uq_session_memory_user_key'),
    )
    op.create_index('ix_session_memory_user_id', 'session_memory', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_session_memory_user_id', table_name='session_memory')
    op.drop_table('session_memory')
    op.drop_index('ix_user_feedback_user_id', table_name='user_feedback')
    op.drop_table('user_feedback')
