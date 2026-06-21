from fastembed import TextEmbedding, SparseTextEmbedding

from app.core.config import settings

_model: TextEmbedding | None = None
_sparse_model: SparseTextEmbedding | None = None
_reranker = None


def _get_model() -> TextEmbedding:
    global _model
    if _model is None:
        _model = TextEmbedding(model_name=settings.embedding_model)
    return _model


def _get_sparse_model() -> SparseTextEmbedding:
    global _sparse_model
    if _sparse_model is None:
        _sparse_model = SparseTextEmbedding(model_name=settings.sparse_embedding_model)
    return _sparse_model


def _get_reranker():
    global _reranker
    if _reranker is None:
        from fastembed.rerank.cross_encoder import TextCrossEncoder
        _reranker = TextCrossEncoder(model_name=settings.reranker_model)
    return _reranker


def embed_texts(texts: list[str]) -> list[list[float]]:
    model = _get_model()
    return [vec.tolist() for vec in model.embed(texts)]


def embed_query(query: str) -> list[float]:
    return embed_texts([query])[0]


def sparse_embed_texts(texts: list[str]) -> list[dict]:
    """Return list of {indices: [...], values: [...]} for Qdrant SparseVector."""
    model = _get_sparse_model()
    results = []
    for sparse in model.embed(texts):
        results.append({
            "indices": sparse.indices.tolist(),
            "values": sparse.values.tolist(),
        })
    return results


def sparse_embed_query(query: str) -> dict:
    return sparse_embed_texts([query])[0]


def rerank(query: str, texts: list[str], top_k: int | None = None) -> list[tuple[int, float]]:
    """Rerank texts by relevance to query. Returns [(original_index, score), ...] sorted by score desc."""
    if not texts:
        return []
    k = top_k or settings.rag_top_k
    model = _get_reranker()
    scores = list(model.rerank(query, texts))
    indexed = [(entry["index"], entry["score"]) for entry in scores]
    indexed.sort(key=lambda x: x[1], reverse=True)
    return indexed[:k]
