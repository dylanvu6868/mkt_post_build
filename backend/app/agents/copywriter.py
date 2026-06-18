from typing import Any

from pydantic import BaseModel

from app.agents.base import generate_structured
from app.schemas.agents import (
    DRAFT_SCHEMAS,
    EmailDraft,
    FAQItem,
    FacebookPostDraft,
    LandingPageDraft,
    SeoBlogDraft,
    TikTokScriptDraft,
)

SYSTEM_TEMPLATES: dict[str, str] = {
    "facebook_post": (
        "You are an expert Facebook copywriter. Use the AIDA framework. Honor the "
        "brand voice (tone, preferred and forbidden words) if provided. Return a "
        "structured post with a hook, body, CTA, and hashtags."
    ),
    "seo_blog": (
        "You are an expert SEO blog writer. Write a search-optimized blog post with "
        "an SEO title, meta description, outline, full blog content, and FAQ section. "
        "Honor the brand voice if provided."
    ),
    "email": (
        "You are an expert email marketer. Write a marketing email with a compelling "
        "subject line, engaging body, and clear CTA. Honor the brand voice if provided."
    ),
    "landing_page": (
        "You are an expert landing page copywriter. Write a high-converting landing "
        "page with headline, subheadline, benefits list, and CTA. Honor the brand "
        "voice if provided."
    ),
    "tiktok_script": (
        "You are an expert TikTok content creator. Write a short, engaging TikTok "
        "script with a hook (first 3 seconds), main script, and CTA. Honor the brand "
        "voice if provided."
    ),
}


def _format_brand_voice(brand_profile: dict[str, Any]) -> str:
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


def _mock_draft(content_type: str, brief: str, brand_profile: dict[str, Any]) -> BaseModel:
    brand_name = brand_profile.get("brand_name", "")
    tone = brand_profile.get("tone", "")
    tag = (brief.replace(" ", "") or "marketing").lower()

    hook_prefix = f"{brand_name}: " if brand_name else ""
    tone_note = f" Our {tone} approach sets us apart." if tone else ""

    if content_type == "facebook_post":
        return FacebookPostDraft(
            hook=f"{hook_prefix}Struggling with {brief}? You're not alone. \U0001f680",
            body=(
                f"Meet the smarter way to handle {brief}. Built to save you "
                f"time and deliver real results — so you can focus on what "
                f"matters most.{tone_note}"
            ),
            cta="\U0001f449 Learn more today!",
            hashtags=[f"#{tag}", "#marketing", "#growth"],
        )

    if content_type == "seo_blog":
        return SeoBlogDraft(
            seo_title=f"{hook_prefix}{brief.title()} — The Complete Guide",
            meta_description=f"Learn everything about {brief}. Tips, strategies, and expert insights.",
            outline=["Introduction", "Key Benefits", "How It Works", "Conclusion"],
            blog_content=(
                f"# {brief.title()}\n\n"
                f"In today's market, {brief} is more important than ever.{tone_note} "
                f"This comprehensive guide covers everything you need to know."
            ),
            faq=[
                FAQItem(question=f"What is {brief}?", answer=f"{brief} is a key strategy for modern marketing."),
                FAQItem(question=f"Why is {brief} important?", answer=f"It helps businesses grow and reach their audience."),
            ],
        )

    if content_type == "email":
        return EmailDraft(
            subject=f"{hook_prefix}Discover the power of {brief}",
            body=(
                f"Hi there,\n\nWe wanted to share something exciting about {brief}. "
                f"Our latest insights show that this approach can transform your results.{tone_note}"
            ),
            cta="Click here to learn more",
        )

    if content_type == "landing_page":
        return LandingPageDraft(
            headline=f"{hook_prefix}{brief.title()} — Transform Your Results",
            subheadline=f"The smarter way to approach {brief} for modern businesses",
            benefits=[
                f"Save time with automated {brief}",
                "Get real, measurable results",
                "Easy to set up and use",
            ],
            cta="Get Started Free",
        )

    # tiktok_script
    return TikTokScriptDraft(
        hook=f"{hook_prefix}Stop scrolling! This changes everything about {brief} \U0001f525",
        script=(
            f"Here's why {brief} matters more than ever. "
            f"Most people get this wrong, but here's the secret.{tone_note}"
        ),
        cta=f"Follow for more tips on {brief}!",
    )


async def copywriter(state: dict[str, Any]) -> dict[str, Any]:
    brief = state["brief"]
    brand_profile = state.get("brand_profile") or {}
    content_type = state.get("content_type", "facebook_post")

    if not state.get("provider_available"):
        draft = _mock_draft(content_type, brief, brand_profile)
        return {"draft": draft.model_dump()}

    system = SYSTEM_TEMPLATES.get(content_type, SYSTEM_TEMPLATES["facebook_post"])
    schema = DRAFT_SCHEMAS.get(content_type, FacebookPostDraft)

    brand_voice_section = _format_brand_voice(brand_profile)
    user = (
        f"Topic: {brief}\n"
        f"Creative brief: {state.get('fused_brief')}\n"
        f"{brand_voice_section}"
    )
    result = await generate_structured("smart", system, user, schema)
    return {"draft": result.model_dump()}
