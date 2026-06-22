from unittest.mock import patch

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
        "project_id": 1,
        "brief": "eco-friendly water bottles",
        "marketing_goal": "brand awareness",
        "provider_available": False,
        "errors": [],
    }


async def test_planner_returns_fixed_three_branches():
    out = await planner(_mock_state())
    Plan(**out["plan_output"])  # validates shape
    assert out["plan_output"]["tasks"] == ["research", "seo", "brand"]


async def test_research_mock_is_schema_valid_and_nonempty():
    out = await research(_mock_state())
    parsed = Research(**out["research_output"])
    assert parsed.pain_points
    assert parsed.product_benefits


async def test_seo_mock_uses_brief_as_keyword_source():
    out = await seo(_mock_state())
    parsed = SEO(**out["seo_output"])
    assert parsed.primary_keyword
    assert parsed.secondary_keywords


@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_brand_returns_empty_context_when_no_docs(mock_embed, mock_retrieve):
    out = await brand(_mock_state())
    parsed = BrandContext(**out["brand_output"])
    assert parsed.relevant_context == []
    assert parsed.brand_notes


def _downstream_state():
    return {
        "brief": "eco-friendly water bottles",
        "marketing_goal": "brand awareness",
        "content_type": "facebook_post",
        "provider_available": False,
        "brand_profile": {},
        "research_output": {
            "pain_points": ["p"],
            "customer_motivations": ["m"],
            "product_benefits": ["b"],
            "industry_context": "c",
        },
        "seo_output": {
            "primary_keyword": "eco water bottle",
            "secondary_keywords": ["reusable bottle"],
            "search_intent": "informational",
            "meta_description": "m",
        },
        "brand_output": {"relevant_context": [], "brand_notes": "none"},
        "errors": [],
    }


async def test_fusion_mock_produces_unified_brief():
    out = await fusion(_downstream_state())
    parsed = FusedBrief(**out["fused_output"])
    assert parsed.unified_brief


async def test_copywriter_mock_produces_facebook_post():
    state = _downstream_state()
    state["fused_output"] = {"unified_brief": "write a post"}
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
    assert out["final"]["hook"]


async def test_copywriter_mock_uses_brand_profile():
    state = _downstream_state()
    state["fused_output"] = {"unified_brief": "write a post"}
    state["brand_profile"] = {
        "brand_name": "EcoBottle",
        "tone": "friendly",
        "writing_style": "conversational",
        "preferred_words": ["sustainable"],
        "forbidden_words": ["cheap"],
    }
    out = await copywriter(state)
    parsed = FacebookPostDraft(**out["draft"])
    # Mock output should include brand_name in the hook
    assert "EcoBottle" in parsed.hook
    # Mock output should include tone in the body
    assert "friendly" in parsed.body


async def test_copywriter_mock_produces_seo_blog():
    state = _downstream_state()
    state["content_type"] = "seo_blog"
    state["fused_output"] = {"unified_brief": "write a blog post"}
    out = await copywriter(state)
    assert "seo_title" in out["draft"]
    assert "blog_content" in out["draft"]
    assert "faq" in out["draft"]


async def test_copywriter_mock_produces_email():
    state = _downstream_state()
    state["content_type"] = "email"
    state["fused_output"] = {"unified_brief": "write an email"}
    out = await copywriter(state)
    assert "subject" in out["draft"]
    assert "body" in out["draft"]
    assert "cta" in out["draft"]


async def test_copywriter_mock_produces_landing_page():
    state = _downstream_state()
    state["content_type"] = "landing_page"
    state["fused_output"] = {"unified_brief": "write a landing page"}
    out = await copywriter(state)
    assert "headline" in out["draft"]
    assert "subheadline" in out["draft"]
    assert "benefits" in out["draft"]
    assert "cta" in out["draft"]


async def test_copywriter_mock_produces_tiktok_script():
    state = _downstream_state()
    state["content_type"] = "tiktok_script"
    state["fused_output"] = {"unified_brief": "write a tiktok script"}
    out = await copywriter(state)
    assert "hook" in out["draft"]
    assert "script" in out["draft"]
    assert "cta" in out["draft"]


async def test_reviewer_mock_handles_seo_blog():
    state = _downstream_state()
    state["content_type"] = "seo_blog"
    state["draft"] = {
        "seo_title": "title",
        "meta_description": "desc",
        "outline": ["intro"],
        "blog_content": "content",
        "faq": [{"question": "q", "answer": "a"}],
    }
    out = await reviewer(state)
    assert 0 <= out["review"]["score"] <= 100
    assert out["final"]["seo_title"]


async def test_reviewer_mock_handles_email():
    state = _downstream_state()
    state["content_type"] = "email"
    state["draft"] = {"subject": "s", "body": "b", "cta": "c"}
    out = await reviewer(state)
    assert 0 <= out["review"]["score"] <= 100
    assert out["final"]["subject"]
