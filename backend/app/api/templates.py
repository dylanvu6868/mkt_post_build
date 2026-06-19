from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.user import User
from app.models.user_template import UserTemplate

router = APIRouter(prefix="/templates", tags=["templates"])


class TemplateCreate(BaseModel):
    content_type: str
    template_text: str


class TemplateResponse(TemplateCreate):
    id: int


@router.get("", response_model=list[TemplateResponse])
async def get_templates(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Any:
    result = await session.execute(
        select(UserTemplate).where(UserTemplate.user_id == current_user.id)
    )
    return result.scalars().all()


@router.get("/{content_type}", response_model=TemplateResponse)
async def get_template(
    content_type: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Any:
    result = await session.execute(
        select(UserTemplate).where(
            UserTemplate.user_id == current_user.id,
            UserTemplate.content_type == content_type
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.post("", response_model=TemplateResponse)
async def create_or_update_template(
    template_in: TemplateCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Any:
    result = await session.execute(
        select(UserTemplate).where(
            UserTemplate.user_id == current_user.id,
            UserTemplate.content_type == template_in.content_type
        )
    )
    template = result.scalar_one_or_none()

    if template:
        template.template_text = template_in.template_text
    else:
        template = UserTemplate(
            user_id=current_user.id,
            content_type=template_in.content_type,
            template_text=template_in.template_text,
        )
        session.add(template)

    await session.commit()
    await session.refresh(template)
    return template


@router.delete("/{content_type}")
async def delete_template(
    content_type: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Any:
    result = await session.execute(
        select(UserTemplate).where(
            UserTemplate.user_id == current_user.id,
            UserTemplate.content_type == content_type
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    await session.delete(template)
    await session.commit()
    return {"status": "ok"}
