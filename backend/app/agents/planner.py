from typing import Any

from app.schemas.agents import Plan


async def planner(state: dict[str, Any]) -> dict[str, Any]:
    """Deterministic node: the parallel fan-out is fixed, so no LLM call is needed."""
    return {"plan": Plan().model_dump()}
