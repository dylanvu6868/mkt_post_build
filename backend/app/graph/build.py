from langgraph.graph import END, START, StateGraph

from app.agents.brand import brand
from app.agents.copywriter import copywriter
from app.agents.formatter import formatter
from app.agents.fusion import fusion
from app.agents.planner import planner
from app.agents.research import research
from app.agents.reviewer import reviewer
from app.agents.seo import seo
from app.graph.state import GraphState

# Import new agents
from app.agents.landing_page_coder import landing_page_coder
from app.agents.marketing_planner_rag import marketing_planner_rag

def route_by_content_type(state: GraphState):
    ctype = state.get("content_type", "facebook_post")
    if ctype == "landing_page":
        return "landing_page_pipeline"
    elif ctype == "marketing_plan":
        return "marketing_plan_pipeline"
    else:
        return "social_post_pipeline"

def build_graph():
    """Assemble and compile the multi-agent pipelines."""
    graph = StateGraph(GraphState)

    # Core Social Post Agents
    graph.add_node("planner", planner)
    graph.add_node("research_agent", research)
    graph.add_node("seo_agent", seo)
    graph.add_node("brand", brand)
    graph.add_node("fusion", fusion)
    graph.add_node("copywriter", copywriter)
    graph.add_node("reviewer", reviewer)
    graph.add_node("formatter", formatter)

    # New Feature Agents
    graph.add_node("landing_page_coder", landing_page_coder)
    graph.add_node("marketing_planner_rag", marketing_planner_rag)

    # Dynamic Routing from START
    graph.add_conditional_edges(
        START,
        route_by_content_type,
        {
            "social_post_pipeline": "planner",
            "landing_page_pipeline": "landing_page_coder",
            "marketing_plan_pipeline": "marketing_planner_rag",
        }
    )

    # --- Social Post Pipeline ---
    # fan-out
    graph.add_edge("planner", "research_agent")
    graph.add_edge("planner", "seo_agent")
    graph.add_edge("planner", "brand")
    # fan-in: fusion runs after all three parallel branches complete
    graph.add_edge("research_agent", "fusion")
    graph.add_edge("seo_agent", "fusion")
    graph.add_edge("brand", "fusion")
    # linear tail
    graph.add_edge("fusion", "copywriter")
    graph.add_edge("copywriter", "reviewer")
    graph.add_edge("reviewer", "formatter")
    graph.add_edge("formatter", END)

    # --- Landing Page Pipeline ---
    graph.add_edge("landing_page_coder", END)

    # --- Marketing Plan Pipeline ---
    graph.add_edge("marketing_planner_rag", END)

    return graph.compile()
