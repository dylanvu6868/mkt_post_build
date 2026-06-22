from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.api.deps import get_current_user
from app.models.user import User
from app.mcp.meta import tools as meta_tools
from app.mcp.email import tools as email_tools

router = APIRouter(prefix="/mcp", tags=["mcp"])


# ── Request schemas ──

class PublishPostReq(BaseModel):
    page_id: str
    message: str
    image_url: str | None = None

class SchedulePostReq(BaseModel):
    page_id: str
    message: str
    publish_time: str

class CommentReq(BaseModel):
    page_id: str
    post_id: str

class ReplyCommentReq(BaseModel):
    page_id: str
    comment_id: str
    message: str

class InsightsReq(BaseModel):
    page_id: str
    days: int = 7

class EmailReq(BaseModel):
    to: list[str]
    subject: str
    html: str
    from_email: str | None = None

class BatchEmailReq(BaseModel):
    recipients: list[dict]
    subject: str
    html_template: str
    from_email: str | None = None


# ── Meta / Facebook endpoints ──

@router.get("/meta/pages")
async def list_pages(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await meta_tools.list_pages(session, user.id)


@router.post("/meta/publish")
async def publish_post(body: PublishPostReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await meta_tools.publish_post(session, user.id, body.page_id, body.message, body.image_url)


@router.post("/meta/schedule")
async def schedule_post(body: SchedulePostReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    dt = datetime.fromisoformat(body.publish_time)
    return await meta_tools.schedule_post(session, user.id, body.page_id, body.message, dt)


@router.post("/meta/comments")
async def get_comments(body: CommentReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await meta_tools.get_comments(session, user.id, body.page_id, body.post_id)


@router.post("/meta/reply")
async def reply_comment(body: ReplyCommentReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await meta_tools.reply_comment(session, user.id, body.page_id, body.comment_id, body.message)


@router.post("/meta/insights")
async def get_insights(body: InsightsReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await meta_tools.get_insights(session, user.id, body.page_id, body.days)


# ── Email endpoints ──

@router.post("/email/send")
async def send_email(body: EmailReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await email_tools.send_email(session, user.id, body.to, body.subject, body.html, body.from_email)


@router.post("/email/batch")
async def send_batch(body: BatchEmailReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await email_tools.send_batch(session, user.id, body.recipients, body.subject, body.html_template, body.from_email)


@router.get("/email/stats")
async def email_stats(campaign_id: int | None = None, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await email_tools.get_email_stats(session, user.id, campaign_id)
