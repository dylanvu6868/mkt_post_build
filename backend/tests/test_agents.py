from app.agents.brand import brand
from app.agents.planner import planner
from app.agents.research import research
from app.agents.seo import seo
from app.schemas.agents import BrandContext, Plan, Research, SEO


def _mock_state():
    return {
        "brief": "eco-friendly water bottles",
        "marketing_goal": "brand awareness",
        "provider_available": False,
        "errors": [],
    }


async def test_planner_returns_fixed_three_branches():
    out = await planner(_mock_state())
    Plan(**out["plan"])  # validates shape
    assert out["plan"]["tasks"] == ["research", "seo", "brand"]


async def test_research_mock_is_schema_valid_and_nonempty():
    out = await research(_mock_state())
    parsed = Research(**out["research"])
    assert parsed.pain_points
    assert parsed.product_benefits


async def test_seo_mock_uses_brief_as_keyword_source():
    out = await seo(_mock_state())
    parsed = SEO(**out["seo"])
    assert parsed.primary_keyword
    assert parsed.secondary_keywords


async def test_brand_mock_returns_empty_context_in_m2():
    out = await brand(_mock_state())
    parsed = BrandContext(**out["brand_context"])
    assert parsed.relevant_context == []
    assert parsed.brand_notes
