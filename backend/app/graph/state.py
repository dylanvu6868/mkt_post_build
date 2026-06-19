import operator
from typing import Annotated, Any, TypedDict


class GraphState(TypedDict, total=False):
    # inputs
    project_id: int
    content_type: str
    brief: str
    marketing_goal: str
    brand_profile: dict[str, Any]
    # agent outputs (stored as JSON-serializable dicts)
    plan: dict[str, Any]
    research: dict[str, Any]
    seo: dict[str, Any]
    brand_context: dict[str, Any]
    fused_brief: dict[str, Any]
    draft: dict[str, Any]
    review: dict[str, Any]
    final: dict[str, Any]
    custom_template: str | None
    formatted_final: dict[str, Any]
    # control
    provider_available: bool
    errors: Annotated[list[str], operator.add]  # reducer: parallel branches append
