from langgraph.graph import END, START, StateGraph

from app.agents.brand import brand
from app.agents.copywriter import copywriter
from app.agents.fusion import fusion
from app.agents.planner import planner
from app.agents.research import research
from app.agents.reviewer import reviewer
from app.agents.seo import seo
from app.graph.state import GraphState


def build_graph():
    """Assemble and compile the 7-agent Facebook Post pipeline."""
    graph = StateGraph(GraphState)

    graph.add_node("planner", planner)
    graph.add_node("research_agent", research)
    graph.add_node("seo_agent", seo)
    graph.add_node("brand", brand)
    graph.add_node("fusion", fusion)
    graph.add_node("copywriter", copywriter)
    graph.add_node("reviewer", reviewer)

    graph.add_edge(START, "planner")
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
    graph.add_edge("reviewer", END)

    return graph.compile()
