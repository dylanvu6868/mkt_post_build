from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.email_contact import EmailContact
from app.models.email_list import EmailList
from app.models.email_template import EmailTemplate
from app.models.scheduled_email import ScheduledEmail
from app.models.user import User
from app.services.audit import log_action

router = APIRouter(prefix="/mcp/email", tags=["email-scheduling"])


class ScheduleReq(BaseModel):
    template_id: int
    list_id: int
    scheduled_at: str


@router.post("/schedule", status_code=201)
async def schedule_email(body: ScheduleReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    tpl = await session.get(EmailTemplate, body.template_id)
    if not tpl or tpl.user_id != user.id:
        raise HTTPException(404, "Template not found")
    lst = await session.get(EmailList, body.list_id)
    if not lst or lst.user_id != user.id:
        raise HTTPException(404, "List not found")
    sched = ScheduledEmail(
        user_id=user.id, template_id=body.template_id,
        list_id=body.list_id, scheduled_at=body.scheduled_at,
    )
    session.add(sched)
    await session.commit()
    await log_action(session, user.id, "email.schedule", "scheduled_email", str(sched.id))
    return {"id": sched.id, "scheduled_at": sched.scheduled_at, "status": sched.status}


@router.get("/scheduled")
async def list_scheduled(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(
        select(ScheduledEmail).where(ScheduledEmail.user_id == user.id).order_by(ScheduledEmail.created_at.desc())
    )).scalars().all()
    return [{"id": s.id, "template_id": s.template_id, "list_id": s.list_id, "scheduled_at": s.scheduled_at, "status": s.status, "sent_at": str(s.sent_at) if s.sent_at else None} for s in rows]


@router.post("/cancel-schedule")
async def cancel_schedule(schedule_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    sched = await session.get(ScheduledEmail, schedule_id)
    if not sched or sched.user_id != user.id:
        raise HTTPException(404, "Scheduled email not found")
    if sched.status != "pending":
        raise HTTPException(400, "Can only cancel pending schedules")
    sched.status = "cancelled"
    await session.commit()
    await log_action(session, user.id, "email.cancel_schedule", "scheduled_email", str(sched.id))
    return {"id": sched.id, "status": "cancelled"}


@router.post("/unsubscribe/{token}")
async def unsubscribe(token: str, session: AsyncSession = Depends(get_session)):
    contact = (await session.execute(
        select(EmailContact).where(EmailContact.email == token)
    )).scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contact not found")
    contact.status = "unsubscribed"
    await session.commit()
    return {"status": "unsubscribed"}
