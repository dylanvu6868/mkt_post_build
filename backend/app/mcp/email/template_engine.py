"""Email template engine for Vitba Mail builder.

Re-exports the render/list functions from the landing template engine
for email-specific templates.
"""

from app.mcp.landing.template_engine import (
    render_email,
    list_email_templates,
    EMAIL_TEMPLATES,
    EMAIL_SLOTS,
)

__all__ = ["render_email", "list_email_templates", "EMAIL_TEMPLATES", "EMAIL_SLOTS"]
