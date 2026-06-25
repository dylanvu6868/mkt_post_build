"""Meta MCP tools — Facebook page publishing, comments, insights."""

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.encryption import decrypt_token, encrypt_token
from app.mcp.meta.client import (
    exchange_code_for_token,
    exchange_for_long_lived,
    graph_get,
    graph_post,
)
from app.models.meta_page import MetaPage
from app.models.oauth_account import OauthAccount
from app.models.user import User
from app.services.audit import log_action

logger = logging.getLogger(__name__)


# ─── Token helpers ──────────────────────────────────────────────

async def get_meta_account(session: AsyncSession, user: User) -> OauthAccount | None:
    result = await session.execute(
        select(OauthAccount).where(
            OauthAccount.user_id == user.id,
            OauthAccount.provider == "meta",
        )
    )
    return result.scalar_one_or_none()


async def get_user_token(session: AsyncSession, user: User) -> str | None:
    acct = await get_meta_account(session, user)
    if acct is None:
        return None
    return decrypt_token(acct.access_token_enc)


# ─── OAuth connect ──────────────────────────────────────────────

async def save_meta_tokens(session: AsyncSession, user: User, code: str) -> dict[str, Any]:
    """Exchange OAuth code, store long-lived token, sync pages."""
    token_data = await exchange_code_for_token(code)
    short_token = token_data.get("access_token")
    if not short_token:
        return {"error": "Không lấy được access token từ Meta", "raw": token_data}

    # Exchange for long-lived
    long_data = await exchange_for_long_lived(short_token)
    long_token = long_data.get("access_token", short_token)
    expires_in = long_data.get("expires_in")
    expires_at = None
    if expires_in:
        from datetime import timedelta
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))

    # Fetch user identity
    me = await graph_get("me", long_token, fields="id,name")
    provider_user_id = me.get("id")

    # Upsert oauth account
    existing = await get_meta_account(session, user)
    if existing:
        existing.access_token_enc = encrypt_token(long_token)
        existing.provider_user_id = provider_user_id
        existing.expires_at = expires_at
        existing.scopes = ",".join(token_data.get("data", {}).get("granted_scopes", []) or [])
    else:
        acct = OauthAccount(
            user_id=user.id,
            provider="meta",
            provider_user_id=provider_user_id,
            access_token_enc=encrypt_token(long_token),
            expires_at=expires_at,
        )
        session.add(acct)
    await session.commit()

    # Sync pages
    pages_synced = await sync_pages(session, user, long_token)
    return {"connected": True, "user": me, "pages_synced": pages_synced}


async def sync_pages(session: AsyncSession, user: User, user_token: str) -> int:
    """Fetch and cache the user's Facebook pages."""
    data = await graph_get("me/accounts", user_token, fields="id,name,category,access_token,picture,followers_count")
    pages = data.get("data", [])

    # Clear old cached pages for this user
    await session.execute(delete(MetaPage).where(MetaPage.user_id == user.id))

    for p in pages:
        page = MetaPage(
            user_id=user.id,
            page_id=p["id"],
            name=p.get("name", ""),
            category=p.get("category"),
            access_token_enc=encrypt_token(p["access_token"]),
            picture_url=(p.get("picture") or {}).get("data", {}).get("url") if isinstance(p.get("picture"), dict) else None,
            followers_count=p.get("followers_count"),
            last_synced_at=datetime.now(timezone.utc),
        )
        session.add(page)
    await session.commit()
    return len(pages)


# ─── Page helpers ───────────────────────────────────────────────

async def get_page(session: AsyncSession, user: User, page_id: str) -> MetaPage | None:
    result = await session.execute(
        select(MetaPage).where(MetaPage.user_id == user.id, MetaPage.page_id == page_id)
    )
    return result.scalar_one_or_none()


async def list_pages(session: AsyncSession, user: User) -> list[dict[str, Any]]:
    result = await session.execute(
        select(MetaPage).where(MetaPage.user_id == user.id).order_by(MetaPage.name)
    )
    pages = result.scalars().all()
    return [
        {
            "id": p.page_id,
            "name": p.name,
            "category": p.category,
            "picture_url": p.picture_url,
            "followers_count": p.followers_count,
        }
        for p in pages
    ]


# ─── Publishing ─────────────────────────────────────────────────

async def create_post(
    session: AsyncSession, user: User, page_id: str, content: str, image_url: str | None = None
) -> dict[str, Any]:
    page = await get_page(session, user, page_id)
    if page is None:
        return {"error": "Không tìm thấy trang. Vui lòng kết nối lại Meta."}
    token = decrypt_token(page.access_token_enc)

    if image_url:
        result = await graph_post(
            f"{page_id}/photos",
            token,
            url=image_url,
            caption=content,
            published="true",
        )
    else:
        result = await graph_post(f"{page_id}/feed", token, message=content)

    if "error" in result:
        return {"error": result["error"].get("message", "Lỗi không xác định từ Meta")}

    post_id = result.get("id") or result.get("post_id")
    await log_action(session, user.id, "meta.post_create", "meta_page", page_id,
                     {"post_id": post_id, "has_image": bool(image_url)})
    return {"post_id": post_id, "page_id": page_id}


