from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import Research

SYSTEM = (
    "Bạn là một chuyên gia phân tích nghiên cứu thị trường. Dựa trên thông tin sản phẩm và mục tiêu marketing, "
    "hãy trả về kết quả nghiên cứu có cấu trúc bằng Tiếng Việt bao gồm: nỗi đau của khách hàng (pain points), "
    "động lực mua hàng (customer motivations), lợi ích sản phẩm (product benefits), và ngữ cảnh ngành (industry context)."
)


async def research(state: dict[str, Any]) -> dict[str, Any]:
    brief = state["brief"]
    if not state.get("provider_available"):
        return {
            "research": Research(
                pain_points=[f"Buyers find it hard to choose the right {brief}."],
                customer_motivations=[
                    "Save time",
                    "Trust the brand",
                    "Get value for money",
                ],
                product_benefits=["High quality", "Easy to use", "Affordable"],
                industry_context=f"Demand for {brief} is growing steadily.",
            ).model_dump()
        }
    user = f"Product/brief: {brief}\nMarketing goal: {state.get('marketing_goal', '')}"
    result = await generate_structured("fast", SYSTEM, user, Research)
    return {"research": result.model_dump()}
