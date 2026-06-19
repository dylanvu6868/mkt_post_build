"""add user templates

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-06-18 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd4e5f6a7b8c9'
down_revision = '4d7b94408780'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('user_templates',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('content_type', sa.String(length=50), nullable=False),
    sa.Column('template_text', sa.Text(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'content_type', name='uq_user_content_type')
    )
    op.create_index(op.f('ix_user_templates_content_type'), 'user_templates', ['content_type'], unique=False)
    op.create_index(op.f('ix_user_templates_user_id'), 'user_templates', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_templates_user_id'), table_name='user_templates')
    op.drop_index(op.f('ix_user_templates_content_type'), table_name='user_templates')
    op.drop_table('user_templates')
