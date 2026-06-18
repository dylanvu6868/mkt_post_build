from pathlib import Path

import pypdf
from docx import Document as DocxDocument


def extract_text(file_path: Path) -> str:
    """Extract text content from PDF, DOCX, or TXT files."""
    suffix = file_path.suffix.lower()

    if suffix == ".pdf":
        return _extract_pdf(file_path)
    if suffix == ".docx":
        return _extract_docx(file_path)
    if suffix == ".txt":
        return _extract_txt(file_path)

    raise ValueError(f"Unsupported file type: {suffix}")


def _extract_pdf(file_path: Path) -> str:
    reader = pypdf.PdfReader(str(file_path))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages).strip()


def _extract_docx(file_path: Path) -> str:
    doc = DocxDocument(str(file_path))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs).strip()


def _extract_txt(file_path: Path) -> str:
    return file_path.read_text(encoding="utf-8").strip()
