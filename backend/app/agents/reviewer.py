from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import FacebookPostDraft, Review

SYSTEM = (
    "You are a senior content editor. Score the draft from 0 to 100, list concrete "
    "suggestions, and return an improved final version of the Facebook post "
    "(single pass — no further revision)."
)


async def reviewer(state: dict[str, Any]) -> dict[str, Any]:
    draft = state.get("draft", {})
    if not state.get("provider_available"):
        final = dict(draft)
        final["cta"] = f"{final.get('cta', '')} Limited time only!".strip()
        review = Review(
            score=85,
            suggestions=["Tighten the hook.", "Add urgency to the CTA."],
            final_content=FacebookPostDraft(**final),
        )
        return {
            "review": review.model_dump(),
            "final": review.final_content.model_dump(),
        }
    user = f"Brief: {state['brief']}\nDraft to review: {draft}"
    result = await generate_structured("smart", SYSTEM, user, Review)
    return {
        "review": result.model_dump(),
        "final": result.final_content.model_dump(),
    }
