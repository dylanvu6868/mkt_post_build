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


from app.agents.lab_generic import GenericToolResponse


@patch("app.agents.lab_generic.generate_structured", new_callable=AsyncMock)
async def test_generic_tool_endpoint_success(mock_gen, client, promote):
    mock_gen.return_value = GenericToolResponse(
        title="Phân tích thị trường App giao đồ ăn",
        summary="Thị trường tiềm năng lớn.",
        content="## Quy mô thị trường\nNội dung chi tiết.",
        key_points=["TAM lớn", "Cạnh tranh cao"],
    )
    reg = await client.post(
        "/auth/register",
        json={"name": "User", "email": "generic_ok@example.com", "password": "secret123"},
    )
    assert reg.status_code == 201
    user_id = reg.json()["user"]["id"]
    token = reg.json()["access_token"]
    await promote(user_id, "max")

    resp = await client.post(
        "/api/lab/generic/market-sizing",
        json={"inputs": {"product": "App giao đồ ăn", "market": "Hà Nội"}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Phân tích thị trường App giao đồ ăn"
    assert "TAM lớn" in data["key_points"]


async def test_generic_tool_endpoint_unknown_tool_404(client):
    reg = await client.post(
        "/auth/register",
        json={"name": "User", "email": "generic_404@example.com", "password": "secret123"},
    )
    token = reg.json()["access_token"]

    resp = await client.post(
        "/api/lab/generic/does-not-exist",
        json={"inputs": {}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404


async def test_generic_tool_endpoint_requires_auth(client):
    resp = await client.post(
        "/api/lab/generic/market-sizing",
        json={"inputs": {"product": "x"}},
    )
    assert resp.status_code == 403
