"""User feedback endpoint — thumbs up/down + text comment on AI outputs."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.user import User
from app.models.user_feedback import UserFeedback

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


class FeedbackCreate(BaseModel):
    rating: str = Field(..., pattern="^(up|down)$")
    comment: str | None = None
    category: str | None = Field(None, pattern="^(accuracy|quality|speed|other)$")
    message_id: int | None = None
    content_history_id: int | None = None


class FeedbackResponse(BaseModel):
    id: int
    rating: str
    comment: str | None
    category: str | None


@router.post("", response_model=FeedbackResponse, status_code=201)
async def create_feedback(
    body: FeedbackCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not body.message_id and not body.content_history_id:
        raise HTTPException(400, "Phải cung cấp message_id hoặc content_history_id")
    fb = UserFeedback(
        user_id=user.id,
        message_id=body.message_id,
        content_history_id=body.content_history_id,
        rating=body.rating,
        comment=body.comment,
        category=body.category,
    )
    session.add(fb)
    await session.commit()
    await session.refresh(fb)
    return FeedbackResponse(id=fb.id, rating=fb.rating, comment=fb.comment, category=fb.category)


@router.get("/stats")
async def feedback_stats(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    rows = (
        await session.execute(
            select(UserFeedback.rating, func.count(UserFeedback.id))
            .where(UserFeedback.user_id == user.id)
            .group_by(UserFeedback.rating)
        )
    ).all()
    counts = {r[0]: r[1] for r in rows}
    total = sum(counts.values())
    up = counts.get("up", 0)
    down = counts.get("down", 0)
    satisfaction = round(up / total * 100, 1) if total > 0 else None
    return {"total": total, "up": up, "down": down, "satisfaction_pct": satisfaction}
