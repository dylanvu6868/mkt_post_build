"""Cross-Post Orchestrator — publish one piece of content to multiple platforms at once.

This is the "killer feature" of Vitba: generate content → 1 click → publish to
Facebook, Email, and (future) TikTok/Zalo simultaneously. It also links the
Content Calendar to Meta so a scheduled calendar item auto-publishes when due.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.mcp.email import tools as email_tools
from app.mcp.meta import tools as meta_tools
from app.models.content_item import ContentItem
from app.models.user import User
from app.services.audit import log_action

logger = logging.getLogger(__name__)


async def cross_post(
    session: AsyncSession,
    user: User,
    content: str,
    *,
    meta_page_ids: list[str] | None = None,
    email_recipients: list[str] | None = None,
    email_subject: str | None = None,
    image_url: str | None = None,
    content_item_id: int | None = None,
) -> dict[str, Any]:
    """Publish to all selected platforms in parallel-ish sequence.

    Returns a per-platform result map:
      {"meta": [...], "email": {...}, "errors": [...]}
    """
    results: dict[str, Any] = {"meta": [], "email": {}, "errors": []}

    # ─── Meta (Facebook Pages) ──────────────────────────────
    if meta_page_ids:
        for page_id in meta_page_ids:
            r = await meta_tools.create_post(session, user, page_id, content, image_url)
            if "error" in r:
                results["errors"].append({"platform": "meta", "page_id": page_id, "error": r["error"]})
            else:
                results["meta"].append(r)

    # ─── Email ──────────────────────────────────────────────
    if email_recipients and email_subject:
        try:
            r = await email_tools.send_email(
                session, user.id, email_recipients, email_subject,
                _email_html(content, image_url),
            )
            results["email"] = r
        except Exception as exc:  # noqa: BLE001
            results["errors"].append({"platform": "email", "error": str(exc)})

    # ─── Mark calendar item as published ────────────────────
    if content_item_id:
        item = await session.get(ContentItem, content_item_id)
        if item and item.user_id == user.id:
            item.status = "published"
            item.published_date = datetime.now(timezone.utc)
            await session.commit()

    await log_action(
        session, user.id, "orchestrator.cross_post", "content_item",
        str(content_item_id) if content_item_id else None,
        {
            "meta_pages": len(meta_page_ids or []),
            "email_recipients": len(email_recipients or []),
            "has_image": bool(image_url),
        },
    )
    return results


def _email_html(content: str, image_url: str | None = None) -> str:
    """Wrap plain-text content in a simple responsive HTML email body."""
    img_tag = f'<img src="{image_url}" alt="" style="max-width:100%;border-radius:12px;margin:16px 0;" />' if image_url else ""
    return f"""\
<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a;">
  {img_tag}
  <div style="white-space:pre-wrap;font-size:15px;line-height:1.6;">{content}</div>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
  <p style="font-size:12px;color:#888;">Email gửi từ Vitba.ai — AI Marketing Platform</p>
</div>"""


async def publish_scheduled_calendar_item(session: AsyncSession, item: ContentItem) -> dict[str, Any]:
    """Called by the scheduler when a calendar item is due.

    Looks up the owner and publishes to the platforms attached to the item
    (stored in item.tags or a dedicated column). For MVP we publish to all
    connected Meta pages.
    """
    user = await session.get(User, item.user_id)
    if user is None:
        return {"error": "user not found"}

    # Determine target platforms from tags (e.g. ["meta:123", "meta:456", "email"])
    meta_page_ids: list[str] = []
    email_recipients: list[str] = []
    tags = item.tags or []
    for tag in tags:
        if tag.startswith("meta:"):
            meta_page_ids.append(tag[5:])
        elif tag == "email" and item.body:
            # crude: treat body as comma-separated recipients for MVP
            email_recipients = [e.strip() for e in item.body.split(",") if "@" in e]

    return await cross_post(
        session,
        user,
        content=item.title + "\n\n" + (item.body or ""),
        meta_page_ids=meta_page_ids,
        email_recipients=email_recipients,
        email_subject=item.title,
        content_item_id=item.id,
    )
