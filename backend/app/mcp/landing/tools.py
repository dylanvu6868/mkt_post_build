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


def _slugify(text: str) -> str:
    """Chuẩn hóa tên trang thành slug URL-safe (bỏ dấu tiếng Việt)."""
    import re
    import unicodedata

    text = unicodedata.normalize("NFD", text or "")
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = text.replace("đ", "d").replace("Đ", "D")
    text = re.sub(r"[^a-zA-Z0-9\s-]", " ", text).strip().lower()
    text = re.sub(r"[\s-]+", "-", text).strip("-")
    return text[:60] or "trang-moi"


async def _unique_slug(session: AsyncSession, raw: str) -> str:
    """Đảm bảo slug không trùng (subdomain phải duy nhất): thêm -2, -3... nếu cần."""
    base = _slugify(raw)
    slug = base
    n = 1
    while True:
        exists = (await session.execute(
            select(LandingPage).where(LandingPage.slug == slug)
        )).scalar_one_or_none()
        if not exists:
            return slug
        n += 1
        slug = f"{base}-{n}"


def _lead_capture_script(slug: str) -> str:
    """Script chặn mọi <form> trên trang publish → POST về backend lưu lead,
    rồi hiện lời cảm ơn. Nhờ vậy trang bán hàng/đăng ký nhận được thông tin khách."""
    return (
        "<script>(function(){document.addEventListener('submit',function(e){"
        "var f=e.target;if(!f||f.tagName!=='FORM')return;e.preventDefault();"
        "var d={};new FormData(f).forEach(function(v,k){d[k]=v;});"
        "var b=f.querySelector('[type=submit],button');if(b){b.disabled=true;}"
        f"fetch('/p/{slug}/submit',{{method:'POST',headers:{{'Content-Type':'application/json'}},"
        "body:JSON.stringify({data:d})}).then(function(r){if(!r.ok)throw 0;"
        "var m=document.createElement('div');m.style.cssText='padding:24px;text-align:center;font-weight:600';"
        "m.textContent='\\u2713 C\\u1ea3m \\u01a1n b\\u1ea1n! Ch\\u00fang t\\u00f4i \\u0111\\u00e3 nh\\u1eadn \\u0111\\u01b0\\u1ee3c th\\u00f4ng tin v\\u00e0 s\\u1ebd li\\u00ean h\\u1ec7 s\\u1edbm.';"
        "f.replaceWith(m);}).catch(function(){if(b){b.disabled=false;}"
        "alert('G\\u1eedi th\\u1ea5t b\\u1ea1i, vui l\\u00f2ng th\\u1eed l\\u1ea1i.');});},true);})();</script>"
    )


def _inject_lead_capture(doc: str, slug: str) -> str:
    script = _lead_capture_script(slug)
    if "</body>" in doc:
        return doc.replace("</body>", script + "</body>", 1)
    return doc + script


