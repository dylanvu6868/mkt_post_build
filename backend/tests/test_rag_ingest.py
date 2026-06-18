from unittest.mock import patch

from app.rag.chunk import chunk_text


def test_chunk_text_integrates_with_extract():
    """Verify the chunk module works on realistic extracted text."""
    text = "This is a test document. " * 500  # ~2500 words
    chunks = chunk_text(text, chunk_size=800, overlap=100)
    assert len(chunks) >= 3
    for c in chunks:
        assert len(c.split()) <= 810  # chunk_size + small tolerance


@patch("app.rag.ingest.upsert_chunks")
@patch("app.rag.ingest.embed_texts")
@patch("app.rag.ingest.extract_text")
async def test_ingest_document_orchestrates_pipeline(
    mock_extract, mock_embed, mock_upsert
):
    from app.rag.ingest import ingest_document

    mock_extract.return_value = "word " * 1600  # large enough to produce multiple chunks
    mock_embed.return_value = [[0.1] * 384, [0.2] * 384, [0.3] * 384]  # 3 vectors

    count = await ingest_document(b"fake content", "test.txt", project_id=1, document_id=1)

    mock_extract.assert_called_once()
    mock_embed.assert_called_once()
    mock_upsert.assert_called_once()
    assert count >= 1
