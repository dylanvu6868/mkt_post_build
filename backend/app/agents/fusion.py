from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import FusedBrief

SYSTEM = (
    "Bạn có nhiệm vụ tổng hợp các thông tin từ nghiên cứu (research), SEO, và ngữ cảnh thương hiệu "
    "thành một bản tóm tắt sáng tạo (creative brief) ngắn gọn, súc tích bằng Tiếng Việt "
    "để copywriter có thể dựa vào đó viết nội dung trực tiếp."
)


async def fusion(state: dict[str, Any]) -> dict[str, Any]:
    brief = state["brief"]
    if not state.get("provider_available"):
        keyword = (state.get("seo") or {}).get("primary_keyword", brief)
        goal = state.get("marketing_goal") or "engagement"
        return {
            "fused_brief": FusedBrief(
                unified_brief=(
                    f"Write a Facebook post about {brief}. "
                    f"Lead with the primary keyword '{keyword}'. "
                    f"Emphasize the product benefits and address the audience's "
                    f"pain points. Goal: {goal}."
                )
            ).model_dump()
        }
    user = (
        f"Brief: {brief}\n"
        f"Research: {state.get('research')}\n"
        f"SEO: {state.get('seo')}\n"
        f"Brand context: {state.get('brand_context')}"
    )
    result = await generate_structured("fast", SYSTEM, user, FusedBrief)
    return {"fused_brief": result.model_dump()}
