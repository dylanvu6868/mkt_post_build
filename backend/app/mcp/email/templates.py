from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.email_template import EmailTemplate
from app.models.user import User
from app.services.audit import log_action

router = APIRouter(prefix="/mcp/email/templates", tags=["email-templates"])


class TemplateCreate(BaseModel):
    name: str
    subject: str
    html_body: str
    variables: list[str] | None = None
    category: str | None = None

class TemplateUpdate(BaseModel):
    name: str | None = None
    subject: str | None = None
    html_body: str | None = None
    variables: list[str] | None = None
    category: str | None = None


@router.get("")
async def list_templates(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(
        select(EmailTemplate).where(EmailTemplate.user_id == user.id).order_by(EmailTemplate.created_at.desc())
    )).scalars().all()
    return [{"id": t.id, "name": t.name, "subject": t.subject, "category": t.category, "created_at": str(t.created_at)} for t in rows]


@router.get("/{template_id}")
async def get_template(template_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    tpl = await session.get(EmailTemplate, template_id)
    if not tpl or tpl.user_id != user.id:
        raise HTTPException(404, "Template not found")
    return {"id": tpl.id, "name": tpl.name, "subject": tpl.subject, "html_body": tpl.html_body, "variables": tpl.variables, "category": tpl.category}


@router.post("", status_code=201)
async def create_template(body: TemplateCreate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    tpl = EmailTemplate(user_id=user.id, name=body.name, subject=body.subject, html_body=body.html_body, variables=body.variables, category=body.category)
    session.add(tpl)
    await session.commit()
    await log_action(session, user.id, "email.template_create", "email_template", str(tpl.id))
    return {"id": tpl.id, "name": tpl.name}


@router.patch("/{template_id}")
async def update_template(template_id: int, body: TemplateUpdate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    tpl = await session.get(EmailTemplate, template_id)
    if not tpl or tpl.user_id != user.id:
        raise HTTPException(404, "Template not found")
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(tpl, field, val)
    await session.commit()
    await log_action(session, user.id, "email.template_update", "email_template", str(tpl.id))
    return {"id": tpl.id, "name": tpl.name}


@router.delete("/{template_id}", status_code=204)
async def delete_template(template_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    tpl = await session.get(EmailTemplate, template_id)
    if not tpl or tpl.user_id != user.id:
        raise HTTPException(404, "Template not found")
    await session.delete(tpl)
    await session.commit()
    await log_action(session, user.id, "email.template_delete", "email_template", str(template_id))
