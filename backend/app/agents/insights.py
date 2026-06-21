"""Combined research + SEO agent — single LLM call instead of two."""

from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import Insights

SYSTEM = (
    "Bạn là chuyên gia phân tích thị trường và SEO của Vitba AI. Dựa trên brief sản phẩm, hãy trả về bằng Tiếng Việt:\n"
    "- primary_keyword: từ khóa chính SEO (1 từ/cụm từ, volume cao, relevant nhất)\n"
    "- secondary_keywords: 5-8 từ khóa phụ (long-tail, LSI, related)\n"
    "- pain_points: 3-5 nỗi đau khách hàng CỤ THỂ (dùng ngôn ngữ đời thường, có cảm xúc)\n"
    "- product_benefits: 3-5 lợi ích sản phẩm CỤ THỂ (có con số nếu có thể, so sánh với đối thủ)\n"
    "- creative_angle: góc sáng tạo ĐỘC ĐÁO để copywriter viết nội dung (không cliché, có twist)"
)


async def insights(state: dict[str, Any]) -> dict[str, Any]:
    brief = state["brief"]
    goal = state.get("marketing_goal", "")

    if not state.get("provider_available"):
        return {
            "insights": Insights(
                primary_keyword=brief,
                secondary_keywords=[f"best {brief}", f"{brief} guide"],
                pain_points=[f"Khó khăn khi chọn {brief} phù hợp"],
                product_benefits=["Chất lượng cao", "Dễ sử dụng", "Giá hợp lý"],
                creative_angle=f"Giải pháp {brief} dành riêng cho bạn",
            ).model_dump()
        }

    user = f"Product/brief: {brief}\nMarketing goal: {goal}"
    result = await generate_structured("fast", SYSTEM, user, Insights)
    return {"insights": result.model_dump()}
