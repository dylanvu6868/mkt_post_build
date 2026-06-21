from langgraph.graph import END, START, StateGraph

from app.agents.copywriter import copywriter
from app.agents.formatter import formatter
from app.agents.reviewer import reviewer
from app.graph.state import GraphState

from app.agents.landing_page_coder import landing_page_coder
from app.agents.marketing_planner_rag import marketing_planner_rag

PREMIUM_PLANS = {"pro", "max"}


def route_by_content_type(state: GraphState):
    ctype = state.get("content_type", "facebook_post")
    if ctype == "landing_page":
        return "landing_page_coder"
    elif ctype == "marketing_plan":
        return "marketing_planner_rag"
    else:
        return "copywriter"


def route_after_copywriter(state: GraphState):
    if state.get("user_plan", "free") in PREMIUM_PLANS:
        return "reviewer"
    return END


def route_after_reviewer(state: GraphState):
    if state.get("custom_template"):
        return "formatter"
    return END


def build_graph():
    """Pipeline: copywriter (all) -> reviewer -> formatter (Pro/Max only)."""
    graph = StateGraph(GraphState)

    graph.add_node("copywriter", copywriter)
    graph.add_node("reviewer", reviewer)
    graph.add_node("formatter", formatter)
    graph.add_node("landing_page_coder", landing_page_coder)
    graph.add_node("marketing_planner_rag", marketing_planner_rag)

    graph.add_conditional_edges(
        START,
        route_by_content_type,
        {
            "copywriter": "copywriter",
            "landing_page_coder": "landing_page_coder",
            "marketing_planner_rag": "marketing_planner_rag",
        }
    )

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
