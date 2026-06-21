import uuid

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.core.config import settings

_client: QdrantClient | None = None


def _get_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(url=settings.qdrant_url)
    return _client


def init_collection(vector_size: int = 384) -> None:
    """Create the collection if it doesn't exist (BGE-small = 384 dimensions)."""
    client = _get_client()
    collections = [c.name for c in client.get_collections().collections]
    if settings.qdrant_collection_name not in collections:
        client.create_collection(
            collection_name=settings.qdrant_collection_name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )


def upsert_chunks(
    project_id: int, document_id: int, chunks: list[str], vectors: list[list[float]]
) -> None:
    """Store embedded chunks in Qdrant with project_id + document_id payload."""
    client = _get_client()
    init_collection(vector_size=len(vectors[0]))
    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=vec,
            payload={
                "project_id": project_id,
                "document_id": document_id,
                "chunk_index": i,
                "text": chunk,
            },
        )
        for i, (chunk, vec) in enumerate(zip(chunks, vectors))
    ]
    client.upsert(collection_name=settings.qdrant_collection_name, points=points)


def retrieve(
    project_id: int, query_vector: list[float], top_k: int | None = None
) -> list[str]:
    """Retrieve top-k chunks for a project, filtered by project_id."""
    client = _get_client()
    k = top_k or settings.rag_top_k

    # Check collection exists; return empty if not
    collections = [c.name for c in client.get_collections().collections]
    if settings.qdrant_collection_name not in collections:
        return []

    results = client.query_points(
        collection_name=settings.qdrant_collection_name,
        query=query_vector,
        query_filter={
            "must": [{"key": "project_id", "match": {"value": project_id}}]
        },
        limit=k,
    )
    return [point.payload["text"] for point in results.points if point.payload]


def upsert_chunks_with_conv(
    project_id: int,
    document_id: int,
    conversation_id: int,
    chunks: list[str],
    vectors: list[list[float]],
) -> None:
    """Store embedded chunks with conversation_id for chat-scoped retrieval."""
    client = _get_client()
    init_collection(vector_size=len(vectors[0]))
    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=vec,
            payload={
                "project_id": project_id,
                "document_id": document_id,
                "conversation_id": conversation_id,
                "chunk_index": i,
                "text": chunk,
            },
        )
        for i, (chunk, vec) in enumerate(zip(chunks, vectors))
    ]
    client.upsert(collection_name=settings.qdrant_collection_name, points=points)


def retrieve_by_conversation(
    conversation_id: int, query_vector: list[float], top_k: int | None = None
) -> list[str]:
    """Retrieve top-k chunks scoped to a specific conversation."""
    client = _get_client()
    k = top_k or settings.rag_top_k

    collections = [c.name for c in client.get_collections().collections]
    if settings.qdrant_collection_name not in collections:
        return []

    results = client.query_points(
        collection_name=settings.qdrant_collection_name,
        query=query_vector,
        query_filter={
            "must": [{"key": "conversation_id", "match": {"value": conversation_id}}]
        },
        limit=k,
    )
    return [point.payload["text"] for point in results.points if point.payload]


def delete_by_document(document_id: int) -> None:
    """Delete all chunks belonging to a specific document."""
    client = _get_client()
    collections = [c.name for c in client.get_collections().collections]
    if settings.qdrant_collection_name not in collections:
        return
    client.delete(
        collection_name=settings.qdrant_collection_name,
        points_selector={
            "filter": {
                "must": [{"key": "document_id", "match": {"value": document_id}}]
            }
        },
    )
