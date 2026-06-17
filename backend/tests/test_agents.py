from app.agents.brand import brand
from app.agents.planner import planner
from app.agents.research import research
from app.agents.seo import seo
from app.schemas.agents import BrandContext, Plan, Research, SEO
from app.agents.copywriter import copywriter
from app.agents.fusion import fusion
from app.agents.reviewer import reviewer
from app.schemas.agents import FacebookPostDraft, FusedBrief, Review


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


def _downstream_state():
    return {
        "brief": "eco-friendly water bottles",
        "marketing_goal": "brand awareness",
        "provider_available": False,
        "brand_profile": {},
        "research": {
            "pain_points": ["p"],
            "customer_motivations": ["m"],
            "product_benefits": ["b"],
            "industry_context": "c",
        },
        "seo": {
            "primary_keyword": "eco water bottle",
            "secondary_keywords": ["reusable bottle"],
            "search_intent": "informational",
            "meta_description": "m",
        },
        "brand_context": {"relevant_context": [], "brand_notes": "none"},
        "errors": [],
    }


async def test_fusion_mock_produces_unified_brief():
    out = await fusion(_downstream_state())
    parsed = FusedBrief(**out["fused_brief"])
    assert parsed.unified_brief


async def test_copywriter_mock_produces_facebook_post():
    state = _downstream_state()
    state["fused_brief"] = {"unified_brief": "write a post"}
    out = await copywriter(state)
    parsed = FacebookPostDraft(**out["draft"])
    assert parsed.hook and parsed.body and parsed.cta
    assert parsed.hashtags


async def test_reviewer_mock_scores_and_returns_final():
    state = _downstream_state()
    state["draft"] = {
        "hook": "h",
        "body": "b",
        "cta": "Buy now",
        "hashtags": ["#eco"],
    }
    out = await reviewer(state)
    review = Review(**out["review"])
    assert 0 <= review.score <= 100
    assert review.suggestions
    # `final` is the improved post, surfaced as its own state key
    FacebookPostDraft(**out["final"])
    assert out["final"]["hook"]
