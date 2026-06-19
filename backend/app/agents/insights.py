"""Combined research + SEO agent — single LLM call instead of two."""

from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import Insights

SYSTEM = (
    "Bạn là chuyên gia phân tích thị trường và SEO. Dựa trên brief sản phẩm, hãy trả về bằng Tiếng Việt: "
    "từ khóa chính (primary_keyword), từ khóa phụ (secondary_keywords), "
    "nỗi đau khách hàng (pain_points), lợi ích sản phẩm (product_benefits), "
    "và góc sáng tạo (creative_angle) để copywriter viết nội dung."
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
