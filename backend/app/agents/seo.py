import json
from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import SEO
from app.services.dataforseo import DataForSEOService

SYSTEM = (
    "Bạn là một chiến lược gia SEO. Dựa trên bản tóm tắt sản phẩm, hãy trả về kết quả bằng Tiếng Việt "
    "bao gồm: từ khóa chính (primary keyword), các từ khóa phụ (secondary keywords), "
    "mục đích tìm kiếm chính (search intent), và thẻ mô tả (meta description)."
)

SYSTEM_WITH_DATA = (
    "Bạn là một chiến lược gia SEO chuyên nghiệp. Dựa trên bản tóm tắt sản phẩm VÀ dữ liệu thực "
    "từ DataForSEO (từ khóa, search volume, cạnh tranh, authority của domain), hãy đưa ra phân tích "
    "SEO sâu sắc bằng Tiếng Việt bao gồm: "
    "từ khóa chính (primary keyword), các từ khóa phụ (secondary keywords), "
    "mục đích tìm kiếm chính (search intent), và thẻ mô tả (meta description). "
    "Ưu tiên sử dụng dữ liệu thực từ DataForSEO để đưa ra quyết định có cơ sở."
)


async def seo(state: dict[str, Any]) -> dict[str, Any]:
    """LLM-only SEO analysis — fallback when DataForSEO is not configured."""
    brief = state["brief"]
    if not state.get("provider_available"):
        return {
            "seo_output": SEO(
                primary_keyword=brief,
                secondary_keywords=[f"best {brief}", f"{brief} guide"],
                search_intent="informational",
                meta_description=f"Everything you need to know about {brief}.",
            ).model_dump()
        }
    user = f"Product/brief: {brief}"
    result = await generate_structured("fast", SYSTEM, user, SEO)
    return {"seo_output": result.model_dump()}


async def seo_with_dataforseo(state: dict[str, Any]) -> dict[str, Any]:
    """SEO analysis enriched with real DataForSEO keyword & domain data.

    Fetches real keyword suggestions and domain rank overview, then feeds
    that data to the LLM for a more informed SEO strategy. Falls back to
    plain LLM-only analysis if DataForSEO is not configured.
    """
    brief = state["brief"]
    domain = state.get("domain", "")
    location_code = state.get("location_code", 2840)

    if not state.get("provider_available"):
        return {
            "seo_output": SEO(
                primary_keyword=brief,
                secondary_keywords=[f"best {brief}", f"{brief} guide"],
                search_intent="informational",
                meta_description=f"Everything you need to know about {brief}.",
            ).model_dump()
        }

    # If DataForSEO is not configured, fall back to plain LLM SEO
    if not DataForSEOService.get_api_key():
        return await seo(state)

    # Gather real data from DataForSEO
    d4s = DataForSEOService()
    try:
        keyword_data = await d4s.keyword_suggestions(brief, location_code)
    except Exception as exc:
        keyword_data = {"items": [], "error": str(exc)}

    rank_data: dict[str, Any] = {}
    if domain:
        try:
            rank_data = await d4s.domain_rank_overview(target=domain, location_code=location_code)
        except Exception as exc:
            rank_data = {"items": [], "error": str(exc)}

    # Build enriched prompt for the LLM
    data_context = (
        f"\n\n--- DataForSEO Research Data ---\n"
        f"Keyword Suggestions:\n{json.dumps(keyword_data, ensure_ascii=False, default=str)[:3000]}\n"
    )
    if rank_data:
        data_context += (
            f"\nDomain Rank Overview ({domain}):\n"
            f"{json.dumps(rank_data, ensure_ascii=False, default=str)[:2000]}\n"
        )
    data_context += "--- End DataForSEO Data ---"

    user = f"Product/brief: {brief}{data_context}"
    result = await generate_structured("fast", SYSTEM_WITH_DATA, user, SEO)
    return {
        "seo_output": result.model_dump(),
        "dataforseo_used": True,
        "dataforseo_keyword_data": keyword_data,
        "dataforseo_rank_data": rank_data,
    }
