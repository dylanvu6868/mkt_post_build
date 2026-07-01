import html as html_mod
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.core.plan_limits import check_daily_landing_generates
from app.core.tracing import trace_request
from app.models.landing_page import LandingPage
from app.models.user import User
from app.services.audit import log_action
from app.services.brand_profile_service import load_brand_profile, format_brand_voice
from app.services.storage import save_upload
from app.mcp.landing.template_engine import (
    render_landing,
    list_landing_templates,
    get_landing_style_reference,
)

router = APIRouter(tags=["landing"])
public_router = APIRouter()


def _render(page: LandingPage) -> str:
    css = f"<style>{page.css_content}</style>" if page.css_content else ""
    return f"<!DOCTYPE html><html><head><meta charset='utf-8'><title>{html_mod.escape(page.title)}</title>{css}</head><body>{page.html_content}</body></html>"


class PageCreate(BaseModel):
    title: str
    slug: str
    html_content: str = ""
    css_content: str | None = None

class PageUpdate(BaseModel):
    title: str | None = None
    html_content: str | None = None
    css_content: str | None = None

class GenerateReq(BaseModel):
    purpose: str
    product: str
    project_id: int | None = None
    tone: str = "professional"
    cta: str = "Sign up"
    color_scheme: str = "blue"
    style: str = "modern"
    sections: list[str] | None = None
    hero_image_url: str | None = None
    logo_url: str | None = None
    additional_images: list[str] | None = None
    template: str | None = None

class PreviewReq(BaseModel):
    html_content: str
    css_content: str | None = None

class ModifyReq(BaseModel):
    current_html: str
    prompt: str
    project_id: int | None = None


@router.get("/mcp/landing/pages")
async def list_pages(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(
        select(LandingPage).where(LandingPage.user_id == user.id).order_by(LandingPage.created_at.desc())
    )).scalars().all()
    return [{"id": p.id, "title": p.title, "slug": p.slug, "status": p.status, "created_at": str(p.created_at)} for p in rows]


