from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import FacebookPostDraft

SYSTEM = (
    "You are an expert Facebook copywriter. Use the AIDA framework. Honor the "
    "brand voice (tone, preferred and forbidden words) if provided. Return a "
    "structured post with a hook, body, CTA, and hashtags."
)


def _format_brand_voice(brand_profile: dict[str, Any]) -> str:
    """Format brand_profile dict into a prompt section for the LLM."""
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


async def copywriter(state: dict[str, Any]) -> dict[str, Any]:
    brief = state["brief"]
    brand_profile = state.get("brand_profile") or {}

    if not state.get("provider_available"):
        brand_name = brand_profile.get("brand_name", "")
        tone = brand_profile.get("tone", "")
        tag = (brief.replace(" ", "") or "marketing").lower()

        hook_prefix = f"{brand_name}: " if brand_name else ""
        tone_note = f" Our {tone} approach sets us apart." if tone else ""

        return {
            "draft": FacebookPostDraft(
                hook=f"{hook_prefix}Struggling with {brief}? You're not alone. \U0001f680",
                body=(
                    f"Meet the smarter way to handle {brief}. Built to save you "
                    f"time and deliver real results — so you can focus on what "
                    f"matters most.{tone_note}"
                ),
                cta="\U0001f449 Learn more today!",
                hashtags=[f"#{tag}", "#marketing", "#growth"],
            ).model_dump()
        }

    brand_voice_section = _format_brand_voice(brand_profile)
    user = (
        f"Topic: {brief}\n"
        f"Creative brief: {state.get('fused_brief')}\n"
        f"{brand_voice_section}"
    )
    result = await generate_structured("smart", SYSTEM, user, FacebookPostDraft)
    return {"draft": result.model_dump()}
