import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.mcp.seo.analyzer import analyze_html, extract_keywords
from app.models.seo_audit import SeoAudit
from app.models.user import User
from app.services.audit import log_action

router = APIRouter(prefix="/mcp/seo", tags=["seo"])


class AnalyzeReq(BaseModel):
    url: str | None = None
    html: str | None = None

class KeywordsReq(BaseModel):
    text: str
    top_n: int = 20


@router.post("/analyze")
async def analyze(body: AnalyzeReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    if not body.url and not body.html:
        raise HTTPException(400, "Provide url or html")
    html = body.html or ""
    if body.url and not html:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(body.url, follow_redirects=True)
                resp.raise_for_status()
                html = resp.text
        except httpx.HTTPError as exc:
            raise HTTPException(400, f"Could not fetch URL: {exc}")
    result = analyze_html(html, body.url)
    audit = SeoAudit(
        user_id=user.id, url=body.url,
        title=result["title"].get("text", ""),
        score=result["score"], issues=result["issues"],
        suggestions=result["suggestions"], meta_data=result,
    )
    session.add(audit)
    await session.commit()
    await log_action(session, user.id, "seo.analyze", "seo_audit", str(audit.id))
    return {**result, "audit_id": audit.id}


@router.post("/keywords")
async def keywords(body: KeywordsReq, user: User = Depends(get_current_user)):
    return extract_keywords(body.text, body.top_n)


@router.get("/audits")
async def list_audits(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(
        select(SeoAudit).where(SeoAudit.user_id == user.id).order_by(SeoAudit.created_at.desc()).limit(50)
    )).scalars().all()
    return [{"id": a.id, "url": a.url, "title": a.title, "score": a.score, "created_at": str(a.created_at)} for a in rows]


@router.get("/audits/{audit_id}")
async def get_audit(audit_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    audit = await session.get(SeoAudit, audit_id)
    if not audit or audit.user_id != user.id:
        raise HTTPException(404, "Audit not found")
    return {"id": audit.id, "url": audit.url, "title": audit.title, "score": audit.score, "issues": audit.issues, "suggestions": audit.suggestions, "meta_data": audit.meta_data, "created_at": str(audit.created_at)}
