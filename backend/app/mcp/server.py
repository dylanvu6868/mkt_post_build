from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.api.deps import get_current_user
from app.models.user import User
from app.mcp.email import tools as email_tools

router = APIRouter(prefix="/mcp", tags=["mcp"])


# -- Request schemas --

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


# -- Email endpoints --

@router.post("/email/send")
async def send_email(body: EmailReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await email_tools.send_email(session, user.id, body.to, body.subject, body.html, body.from_email)


@router.post("/email/batch")
async def send_batch(body: BatchEmailReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await email_tools.send_batch(session, user.id, body.recipients, body.subject, body.html_template, body.from_email)


@router.get("/email/stats")
async def email_stats(campaign_id: int | None = None, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await email_tools.get_email_stats(session, user.id, campaign_id)
