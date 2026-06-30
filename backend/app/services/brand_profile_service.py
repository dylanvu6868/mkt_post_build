from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.brand_profile import BrandProfile
from app.models.project import Project


async def load_brand_profile(session: AsyncSession, project_id: int, user_id: int) -> dict:
    """Loads the BrandProfile for project_id, scoped to user_id ownership.
    Returns {} if the project doesn't exist, isn't owned by user_id, or has no profile."""
    project = await session.get(Project, project_id)
    if project is None or project.user_id != user_id:
        return {}

    result = await session.execute(
        select(BrandProfile).where(BrandProfile.project_id == project_id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        return {}

    return {
        "brand_name": profile.brand_name,
        "tone": profile.tone,
        "writing_style": profile.writing_style,
        "preferred_words": profile.preferred_words or [],
        "forbidden_words": profile.forbidden_words or [],
    }


def format_brand_voice(brand_profile: dict[str, Any]) -> str:
    if not brand_profile:
        return ""

    parts: list[str] = []
    if brand_profile.get("brand_name"):
        parts.append(f"Brand name: {brand_profile['brand_name']}")
    if brand_profile.get("tone"):
        parts.append(f"Tone: {brand_profile['tone']}")
    if brand_profile.get("writing_style"):
        parts.append(f"Writing style: {brand_profile['writing_style']}")
    if brand_profile.get("preferred_words"):
        parts.append(
            f"Preferred words (use these): {', '.join(brand_profile['preferred_words'])}"
        )
    if brand_profile.get("forbidden_words"):
        parts.append(
            f"Forbidden words (NEVER use these): {', '.join(brand_profile['forbidden_words'])}"
        )

    if not parts:
        return ""
    return "Brand voice:\n" + "\n".join(parts)
