"""Plan-based feature limits enforcement."""

from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

PLAN_LIMITS = {
    "lite": {
        "daily_generations": 3,
        "content_types": {"facebook_post", "email"},
        "max_projects": 1,
        "max_conversations": 10,
        "max_kb_files": 3,
        "max_brand_profiles": 1,
    },
    "pro": {
        "daily_generations": 30,
        "content_types": {"facebook_post", "email", "seo_blog", "tiktok_script", "marketing_plan"},
        "max_projects": 5,
        "max_conversations": 100,
        "max_kb_files": 30,
        "max_brand_profiles": 3,
    },
    "max": {
        "daily_generations": 999999,
        "content_types": {"facebook_post", "email", "seo_blog", "tiktok_script", "marketing_plan", "landing_page"},
        "max_projects": 999999,
        "max_conversations": 999999,
        "max_kb_files": 999999,
        "max_brand_profiles": 999999,
    },
}


def get_user_plan(user: User) -> str:
    plan = user.plan or "lite"
    if plan != "lite" and user.plan_expires_at:
        if user.plan_expires_at < datetime.now(timezone.utc):
            return "lite"
    return plan


def get_limits(user: User) -> dict:
    return PLAN_LIMITS.get(get_user_plan(user), PLAN_LIMITS["lite"])


async def check_daily_generation_limit(session: AsyncSession, user: User) -> tuple[bool, int, int]:
    """Returns (allowed, used_today, limit)."""
    from app.models.generation_job import GenerationJob
    from app.models.project import Project

    limits = get_limits(user)
    limit = limits["daily_generations"]

    today_start = datetime.combine(date.today(), datetime.min.time(), tzinfo=timezone.utc)
    count_result = await session.execute(
        select(func.count(GenerationJob.id))
        .join(Project, GenerationJob.project_id == Project.id)
        .where(
            Project.user_id == user.id,
            GenerationJob.created_at >= today_start,
        )
    )
    used = count_result.scalar() or 0
    return used < limit, used, limit


def check_content_type_allowed(user: User, content_type: str) -> bool:
    limits = get_limits(user)
    return content_type in limits["content_types"]
