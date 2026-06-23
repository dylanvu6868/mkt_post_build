import csv
import io

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.email_contact import EmailContact
from app.models.user import User
from app.services.audit import log_action

router = APIRouter(prefix="/mcp/email/contacts", tags=["email-contacts"])


class ContactCreate(BaseModel):
    email: str
    name: str | None = None
    tags: list[str] | None = None

class ContactUpdate(BaseModel):
    name: str | None = None
    tags: list[str] | None = None
    status: str | None = None


@router.get("")
async def list_contacts(
    tag: str | None = None, status: str | None = None,
    user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session),
):
    q = select(EmailContact).where(EmailContact.user_id == user.id)
    if status:
        q = q.where(EmailContact.status == status)
    rows = (await session.execute(q.order_by(EmailContact.created_at.desc()))).scalars().all()
    results = []
    for c in rows:
        if tag and (not c.tags or tag not in c.tags):
            continue
        results.append({"id": c.id, "email": c.email, "name": c.name, "tags": c.tags, "status": c.status})
    return results


@router.post("", status_code=201)
async def create_contact(body: ContactCreate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    contact = EmailContact(user_id=user.id, email=body.email, name=body.name, tags=body.tags)
    session.add(contact)
    await session.commit()
    await log_action(session, user.id, "email.contact_create", "email_contact", str(contact.id))
    return {"id": contact.id, "email": contact.email}


@router.post("/import", status_code=201)
async def import_contacts(file: UploadFile = File(...), user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    content = (await file.read()).decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    count = 0
    for row in reader:
        email_val = row.get("email", "").strip()
        if not email_val:
            continue
        contact = EmailContact(
            user_id=user.id, email=email_val,
            name=row.get("name", "").strip() or None,
            tags=[t.strip() for t in row.get("tags", "").split(",") if t.strip()] or None,
        )
        session.add(contact)
        count += 1
    await session.commit()
    await log_action(session, user.id, "email.contacts_import", "email_contact", None, {"count": count})
    return {"imported": count}


@router.patch("/{contact_id}")
async def update_contact(contact_id: int, body: ContactUpdate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    contact = await session.get(EmailContact, contact_id)
    if not contact or contact.user_id != user.id:
        raise HTTPException(404, "Contact not found")
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(contact, field, val)
    await session.commit()
    return {"id": contact.id, "email": contact.email}


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(contact_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    contact = await session.get(EmailContact, contact_id)
    if not contact or contact.user_id != user.id:
        raise HTTPException(404, "Contact not found")
    await session.delete(contact)
    await session.commit()
