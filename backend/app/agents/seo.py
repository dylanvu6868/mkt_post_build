from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import SEO

SYSTEM = (
    "Bạn là một chiến lược gia SEO. Dựa trên bản tóm tắt sản phẩm, hãy trả về kết quả bằng Tiếng Việt "
    "bao gồm: từ khóa chính (primary keyword), các từ khóa phụ (secondary keywords), "
    "mục đích tìm kiếm chính (search intent), và thẻ mô tả (meta description)."
)


async def seo(state: dict[str, Any]) -> dict[str, Any]:
    brief = state["brief"]
    if not state.get("provider_available"):
        return {
            "seo": SEO(
                primary_keyword=brief,
                secondary_keywords=[f"best {brief}", f"{brief} guide"],
                search_intent="informational",
                meta_description=f"Everything you need to know about {brief}.",
            ).model_dump()
        }
    user = f"Product/brief: {brief}"
    result = await generate_structured("fast", SYSTEM, user, SEO)
    return {"seo": result.model_dump()}
