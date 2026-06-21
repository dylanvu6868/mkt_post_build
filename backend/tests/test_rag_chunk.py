from app.rag.chunk import chunk_text


def test_short_text_becomes_single_chunk():
    chunks = chunk_text("Short text.", chunk_size=800, overlap=100)
    assert len(chunks) == 1
    assert chunks[0] == "Short text."


def test_long_text_is_split_with_overlap():
    text = " ".join([f"word{i}" for i in range(2000)])
    chunks = chunk_text(text, chunk_size=800, overlap=100)
    assert len(chunks) >= 3
    for i in range(len(chunks) - 1):
        words_cur = set(chunks[i].split())
        words_next = set(chunks[i + 1].split())
        shared = words_cur & words_next
        assert len(shared) > 0, f"No overlap between chunk {i} and {i+1}"


def test_empty_text_returns_empty():
    assert chunk_text("") == []
    assert chunk_text("   ") == []
