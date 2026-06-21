from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import DRAFT_SCHEMAS, Review

SYSTEM_TEMPLATES: dict[str, str] = {
    "facebook_post": (
        "Bạn là một biên tập viên nội dung cấp cao. Hãy chấm điểm bản nháp từ 0 đến 100, liệt kê "
        "các đề xuất cụ thể để cải thiện, và trả về phiên bản bài viết Facebook cuối cùng đã được tối ưu "
        "(chỉ duyệt 1 lần duy nhất). VIẾT BẰNG TIẾNG VIỆT."
    ),
    "seo_blog": (
        "Bạn là một biên tập viên cấp cao chuyên về SEO. Hãy chấm điểm bài blog nháp từ 0 đến 100, "
        "liệt kê các đề xuất cụ thể về SEO và độ dễ đọc, và trả về phiên bản cuối cùng đã được cải thiện "
        "(chỉ duyệt 1 lần duy nhất). VIẾT BẰNG TIẾNG VIỆT."
    ),
    "email": (
        "Bạn là một biên tập viên cấp cao về Email Marketing. Hãy chấm điểm email nháp từ 0 đến 100, "
        "liệt kê các đề xuất cụ thể để tăng tỷ lệ mở và chuyển đổi, và trả về phiên bản cuối cùng "
        "đã được cải thiện (chỉ duyệt 1 lần duy nhất). VIẾT BẰNG TIẾNG VIỆT."
    ),
    "landing_page": (
        "Bạn là một chuyên gia copywriter tối ưu chuyển đổi. Hãy chấm điểm landing page nháp từ 0 đến 100, "
        "liệt kê các đề xuất tối ưu hóa chuyển đổi, và trả về phiên bản cuối cùng đã được cải thiện "
        "(chỉ duyệt 1 lần duy nhất). VIẾT BẰNG TIẾNG VIỆT."
    ),
    "tiktok_script": (
        "Bạn là một chiến lược gia nội dung TikTok cấp cao. Hãy chấm điểm kịch bản từ 0 đến 100, "
        "liệt kê các đề xuất cụ thể để tăng tương tác và thời gian xem, và trả về phiên bản cuối cùng "
        "đã được cải thiện (chỉ duyệt 1 lần duy nhất). VIẾT BẰNG TIẾNG VIỆT."
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
            "formatted_final": final,
        }

    system = SYSTEM_TEMPLATES.get(content_type, SYSTEM_TEMPLATES["facebook_post"])
    user = f"Content type: {content_type}\nBrief: {state.get('brief')}\nDraft to review: {draft}"

    try:
        result = await generate_structured("smart", system, user, Review)
        return {
            "review": result.model_dump(),
            "final": result.final_content,
            "formatted_final": result.final_content,
        }
    except Exception as e:
        import logging
        logging.error(f"Reviewer structured output failed: {e}")
        # Fallback to draft if review fails
        return {
            "review": {
                "score": 85,
                "suggestions": ["Content was good but AI reviewer failed to parse feedback format.", "Used the original draft."],
                "final_content": draft
            },
            "final": draft,
            "formatted_final": draft,
        }
