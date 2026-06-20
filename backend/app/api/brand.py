from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.core.plan_limits import check_brand_profile_limit, upgrade_message
from app.models.project import Project
from app.models.user import User
from app.schemas.brand import BrandProfileResponse, BrandProfileUpsert
from app.services import brand_service

router = APIRouter(prefix="/brand-profile", tags=["brand-profile"])


@router.post("", response_model=BrandProfileResponse)
async def upsert_brand_profile(
    payload: BrandProfileUpsert,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> BrandProfileResponse:
    project = await session.get(Project, payload.project_id)
    if project is None or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    allowed, used, limit = await check_brand_profile_limit(
        session, current_user, payload.project_id
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Bạn đã dùng hết {limit} Brand Voice profile ({used}/{limit}). "
                + upgrade_message("tạo thêm Brand Voice")
            ),
        )

    profile = await brand_service.upsert_brand_profile(
        session,
        payload.project_id,
        payload.brand_name,
        payload.tone,
        payload.writing_style,
        payload.preferred_words,
        payload.forbidden_words,
    )
    return BrandProfileResponse.model_validate(profile)


@router.get("", response_model=BrandProfileResponse)
async def get_brand_profile(
    project_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> BrandProfileResponse:
    profile = await brand_service.get_brand_profile(
        session, project_id, current_user.id
    )
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand profile not found",
        )
    return BrandProfileResponse.model_validate(profile)
