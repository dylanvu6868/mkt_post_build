from unittest.mock import patch

from app.agents.brand import brand
from app.schemas.agents import BrandContext


def _mock_state(project_id=1):
    return {
        "project_id": project_id,
        "brief": "eco-friendly water bottles",
        "marketing_goal": "brand awareness",
        "provider_available": False,
        "errors": [],
    }


@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_brand_returns_empty_context_when_no_docs(mock_embed, mock_retrieve):
    out = await brand(_mock_state())
    parsed = BrandContext(**out["brand_context"])
    assert parsed.relevant_context == []
    assert parsed.brand_notes


@patch(
    "app.agents.brand.retrieve",
    return_value=["Our brand is premium and eco-focused.", "We value sustainability."],
)
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_brand_returns_retrieved_chunks_as_context(mock_embed, mock_retrieve):
    out = await brand(_mock_state())
    parsed = BrandContext(**out["brand_context"])
    assert len(parsed.relevant_context) == 2
    assert "premium" in parsed.relevant_context[0]
    assert parsed.brand_notes


@patch("app.agents.brand.retrieve", side_effect=Exception("Qdrant down"))
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_brand_handles_qdrant_failure_gracefully(mock_embed, mock_retrieve):
    out = await brand(_mock_state())
    parsed = BrandContext(**out["brand_context"])
    assert parsed.relevant_context == []
    # Should still return valid output, not crash
