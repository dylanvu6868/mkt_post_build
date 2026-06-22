import operator
from typing import Annotated, Any, TypedDict


class GraphState(TypedDict, total=False):
    # inputs
    project_id: int
    content_type: str
    brief: str
    marketing_goal: str
    brand_profile: dict[str, Any]
    user_plan: str
    # extra context from chat
    industry: str
    target_audience: str
    tone: str
    cta_text: str
    custom_structure: str | None
    # agent outputs (stored as JSON-serializable dicts)
    plan_output: dict[str, Any]
    research_output: dict[str, Any]
    seo_output: dict[str, Any]
    brand_output: dict[str, Any]
    fused_output: dict[str, Any]
    insights: dict[str, Any]
    draft: dict[str, Any]
    review: dict[str, Any]
    final: dict[str, Any]
    custom_template: str | None
    formatted_final: dict[str, Any]
    # control
    provider_available: bool
    errors: Annotated[list[str], operator.add]  # reducer: parallel branches append
