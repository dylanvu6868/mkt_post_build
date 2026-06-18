from app.rag.chunk import chunk_text


def test_short_text_becomes_single_chunk():
    chunks = chunk_text("Short text.", chunk_size=800, overlap=100)
    assert len(chunks) == 1
    assert chunks[0] == "Short text."


def test_long_text_is_split_with_overlap():
    # Each "word" is 1 token (approx). 2000 words → at least 3 chunks of ~800 with overlap.
    text = " ".join([f"word{i}" for i in range(2000)])
    chunks = chunk_text(text, chunk_size=800, overlap=100)
    assert len(chunks) >= 3
    # Verify overlap: chunk N's last `overlap` words should be chunk N+1's first `overlap` words
    for i in range(len(chunks) - 1):
        words_current = chunks[i].split()
        words_next = chunks[i + 1].split()
        # The last 100 words of the current chunk should match the first 100 of the next
        tail = words_current[-100:]
        head = words_next[:100]
        assert tail == head, f"No overlap between chunk {i} and {i+1}"


def test_empty_text_returns_empty():
    assert chunk_text("") == []
    assert chunk_text("   ") == []
