"""add MCP Hub tables (email marketing, content calendar, SEO, landing pages)

Creates the eight tables introduced by the MCP Hub rebuild. Matches the
SQLAlchemy models in app/models/. JSON columns use JSONB (production is
Postgres/Supabase).

Note on ``campaign_id``: the ``campaigns`` table is not managed by Alembic in
this project (it is created by the startup ``Base.metadata.create_all`` hook),
so adding a hard ForeignKey to it here would make ``alembic upgrade head`` fail
on a fresh database. ``campaign_id`` is therefore a plain nullable integer; the
app treats it as an optional soft link and never relies on DB-level cascade.

Revision ID: b1c2d3e4f5a6
Revises: 3b52801c0019
Create Date: 2026-06-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "3b52801c0019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "email_templates",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("subject", sa.String(500), nullable=False),
        sa.Column("html_body", sa.Text, nullable=False),
        sa.Column("variables", postgresql.JSONB, nullable=True),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "email_contacts",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("email", sa.String(320), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("tags", postgresql.JSONB, nullable=True),
        sa.Column("metadata_json", postgresql.JSONB, nullable=True),
        sa.Column("status", sa.String(50), server_default="active", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "email_lists",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "email_list_contacts",
        sa.Column("list_id", sa.Integer, sa.ForeignKey("email_lists.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("contact_id", sa.Integer, sa.ForeignKey("email_contacts.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "scheduled_emails",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("template_id", sa.Integer, sa.ForeignKey("email_templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("list_id", sa.Integer, sa.ForeignKey("email_lists.id", ondelete="CASCADE"), nullable=False),
        sa.Column("campaign_id", sa.Integer, nullable=True),
        sa.Column("scheduled_at", sa.String(50), nullable=False),
        sa.Column("status", sa.String(50), server_default="pending", nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "content_items",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("campaign_id", sa.Integer, nullable=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("content_type", sa.String(50), nullable=False),
        sa.Column("body", sa.Text, nullable=True),
        sa.Column("status", sa.String(50), server_default="draft", nullable=False),
        sa.Column("scheduled_date", sa.String(50), nullable=True),
        sa.Column("published_date", sa.String(50), nullable=True),
        sa.Column("tags", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "seo_audits",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("url", sa.String(2000), nullable=True),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("score", sa.Integer, server_default="0", nullable=False),
        sa.Column("issues", postgresql.JSONB, nullable=True),
        sa.Column("suggestions", postgresql.JSONB, nullable=True),
        sa.Column("meta_data", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "landing_pages",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("campaign_id", sa.Integer, nullable=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("html_content", sa.Text, server_default="", nullable=False),
        sa.Column("css_content", sa.Text, nullable=True),
        sa.Column("status", sa.String(50), server_default="draft", nullable=False),
        sa.Column("template_name", sa.String(255), nullable=True),
        sa.Column("variables", postgresql.JSONB, nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("landing_pages")
    op.drop_table("seo_audits")
    op.drop_table("content_items")
    op.drop_table("scheduled_emails")
    op.drop_table("email_list_contacts")
    op.drop_table("email_lists")
    op.drop_table("email_contacts")
    op.drop_table("email_templates")
