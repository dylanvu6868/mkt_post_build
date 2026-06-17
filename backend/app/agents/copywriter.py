from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import FacebookPostDraft

SYSTEM = (
    "You are an expert Facebook copywriter. Use the AIDA framework. Honor the "
    "brand voice (tone, preferred and forbidden words) if provided. Return a "
    "structured post with a hook, body, CTA, and hashtags."
)


async def copywriter(state: dict[str, Any]) -> dict[str, Any]:
    brief = state["brief"]
    if not state.get("provider_available"):
        tag = (brief.replace(" ", "") or "marketing").lower()
        return {
            "draft": FacebookPostDraft(
                hook=f"Struggling with {brief}? You're not alone. 🚀",
                body=(
                    f"Meet the smarter way to handle {brief}. Built to save you "
                    f"time and deliver real results — so you can focus on what "
                    f"matters most."
                ),
                cta="👉 Learn more today!",
                hashtags=[f"#{tag}", "#marketing", "#growth"],
            ).model_dump()
        }
    user = (
        f"Topic: {brief}\n"
        f"Creative brief: {state.get('fused_brief')}\n"
        f"Brand voice: {state.get('brand_profile') or {}}"
    )
    result = await generate_structured("smart", SYSTEM, user, FacebookPostDraft)
    return {"draft": result.model_dump()}
