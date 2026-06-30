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
    """AI generates custom email content and renders it into a template."""
    from app.llm.factory import get_chat_model_for_tier as get_chat_model, provider_available
    if not provider_available():
        raise HTTPException(503, "LLM provider not configured")

    brand_profile = {}
    if body.project_id is not None:
        brand_profile = await load_brand_profile(session, body.project_id, user.id)
    brand_name = brand_profile.get("brand_name") or body.brand_name
    brand_voice = format_brand_voice(brand_profile)

    from pydantic import BaseModel, Field
    class EmailContent(BaseModel):
        hero_title: str = Field(description="Tiêu đề chính của hero section")
        hero_subtitle: str = Field(description="Phụ đề hero section")
        hero_body: str = Field(description="Nội dung hero section")
        hero_image_url: str = Field(description="URL ảnh minh họa hero (để trống nếu không có)")
        hero_cta_text: str = Field(description="Chữ trên nút CTA chính")
        hero_cta_link: str = Field(description="Link cho nút CTA chính")
        about_title: str = Field(description="Tiêu đề phần giới thiệu")
        about_body: str = Field(description="Nội dung giới thiệu")
        about_image_url: str = Field(description="URL ảnh giới thiệu")
        cta_title: str = Field(description="Tiêu đề phần CTA cuối")
        cta_body: str = Field(description="Nội dung CTA cuối")
        cta_button_text: str = Field(description="Chữ trên nút CTA cuối")
        cta_button_link: str = Field(description="Link nút CTA cuối")
        contact_email: str = Field(description="Email liên hệ")
        contact_phone: str = Field(description="Số điện thoại liên hệ")
        contact_website: str = Field(description="Website liên hệ")
        contact_address: str = Field(description="Địa chỉ")
        copyright_text: str = Field(description="Dòng bản quyền footer")

    system = """Bạn là AI Copywriter cho Vitba AI. Nhiệm vụ: Viết nội dung cho email marketing.
Viết nội dung hấp dẫn, chuyên nghiệp bằng tiếng Việt. Không bỏ trống các trường (dùng nội dung giả định phù hợp nếu cần)."""

    user_msg = f"""Mô tả email: {body.prompt}
Brand: {brand_name or "(tự đặt)"}
Nút CTA: {body.cta_text}
{brand_voice}

Tạo nội dung cho các phần của email."""

    from langchain_core.messages import SystemMessage, HumanMessage
    from app.core.tracing import trace_request

    with trace_request("email.generate_custom", user_id=user.id, metadata={"prompt": body.prompt[:200]}):
        llm = get_chat_model("smart", max_tokens=8192).with_structured_output(EmailContent)
        content = await llm.ainvoke([SystemMessage(content=system), HumanMessage(content=user_msg)])

    # Inject static elements from user input
    content_dict = content.model_dump()
    content_dict["brand_name"] = brand_name
    content_dict["logo_url"] = body.logo_url
    content_dict["primary_color"] = body.primary_color
    content_dict["social_facebook"] = "https://facebook.com"
    content_dict["social_twitter"] = "https://twitter.com"
    content_dict["social_instagram"] = "https://instagram.com"

    html = render_email("m1", content_dict)
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
    """AI generates email from onboarding wizard answers."""
    from app.llm.factory import get_chat_model_for_tier as get_chat_model, provider_available
    if not provider_available():
        raise HTTPException(503, "LLM provider not configured")

    brand_profile = {}
    if body.project_id is not None:
        brand_profile = await load_brand_profile(session, body.project_id, user.id)
    brand_name = brand_profile.get("brand_name") or body.brand_name
    brand_voice = format_brand_voice(brand_profile)

    from pydantic import BaseModel, Field
    class EmailContent(BaseModel):
        hero_title: str = Field(description="Tiêu đề chính của hero section")
        hero_subtitle: str = Field(description="Phụ đề hero section")
        hero_body: str = Field(description="Nội dung hero section")
        hero_image_url: str = Field(description="URL ảnh minh họa hero (để trống nếu không có)")
        hero_cta_text: str = Field(description="Chữ trên nút CTA chính")
        hero_cta_link: str = Field(description="Link cho nút CTA chính")
        about_title: str = Field(description="Tiêu đề phần giới thiệu")
        about_body: str = Field(description="Nội dung giới thiệu")
        about_image_url: str = Field(description="URL ảnh giới thiệu")
        cta_title: str = Field(description="Tiêu đề phần CTA cuối")
        cta_body: str = Field(description="Nội dung CTA cuối")
        cta_button_text: str = Field(description="Chữ trên nút CTA cuối")
        cta_button_link: str = Field(description="Link nút CTA cuối")
        contact_email: str = Field(description="Email liên hệ")
        contact_phone: str = Field(description="Số điện thoại liên hệ")
        contact_website: str = Field(description="Website liên hệ")
        contact_address: str = Field(description="Địa chỉ")
        copyright_text: str = Field(description="Dòng bản quyền footer")

    system = """Bạn là AI Copywriter chuyên nghiệp của Vitba AI. Nhiệm vụ: Viết nội dung cho email marketing.
Viết nội dung hấp dẫn, chuyên nghiệp bằng tiếng Việt. Hãy tưởng tượng ra các nội dung chi tiết dựa trên mục đích người dùng cung cấp."""

    user_msg = f"""## Câu trả lời Onboarding:
- Mục đích email: {body.purpose}
- Brand: {brand_name or "(tự đặt)"}
{brand_voice}

Viết nội dung cho tất cả các phần của email."""

    from langchain_core.messages import SystemMessage, HumanMessage
    from app.core.tracing import trace_request

    with trace_request("email.onboard", user_id=user.id, metadata={"purpose": body.purpose[:100]}):
        llm = get_chat_model("smart", max_tokens=8192).with_structured_output(EmailContent)
        content = await llm.ainvoke([SystemMessage(content=system), HumanMessage(content=user_msg)])

    # Inject user settings + extracted content
    content_dict = content.model_dump()
    content_dict["brand_name"] = brand_name
    content_dict["logo_url"] = body.logo_url
    
    # Parse color_palette to get primary_color
    colors = body.color_palette.split(":")[-1].split(",") if ":" in body.color_palette else []
    primary = colors[0].strip() if colors else "#2563EB"
    content_dict["primary_color"] = primary

    html = render_email("m1", content_dict)
    
    return {"html": html}
