from langgraph.graph import END, START, StateGraph

from app.agents.brand import brand
from app.agents.copywriter import copywriter
from app.agents.formatter import formatter
from app.agents.fusion import fusion
from app.agents.landing_page_coder import landing_page_coder
from app.agents.marketing_planner_rag import marketing_planner_rag
from app.agents.planner import planner
from app.agents.research import research
from app.agents.reviewer import reviewer
from app.agents.seo import seo
from app.graph.state import GraphState

PREMIUM_PLANS = {"pro", "max"}


def route_by_content_type(state: GraphState):
    ctype = state.get("content_type", "facebook_post")
    if ctype == "landing_page":
        return "landing_page_coder"
    elif ctype == "marketing_plan":
        return "marketing_planner_rag"
    else:
        return "planner"


def route_after_copywriter(state: GraphState):
    if state.get("user_plan", "free") in PREMIUM_PLANS:
        return "reviewer"
    return END


def route_after_reviewer(state: GraphState):
    if state.get("custom_template"):
        return "formatter"
    return END


def build_graph():
    """Full pipeline: planner → [research, seo, brand] → fusion → copywriter → reviewer → formatter."""
    graph = StateGraph(GraphState)

    graph.add_node("planner", planner)
    graph.add_node("research", research)
    graph.add_node("seo", seo)
    graph.add_node("brand", brand)
    graph.add_node("fusion", fusion)
    graph.add_node("copywriter", copywriter)
    graph.add_node("reviewer", reviewer)
    graph.add_node("formatter", formatter)
    graph.add_node("landing_page_coder", landing_page_coder)
    graph.add_node("marketing_planner_rag", marketing_planner_rag)

    graph.add_conditional_edges(
        START,
        route_by_content_type,
        {
            "planner": "planner",
            "landing_page_coder": "landing_page_coder",
            "marketing_planner_rag": "marketing_planner_rag",
        },
    )

    graph.add_edge("planner", "research")
    graph.add_edge("planner", "seo")
    graph.add_edge("planner", "brand")

    graph.add_edge("research", "fusion")
    graph.add_edge("seo", "fusion")
    graph.add_edge("brand", "fusion")

    graph.add_edge("fusion", "copywriter")

    graph.add_conditional_edges(
        "copywriter",
        route_after_copywriter,
        {"reviewer": "reviewer", END: END},
    )

    graph.add_conditional_edges(
        "reviewer",
        route_after_reviewer,
        {"formatter": "formatter", END: END},
    )

    graph.add_edge("formatter", END)
    graph.add_edge("landing_page_coder", END)
    graph.add_edge("marketing_planner_rag", END)

    return graph.compile()
