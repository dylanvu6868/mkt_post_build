from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.content_item import ContentItem
from app.models.user import User
from app.services.audit import log_action

router = APIRouter(prefix="/mcp/calendar", tags=["calendar"])

VALID_STATUSES = {"draft", "review", "approved", "published", "archived"}
VALID_TRANSITIONS = {
    "draft": {"review", "archived"},
    "review": {"draft", "approved", "archived"},
    "approved": {"published", "archived"},
    "published": {"archived"},
    "archived": set(),
}


class ItemCreate(BaseModel):
    title: str
    content_type: str
    body: str | None = None
    scheduled_date: str | None = None
    tags: list[str] | None = None

class ItemUpdate(BaseModel):
    title: str | None = None
    content_type: str | None = None
    body: str | None = None
    scheduled_date: str | None = None
    tags: list[str] | None = None

class StatusUpdate(BaseModel):
    status: str


@router.get("/items")
async def list_items(
    status: str | None = None, month: str | None = None, content_type: str | None = None,
    user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session),
):
    q = select(ContentItem).where(ContentItem.user_id == user.id)
    if status:
        q = q.where(ContentItem.status == status)
    if content_type:
        q = q.where(ContentItem.content_type == content_type)
    if month:
        q = q.where(ContentItem.scheduled_date.like(f"{month}%"))
    rows = (await session.execute(q.order_by(ContentItem.created_at.desc()))).scalars().all()
    return [{"id": i.id, "title": i.title, "content_type": i.content_type, "status": i.status, "scheduled_date": i.scheduled_date, "tags": i.tags, "created_at": str(i.created_at)} for i in rows]


@router.post("/items", status_code=201)
async def create_item(body: ItemCreate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    item = ContentItem(user_id=user.id, title=body.title, content_type=body.content_type, body=body.body, scheduled_date=body.scheduled_date, tags=body.tags)
    session.add(item)
    await session.commit()
    await log_action(session, user.id, "calendar.item_create", "content_item", str(item.id))
    return {"id": item.id, "title": item.title, "status": item.status}


@router.get("/overview")
async def overview(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(select(ContentItem).where(ContentItem.user_id == user.id))).scalars().all()
    by_status: dict[str, int] = {}
    by_type: dict[str, int] = {}
    for item in rows:
        by_status[item.status] = by_status.get(item.status, 0) + 1
        by_type[item.content_type] = by_type.get(item.content_type, 0) + 1
    return {"total": len(rows), "by_status": by_status, "by_type": by_type}


@router.get("/items/{item_id}")
async def get_item(item_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    item = await session.get(ContentItem, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Item not found")
    return {"id": item.id, "title": item.title, "content_type": item.content_type, "body": item.body, "status": item.status, "scheduled_date": item.scheduled_date, "tags": item.tags}


@router.patch("/items/{item_id}")
async def update_item(item_id: int, body: ItemUpdate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    item = await session.get(ContentItem, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Item not found")
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(item, field, val)
    await session.commit()
    return {"id": item.id, "title": item.title}


@router.patch("/items/{item_id}/status")
async def update_status(item_id: int, body: StatusUpdate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    item = await session.get(ContentItem, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Item not found")
    if body.status not in VALID_STATUSES:
        raise HTTPException(400, f"Invalid status: {body.status}")
    allowed = VALID_TRANSITIONS.get(item.status, set())
    if body.status != item.status and body.status not in allowed:
        raise HTTPException(400, f"Cannot transition from {item.status} to {body.status}")
    item.status = body.status
    if body.status == "published":
        item.published_date = datetime.now(timezone.utc).isoformat()
    await session.commit()
    await log_action(session, user.id, "calendar.status_change", "content_item", str(item.id), {"new_status": body.status})
    return {"id": item.id, "status": item.status}


@router.delete("/items/{item_id}", status_code=204)
async def delete_item(item_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    item = await session.get(ContentItem, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Item not found")
    await session.delete(item)
    await session.commit()
