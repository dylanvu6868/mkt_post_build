"""Add oauth_accounts and meta_pages tables

Revision ID: o1a2b3c4d5e6
Revises: 428896e85f32
Create Date: 2026-06-25 03:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'o1a2b3c4d5e6'
down_revision: Union[str, None] = '428896e85f32'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'oauth_accounts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('provider_user_id', sa.String(length=255), nullable=True),
        sa.Column('access_token_enc', sa.String(length=2048), nullable=False),
        sa.Column('refresh_token_enc', sa.String(length=2048), nullable=True),
        sa.Column('scopes', sa.String(length=1024), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_oauth_accounts_user_id', 'oauth_accounts', ['user_id'])
    op.create_index('ix_oauth_accounts_provider', 'oauth_accounts', ['provider'])

    op.create_table(
        'meta_pages',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('page_id', sa.String(length=128), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=255), nullable=True),
        sa.Column('access_token_enc', sa.String(length=2048), nullable=False),
        sa.Column('picture_url', sa.String(length=1024), nullable=True),
        sa.Column('followers_count', sa.Integer(), nullable=True),
        sa.Column('is_instagram', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_meta_pages_user_id', 'meta_pages', ['user_id'])
    op.create_index('ix_meta_pages_page_id', 'meta_pages', ['page_id'])


def downgrade() -> None:
    op.drop_index('ix_meta_pages_page_id', table_name='meta_pages')
    op.drop_index('ix_meta_pages_user_id', table_name='meta_pages')
    op.drop_table('meta_pages')
    op.drop_index('ix_oauth_accounts_provider', table_name='oauth_accounts')
    op.drop_index('ix_oauth_accounts_user_id', table_name='oauth_accounts')
    op.drop_table('oauth_accounts')
