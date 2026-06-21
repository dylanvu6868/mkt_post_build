import logging
import uuid

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    Prefetch,
    SparseVector,
    SparseVectorParams,
    VectorParams,
)

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: QdrantClient | None = None


def _get_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(url=settings.qdrant_url)
    return _client


def _collection_exists() -> bool:
    client = _get_client()
    collections = [c.name for c in client.get_collections().collections]
    return settings.qdrant_collection_name in collections


def _is_hybrid_collection() -> bool:
    if not _collection_exists():
        return False
    client = _get_client()
    info = client.get_collection(settings.qdrant_collection_name)
    return isinstance(info.config.params.vectors, dict)


def init_collection(vector_size: int = 384) -> None:
    client = _get_client()

    if _collection_exists():
        if _is_hybrid_collection():
            return
        logger.warning("Migrating Qdrant collection to hybrid format (dense + sparse). Old data will be cleared.")
        client.delete_collection(settings.qdrant_collection_name)

    client.create_collection(
        collection_name=settings.qdrant_collection_name,
        vectors_config={
            "dense": VectorParams(size=vector_size, distance=Distance.COSINE),
        },
        sparse_vectors_config={
            "sparse": SparseVectorParams(),
        },
    )


def upsert_chunks(
    project_id: int,
    document_id: int,
    chunks: list[str],
    vectors: list[list[float]],
    sparse_vectors: list[dict] | None = None,
) -> None:
    client = _get_client()
    init_collection(vector_size=len(vectors[0]))

    points = []
    for i, (chunk, vec) in enumerate(zip(chunks, vectors)):
        vector_data: dict = {"dense": vec}
        if sparse_vectors and i < len(sparse_vectors):
            sv = sparse_vectors[i]
            vector_data["sparse"] = SparseVector(indices=sv["indices"], values=sv["values"])

        points.append(PointStruct(
            id=str(uuid.uuid4()),
            vector=vector_data,
            payload={
                "project_id": project_id,
                "document_id": document_id,
                "chunk_index": i,
                "text": chunk,
            },
        ))
    client.upsert(collection_name=settings.qdrant_collection_name, points=points)


def retrieve(
    project_id: int, query_vector: list[float], top_k: int | None = None,
    query_sparse: dict | None = None, query_text: str | None = None,
) -> list[str]:
    client = _get_client()
    if not _collection_exists():
        return []

    retrieve_k = settings.rag_retrieve_k
    final_k = top_k or settings.rag_top_k
    qfilter = Filter(must=[FieldCondition(key="project_id", match=MatchValue(value=project_id))])

    if query_sparse and _is_hybrid_collection():
        sparse_vec = SparseVector(indices=query_sparse["indices"], values=query_sparse["values"])
        results = client.query_points(
            collection_name=settings.qdrant_collection_name,
            prefetch=[
                Prefetch(query=query_vector, using="dense", filter=qfilter, limit=retrieve_k),
                Prefetch(query=sparse_vec, using="sparse", filter=qfilter, limit=retrieve_k),
            ],
            query=query_vector,
            using="dense",
            limit=retrieve_k,
        )
    else:
        query_kwargs = {"query": query_vector, "limit": retrieve_k}
        if _is_hybrid_collection():
            query_kwargs["using"] = "dense"
        results = client.query_points(
            collection_name=settings.qdrant_collection_name,
            query_filter=qfilter,
            **query_kwargs,
        )

    texts = [p.payload["text"] for p in results.points if p.payload]

    if query_text and len(texts) > final_k:
        from app.rag.embeddings import rerank
        ranked = rerank(query_text, texts, top_k=final_k)
        return [texts[idx] for idx, _ in ranked]

    return texts[:final_k]


def upsert_chunks_with_conv(
    project_id: int,
    document_id: int,
    conversation_id: int,
    chunks: list[str],
    vectors: list[list[float]],
    sparse_vectors: list[dict] | None = None,
) -> None:
    client = _get_client()
    init_collection(vector_size=len(vectors[0]))

    points = []
    for i, (chunk, vec) in enumerate(zip(chunks, vectors)):
        vector_data: dict = {"dense": vec}
        if sparse_vectors and i < len(sparse_vectors):
            sv = sparse_vectors[i]
            vector_data["sparse"] = SparseVector(indices=sv["indices"], values=sv["values"])

        points.append(PointStruct(
            id=str(uuid.uuid4()),
            vector=vector_data,
            payload={
                "project_id": project_id,
                "document_id": document_id,
                "conversation_id": conversation_id,
                "chunk_index": i,
                "text": chunk,
            },
        ))
    client.upsert(collection_name=settings.qdrant_collection_name, points=points)


def retrieve_by_conversation(
    conversation_id: int, query_vector: list[float], top_k: int | None = None,
    query_sparse: dict | None = None, query_text: str | None = None,
) -> list[str]:
    client = _get_client()
    if not _collection_exists():
        return []

    retrieve_k = settings.rag_retrieve_k
    final_k = top_k or settings.rag_top_k
    qfilter = Filter(must=[FieldCondition(key="conversation_id", match=MatchValue(value=conversation_id))])

    if query_sparse and _is_hybrid_collection():
        sparse_vec = SparseVector(indices=query_sparse["indices"], values=query_sparse["values"])
        results = client.query_points(
            collection_name=settings.qdrant_collection_name,
            prefetch=[
                Prefetch(query=query_vector, using="dense", filter=qfilter, limit=retrieve_k),
                Prefetch(query=sparse_vec, using="sparse", filter=qfilter, limit=retrieve_k),
            ],
            query=query_vector,
            using="dense",
            limit=retrieve_k,
        )
    else:
        query_kwargs = {"query": query_vector, "limit": retrieve_k}
        if _is_hybrid_collection():
            query_kwargs["using"] = "dense"
        results = client.query_points(
            collection_name=settings.qdrant_collection_name,
            query_filter=qfilter,
            **query_kwargs,
        )

    texts = [p.payload["text"] for p in results.points if p.payload]

    if query_text and len(texts) > final_k:
        from app.rag.embeddings import rerank
        ranked = rerank(query_text, texts, top_k=final_k)
        return [texts[idx] for idx, _ in ranked]

    return texts[:final_k]


def delete_by_document(document_id: int) -> None:
    client = _get_client()
    if not _collection_exists():
        return
    client.delete(
        collection_name=settings.qdrant_collection_name,
        points_selector={
            "filter": {
                "must": [{"key": "document_id", "match": {"value": document_id}}]
            }
        },
    )
