"""Meta MCP HTTP routes — OAuth callback + tool endpoints."""

import secrets
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.db import get_session
from app.mcp.meta.client import oauth_authorize_url
from app.mcp.meta import tools as meta_tools
from app.models.user import User

router = APIRouter(prefix="/mcp/meta", tags=["meta"])
public_router = APIRouter(prefix="/meta", tags=["meta"])


# ─── Request schemas ────────────────────────────────────────────

class PostReq(BaseModel):
    page_id: str
    content: str
    image_url: str | None = None

class BulkPostReq(BaseModel):
    page_ids: list[str]
    content: str
    image_url: str | None = None

class ScheduleReq(BaseModel):
    page_id: str
    content: str
    publish_time: str  # ISO-8601 UTC

class ReplyReq(BaseModel):
    comment_id: str
    message: str


class CrossPostReq(BaseModel):
    content: str
    meta_page_ids: list[str] = []
    email_recipients: list[str] = []
    email_subject: str | None = None
    image_url: str | None = None
    content_item_id: int | None = None


# ─── OAuth connect ──────────────────────────────────────────────

@router.get("/connect")
async def meta_connect(user: User = Depends(get_current_user)) -> dict[str, str]:
    """Return the Facebook OAuth authorize URL for the frontend to redirect to."""
    state = secrets.token_urlsafe(24)
    # state is single-use; in production store in Redis with user_id → state mapping.
    url = oauth_authorize_url(state)
    return {"authorize_url": url, "state": state}


@public_router.get("/oauth/callback")
async def meta_oauth_callback(
    request: Request,
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    error_reason: str | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
):
    """Public OAuth callback — exchanges code, stores tokens, redirects to frontend.

    The frontend passes the user_id via the 'state' query param (encoded) OR we
    require the caller to append &user_id=... when building the authorize URL.
    For security we expect the frontend to send the JWT in a cookie/header on a
    separate /connect/finish endpoint. Here we accept user_id via state for the
    MVP and recommend upgrading to session-bound state via Redis.
    """
    if error:
        return RedirectResponse(url=f"{settings.cors_origins.split(',')[0]}/hub/meta?error={error_reason or error}")
    if not code:
        raise HTTPException(400, "Thiếu code từ Meta")

    # Expect state to carry the user id (simple MVP encoding: "uid:<id>:<nonce>")
    user_id: int | None = None
    if state and state.startswith("uid:"):
        parts = state.split(":")
        if len(parts) >= 3:
            try:
                user_id = int(parts[1])
            except ValueError:
                user_id = None
    if user_id is None:
        raise HTTPException(400, "State không hợp lệ — không xác định được user")

    from app.models.user import User as UserModel
    user = await session.get(UserModel, user_id)
    if user is None:
        raise HTTPException(404, "Không tìm thấy user")

    result = await meta_tools.save_meta_tokens(session, user, code)
    frontend = settings.cors_origins.split(",")[0]
    if "error" in result:
        return RedirectResponse(url=f"{frontend}/hub/meta?error=connect_failed")
    return RedirectResponse(url=f"{frontend}/hub/meta?connected=1&pages={result.get('pages_synced', 0)}")


@router.get("/status")
async def meta_status(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    acct = await meta_tools.get_meta_account(session, user)
    if acct is None:
        return {"connected": False}
    pages = await meta_tools.list_pages(session, user)
    return {"connected": True, "provider_user_id": acct.provider_user_id, "pages": pages}


@router.post("/disconnect")
async def meta_disconnect(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, bool]:
    from sqlalchemy import delete
    from app.models.meta_page import MetaPage
    from app.models.oauth_account import OauthAccount
    await session.execute(delete(OauthAccount).where(OauthAccount.user_id == user.id, OauthAccount.provider == "meta"))
    await session.execute(delete(MetaPage).where(MetaPage.user_id == user.id))
    await session.commit()
    return {"disconnected": True}


@router.post("/sync-pages")
async def sync_pages(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    token = await meta_tools.get_user_token(session, user)
    if token is None:
        raise HTTPException(400, "Chưa kết nối Meta")
    count = await meta_tools.sync_pages(session, user, token)
    pages = await meta_tools.list_pages(session, user)
    return {"pages_synced": count, "pages": pages}


# ─── Tools ──────────────────────────────────────────────────────

@router.get("/pages")
async def list_pages(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    pages = await meta_tools.list_pages(session, user)
    return {"pages": pages}


@router.post("/post")
async def create_post(
    body: PostReq,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    return await meta_tools.create_post(session, user, body.page_id, body.content, body.image_url)


@router.post("/bulk-post")
async def bulk_post(
    body: BulkPostReq,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    return await meta_tools.bulk_post(session, user, body.page_ids, body.content, body.image_url)


@router.post("/schedule")
async def schedule_post(
    body: ScheduleReq,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    return await meta_tools.schedule_post(session, user, body.page_id, body.content, body.publish_time)


@router.get("/comments/{post_id}")
async def get_comments(
    post_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    return await meta_tools.get_comments(session, user, post_id)


@router.post("/reply")
async def reply_comment(
    body: ReplyReq,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    return await meta_tools.reply_comment(session, user, body.comment_id, body.message)


@router.get("/insights/{page_id}")
async def get_insights(
    page_id: str,
    range: str = "30d",
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    return await meta_tools.get_insights(session, user, page_id, range)


# ─── Cross-Post Orchestrator ─────────────────────────────────────

@router.post("/cross-post")
async def cross_post(
    body: CrossPostReq,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """Publish one piece of content to Meta + Email simultaneously."""
    from app.mcp.orchestrator import cross_post as _cross_post
    if not body.meta_page_ids and not body.email_recipients:
        raise HTTPException(400, "Chọn ít nhất một nền tảng để đăng.")
    if body.email_recipients and not body.email_subject:
        raise HTTPException(400, "Tiêu đề email là bắt buộc khi gửi email.")
    return await _cross_post(
        session, user, body.content,
        meta_page_ids=body.meta_page_ids,
        email_recipients=body.email_recipients,
        email_subject=body.email_subject,
        image_url=body.image_url,
        content_item_id=body.content_item_id,
    )
