import tempfile
from pathlib import Path

from app.core.config import settings
from app.rag.chunk import chunk_text
from app.rag.embeddings import embed_texts, sparse_embed_texts
from app.rag.extract import extract_text
from app.rag.qdrant_store import upsert_chunks


async def ingest_document(
    file_bytes: bytes,
    filename: str,
    project_id: int,
    document_id: int,
) -> int:
    """Full RAG pipeline: extract → chunk → embed → upsert to Qdrant.

    Returns the number of chunks stored.
    """
    suffix = Path(filename).suffix.lower()
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp.flush()
        tmp_path = Path(tmp.name)

    try:
        text = extract_text(tmp_path)
        if not text.strip():
            return 0

        chunks = chunk_text(
            text,
            chunk_size=settings.rag_chunk_size,
            overlap=settings.rag_chunk_overlap,
        )
        if not chunks:
            return 0

        vectors = embed_texts(chunks)
        sparse_vecs = sparse_embed_texts(chunks)
        upsert_chunks(project_id, document_id, chunks, vectors, sparse_vectors=sparse_vecs)
        return len(chunks)
    finally:
        tmp_path.unlink(missing_ok=True)
