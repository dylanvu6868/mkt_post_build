"""Plan-based feature limits enforcement."""

from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

# The free, default tier for users who have never paid.
FREE_PLAN = "free"

HISTORY_RETENTION_DAYS: dict[str, int | None] = {
    "free": 7,
    "lite": 30,
    "pro": 90,
    "max": None,
}


PLAN_LIMITS = {
    "free": {
        "daily_generations": 15,
        "content_types": {"facebook_post", "email", "seo_blog", "tiktok_script"},
        "max_projects": 3,
        "max_conversations": 999999,
        "max_kb_files": 10,
        "max_brand_profiles": 2,
        "daily_lab_uses": 3,
        "hub_tools": set(),
        "daily_email_sends": 0,
        "daily_landing_generates": 0,
    },
    "lite": {
        "daily_generations": 50,
        "content_types": {"facebook_post", "email", "seo_blog", "tiktok_script", "marketing_plan"},
        "max_projects": 10,
        "max_conversations": 999999,
        "max_kb_files": 30,
        "max_brand_profiles": 5,
        "daily_lab_uses": 10,
        "hub_tools": {"email", "seo", "calendar"},
        "daily_email_sends": 100,
        "daily_landing_generates": 0,
    },
    "pro": {
        "daily_generations": 200,
        "content_types": {"facebook_post", "email", "seo_blog", "tiktok_script", "marketing_plan", "landing_page"},
        "max_projects": 30,
        "max_conversations": 999999,
        "max_kb_files": 100,
        "max_brand_profiles": 15,
        "daily_lab_uses": 30,
        "hub_tools": {"email", "seo", "calendar", "analytics", "landing", "meta"},
        "daily_email_sends": 500,
        "daily_landing_generates": 20,
    },
    "max": {
        "daily_generations": 999999,
        "content_types": {"facebook_post", "email", "seo_blog", "tiktok_script", "marketing_plan", "landing_page"},
        "max_projects": 999999,
        "max_conversations": 999999,
        "max_kb_files": 999999,
        "max_brand_profiles": 999999,
        "daily_lab_uses": 999999,
        "hub_tools": {"email", "seo", "calendar", "analytics", "landing", "meta"},
        "daily_email_sends": 999999,
        "daily_landing_generates": 999999,
    },
}


def get_user_plan(user: User) -> str:
    plan = user.plan or FREE_PLAN
    # Paid plans revert to free once expired.
    if plan != FREE_PLAN and user.plan_expires_at:
        expires = user.plan_expires_at
        # SQLite returns naive datetimes; treat them as UTC for comparison.
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < datetime.now(timezone.utc):
            return FREE_PLAN
    return plan if plan in PLAN_LIMITS else FREE_PLAN


def get_limits(user: User) -> dict:
    return PLAN_LIMITS.get(get_user_plan(user), PLAN_LIMITS[FREE_PLAN])


async def check_daily_generation_limit(session: AsyncSession, user: User) -> tuple[bool, int, int]:
    """Returns (allowed, used_today, limit)."""
    from app.models.generation_job import GenerationJob
    from app.models.project import Project

    limits = get_limits(user)
    limit = limits["daily_generations"]

    today_start = datetime.combine(datetime.now(timezone.utc).date(), datetime.min.time(), tzinfo=timezone.utc)
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


def get_history_retention_days(user: User) -> int | None:
    return HISTORY_RETENTION_DAYS.get(get_user_plan(user), 30)


def upgrade_message(feature: str) -> str:
    return (
        f"Gói hiện tại không hỗ trợ {feature}. "
        "Vui lòng nâng cấp gói Pro hoặc Max để sử dụng tính năng này."
    )


async def check_daily_email_sends(session: AsyncSession, user: User) -> tuple[bool, int, int]:
    """Returns (allowed, used_today, limit). allowed=False if limit is 0."""
    from app.models.audit_log import AuditLog

    limits = get_limits(user)
    limit = limits["daily_email_sends"]
    if limit <= 0:
        return False, 0, 0

    today_start = datetime.combine(datetime.now(timezone.utc).date(), datetime.min.time(), tzinfo=timezone.utc)
    count_result = await session.execute(
        select(func.count(AuditLog.id)).where(
            AuditLog.user_id == user.id,
            AuditLog.action.in_(["email.send", "email.batch_send"]),
            AuditLog.created_at >= today_start,
        )
    )
    used = count_result.scalar() or 0
    return used < limit, used, limit


async def check_daily_landing_generates(session: AsyncSession, user: User) -> tuple[bool, int, int]:
    """Returns (allowed, used_today, limit). allowed=False if limit is 0."""
    from app.models.audit_log import AuditLog

    limits = get_limits(user)
    limit = limits["daily_landing_generates"]
    if limit <= 0:
        return False, 0, 0

    today_start = datetime.combine(datetime.now(timezone.utc).date(), datetime.min.time(), tzinfo=timezone.utc)
    count_result = await session.execute(
        select(func.count(AuditLog.id)).where(
            AuditLog.user_id == user.id,
            AuditLog.action == "landing.generate",
            AuditLog.created_at >= today_start,
        )
    )
    used = count_result.scalar() or 0
    return used < limit, used, limit


