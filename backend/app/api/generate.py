from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.deps import get_current_user
from app.core.db import get_session, get_session_maker
from app.llm.factory import provider_available
from app.models.brand_profile import BrandProfile
from app.models.project import Project
from app.models.user import User
from app.schemas.generation import GenerateRequest, JobResponse, JobStatusResponse
from app.services import generation_service

router = APIRouter(prefix="/generate", tags=["generate"])

SUPPORTED_CONTENT_TYPES = {"facebook_post", "seo_blog", "email", "landing_page", "tiktok_script"}


@router.post("", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_generation(
    payload: GenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    session_maker: async_sessionmaker[AsyncSession] = Depends(get_session_maker),
) -> JobResponse:
    if payload.content_type not in SUPPORTED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported content_type: {payload.content_type}",
        )
    project = await session.get(Project, payload.project_id)
    if project is None or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # Load brand profile for this project (may be None)
    result = await session.execute(
        select(BrandProfile).where(BrandProfile.project_id == payload.project_id)
    )
    profile = result.scalar_one_or_none()
    brand_profile_data: dict = {}
    if profile is not None:
        brand_profile_data = {
            "brand_name": profile.brand_name,
            "tone": profile.tone,
            "writing_style": profile.writing_style,
            "preferred_words": profile.preferred_words or [],
            "forbidden_words": profile.forbidden_words or [],
        }

    job = await generation_service.create_job(
        session,
        payload.project_id,
        payload.content_type,
        payload.brief,
        payload.marketing_goal,
    )
    initial_state = {
        "project_id": payload.project_id,
        "content_type": payload.content_type,
        "brief": payload.brief,
        "marketing_goal": payload.marketing_goal,
        "brand_profile": brand_profile_data,
        "provider_available": provider_available(),
        "errors": [],
    }
    background_tasks.add_task(
        generation_service.run_generation_job, session_maker, job.id, initial_state
    )
    return JobResponse(job_id=job.id, status=job.status)


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_generation(
    job_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> JobStatusResponse:
    job = await generation_service.get_job_for_user(session, job_id, current_user.id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job not found"
        )
    return JobStatusResponse(
        id=job.id,
        status=job.status,
        current_step=job.current_step,
        result=job.result_json,
        error=job.error,
    )
