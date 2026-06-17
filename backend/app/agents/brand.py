from typing import Any

from app.schemas.agents import BrandContext


async def brand(state: dict[str, Any]) -> dict[str, Any]:
    """M2 has no RAG yet (wired in M3), so return an empty grounded context.

    Kept as a graph node so the 7-agent topology and fan-in are exercised now;
    M3 replaces the body with a Qdrant retrieval filtered by project_id.
    """
    return {
        "brand_context": BrandContext(
            relevant_context=[],
            brand_notes="No brand documents ingested yet (RAG arrives in M3).",
        ).model_dump()
    }
