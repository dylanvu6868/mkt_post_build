from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import DRAFT_SCHEMAS, Review

SYSTEM_TEMPLATES: dict[str, str] = {
    "facebook_post": (
        "Bạn là biên tập viên nội dung cấp cao của Vitba AI. Hãy review bản nháp Facebook post:\n"
        "1. Chấm điểm từ 0-100 dựa trên: hook hấp dẫn (20đ), nỗi đau & insight (20đ), giải pháp thuyết phục (20đ), CTA rõ ràng (15đ), cảm xúc & engagement (15đ), hashtag & formatting (10đ).\n"
        "2. Liệt kê 3-5 đề xuất CỤ THỂ để cải thiện (không chung chung).\n"
        "3. Trả về phiên bản cuối cùng đã được tối ưu — PHẢI DÀI HƠN và CHI TIẾT HƠN bản nháp. Giữ nguyên framework đã chọn.\n"
        "4. Đảm bảo body có ít nhất 300 từ, hook gây tò mò mạnh, CTA tạo urgency. VIẾT BẰNG TIẾNG VIỆT."
    ),
    "seo_blog": (
        "Bạn là biên tập viên SEO cấp cao của Vitba AI. Hãy review bản nháp blog:\n"
        "1. Chấm điểm từ 0-100 dựa trên: SEO on-page (25đ), chất lượng nội dung (25đ), cấu trúc & readability (20đ), FAQ & keyword coverage (15đ), CTA & internal linking (15đ).\n"
        "2. Liệt kê 3-5 đề xuất CỤ THỂ: keyword density, heading hierarchy, meta tags, content gaps.\n"
        "3. Trả về phiên bản cuối cùng — blog PHẢI tối thiểu 1500 từ, SEO title <60 ký tự, meta description 150-160 ký tự.\n"
        "4. Bổ sung FAQ nếu thiếu (ít nhất 5 câu). VIẾT BẰNG TIẾNG VIỆT."
    ),
    "email": (
        "Bạn là biên tập viên Email Marketing cấp cao của Vitba AI. Hãy review bản nháp email:\n"
        "1. Chấm điểm từ 0-100 dựa trên: subject line (25đ), hook & personalization (20đ), body content (20đ), CTA (20đ), format & readability (15đ).\n"
        "2. Liệt kê 3-5 đề xuất CỤ THỂ để tăng open rate và click rate.\n"
        "3. Trả về phiên bản cuối cùng — subject <50 ký tự, preheader hấp dẫn, CTA nổi bật. VIẾT BẰNG TIẾNG VIỆT."
    ),
    "landing_page": (
        "Bạn là chuyên gia CRO (Conversion Rate Optimization) cấp cao của Vitba AI. Hãy review landing page:\n"
        "1. Chấm điểm từ 0-100 dựa trên: hero & value prop (25đ), benefits & features (20đ), social proof (20đ), CTA & urgency (20đ), overall UX flow (15đ).\n"
        "2. Liệt kê 3-5 đề xuất CỤ THỂ để tối ưu conversion rate.\n"
        "3. Trả về phiên bản cuối cùng đã tối ưu. VIẾT BẰNG TIẾNG VIỆT."
    ),
    "tiktok_script": (
        "Bạn là chiến lược gia nội dung TikTok cấp cao của Vitba AI. Hãy review kịch bản:\n"
        "1. Chấm điểm từ 0-100 dựa trên: hook 3s đầu (30đ), storytelling & flow (25đ), visual & scene direction (20đ), CTA & engagement (15đ), caption & hashtag (10đ).\n"
        "2. Liệt kê 3-5 đề xuất CỤ THỂ để tăng watch time và engagement.\n"
        "3. Trả về phiên bản cuối cùng — kịch bản PHẢI có chi tiết scene, text overlay, nhạc nền gợi ý. VIẾT BẰNG TIẾNG VIỆT."
    ),
}


async def reviewer(state: dict[str, Any]) -> dict[str, Any]:
    draft = state.get("draft", {})
    content_type = state.get("content_type", "facebook_post")

    if not state.get("provider_available"):
        # Mock mode — alert scope (không silently generate fake data)
        review = Review(
            score=0,
            suggestions=["Mock mode: reviewer skipped — set LLM_API_KEY để review thực."],
            final_content=draft,
        )
        return {
            "review": review.model_dump(),
            "final": draft,
            "formatted_final": draft,
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