@router.post("/mcp/landing/pages", status_code=201)
async def create_page(body: PageCreate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    existing = (await session.execute(select(LandingPage).where(LandingPage.slug == body.slug))).scalar_one_or_none()
    if existing:
        raise HTTPException(400, "Slug already exists")
    page = LandingPage(user_id=user.id, title=body.title, slug=body.slug, html_content=body.html_content, css_content=body.css_content)
    session.add(page)
    await session.commit()
    await log_action(session, user.id, "landing.create", "landing_page", str(page.id))
    return {"id": page.id, "title": page.title, "slug": page.slug}


@router.post("/mcp/landing/generate")
async def generate_page(body: GenerateReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    allowed, used, limit = await check_daily_landing_generates(session, user)
    if not allowed:
        raise HTTPException(429, f"Bạn đã đạt giới hạn tạo landing page trong ngày của gói hiện tại ({limit}/ngày). Vui lòng nâng cấp.")
    from app.llm.factory import get_chat_model_for_tier as get_chat_model, provider_available
    if not provider_available():
        raise HTTPException(503, "LLM provider not configured")

    brand_profile = {}
    if body.project_id is not None:
        brand_profile = await load_brand_profile(session, body.project_id, user.id)
    brand_voice = format_brand_voice(brand_profile)
    effective_brand_name = brand_profile.get("brand_name") or body.product

    style_ref = get_landing_style_reference()

    images_context = ""
    if body.logo_url:
        images_context += f"\nLogo URL: {body.logo_url}"
    if body.hero_image_url:
        images_context += f"\nHero image URL: {body.hero_image_url}"
    if body.additional_images:
        images_context += f"\nAdditional images: {', '.join(body.additional_images)}"

    color_context = f"\nPrimary color: {body.color_scheme}"
    cta_context = f"\nCTA button text: {body.cta}"
    sections_str = ", ".join(body.sections) if body.sections else "hero, features, CTA"

    system = f"""Bạn là AI Landing Page Designer độc quyền của Vitba AI.
Nhiệm vụ: tạo landing page HTML hoàn chỉnh, responsive, đẹp, chuyển đổi cao từ mô tả của người dùng.

## STYLE REFERENCE (học từ cấu trúc mẫu, đừng copy nguyên nội dung):
{style_ref}

## YÊU CẦU KỸ THUẬT:
1. HTML hoàn chỉnh với inline CSS trong <style> tag
2. Responsive, mobile-first, sử dụng CSS Grid/Flexbox
3. Sử dụng Tailwind CSS qua CDN: <script src="https://cdn.tailwindcss.com"></script>
4. VỀ HÌNH ẢNH: Nếu có cung cấp URL ảnh (logo, hero), dùng trực tiếp. NẾU KHÔNG CUNG CẤP URL, TUYỆT ĐỐI KHÔNG TỰ BỊA ĐƯỜNG DẪN ẢNH (hãy dùng dạng Text để hiển thị tên Brand).
5. Smooth animations, hover effects, gradient accents
6. Typography hierarchy rõ ràng, font Google Fonts
7. Các sections cần có: {sections_str}
8. Tất cả sections phải đầy đủ nội dung (không placeholder)
9. Viết bằng tiếng Việt
10. Trả về DUY NHẤT mã HTML bắt đầu bằng <!DOCTYPE html>
11. KHÔNG markdown fence, KHÔNG giải thích"""

    user_msg = f"""Mục đích: {body.purpose}
Sản phẩm: {body.product}
Brand: {effective_brand_name}
Tone: {body.tone}
Style yêu cầu: {body.style}
{images_context}{color_context}{cta_context}
{brand_voice}

Tạo landing page hoàn chỉnh, chuyên nghiệp, tối ưu conversion."""

    from langchain_core.messages import SystemMessage, HumanMessage
    with trace_request("landing.generate", user_id=user.id, metadata={"purpose": body.purpose, "product": body.product}):
        llm = get_chat_model("smart", max_tokens=8192)
        resp = await llm.ainvoke([SystemMessage(content=system), HumanMessage(content=user_msg)])

    from app.mcp.landing.template_engine import extract_html_from_response
    html = extract_html_from_response(resp.content if isinstance(resp.content, str) else str(resp.content))
    
    await log_action(session, user.id, "landing.generate", "landing_page", None)
    return {"html": html}


@router.post("/mcp/landing/preview")
async def preview_page(body: PreviewReq, user: User = Depends(get_current_user)):
    css = f"<style>{body.css_content}</style>" if body.css_content else ""
    return HTMLResponse(f"<!DOCTYPE html><html><head>{css}</head><body>{body.html_content}</body></html>")


@router.get("/mcp/landing/pages/{page_id}")
async def get_page(page_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    page = await session.get(LandingPage, page_id)
    if not page or page.user_id != user.id:
        raise HTTPException(404, "Page not found")
    return {"id": page.id, "title": page.title, "slug": page.slug, "html_content": page.html_content, "css_content": page.css_content, "status": page.status}


@router.patch("/mcp/landing/pages/{page_id}")
async def update_page(page_id: int, body: PageUpdate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    page = await session.get(LandingPage, page_id)
    if not page or page.user_id != user.id:
        raise HTTPException(404, "Page not found")
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(page, field, val)
    await session.commit()
    return {"id": page.id, "title": page.title}


@router.patch("/mcp/landing/pages/{page_id}/publish")
async def publish_page(page_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    page = await session.get(LandingPage, page_id)
    if not page or page.user_id != user.id:
        raise HTTPException(404, "Page not found")
    page.status = "published"
    page.published_at = datetime.now(timezone.utc)
    await session.commit()
    await log_action(session, user.id, "landing.publish", "landing_page", str(page.id))
    return {"id": page.id, "status": "published", "slug": page.slug}


@router.get("/mcp/landing/pages/{page_id}/export")
async def export_page(page_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    page = await session.get(LandingPage, page_id)
    if not page or page.user_id != user.id:
        raise HTTPException(404, "Page not found")
    return HTMLResponse(_render(page), headers={"Content-Disposition": f"attachment; filename={page.slug}.html"})


@router.post("/mcp/landing/modify")
async def modify_landing_html(
    body: ModifyReq,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Modify existing landing page HTML using AI based on a prompt."""
    from app.services.llm import generate_structured

    system_msg = (
        "You are an expert Frontend Developer proficient in Tailwind CSS. "
        "The user will provide you with their current HTML landing page code, and a prompt describing what they want to change. "
        "You must apply the requested changes to the HTML. Keep all existing Tailwind classes intact unless the prompt specifically requires changing them. "
        "Respond ONLY with the modified valid HTML code inside ```html ... ``` block. No markdown or explanations outside."
    )

    user_msg = (
        f"USER PROMPT:\n{body.prompt}\n\n"
        f"CURRENT HTML:\n```html\n{body.current_html}\n```\n\n"
        "Please provide the updated HTML."
    )

    try:
        raw_response = await generate_structured(
            system_msg=system_msg,
            user_msg=user_msg,
            response_schema=None,
            model_tier="smart"
        )
        html = extract_html_from_response(raw_response)
        
        # Ensure we keep the live edit script if it existed
        if 'id="live-edit-script"' not in html:
            script_tag = """
      <script id="live-edit-script">
        document.body.contentEditable = 'true';
        document.body.addEventListener('input', function() {
          window.parent.postMessage({ type: 'html_update', html: document.documentElement.outerHTML }, '*');
        });
        document.body.addEventListener('click', function(e) {
          if (e.target.closest('a')) {
            e.preventDefault();
          }
        });
      </script>
            """
            html = html.replace("</body>", f"{script_tag}\n</body>")

        return {"html": html}
    except Exception as e:
        raise HTTPException(500, f"Landing modification error: {e}")


@router.delete("/mcp/landing/pages/{page_id}", status_code=204)
async def delete_page(page_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    page = await session.get(LandingPage, page_id)
    if not page or page.user_id != user.id:
        raise HTTPException(404, "Page not found")
    await session.delete(page)
    await session.commit()


# ---------------------------------------------------------------------------
# Vitba Landing Page Builder — template-based visual builder
# ---------------------------------------------------------------------------

class RenderReq(BaseModel):
    template_id: str
    content: dict


@router.get("/mcp/landing/templates")
async def get_templates():
    """List available landing page templates for the gallery."""
    return list_landing_templates()


@router.post("/mcp/landing/render")
async def render_template(body: RenderReq, user: User = Depends(get_current_user)):
    """Render a landing page template with user content injected."""
    try:
        html = render_landing(body.template_id, body.content)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"html": html}


@router.post("/mcp/landing/upload-image")
async def upload_landing_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Upload an image (logo, hero, gallery) for the landing builder."""
    try:
        url = await save_upload(file, subdir="landing")
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"url": url}


@router.post("/mcp/landing/save-from-template")
async def save_from_template(
    body: dict,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Save a rendered template as a new landing page."""
    title = body.get("title", "Untitled Landing Page")
    slug = body.get("slug") or title.lower().replace(" ", "-")[:50]
    html_content = body.get("html", "")
    if not html_content:
        raise HTTPException(400, "html content is required")
    page = LandingPage(
        user_id=user.id,
        title=title,
        slug=slug,
        html_content=html_content,
        status="draft",
    )
    session.add(page)
    await session.commit()
    await log_action(session, user.id, "landing.create", "landing_page", str(page.id))
    return {"id": page.id, "title": page.title, "slug": page.slug}


class GenerateCustomReq(BaseModel):
    prompt: str
    project_id: int | None = None
    brand_name: str = ""
    logo_url: str = ""
    hero_image_url: str = ""
    primary_color: str = ""
    cta_text: str = ""
    cta_link: str = ""


@router.post("/mcp/landing/generate-custom")
async def generate_custom_landing(
    body: GenerateCustomReq,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """AI generates a custom landing page from user's description,
    using template patterns as style reference (not slot-filling)."""
    from app.llm.factory import get_chat_model_for_tier as get_chat_model, provider_available
    if not provider_available():
        raise HTTPException(503, "LLM provider not configured")

    brand_profile = {}
    if body.project_id is not None:
        brand_profile = await load_brand_profile(session, body.project_id, user.id)
    brand_name = brand_profile.get("brand_name") or body.brand_name
    brand_voice = format_brand_voice(brand_profile)

    style_ref = get_landing_style_reference()

    images_context = ""
    if body.logo_url:
        images_context += f"\nLogo URL: {body.logo_url}"
    if body.hero_image_url:
        images_context += f"\nHero image URL: {body.hero_image_url}"

    color_context = f"\nPrimary color: {body.primary_color}" if body.primary_color else ""
    cta_context = f"\nCTA button text: {body.cta_text}\nCTA link: {body.cta_link}" if body.cta_text else ""

    system = f"""Bạn là AI Landing Page Designer độc quyền của Vitba AI.
Nhiệm vụ: tạo landing page HTML hoàn chỉnh, responsive, đẹp, chuyển đổi cao từ mô tả của người dùng.

## STYLE REFERENCE (học từ, không copy):
{style_ref}

## YÊU CẦU KỸ THUẬT:
1. HTML hoàn chỉnh với inline CSS trong <style> tag
2. Responsive, mobile-first, sử dụng CSS Grid/Flexbox
3. Sử dụng Tailwind CSS qua CDN: <script src="https://cdn.tailwindcss.com"></script>
4. Nếu có logo/hero image URL, dùng <img src="URL"> trực tiếp
5. Smooth animations, hover effects, gradient accents
6. Typography hierarchy rõ ràng, font Google Fonts
7. Tất cả sections phải đầy đủ nội dung (không placeholder)
8. Viết bằng tiếng Việt
9. Trả về DUY NHẤT mã HTML bắt đầu bằng <!DOCTYPE html>
10. KHÔNG markdown fence, KHÔNG giải thích"""

    user_msg = f"""Mô tả landing page: {body.prompt}
Brand: {brand_name or "(tự đặt tên phù hợp)"}
{images_context}{color_context}{cta_context}
{brand_voice}

Tạo landing page hoàn chỉnh, chuyên nghiệp, độc quyền Vitba."""

    from langchain_core.messages import SystemMessage, HumanMessage
    from app.core.tracing import trace_request

    with trace_request("landing.generate_custom", user_id=user.id, metadata={"prompt": body.prompt[:200]}):
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
    hero_image_url: str = ""
    target_audience: str = ""
    key_features: str = ""
    contact_info: str = ""


@router.post("/mcp/landing/onboard")
async def onboard_generate(
    body: OnboardReq,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """AI generates dynamic landing page HTML from onboarding wizard answers."""
    from app.llm.factory import get_chat_model_for_tier as get_chat_model, provider_available
    if not provider_available():
        raise HTTPException(503, "LLM provider not configured")

    brand_profile = {}
    if body.project_id is not None:
        brand_profile = await load_brand_profile(session, body.project_id, user.id)
    brand_name = brand_profile.get("brand_name") or body.brand_name
    brand_voice = format_brand_voice(brand_profile)

    style_ref = get_landing_style_reference()

    images_context = ""
    if body.logo_url:
        images_context += f"\nLogo URL: {body.logo_url}"
    if body.hero_image_url:
        images_context += f"\nHero image URL: {body.hero_image_url}"

    colors = body.color_palette.split(":")[-1].split(",") if ":" in body.color_palette else []
    primary = colors[0].strip() if colors else "#2563EB"
    color_context = f"\nPrimary color: {primary}"

    system = f"""Bạn là AI Landing Page Designer độc quyền của Vitba AI.
Nhiệm vụ: tạo landing page HTML hoàn chỉnh, responsive, đẹp, chuyển đổi cao từ kết quả onboarding.

## STYLE REFERENCE (học từ cấu trúc mẫu, đừng copy nguyên nội dung):
{style_ref}

## YÊU CẦU KỸ THUẬT:
1. HTML hoàn chỉnh với inline CSS trong <style> tag
2. Responsive, mobile-first, sử dụng CSS Grid/Flexbox
3. Sử dụng Tailwind CSS qua CDN: <script src="https://cdn.tailwindcss.com"></script>
4. VỀ HÌNH ẢNH: Nếu có cung cấp URL ảnh (logo, hero), dùng trực tiếp. NẾU KHÔNG CUNG CẤP URL, TUYỆT ĐỐI KHÔNG TỰ BỊA ĐƯỜNG DẪN ẢNH (hãy dùng dạng Text để hiển thị tên Brand).
5. Smooth animations, hover effects, gradient accents
6. Typography hierarchy rõ ràng, sử dụng font thuộc họ: {body.typography}
7. Tất cả sections phải đầy đủ nội dung (không placeholder)
8. Viết bằng tiếng Việt
9. Trả về DUY NHẤT mã HTML bắt đầu bằng <!DOCTYPE html>
10. KHÔNG markdown fence, KHÔNG giải thích"""

    user_msg = f"""## Câu trả lời Onboarding:
- Mục đích trang: {body.purpose}
- Brand: {brand_name or "(tự đặt phù hợp)"}
- Đối tượng khách hàng mục tiêu: {body.target_audience or "Không xác định rõ, tự phân tích từ mục đích."}
- Các tính năng / Lợi ích nổi bật: {body.key_features or "Tự sáng tạo dựa trên mục đích."}
- Thông tin liên hệ (Địa chỉ, Hotline): {body.contact_info or "Để thông tin giả lập mẫu."}
{images_context}{color_context}
{brand_voice}

Viết toàn bộ HTML hoàn chỉnh cho trang Landing Page."""

    from langchain_core.messages import SystemMessage, HumanMessage
    with trace_request("landing.onboard", user_id=user.id, metadata={"purpose": body.purpose[:100]}):
        llm = get_chat_model("smart", max_tokens=8192)
        resp = await llm.ainvoke([SystemMessage(content=system), HumanMessage(content=user_msg)])

    from app.mcp.landing.template_engine import extract_html_from_response
    html = extract_html_from_response(resp.content if isinstance(resp.content, str) else str(resp.content))

    return {"html": html}


# Public route — serve published landing pages (no auth)
@public_router.get("/p/{slug}")
async def serve_landing_page(slug: str, session: AsyncSession = Depends(get_session)):
    page = (await session.execute(
        select(LandingPage).where(LandingPage.slug == slug, LandingPage.status == "published")
    )).scalar_one_or_none()
    if not page:
        raise HTTPException(404, "Page not found")
    return HTMLResponse(_render(page))
