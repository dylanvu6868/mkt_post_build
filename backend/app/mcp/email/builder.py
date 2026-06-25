"""Vitba Mail Builder — template-based email visual builder.

Provides template gallery, render, and image upload endpoints for the
email builder UI.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.services.storage import save_upload
from app.mcp.email.template_engine import (
    render_email,
    list_email_templates,
)

router = APIRouter(prefix="/mcp/email/builder", tags=["email-builder"])


class RenderReq(BaseModel):
    template_id: str
    content: dict


@router.get("/templates")
async def get_email_templates():
    """List available email templates for the gallery."""
    return list_email_templates()


@router.post("/render")
async def render_email_template(body: RenderReq, user: User = Depends(get_current_user)):
    """Render an email template with user content injected."""
    try:
        html = render_email(body.template_id, body.content)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"html": html}


@router.post("/upload-image")
async def upload_email_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Upload an image for the email builder."""
    try:
        url = await save_upload(file, subdir="email")
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"url": url}