async def bulk_post(
    session: AsyncSession, user: User, page_ids: list[str], content: str, image_url: str | None = None
) -> dict[str, Any]:
    results = []
    for pid in page_ids:
        r = await create_post(session, user, pid, content, image_url)
        results.append({"page_id": pid, **r})
    return {"results": results}


async def schedule_post(
    session: AsyncSession, user: User, page_id: str, content: str, publish_time: str
) -> dict[str, Any]:
    """publish_time must be ISO-8601 or a Meta-compatible datetime string (UTC)."""
    page = await get_page(session, user, page_id)
    if page is None:
        return {"error": "Không tìm thấy trang."}
    token = decrypt_token(page.access_token_enc)

    # Meta expects a Unix timestamp for scheduled_publish_time
    try:
        dt = datetime.fromisoformat(publish_time.replace("Z", "+00:00"))
        ts = int(dt.timestamp())
    except ValueError:
        return {"error": "publish_time phải đúng định dạng ISO-8601"}

    result = await graph_post(
        f"{page_id}/feed",
        token,
        message=content,
        published="false",
        scheduled_publish_time=str(ts),
    )
    if "error" in result:
        return {"error": result["error"].get("message", "Lỗi lên lịch từ Meta")}
    await log_action(session, user.id, "meta.post_schedule", "meta_page", page_id,
                     {"post_id": result.get("id"), "publish_time": publish_time})
    return {"post_id": result.get("id"), "scheduled_for": publish_time}


# ─── Comments ───────────────────────────────────────────────────

async def get_comments(session: AsyncSession, user: User, post_id: str) -> dict[str, Any]:
    # Need a page token — find the page that owns this post.
    # Post id format: "{page_id}_{post_id}". Extract page_id.
    page_id = post_id.split("_")[0] if "_" in post_id else None
    token = None
    if page_id:
        page = await get_page(session, user, page_id)
        if page:
            token = decrypt_token(page.access_token_enc)
    if token is None:
        # Fallback to user token
        token = await get_user_token(session, user)
        if token is None:
            return {"error": "Chưa kết nối Meta"}

    data = await graph_get(f"{post_id}/comments", token, fields="id,from,message,created_time,like_count")
    return {"comments": data.get("data", [])}


async def reply_comment(session: AsyncSession, user: User, comment_id: str, message: str) -> dict[str, Any]:
    # comment_id format: "{page_id}_{post_id}_{comment_id}" — page token needed
    page_id = comment_id.split("_")[0] if "_" in comment_id else None
    token = None
    if page_id:
        page = await get_page(session, user, page_id)
        if page:
            token = decrypt_token(page.access_token_enc)
    if token is None:
        token = await get_user_token(session, user)
        if token is None:
            return {"error": "Chưa kết nối Meta"}

    result = await graph_post(f"{comment_id}/comments", token, message=message)
    if "error" in result:
        return {"error": result["error"].get("message", "Lỗi trả lời bình luận")}
    await log_action(session, user.id, "meta.comment_reply", "meta_comment", comment_id, {"message": message[:100]})
    return {"reply_id": result.get("id")}


# ─── Insights ───────────────────────────────────────────────────

INSIGHT_METRIC_MAP = {
    "7d": "day",
    "30d": "day",
    "90d": "day",
}

PERIOD_DAYS = {"7d": 7, "30d": 30, "90d": 90}


async def get_insights(session: AsyncSession, user: User, page_id: str, range_key: str = "30d") -> dict[str, Any]:
    page = await get_page(session, user, page_id)
    if page is None:
        return {"error": "Không tìm thấy trang."}
    token = decrypt_token(page.access_token_enc)
    period = INSIGHT_METRIC_MAP.get(range_key, "day")
    days = PERIOD_DAYS.get(range_key, 30)

    since = int((datetime.now(timezone.utc)).timestamp()) - days * 86400
    until = int(datetime.now(timezone.utc).timestamp())

    # Page-level metrics
    metrics = "page_impressions,page_post_engagements,page_fans"
    data = await graph_get(
        f"{page_id}/insights",
        token,
        metric=metrics,
        period=period,
        since=since,
        until=until,
    )

    totals = {"reach": 0, "engagement": 0, "followers": page.followers_count or 0}
    for entry in data.get("data", []):
        name = entry.get("name")
        values = entry.get("values", [])
        if name == "page_impressions" and values:
            totals["reach"] = sum(v.get("value", 0) for v in values)
        elif name == "page_post_engagements" and values:
            totals["engagement"] = sum(v.get("value", 0) for v in values)

    await log_action(session, user.id, "meta.insights", "meta_page", page_id, {"range": range_key})
    return {"page_id": page_id, "range": range_key, **totals}
