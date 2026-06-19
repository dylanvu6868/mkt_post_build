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
        "Bạn là một chuyên gia viết copywriter cho Facebook. Hãy sử dụng mô hình AIDA. "
        "Tuân thủ giọng điệu thương hiệu (tone, từ ngữ ưu tiên và từ ngữ cấm) nếu có. "
        "Trả về một bài đăng có cấu trúc với hook (câu mở đầu), body (nội dung), CTA (kêu gọi hành động) và hashtags. "
        "LUÔN LUÔN VIẾT BẰNG TIẾNG VIỆT."
    ),
    "seo_blog": (
        "Bạn là một chuyên gia viết blog chuẩn SEO. Hãy viết một bài blog tối ưu hóa tìm kiếm "
        "với tiêu đề SEO, meta description, dàn ý (outline), nội dung đầy đủ và phần FAQ (câu hỏi thường gặp). "
        "Tuân thủ giọng điệu thương hiệu nếu có. LUÔN LUÔN VIẾT BẰNG TIẾNG VIỆT."
    ),
    "email": (
        "Bạn là một chuyên gia Email Marketing. Hãy viết một email tiếp thị với tiêu đề hấp dẫn, "
        "nội dung thu hút và CTA rõ ràng. Tuân thủ giọng điệu thương hiệu nếu có. LUÔN LUÔN VIẾT BẰNG TIẾNG VIỆT."
    ),
    "landing_page": (
        "Bạn là một chuyên gia viết nội dung Landing Page. Hãy viết một trang đích có tỷ lệ chuyển đổi cao "
        "với tiêu đề chính, tiêu đề phụ, danh sách lợi ích và CTA. Tuân thủ giọng điệu thương hiệu nếu có. "
        "LUÔN LUÔN VIẾT BẰNG TIẾNG VIỆT."
    ),
    "tiktok_script": (
        "Bạn là một chuyên gia sáng tạo nội dung TikTok. Hãy viết một kịch bản TikTok ngắn gọn, "
        "thu hút với hook (trong 3 giây đầu), nội dung chính và CTA. Tuân thủ giọng điệu thương hiệu nếu có. "
        "LUÔN LUÔN VIẾT BẰNG TIẾNG VIỆT."
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
