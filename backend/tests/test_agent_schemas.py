import pytest
from pydantic import ValidationError

from app.schemas.agents import (
    BrandContext,
    FacebookPostDraft,
    FusedBrief,
    Plan,
    Research,
    Review,
    SEO,
)


def test_plan_defaults_to_three_branches():
    assert Plan().tasks == ["research", "seo", "brand"]


def test_facebook_post_draft_fields():
    draft = FacebookPostDraft(
        hook="h", body="b", cta="c", hashtags=["#x"]
    )
    assert draft.model_dump() == {
        "hook": "h",
        "body": "b",
        "cta": "c",
        "hashtags": ["#x"],
    }


def test_review_nests_final_content_as_facebook_post():
    review = Review(
        score=90,
        suggestions=["tighten"],
        final_content=FacebookPostDraft(hook="h", body="b", cta="c", hashtags=[]),
    )
    dumped = review.model_dump()
    assert dumped["score"] == 90
    assert dumped["final_content"]["hook"] == "h"


def test_research_requires_all_fields():
    with pytest.raises(ValidationError):
        Research(pain_points=["x"])  # missing other required fields


def test_seo_and_brand_and_fusion_shapes():
    seo = SEO(
        primary_keyword="k",
        secondary_keywords=["a"],
        search_intent="informational",
        meta_description="m",
    )
    brand = BrandContext(relevant_context=[], brand_notes="none")
    fused = FusedBrief(unified_brief="brief")
    assert seo.primary_keyword == "k"
    assert brand.relevant_context == []
    assert fused.unified_brief == "brief"
