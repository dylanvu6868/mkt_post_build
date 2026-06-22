from typing import Any

from app.rag.embeddings import embed_query, sparse_embed_query
from app.rag.qdrant_store import retrieve
from app.schemas.agents import BrandContext


async def brand(state: dict[str, Any]) -> dict[str, Any]:
    """Retrieve relevant brand documents from Qdrant for the project.

    Embeds the user brief as a query, retrieves top-k chunks filtered by
    project_id, and returns them as grounded brand context for downstream
    agents.
    """
    project_id = state.get("project_id", 0)
    brief = state.get("brief", "")

    try:
        query_vector = embed_query(brief)
        query_sparse = sparse_embed_query(brief)
        chunks = retrieve(project_id, query_vector, query_sparse=query_sparse, query_text=brief)
    except Exception:  # noqa: BLE001 — Qdrant/embed failure should not crash the pipeline
        chunks = []

    if chunks:
        brand_notes = (
            f"Retrieved {len(chunks)} relevant brand document chunks. "
            f"Use these to maintain brand consistency."
        )
    else:
        brand_notes = "No brand documents found for this project."

    return {
        "brand_output": BrandContext(
            relevant_context=chunks,
            brand_notes=brand_notes,
        ).model_dump()
    }