def _render(page: LandingPage) -> str:
    import re

    content = page.html_content or ""
    # Dọn rác từ chế độ live-edit nếu lỡ được lưu kèm (script + contenteditable
    # làm trang publish bị "sửa được chữ" và lỗi JS)
    content = re.sub(r'<script id="live-edit-script">[\s\S]*?</script>', "", content)
    content = re.sub(r"\scontenteditable=([\"'])(?:true)?\1", "", content, flags=re.IGNORECASE)

    css = f"<style>{page.css_content}</style>" if page.css_content else ""
    stripped = content.lstrip()
    lower = stripped.lower()

    # Trường hợp 1: nội dung đã là document đầy đủ (Builder wizard lưu nguyên trang
    # AI tạo, có sẵn <head> + Tailwind CDN) — serve nguyên vẹn, KHÔNG bọc lồng
    if lower.startswith("<!doctype") or lower.startswith("<html"):
        doc = stripped if lower.startswith("<!doctype") else "<!DOCTYPE html>\n" + stripped
        if css:
            if "</head>" in doc:
                doc = doc.replace("</head>", f"{css}</head>", 1)
            elif "<body" in doc:
                doc = doc.replace("<body", f"{css}<body", 1)
            else:
                doc = css + doc
        return _inject_lead_capture(doc, page.slug)

    # Trường hợp 2: body-fragment (EditorTab lưu phần trong <body>) — bọc khung
    # đầy đủ với viewport + Tailwind CDN để class Tailwind hiển thị đúng
    tailwind = (
        '<script src="https://cdn.tailwindcss.com"></script>' if "class=" in content else ""
    )
    return (
        "<!DOCTYPE html><html lang='vi'><head><meta charset='utf-8'>"
        "<meta name='viewport' content='width=device-width, initial-scale=1'>"
        f"<title>{html_mod.escape(page.title)}</title>{tailwind}{css}</head>"
        f"<body>{content}{_lead_capture_script(page.slug)}</body></html>"
    )


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
1. TẤT CẢ TRONG MỘT FILE HTML DUY NHẤT, TỰ CHỨA (self-contained): toàn bộ CSS tùy chỉnh đặt trong <style> ở <head>; toàn bộ JavaScript đặt trong <script> ở cuối <body>. TUYỆT ĐỐI KHÔNG tách file .css/.js riêng, KHÔNG link tới file ngoài (chỉ được phép Tailwind CDN + Google Fonts). File phải mở trực tiếp là chạy đầy đủ style + tương tác
2. Responsive, mobile-first, sử dụng CSS Grid/Flexbox
3. Sử dụng Tailwind CSS qua CDN: <script src="https://cdn.tailwindcss.com"></script>
4. VỀ HÌNH ẢNH: Nếu có cung cấp URL ảnh (logo, hero), dùng trực tiếp. NẾU KHÔNG CUNG CẤP URL, TUYỆT ĐỐI KHÔNG TỰ BỊA ĐƯỜNG DẪN ẢNH (hãy dùng dạng Text để hiển thị tên Brand).
5. Smooth animations, hover effects, gradient accents.
   - ICON: CHỈ dùng SVG inline dạng line/stroke, đặt stroke="currentColor" để icon tự đồng bộ màu theo màu chữ của section. TUYỆT ĐỐI KHÔNG dùng emoji, KHÔNG icon font hay thư viện icon ngoài (icon nhựa xấu).
   - FORM THU THẬP: nếu trang có mục đích đăng ký / đặt hàng / liên hệ / thu thập khách, PHẢI có <form> với các ô nhập rõ ràng (họ tên [name], số điện thoại [name=phone], email [name=email] tùy phù hợp) và nút submit. Đặt thuộc tính name có ý nghĩa cho mỗi input. Không cần thêm action/JS gửi — hệ thống tự nhận dữ liệu.
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
    from app.core.config import settings
    public_url = (
        f"https://{page.slug}.{settings.landing_base_domain}"
        if settings.landing_base_domain
        else f"/p/{page.slug}"
    )
    return {"id": page.id, "status": "published", "slug": page.slug, "public_url": public_url}


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
    from app.llm.factory import get_chat_model_for_tier as get_chat_model, provider_available
    from app.mcp.landing.template_engine import extract_html_from_response
    if not provider_available():
        raise HTTPException(503, "LLM provider not configured")

    system_msg = (
        "You are an expert Frontend Developer proficient in Tailwind CSS. "
        "The user will provide you with their current HTML landing page code, and a prompt describing what they want to change. "
        "You must apply the requested changes to the HTML. Keep all existing Tailwind classes intact unless the prompt specifically requires changing them. "
        "Do NOT invent new image URLs; keep existing image URLs as-is. "
        "Respond ONLY with the modified valid HTML code, starting with <!DOCTYPE html>. No markdown fences or explanations."
    )

    user_msg = (
        f"USER PROMPT:\n{body.prompt}\n\n"
        f"CURRENT HTML:\n```html\n{body.current_html}\n```\n\n"
        "Please provide the updated HTML."
    )

    try:
        from langchain_core.messages import SystemMessage, HumanMessage
        with trace_request("landing.modify", user_id=user.id, metadata={"prompt": body.prompt[:200]}):
            llm = get_chat_model("smart", max_tokens=8192)
            resp = await llm.ainvoke([SystemMessage(content=system_msg), HumanMessage(content=user_msg)])
        raw_response = resp.content if isinstance(resp.content, str) else str(resp.content)
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
    html_content = body.get("html", "")
    if not html_content:
        raise HTTPException(400, "html content is required")
    slug = await _unique_slug(session, body.get("slug") or title)
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
1. TẤT CẢ TRONG MỘT FILE HTML DUY NHẤT, TỰ CHỨA (self-contained): toàn bộ CSS tùy chỉnh đặt trong <style> ở <head>; toàn bộ JavaScript đặt trong <script> ở cuối <body>. TUYỆT ĐỐI KHÔNG tách file .css/.js riêng, KHÔNG link tới file ngoài (chỉ được phép Tailwind CDN + Google Fonts). File phải mở trực tiếp là chạy đầy đủ style + tương tác
2. Responsive, mobile-first, sử dụng CSS Grid/Flexbox
3. Sử dụng Tailwind CSS qua CDN: <script src="https://cdn.tailwindcss.com"></script>
4. Nếu có logo/hero image URL, dùng <img src="URL"> trực tiếp
5. Smooth animations, hover effects, gradient accents.
   - ICON: CHỈ dùng SVG inline dạng line/stroke, đặt stroke="currentColor" để icon tự đồng bộ màu theo màu chữ của section. TUYỆT ĐỐI KHÔNG dùng emoji, KHÔNG icon font hay thư viện icon ngoài (icon nhựa xấu).
   - FORM THU THẬP: nếu trang có mục đích đăng ký / đặt hàng / liên hệ / thu thập khách, PHẢI có <form> với các ô nhập rõ ràng (họ tên [name], số điện thoại [name=phone], email [name=email] tùy phù hợp) và nút submit. Đặt thuộc tính name có ý nghĩa cho mỗi input. Không cần thêm action/JS gửi — hệ thống tự nhận dữ liệu.
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
1. TẤT CẢ TRONG MỘT FILE HTML DUY NHẤT, TỰ CHỨA (self-contained): toàn bộ CSS tùy chỉnh đặt trong <style> ở <head>; toàn bộ JavaScript đặt trong <script> ở cuối <body>. TUYỆT ĐỐI KHÔNG tách file .css/.js riêng, KHÔNG link tới file ngoài (chỉ được phép Tailwind CDN + Google Fonts). File phải mở trực tiếp là chạy đầy đủ style + tương tác
2. Responsive, mobile-first, sử dụng CSS Grid/Flexbox
3. Sử dụng Tailwind CSS qua CDN: <script src="https://cdn.tailwindcss.com"></script>
4. VỀ HÌNH ẢNH: Nếu có cung cấp URL ảnh (logo, hero), dùng trực tiếp. NẾU KHÔNG CUNG CẤP URL, TUYỆT ĐỐI KHÔNG TỰ BỊA ĐƯỜNG DẪN ẢNH (hãy dùng dạng Text để hiển thị tên Brand).
5. Smooth animations, hover effects, gradient accents.
   - ICON: CHỈ dùng SVG inline dạng line/stroke, đặt stroke="currentColor" để icon tự đồng bộ màu theo màu chữ của section. TUYỆT ĐỐI KHÔNG dùng emoji, KHÔNG icon font hay thư viện icon ngoài (icon nhựa xấu).
   - FORM THU THẬP: nếu trang có mục đích đăng ký / đặt hàng / liên hệ / thu thập khách, PHẢI có <form> với các ô nhập rõ ràng (họ tên [name], số điện thoại [name=phone], email [name=email] tùy phù hợp) và nút submit. Đặt thuộc tính name có ý nghĩa cho mỗi input. Không cần thêm action/JS gửi — hệ thống tự nhận dữ liệu.
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


