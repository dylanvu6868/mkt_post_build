"""Vitba Mail Builder — AI-driven email builder.

Provides AI generation, template gallery, render, and image upload endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.user import User
from app.services.brand_profile_service import load_brand_profile, format_brand_voice
from app.services.storage import save_upload
from app.mcp.landing.template_engine import (
    render_email,
    list_email_templates,
)

router = APIRouter(prefix="/mcp/email/builder", tags=["email-builder"])


class RenderReq(BaseModel):
    template_id: str
    content: dict


class GenerateCustomReq(BaseModel):
    prompt: str
    project_id: int | None = None
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
async def generate_custom_email(
    body: GenerateCustomReq,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """AI generates custom email HTML and structure dynamically."""
    from app.llm.factory import get_chat_model_for_tier as get_chat_model, provider_available
    from app.mcp.landing.template_engine import get_email_style_reference
    if not provider_available():
        raise HTTPException(503, "LLM provider not configured")

    brand_profile = {}
    if body.project_id is not None:
        brand_profile = await load_brand_profile(session, body.project_id, user.id)
    brand_name = brand_profile.get("brand_name") or body.brand_name
    brand_voice = format_brand_voice(brand_profile)

    style_ref = get_email_style_reference()
    
    images_context = ""
    if body.logo_url:
        images_context += f"\nLogo URL: {body.logo_url}"

    color_context = f"\nPrimary color: {body.primary_color}" if body.primary_color else ""
    cta_context = f"\nCTA button text: {body.cta_text}\nCTA link: {body.cta_link}" if body.cta_text else ""

    system = f"""Bạn là AI Email Marketing Designer độc quyền của Vitba AI.
Nhiệm vụ: tạo email HTML hoàn chỉnh, responsive, đẹp, chuyển đổi cao từ mô tả của người dùng.

## STYLE REFERENCE (học từ cấu trúc mẫu, đừng copy nguyên nội dung):
{style_ref}

## YÊU CẦU KỸ THUẬT BẮT BUỘC (QUAN TRỌNG CHO EMAIL):
1. Bắt buộc dùng table layout (<table>, <tr>, <td>) thay vì div flex/grid để đảm bảo tương thích với Outlook/Gmail.
2. Tất cả CSS phải là inline CSS trong các thẻ HTML (style="...").
3. Bắt buộc có thẻ <!DOCTYPE html> ở đầu.
4. Mọi hình ảnh (nếu có logo) phải dùng thẻ <img> với thuộc tính width/height, alt rõ ràng và display:block.
5. Viết nội dung bằng tiếng Việt chuyên nghiệp, hấp dẫn.
6. KHÔNG dùng markdown fence. Chỉ trả về mã nguồn HTML thuần túy.
7. Đảm bảo cấu trúc đầy đủ: Header, Hero, Nội dung chính, Nút CTA nổi bật và Footer."""

    user_msg = f"""Mô tả email: {body.prompt}
Brand: {brand_name or "(tự đặt tên phù hợp)"}
{images_context}{color_context}{cta_context}
{brand_voice}

Viết toàn bộ HTML hoàn chỉnh cho email."""

    from langchain_core.messages import SystemMessage, HumanMessage
    from app.core.tracing import trace_request

    with trace_request("email.generate_custom", user_id=user.id, metadata={"prompt": body.prompt[:200]}):
        llm = get_chat_model("smart", max_tokens=8192)
        resp = await llm.ainvoke([SystemMessage(content=system), HumanMessage(content=user_msg)])

    from app.mcp.landing.template_engine import extract_html_from_response
    html = extract_html_from_response(resp.content if isinstance(resp.content, str) else str(resp.content))

    return {"html": html}


class OnboardReq(BaseModel):
    purpose: str
    color_palette: str
    typography: str
    project_id: int | None = None
    brand_name: str = ""
    logo_url: str = ""


@router.post("/onboard")
async def onboard_generate(
    body: OnboardReq,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """AI generates email HTML dynamically from onboarding wizard answers."""
    from app.llm.factory import get_chat_model_for_tier as get_chat_model, provider_available
    from app.mcp.landing.template_engine import get_email_style_reference
    if not provider_available():
        raise HTTPException(503, "LLM provider not configured")

    brand_profile = {}
    if body.project_id is not None:
        brand_profile = await load_brand_profile(session, body.project_id, user.id)
    brand_name = brand_profile.get("brand_name") or body.brand_name
    brand_voice = format_brand_voice(brand_profile)

    style_ref = get_email_style_reference()
    
    images_context = ""
    if body.logo_url:
        images_context += f"\nLogo URL: {body.logo_url}"

    colors = body.color_palette.split(":")[-1].split(",") if ":" in body.color_palette else []
    primary = colors[0].strip() if colors else "#2563EB"
    color_context = f"\nPrimary color (from palette): {primary}"

    system = f"""Bạn là AI Email Marketing Designer độc quyền của Vitba AI.
Nhiệm vụ: tạo email HTML hoàn chỉnh, responsive, đẹp, chuyển đổi cao từ mô tả của người dùng.

## STYLE REFERENCE (học từ cấu trúc mẫu, đừng copy nguyên nội dung):
{style_ref}

## YÊU CẦU KỸ THUẬT BẮT BUỘC (QUAN TRỌNG CHO EMAIL):
1. Bắt buộc dùng table layout (<table>, <tr>, <td>) thay vì div flex/grid để đảm bảo tương thích với Outlook/Gmail.
2. Tất cả CSS phải là inline CSS trong các thẻ HTML (style="...").
3. Bắt buộc có thẻ <!DOCTYPE html> ở đầu.
4. Mọi hình ảnh (nếu có logo) phải dùng thẻ <img> với thuộc tính width/height, alt rõ ràng và display:block.
5. Viết nội dung bằng tiếng Việt chuyên nghiệp, hấp dẫn.
6. KHÔNG dùng markdown fence. Chỉ trả về mã nguồn HTML thuần túy.
7. Cấu trúc đầy đủ, bao gồm Header, phần giải quyết bài toán/mục đích của email, và Footer."""

    user_msg = f"""## Câu trả lời Onboarding:
- Mục đích email: {body.purpose}
- Brand: {brand_name or "(tự đặt phù hợp)"}
{images_context}{color_context}
{brand_voice}

Viết toàn bộ HTML hoàn chỉnh cho email."""

    from langchain_core.messages import SystemMessage, HumanMessage
    from app.core.tracing import trace_request

    with trace_request("email.onboard", user_id=user.id, metadata={"purpose": body.purpose[:100]}):
        llm = get_chat_model("smart", max_tokens=8192)
        resp = await llm.ainvoke([SystemMessage(content=system), HumanMessage(content=user_msg)])

    from app.mcp.landing.template_engine import extract_html_from_response
    html = extract_html_from_response(resp.content if isinstance(resp.content, str) else str(resp.content))

    return {"html": html}
