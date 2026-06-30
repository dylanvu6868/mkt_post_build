"""Tests for the generic Vitba Lab tool engine (26 new marketing tools)."""

from unittest.mock import patch, AsyncMock

import pytest

from app.agents.lab_generic import GENERIC_TOOLS, GenericToolResponse, run_generic_tool_agent

EXPECTED_IDS = {
    "market-sizing", "persona-builder", "campaign-analyzer", "sentiment-analysis",
    "swot-analyzer", "pricing-advisor", "landing-copy", "product-description",
    "email-sequence", "video-script", "press-release", "blog-writer",
    "ads-copy", "cta-optimizer", "funnel-copy", "cro-auditor", "promo-designer",
    "retention-planner", "loyalty-designer", "faq-handler", "testimonial-enhancer",
    "brand-naming", "tagline-generator", "positioning-builder", "content-calendar",
    "brand-voice-guideline",
}


def test_generic_tools_registry_has_26_entries():
    assert len(GENERIC_TOOLS) == 26


def test_generic_tools_registry_ids_match_expected():
    assert set(GENERIC_TOOLS.keys()) == EXPECTED_IDS


def test_generic_tools_each_have_name_prompt_and_fields():
    for tool_id, spec in GENERIC_TOOLS.items():
        assert spec.name, f"{tool_id} missing name"
        assert spec.system_prompt, f"{tool_id} missing system_prompt"
        assert 1 <= len(spec.fields) <= 3, f"{tool_id} field count out of range"
        for field in spec.fields:
            assert field.key
            assert field.label


async def test_run_generic_tool_agent_unknown_tool_raises():
    with pytest.raises(ValueError, match="Unknown generic tool"):
        await run_generic_tool_agent("does-not-exist", {})


@patch("app.agents.lab_generic.generate_structured", new_callable=AsyncMock)
async def test_run_generic_tool_agent_builds_user_message_from_fields(mock_gen):
    mock_gen.return_value = GenericToolResponse(
        title="t", summary="s", content="c", key_points=["a"]
    )
    await run_generic_tool_agent(
        "market-sizing", {"product": "App giao đồ ăn", "market": "Hà Nội"}
    )

    args = mock_gen.call_args[0]
    assert args[0] == "smart"
    user_msg = args[2]
    assert "Sản phẩm/Ngành: App giao đồ ăn" in user_msg
    assert "Thị trường mục tiêu: Hà Nội" in user_msg
    assert args[3] is GenericToolResponse


@patch("app.agents.lab_generic.generate_structured", new_callable=AsyncMock)
async def test_run_generic_tool_agent_skips_empty_fields(mock_gen):
    mock_gen.return_value = GenericToolResponse(title="t", summary="s", content="c")
    await run_generic_tool_agent("market-sizing", {"product": "   ", "market": "Hà Nội"})

    user_msg = mock_gen.call_args[0][2]
    assert "Sản phẩm/Ngành" not in user_msg
    assert "Thị trường mục tiêu: Hà Nội" in user_msg