def _guess_field(data: dict, *keys: str) -> str | None:
    for k, v in data.items():
        kl = str(k).lower()
        if any(key in kl for key in keys) and v:
            return str(v)[:320]
    return None


# Public route — nhận thông tin khách để lại qua form (lead/đơn hàng), không cần auth
@public_router.post("/p/{slug}/submit")
async def submit_landing_lead(
    slug: str, body: dict, session: AsyncSession = Depends(get_session)
):
    from app.models.landing_lead import LandingLead

    page = (await session.execute(
        select(LandingPage).where(LandingPage.slug == slug, LandingPage.status == "published")
    )).scalar_one_or_none()
    if not page:
        raise HTTPException(404, "Page not found")

    data = body.get("data") if isinstance(body.get("data"), dict) else body
    if not isinstance(data, dict) or not data:
        raise HTTPException(400, "Không có dữ liệu")
    # Giới hạn kích thước để tránh lạm dụng
    data = {str(k)[:100]: str(v)[:2000] for k, v in list(data.items())[:40]}

    lead = LandingLead(
        landing_page_id=page.id,
        user_id=page.user_id,
        name=_guess_field(data, "name", "họ", "ten", "tên"),
        email=_guess_field(data, "email", "mail"),
        phone=_guess_field(data, "phone", "sdt", "điện thoại", "dien thoai", "tel", "mobile"),
        data=data,
    )
    session.add(lead)
    await session.commit()

    # Thông báo cho chủ trang qua email (không chặn nếu lỗi)
    try:
        from app.models.user import User
        from app.services.email_service import email_service

        owner = await session.get(User, page.user_id)
        if owner and email_service.enabled:
            rows = "".join(
                f"<tr><td style='padding:4px 8px;font-weight:600'>{html_mod.escape(str(k))}</td>"
                f"<td style='padding:4px 8px'>{html_mod.escape(str(v))}</td></tr>"
                for k, v in data.items()
            )
            await email_service.send_email(
                to=[owner.email],
                subject=f"[Vitba] Khách mới từ trang '{page.title}'",
                html_content=(
                    f"<h3>Bạn có một khách để lại thông tin trên trang <b>{html_mod.escape(page.title)}</b></h3>"
                    f"<table style='border-collapse:collapse'>{rows}</table>"
                ),
            )
    except Exception:
        pass

    return {"ok": True}


# Owner route — xem danh sách khách của một trang
@router.get("/mcp/landing/pages/{page_id}/leads")
async def list_landing_leads(
    page_id: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    from app.models.landing_lead import LandingLead

    page = await session.get(LandingPage, page_id)
    if not page or page.user_id != user.id:
        raise HTTPException(404, "Page not found")
    rows = (await session.execute(
        select(LandingLead)
        .where(LandingLead.landing_page_id == page_id)
        .order_by(LandingLead.created_at.desc())
    )).scalars().all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "email": r.email,
            "phone": r.phone,
            "data": r.data,
            "created_at": r.created_at.isoformat() if r.created_at else "",
        }
        for r in rows
    ]
