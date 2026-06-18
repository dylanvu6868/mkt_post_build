from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import DRAFT_SCHEMAS, Review

SYSTEM_TEMPLATES: dict[str, str] = {
    "facebook_post": (
        "You are a senior content editor. Score the draft from 0 to 100, list concrete "
        "suggestions, and return an improved final version of the Facebook post "
        "(single pass — no further revision)."
    ),
    "seo_blog": (
        "You are a senior content editor specializing in SEO. Score the blog draft from "
        "0 to 100, list concrete suggestions for SEO and readability, and return an "
        "improved final version (single pass — no further revision)."
    ),
    "email": (
        "You are a senior email marketing editor. Score the email draft from 0 to 100, "
        "list concrete suggestions for open rate and conversion, and return an improved "
        "final version (single pass — no further revision)."
    ),
    "landing_page": (
        "You are a senior conversion copywriter. Score the landing page draft from "
        "0 to 100, list concrete suggestions for conversion optimization, and return "
        "an improved final version (single pass — no further revision)."
    ),
    "tiktok_script": (
        "You are a senior TikTok content strategist. Score the script from 0 to 100, "
        "list concrete suggestions for engagement and watch time, and return an "
        "improved final version (single pass — no further revision)."
    ),
}


async def reviewer(state: dict[str, Any]) -> dict[str, Any]:
    draft = state.get("draft", {})
    content_type = state.get("content_type", "facebook_post")

    if not state.get("provider_available"):
        final = dict(draft)
        if "cta" in final:
            final["cta"] = f"{final['cta']} Limited time only!".strip()
        review = Review(
            score=85,
            suggestions=["Tighten the hook.", "Add urgency to the CTA."],
            final_content=final,
        )
        return {
            "review": review.model_dump(),
            "final": final,
        }

    system = SYSTEM_TEMPLATES.get(content_type, SYSTEM_TEMPLATES["facebook_post"])
    user = f"Content type: {content_type}\nBrief: {state['brief']}\nDraft to review: {draft}"
    result = await generate_structured("smart", system, user, Review)
    return {
        "review": result.model_dump(),
        "final": result.final_content,
    }
