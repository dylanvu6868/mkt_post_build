from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.brand_profile import BrandProfile
from app.models.project import Project


async def upsert_brand_profile(
    session: AsyncSession,
    project_id: int,
    brand_name: str,
    tone: str,
    writing_style: str,
    preferred_words: list[str],
    forbidden_words: list[str],
) -> BrandProfile:
    result = await session.execute(
        select(BrandProfile).where(BrandProfile.project_id == project_id)
    )
    profile = result.scalar_one_or_none()

    if profile is None:
        profile = BrandProfile(
            project_id=project_id,
            brand_name=brand_name,
            tone=tone,
            writing_style=writing_style,
            preferred_words=preferred_words,
            forbidden_words=forbidden_words,
        )
        session.add(profile)
    else:
        profile.brand_name = brand_name
        profile.tone = tone
        profile.writing_style = writing_style
        profile.preferred_words = preferred_words
        profile.forbidden_words = forbidden_words

    await session.commit()
    await session.refresh(profile)
    return profile


async def get_brand_profile(
    session: AsyncSession, project_id: int, user_id: int
) -> BrandProfile | None:
    result = await session.execute(
        select(BrandProfile)
        .join(Project, BrandProfile.project_id == Project.id)
        .where(BrandProfile.project_id == project_id, Project.user_id == user_id)
    )
    return result.scalar_one_or_none()
