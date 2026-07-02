from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.content_history import ContentHistory
from app.models.email_draft import EmailDraft
from app.models.email_template import EmailTemplate
from app.models.lab_history import LabHistory
from app.models.landing_page import LandingPage
from app.models.project import Project
from app.models.seo_audit import SeoAudit
from app.models.user import User
from app.schemas.history import HistoryResponse
from app.services import history_service

router = APIRouter(prefix="/history", tags=["history"])

# Map lab_history.tool_name → frontend route to reopen the tool
_LAB_TOOL_ROUTES = {
    "report": "/hub/report",
    "frame_image": "/hub/frame",
    "invoice_extract": "/hub/frame",
    "seo_analysis": "/hub/lab/seo-analysis",
}

_LAB_TOOL_LABELS = {
    "report": "Vitba Report",
    "frame_image": "Vitba Frame",
    "invoice_extract": "Vitba Frame",
    "seo_analysis": "Phân tích SEO",
}


def _snippet(value: object, max_len: int = 160) -> str:
    text = str(value or "").strip()
    return text[:max_len]


def _lab_route(r: LabHistory) -> str:
    """Route mở lại kèm ?hist={id} để trang tool nạp lại đúng kết quả đã lưu."""
    base = _LAB_TOOL_ROUTES.get(r.tool_name, f"/hub/lab/{r.tool_name}")
    # Trang Frame tự hiển thị toàn bộ ảnh đã lưu — không cần deep-link
    if r.tool_name in ("frame_image", "invoice_extract"):
        return base
    return f"{base}?hist={r.id}"


@router.get("/unified")
async def unified_history(
    limit: int = Query(default=60, ge=1, le=200),
    source: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    """Lịch sử hợp nhất theo user: gộp mọi hoạt động Vitba từ các bảng nguồn."""
    items: list[dict] = []

    def want(name: str) -> bool:
        return source is None or source == name

    if want("lab"):
        rows = (await session.execute(
            select(LabHistory)
            .where(LabHistory.user_id == current_user.id)
            .order_by(LabHistory.created_at.desc())
            .limit(limit)
        )).scalars().all()
        for r in rows:
            inp = r.input_data or {}
            out = r.output_data or {}
            first_input = next((str(v) for v in inp.values() if isinstance(v, str) and v.strip()), "")
            title = _snippet(out.get("title") if isinstance(out, dict) else "", 80) or _snippet(first_input, 80)
            items.append({
                "id": f"lab:{r.id}",
                "source": "lab",
                "tool": _LAB_TOOL_LABELS.get(r.tool_name, r.tool_name),
                "title": title or r.tool_name,
                "snippet": _snippet(first_input),
                "status": "done",
                "created_at": r.created_at.isoformat() if r.created_at else "",
                "route": _lab_route(r),
            })

    if want("content"):
        rows = (await session.execute(
            select(ContentHistory)
            .join(Project, ContentHistory.project_id == Project.id)
            .where(Project.user_id == current_user.id)
            .order_by(ContentHistory.created_at.desc())
            .limit(limit)
        )).scalars().all()
        for r in rows:
            items.append({
                "id": f"content:{r.id}",
                "source": "content",
                "tool": r.content_type,
                "title": _snippet(r.prompt, 80) or r.content_type,
                "snippet": _snippet(r.prompt),
                "status": "done",
                "created_at": r.created_at.isoformat() if r.created_at else "",
                "route": "/history",
            })

    if want("landing"):
        rows = (await session.execute(
            select(LandingPage)
            .where(LandingPage.user_id == current_user.id)
            .order_by(LandingPage.created_at.desc())
            .limit(limit)
        )).scalars().all()
        for r in rows:
            items.append({
                "id": f"landing:{r.id}",
                "source": "landing",
                "tool": "Vitba Landing",
                "title": r.title,
                "snippet": f"/{r.slug}",
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else "",
                "route": f"/hub/landing?open={r.id}",
            })

    if want("email"):
        drafts = (await session.execute(
            select(EmailDraft)
            .where(EmailDraft.user_id == current_user.id)
            .order_by(EmailDraft.updated_at.desc())
            .limit(limit)
        )).scalars().all()
        for r in drafts:
            items.append({
                "id": f"email_draft:{r.id}",
                "source": "email",
                "tool": "Vitba Mail",
                "title": r.subject or "Email nháp",
                "snippet": _snippet((r.meta or {}).get("purpose", "")),
                "status": "draft",
                "created_at": (r.updated_at or r.created_at).isoformat() if (r.updated_at or r.created_at) else "",
                "route": f"/hub/email?draft={r.id}",
            })
        templates = (await session.execute(
            select(EmailTemplate)
            .where(EmailTemplate.user_id == current_user.id)
            .order_by(EmailTemplate.created_at.desc())
            .limit(limit)
        )).scalars().all()
        for r in templates:
            items.append({
                "id": f"email_template:{r.id}",
                "source": "email",
                "tool": "Vitba Mail",
                "title": r.name,
                "snippet": _snippet(r.subject),
                "status": "template",
                "created_at": r.created_at.isoformat() if r.created_at else "",
                "route": "/hub/email",
            })

    if want("seo"):
        rows = (await session.execute(
            select(SeoAudit)
            .where(SeoAudit.user_id == current_user.id)
            .order_by(SeoAudit.created_at.desc())
            .limit(limit)
        )).scalars().all()
        for r in rows:
            items.append({
                "id": f"seo:{r.id}",
                "source": "seo",
                "tool": "Vitba SEO",
                "title": r.title or r.url or "SEO Audit",
                "snippet": _snippet(r.url),
                "status": f"score {r.score}",
                "created_at": r.created_at.isoformat() if r.created_at else "",
                "route": "/hub/seo",
            })

    items.sort(key=lambda x: x["created_at"] or "", reverse=True)
    return items[:limit]


@router.get("", response_model=list[HistoryResponse])
async def list_history(
    project_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[HistoryResponse]:
    project = await session.get(Project, project_id)
    if project is None or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    items = await history_service.list_history(
        session, project_id, current_user.id, current_user
    )
    return [HistoryResponse.model_validate(i) for i in items]


@router.delete("/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_history_item(
    history_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    deleted = await history_service.delete_history(session, history_id, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History item not found",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
