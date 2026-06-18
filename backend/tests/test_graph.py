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
async def test_graph_runs_all_seven_agents_end_to_end_in_mock_mode(mock_embed, mock_retrieve):
    graph = build_graph()
    final = await graph.ainvoke(_initial_state())

    # planner → research/seo/brand (parallel) → fusion → copywriter → reviewer
    assert final["plan"]["tasks"] == ["research", "seo", "brand"]
    assert final["research"]["pain_points"]
    assert final["seo"]["primary_keyword"]
    assert final["brand_context"]["brand_notes"]
    assert final["fused_brief"]["unified_brief"]
    assert final["draft"]["hook"]
    assert 0 <= final["review"]["score"] <= 100
    assert final["final"]["hook"]


@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_graph_is_deterministic_in_mock_mode(mock_embed, mock_retrieve):
    graph = build_graph()
    a = await graph.ainvoke(_initial_state())
    b = await graph.ainvoke(_initial_state())
    assert a["final"] == b["final"]
