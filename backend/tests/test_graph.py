from unittest.mock import patch

from app.graph.build import build_graph


def _initial_state():
    return {
        "project_id": 1,
        "content_type": "facebook_post",
        "brief": "eco-friendly water bottles",
        "marketing_goal": "brand awareness",
        "brand_profile": {},
        "provider_available": False,
        "errors": [],
    }


@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_graph_runs_copywriter_end_to_end_in_mock_mode(mock_embed, mock_retrieve):
    graph = build_graph()
    final = await graph.ainvoke(_initial_state())

    # Single-shot pipeline: routes to copywriter for facebook_post
    assert final["draft"]["hook"]
    assert final["draft"]["body"]
    assert final["draft"]["cta"]
    assert final["draft"]["hashtags"]


@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_graph_is_deterministic_in_mock_mode(mock_embed, mock_retrieve):
    graph = build_graph()
    a = await graph.ainvoke(_initial_state())
    b = await graph.ainvoke(_initial_state())
    assert a["draft"] == b["draft"]
