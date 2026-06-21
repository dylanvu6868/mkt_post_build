from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.deps import get_current_user
from app.core.db import get_session, get_session_maker
from app.core.rate_limit import limiter
from app.llm.factory import provider_available
from app.models.brand_profile import BrandProfile
from app.models.project import Project
from app.models.user import User
from app.models.user_template import UserTemplate
from app.core.plan_limits import (
    check_content_type_allowed,
    check_daily_generation_limit,
    get_user_plan,
    upgrade_message,
)
from app.schemas.generation import GenerateRequest, JobResponse, JobStatusResponse
from app.services import generation_service

router = APIRouter(prefix="/generate", tags=["generate"])

SUPPORTED_CONTENT_TYPES = {"facebook_post", "seo_blog", "email", "landing_page", "tiktok_script", "marketing_plan"}

PLAN_RATE_LIMITS: dict[str, int] = {"free": 5, "lite": 10, "pro": 15, "max": 30}


@router.post("", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("30/minute")
async def start_generation(
    request: Request,
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

    if not check_content_type_allowed(current_user, payload.content_type):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=upgrade_message(f"loại nội dung '{payload.content_type}'"),
        )

    user_plan = get_user_plan(current_user)

    from app.models.generation_job import GenerationJob
    from app.models.project import Project as ProjectModel
    minute_ago = datetime.now(timezone.utc) - timedelta(minutes=1)
    minute_count_result = await session.execute(
        select(func.count(GenerationJob.id))
        .join(ProjectModel, GenerationJob.project_id == ProjectModel.id)
        .where(ProjectModel.user_id == current_user.id, GenerationJob.created_at >= minute_ago)
    )
    minute_used = minute_count_result.scalar() or 0
    plan_rpm = PLAN_RATE_LIMITS.get(user_plan, 10)
    if minute_used >= plan_rpm:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Vượt quá {plan_rpm} lượt/phút cho gói {user_plan.upper()}. Vui lòng chờ giây lát.",
        )

    allowed, used, limit = await check_daily_generation_limit(session, current_user)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Bạn đã dùng hết {limit} lượt tạo hôm nay ({used}/{limit}). "
                + upgrade_message("tạo thêm nội dung")
            ),
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

    # Load custom template for this user and content type
    template_result = await session.execute(
        select(UserTemplate).where(
            UserTemplate.user_id == current_user.id,
            UserTemplate.content_type == payload.content_type
        )
    )
    user_template = template_result.scalar_one_or_none()
    custom_template = user_template.template_text if user_template else None

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
        "custom_template": custom_template,
        "user_plan": user_plan,
        "industry": payload.industry,
        "target_audience": payload.target_audience,
        "tone": payload.tone,
        "cta_text": payload.cta_text,
        "custom_structure": payload.custom_structure,
        "formatted_final": {},
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
