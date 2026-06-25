"""Vitba Mail Builder — AI-driven email builder.

Provides AI generation, template gallery, render, and image upload endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.services.storage import save_upload
from app.mcp.landing.template_engine import (
    render_email,
    list_email_templates,
    get_email_style_reference,
)

router = APIRouter(prefix="/mcp/email/builder", tags=["email-builder"])


class RenderReq(BaseModel):
    template_id: str
    content: dict


class GenerateCustomReq(BaseModel):
    prompt: str
    brand_name: str = ""
    logo_url: str = ""
    primary_color: str = ""
    cta_text: str = ""
    cta_link: str = ""


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


@router.post("/generate-custom")
async def generate_custom_email(body: GenerateCustomReq, user: User = Depends(get_current_user)):
    """AI generates a custom email HTML from user's description,
    using template patterns as style reference."""
    from app.llm.factory import get_chat_model, provider_available
    if not provider_available():
        raise HTTPException(503, "LLM provider not configured")

    style_ref = get_email_style_reference()

    images_context = f"\nLogo URL: {body.logo_url}" if body.logo_url else ""
    color_context = f"\nMàu chính: {body.primary_color}" if body.primary_color else ""
    cta_context = f"\nNút CTA: {body.cta_text}" if body.cta_text else ""

    system = f"""Bạn là AI Email Designer độc quyền của Vitba AI.
Nhiệm vụ: tạo email HTML hoàn chỉnh, responsive, đẹp, chuyên nghiệp từ mô tả người dùng.

## STYLE REFERENCE (học từ, không copy):
{style_ref}

## YÊU CẦU KỸ THUẬT:
1. Email HTML table-based (MJML style) — dùng <table> cho layout, tương thích Outlook/Gmail
2. Max-width 600px, responsive
3. Inline CSS trong style attributes
4. Nếu có logo URL, dùng <img src="URL">
5. Font Google Fonts, typography hierarchy rõ ràng
6. Tất cả nội dung đầy đủ (không placeholder)
7. Viết bằng tiếng Việt
8. Trả về DUY NHẤT mã HTML bắt đầu bằng <!DOCTYPE html>
9. KHÔNG markdown fence, KHÔNG giải thích
10. Email phải có: Header(logo) + Hero + Content + CTA + Footer(contact+unsubscribe)"""

    user_msg = f"""Mô tả email: {body.prompt}
Brand: {body.brand_name or "(tự đặt)"}
{images_context}{color_context}{cta_context}

Tạo email HTML hoàn chỉnh, chuyên nghiệp, độc quyền Vitba."""

    from langchain_core.messages import SystemMessage, HumanMessage
    from app.core.tracing import trace_request

    llm = get_chat_model("fast")
    with trace_request("email.generate_custom", user_id=user.id, metadata={"prompt": body.prompt[:200]}):
        resp = await llm.ainvoke([SystemMessage(content=system), HumanMessage(content=user_msg)])

    html = (resp.content if isinstance(resp.content, str) else str(resp.content)).strip()
    if html.startswith("```"):
        html = html.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    if not html.startswith("<!DOCTYPE"):
        html = f"<!DOCTYPE html>\n{html}"

    return {"html": html}
