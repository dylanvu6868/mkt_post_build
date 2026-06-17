from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import SEO

SYSTEM = (
    "You are an SEO strategist. Given a product brief, return the primary keyword, "
    "secondary keywords, the dominant search intent, and a meta description."
)


async def seo(state: dict[str, Any]) -> dict[str, Any]:
    brief = state["brief"]
    if not state.get("provider_available"):
        return {
            "seo": SEO(
                primary_keyword=brief,
                secondary_keywords=[f"best {brief}", f"{brief} guide"],
                search_intent="informational",
                meta_description=f"Everything you need to know about {brief}.",
            ).model_dump()
        }
    user = f"Product/brief: {brief}"
    result = await generate_structured("fast", SYSTEM, user, SEO)
    return {"seo": result.model_dump()}
