def chunk_text(
    text: str, chunk_size: int = 800, overlap: int = 100
) -> list[str]:
    """Split text into overlapping chunks of approximately `chunk_size` tokens.

    Uses a simple whitespace-based token approximation. Each chunk contains
    roughly `chunk_size` words, with `overlap` words shared between consecutive
    chunks.
    """
    text = text.strip()
    if not text:
        return []

    words = text.split()
    if len(words) <= chunk_size:
        return [text]

    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk_words = words[start:end]
        chunks.append(" ".join(chunk_words))
        # Advance by (chunk_size - overlap) so the next chunk overlaps
        start += chunk_size - overlap

    return chunks
