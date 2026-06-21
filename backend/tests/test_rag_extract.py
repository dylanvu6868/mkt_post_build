import tempfile
from pathlib import Path

from app.rag.extract import extract_text


def test_rag_deps_import():
    import fastembed  # noqa: F401
    import qdrant_client  # noqa: F401
    import pypdf  # noqa: F401
    import docx  # noqa: F401


def test_extract_txt():
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False, mode="w") as f:
        f.write("Hello world from a text file.")
        f.flush()
        text = extract_text(Path(f.name))
    assert "Hello world" in text


def test_extract_unsupported_returns_empty():
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as f:
        f.write(b"a,b")
        f.flush()
        result = extract_text(Path(f.name))
    assert result == ""
