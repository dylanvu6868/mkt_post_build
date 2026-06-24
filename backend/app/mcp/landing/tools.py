import html as html_mod
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.core.plan_limits import check_daily_landing_generates
from app.models.landing_page import LandingPage
from app.models.user import User
from app.services.audit import log_action

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
    from app.llm.factory import get_chat_model, provider_available
    if not provider_available():
        raise HTTPException(503, "LLM provider not configured")
    llm = get_chat_model("fast")
    sections_str = ", ".join(body.sections) if body.sections else "hero, features, CTA"
    images_str = ""
    if body.hero_image_url:
        images_str += f"\nHero image URL: {body.hero_image_url}"
    if body.logo_url:
        images_str += f"\nLogo URL: {body.logo_url}"
    if body.additional_images:
        images_str += f"\nAdditional images: {', '.join(body.additional_images)}"
    template_str = f"\nTemplate style reference: {body.template}" if body.template else ""
    prompt = (
        f"Generate a complete, responsive HTML landing page with inline CSS.\n"
        f"Purpose: {body.purpose}\n"
        f"Product: {body.product}\n"
        f"Tone: {body.tone}\n"
        f"CTA button text: {body.cta}\n"
        f"Color scheme: {body.color_scheme}\n"
        f"Design style: {body.style}\n"
        f"Sections to include: {sections_str}\n"
        f"{images_str}{template_str}\n"
        f"Requirements:\n"
        f"- Mobile-responsive with media queries\n"
        f"- Single HTML file with inline <style>\n"
        f"- Use the specified color scheme as primary color\n"
        f"- Include all requested sections with proper spacing\n"
        f"- If image URLs are provided, use them with <img> tags (object-fit: cover)\n"
        f"- If no image URLs, use CSS gradient/pattern backgrounds instead\n"
        f"- Professional typography with system font stack\n"
        f"- Smooth hover transitions on buttons and links\n"
        f"Return ONLY the HTML code, no markdown fences."
    )
    response = await llm.ainvoke(prompt)
    html = (response.content if isinstance(response.content, str) else str(response.content)).strip()
    if html.startswith("```"):
        html = html.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
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


@router.delete("/mcp/landing/pages/{page_id}", status_code=204)
async def delete_page(page_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    page = await session.get(LandingPage, page_id)
    if not page or page.user_id != user.id:
        raise HTTPException(404, "Page not found")
    await session.delete(page)
    await session.commit()


# Public route — serve published landing pages (no auth)
@public_router.get("/p/{slug}")
async def serve_landing_page(slug: str, session: AsyncSession = Depends(get_session)):
    page = (await session.execute(
        select(LandingPage).where(LandingPage.slug == slug, LandingPage.status == "published")
    )).scalar_one_or_none()
    if not page:
        raise HTTPException(404, "Page not found")
    return HTMLResponse(_render(page))
