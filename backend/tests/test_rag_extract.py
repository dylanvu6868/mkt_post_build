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


def test_extract_csv():
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w") as f:
        f.write("name,age\nAlice,30\nBob,25")
        f.flush()
        text = extract_text(Path(f.name))
    assert "Alice" in text
    assert "Bob" in text


def test_extract_unsupported_returns_empty():
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as f:
        f.write(b"fake binary")
        f.flush()
        result = extract_text(Path(f.name))
    assert result == ""


def test_extract_txt_fallback_encoding():
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
        f.write("Caf\xe9 R\xe9sum\xe9".encode("latin-1"))
        f.flush()
        text = extract_text(Path(f.name))
    assert len(text) > 0
    assert "Caf" in text


def test_extract_empty_txt_returns_empty():
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False, mode="w") as f:
        f.write("   ")
        f.flush()
        text = extract_text(Path(f.name))
    assert text == ""
