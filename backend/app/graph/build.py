from langgraph.graph import END, START, StateGraph

from app.agents.copywriter import copywriter
from app.graph.state import GraphState

from app.agents.landing_page_coder import landing_page_coder
from app.agents.marketing_planner_rag import marketing_planner_rag


def route_by_content_type(state: GraphState):
    ctype = state.get("content_type", "facebook_post")
    if ctype == "landing_page":
        return "landing_page_coder"
    elif ctype == "marketing_plan":
        return "marketing_planner_rag"
    else:
        return "copywriter"


def build_graph():
    """Single-shot pipeline: 1 LLM call for standard content types."""
    graph = StateGraph(GraphState)

    graph.add_node("copywriter", copywriter)
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

    graph.add_edge("copywriter", END)
    graph.add_edge("landing_page_coder", END)
    graph.add_edge("marketing_planner_rag", END)

    return graph.compile()
