from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.email_contact import EmailContact
from app.models.email_list import EmailList, email_list_contacts
from app.models.user import User
from app.services.audit import log_action

router = APIRouter(prefix="/mcp/email/lists", tags=["email-lists"])


class ListCreate(BaseModel):
    name: str
    description: str | None = None

class ListContactsReq(BaseModel):
    contact_ids: list[int]


@router.get("")
async def list_lists(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(
        select(EmailList).where(EmailList.user_id == user.id).order_by(EmailList.created_at.desc())
    )).scalars().all()
    results = []
    for lst in rows:
        count = (await session.execute(
            select(email_list_contacts.c.contact_id).where(email_list_contacts.c.list_id == lst.id)
        )).scalars().all()
        results.append({"id": lst.id, "name": lst.name, "description": lst.description, "contact_count": len(count)})
    return results


@router.post("", status_code=201)
async def create_list(body: ListCreate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    lst = EmailList(user_id=user.id, name=body.name, description=body.description)
    session.add(lst)
    await session.commit()
    await log_action(session, user.id, "email.list_create", "email_list", str(lst.id))
    return {"id": lst.id, "name": lst.name}


@router.post("/{list_id}/contacts")
async def add_contacts_to_list(list_id: int, body: ListContactsReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    lst = await session.get(EmailList, list_id)
    if not lst or lst.user_id != user.id:
        raise HTTPException(404, "List not found")
    for cid in body.contact_ids:
        contact = await session.get(EmailContact, cid)
        if contact and contact.user_id == user.id:
            await session.execute(email_list_contacts.insert().values(list_id=list_id, contact_id=cid))
    await session.commit()
    return {"added": len(body.contact_ids)}


@router.delete("/{list_id}/contacts")
async def remove_contacts_from_list(list_id: int, body: ListContactsReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    lst = await session.get(EmailList, list_id)
    if not lst or lst.user_id != user.id:
        raise HTTPException(404, "List not found")
    for cid in body.contact_ids:
        await session.execute(email_list_contacts.delete().where(
            email_list_contacts.c.list_id == list_id, email_list_contacts.c.contact_id == cid
        ))
    await session.commit()
    return {"removed": len(body.contact_ids)}


@router.delete("/{list_id}", status_code=204)
async def delete_list(list_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    lst = await session.get(EmailList, list_id)
    if not lst or lst.user_id != user.id:
        raise HTTPException(404, "List not found")
    await session.delete(lst)
    await session.commit()
