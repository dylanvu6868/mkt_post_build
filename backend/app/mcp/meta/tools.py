from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.encryption import decrypt_token
from app.models.campaign import Campaign
from app.models.meta_page import MetaPage
from app.mcp.meta import graph_api
from app.services.audit import log_action


async def _get_page_token(session: AsyncSession, user_id: int, page_id: str) -> str:
    row = (await session.execute(
        select(MetaPage).where(MetaPage.user_id == user_id, MetaPage.page_id == page_id)
    )).scalar_one_or_none()
    if not row:
        raise ValueError(f"Page {page_id} not linked for user {user_id}")
    return decrypt_token(row.page_access_token_enc)


async def list_pages(session: AsyncSession, user_id: int) -> list[dict]:
    rows = (await session.execute(
        select(MetaPage).where(MetaPage.user_id == user_id)
    )).scalars().all()
    return [
        {"page_id": r.page_id, "name": r.page_name, "category": r.category, "followers": r.followers_count}
        for r in rows
    ]


async def publish_post(
    session: AsyncSession, user_id: int, page_id: str, message: str, image_url: str | None = None,
) -> dict:
    token = await _get_page_token(session, user_id, page_id)
    result = await graph_api.publish_post(token, page_id, message, image_url)
    post_id = result.get("id") or result.get("post_id", "")

    campaign = Campaign(
        user_id=user_id, type="meta_post", title=message[:200], content=message,
        status="published", published_at=datetime.now(timezone.utc), meta_post_id=str(post_id),
    )
    session.add(campaign)
    await session.commit()

    await log_action(session, user_id, "meta.publish_post", "campaign", str(campaign.id),
                     {"page_id": page_id, "post_id": post_id})
    return {"post_id": post_id, "campaign_id": campaign.id}


async def schedule_post(
    session: AsyncSession, user_id: int, page_id: str, message: str, publish_time: datetime,
) -> dict:
    token = await _get_page_token(session, user_id, page_id)
    ts = int(publish_time.timestamp())
    result = await graph_api.schedule_post(token, page_id, message, ts)
    post_id = result.get("id", "")

    campaign = Campaign(
        user_id=user_id, type="meta_scheduled", title=message[:200], content=message,
        status="scheduled", scheduled_at=publish_time, meta_post_id=str(post_id),
    )
    session.add(campaign)
    await session.commit()

    await log_action(session, user_id, "meta.schedule_post", "campaign", str(campaign.id),
                     {"page_id": page_id, "scheduled": publish_time.isoformat()})
    return {"post_id": post_id, "campaign_id": campaign.id}


async def get_comments(session: AsyncSession, user_id: int, page_id: str, post_id: str) -> list[dict]:
    token = await _get_page_token(session, user_id, page_id)
    comments = await graph_api.get_post_comments(token, post_id)
    await log_action(session, user_id, "meta.get_comments", "post", post_id)
    return comments


async def reply_comment(
    session: AsyncSession, user_id: int, page_id: str, comment_id: str, message: str,
) -> dict:
    token = await _get_page_token(session, user_id, page_id)
    result = await graph_api.reply_to_comment(token, comment_id, message)
    await log_action(session, user_id, "meta.reply_comment", "comment", comment_id)
    return result


async def get_insights(session: AsyncSession, user_id: int, page_id: str, days: int = 7) -> dict:
    token = await _get_page_token(session, user_id, page_id)
    data = await graph_api.get_page_insights(token, page_id, days=days)
    await log_action(session, user_id, "meta.get_insights", "page", page_id)
    return data