async def check_lab_daily_limit(session: AsyncSession, user: User) -> tuple[bool, int, int]:
    from app.models.audit_log import AuditLog

    limits = get_limits(user)
    limit = limits["daily_lab_uses"]
    if limit == 0:
        return False, 0, 0

    today_start = datetime.combine(datetime.now(timezone.utc).date(), datetime.min.time(), tzinfo=timezone.utc)
    count_result = await session.execute(
        select(func.count(AuditLog.id)).where(
            AuditLog.user_id == user.id,
            AuditLog.action.like("lab.%"),
            AuditLog.created_at >= today_start,
        )
    )
    used = count_result.scalar() or 0
    return used < limit, used, limit


async def check_kb_file_limit(session: AsyncSession, user: User) -> tuple[bool, int, int]:
    from app.models.document import Document
    from app.models.project import Project

    limits = get_limits(user)
    limit = limits["max_kb_files"]
    count_result = await session.execute(
        select(func.count(Document.id))
        .join(Project, Document.project_id == Project.id)
        .where(Project.user_id == user.id)
    )
    used = count_result.scalar() or 0
    return used < limit, used, limit


async def check_brand_profile_limit(
    session: AsyncSession, user: User, project_id: int
) -> tuple[bool, int, int]:
    from app.models.brand_profile import BrandProfile
    from app.models.project import Project

    limits = get_limits(user)
    limit = limits["max_brand_profiles"]

    existing = await session.execute(
        select(BrandProfile).where(BrandProfile.project_id == project_id)
    )
    if existing.scalar_one_or_none() is not None:
        return True, 0, limit

    count_result = await session.execute(
        select(func.count(BrandProfile.id))
        .join(Project, BrandProfile.project_id == Project.id)
        .where(Project.user_id == user.id)
    )
    used = count_result.scalar() or 0
    return used < limit, used, limit


async def check_project_limit(session: AsyncSession, user: User) -> tuple[bool, int, int]:
    from app.models.project import Project

    limits = get_limits(user)
    limit = limits["max_projects"]
    count_result = await session.execute(
        select(func.count(Project.id)).where(Project.user_id == user.id)
    )
    used = count_result.scalar() or 0
    return used < limit, used, limit


async def check_conversation_limit(session: AsyncSession, user: User) -> tuple[bool, int, int]:
    from app.models.conversation import Conversation

    limits = get_limits(user)
    limit = limits["max_conversations"]
    count_result = await session.execute(
        select(func.count(Conversation.id)).where(Conversation.user_id == user.id)
    )
    used = count_result.scalar() or 0
    return used < limit, used, limit


def _usage_item(used: int, max_val: int) -> dict:
    return {"used": used, "max": max_val if max_val < 999999 else None}


async def get_usage_stats(session: AsyncSession, user: User) -> dict:
    """Return current usage counts vs plan limits."""
    from app.models.brand_profile import BrandProfile
    from app.models.conversation import Conversation
    from app.models.document import Document
    from app.models.generation_job import GenerationJob
    from app.models.project import Project

    limits = get_limits(user)
    user_id = user.id

    _, gen_used, gen_max = await check_daily_generation_limit(session, user)

    project_count = (
        await session.execute(
            select(func.count(Project.id)).where(Project.user_id == user_id)
        )
    ).scalar() or 0

    conv_count = (
        await session.execute(
            select(func.count(Conversation.id)).where(Conversation.user_id == user_id)
        )
    ).scalar() or 0

    brand_count = (
        await session.execute(
            select(func.count(BrandProfile.id))
            .join(Project, BrandProfile.project_id == Project.id)
            .where(Project.user_id == user_id)
        )
    ).scalar() or 0

    kb_count = (
        await session.execute(
            select(func.count(Document.id))
            .join(Project, Document.project_id == Project.id)
            .where(Project.user_id == user_id)
        )
    ).scalar() or 0

    _, lab_used, lab_max = await check_lab_daily_limit(session, user)
    _, email_send_used, email_send_max = await check_daily_email_sends(session, user)
    _, landing_gen_used, landing_gen_max = await check_daily_landing_generates(session, user)

    return {
        "daily_generations": _usage_item(gen_used, gen_max),
        "projects": _usage_item(project_count, limits["max_projects"]),
        "conversations": _usage_item(conv_count, limits["max_conversations"]),
        "brand_profiles": _usage_item(brand_count, limits["max_brand_profiles"]),
        "kb_files": _usage_item(kb_count, limits["max_kb_files"]),
        "daily_lab_uses": _usage_item(lab_used, lab_max),
        "email_sends": _usage_item(email_send_used, email_send_max if email_send_max > 0 else 0),
        "landing_generates": _usage_item(landing_gen_used, landing_gen_max if landing_gen_max > 0 else 0),
    }
