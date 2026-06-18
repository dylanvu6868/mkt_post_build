# M3 — RAG: Upload → Chunk → Embed → Qdrant → Retrieve, Wired into Brand Agent

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete RAG subsystem so users can upload brand documents (PDF/DOCX/TXT) per project, have them chunked and embedded into Qdrant, and wire the Brand Agent to retrieve top-k relevant chunks during content generation — grounding the pipeline in real brand context.

**Architecture:** Upload flow: `POST /documents/upload` persists a `documents` row (status: pending), then schedules a background task that extracts text → chunks it (~800 words, 100 overlap) → embeds via fastembed (BAAI/bge-small-en-v1.5, 384d, local/free) → upserts to a single Qdrant collection with `project_id` payload filtering. The Brand Agent (previously a stub in M2) now embeds the user's brief as a query, retrieves top-k chunks filtered by `project_id`, and feeds them as grounded context to the Fusion agent. All RAG calls are mocked in tests — no Qdrant or fastembed dependency at test time.

**Tech Stack:** fastembed (BAAI/bge-small-en-v1.5), qdrant-client, pypdf, python-docx, python-multipart (file uploads), FastAPI `BackgroundTasks`, SQLAlchemy 2.0 async, Alembic.

**Spec:** `docs/superpowers/specs/2026-06-17-ai-marketing-multiagent-design.md` (milestone **M3**, sections §5 RAG Subsystem, §4.2 Brand Agent contract, §8 `documents` table, §9 `/documents/upload` + `GET /documents` endpoints). M0 (scaffold), M1 (auth + projects + DB), and M2 (LLM pipeline + agents + async job/poll) are already merged to `master`.

---

## Preconditions

- Work on a feature branch: `git checkout -b m3-rag-brand-agent` (from `master`).
- The backend local venv exists at `backend/.venv` (Python 3.11). It gets new deps in Task 1.
- `config.py` already defines `llm_provider`, `openai_api_key`, `qdrant_url` (from M0). M3 adds new RAG-related config fields.
- The Docker stack can be started with `docker compose up -d` (Postgres + Qdrant). Needed for Task 8 (migration) and Task 9 (live verify).
- **All RAG external calls are mocked in tests:** fastembed and qdrant-client are never called in the test suite. Tests use `unittest.mock.patch` to simulate embed/retrieve/upsert.

## File Structure (created/modified in this plan)

```
backend/
  requirements.txt                       # MODIFY: add fastembed, qdrant-client, pypdf, python-docx, python-multipart
  app/
    core/
      config.py                          # MODIFY: add RAG settings (collection name, embedding model, chunk size/overlap, top_k)
    rag/
      __init__.py                        # CREATE: module docstring
      extract.py                         # CREATE: PDF/DOCX/TXT text extraction
      chunk.py                           # CREATE: overlapping word-based chunker
      embeddings.py                      # CREATE: fastembed singleton wrapper
      qdrant_store.py                    # CREATE: init_collection, upsert_chunks, retrieve, delete_by_document
      ingest.py                          # CREATE: full pipeline orchestrator (extract → chunk → embed → upsert)
    models/
      __init__.py                        # MODIFY: register Document
      document.py                        # CREATE: documents model
    schemas/
      document.py                        # CREATE: DocumentResponse
    services/
      document_service.py               # CREATE: create_document, list_documents, process_upload
    api/
      documents.py                       # CREATE: POST /documents/upload, GET /documents
    agents/
      brand.py                           # MODIFY: replace M2 stub with Qdrant retrieval
    main.py                              # MODIFY: include documents router
  alembic/
    versions/<hash>_add_documents.py     # CREATE via autogenerate
  tests/
    test_rag_extract.py                  # CREATE: text extraction + dep smoke tests
    test_rag_chunk.py                    # CREATE: chunker unit tests
    test_rag_ingest.py                   # CREATE: ingest pipeline integration (mocked)
    test_brand_rag.py                    # CREATE: Brand Agent with mocked Qdrant retrieval
    test_documents.py                    # CREATE: upload/list API endpoint tests
    test_agents.py                       # MODIFY: patch brand agent's embed/retrieve calls
    test_graph.py                        # MODIFY: patch brand agent's embed/retrieve calls
    test_generation_service.py           # MODIFY: patch brand agent's embed/retrieve calls
    test_generate.py                     # MODIFY: patch brand agent's embed/retrieve calls
```

---

### Task 1: M3 dependencies (RAG stack)

**Files:**
- Modify: `backend/requirements.txt`
- Test: `backend/tests/test_rag_extract.py` (import-only smoke, expanded in Task 3)

- [x] **Step 1: Append the M3 deps to `backend/requirements.txt`.** The full file becomes:

```
fastapi==0.115.5
uvicorn[standard]==0.32.1
pydantic-settings==2.6.1
email-validator==2.2.0
python-dotenv==1.0.1
sqlalchemy[asyncio]==2.0.36
asyncpg==0.30.0
alembic==1.14.0
bcrypt==4.2.1
python-jose[cryptography]==3.3.0
pytest==8.3.4
pytest-asyncio==0.24.0
httpx==0.28.1
aiosqlite==0.20.0
langchain==0.3.14
langchain-openai==0.2.14
langchain-anthropic==0.3.1
langgraph==0.2.62
fastembed==0.4.2
qdrant-client==1.12.1
pypdf==5.1.0
python-docx==1.1.2
python-multipart==0.0.19
```

- [x] **Step 2: Install the new deps** (from `backend/`)

```powershell
cd E:\product\mkt_post_build\backend
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```
Expected: installs succeed (fastembed, qdrant-client, pypdf, python-docx, python-multipart and their deps).

- [x] **Step 3: Write an import smoke test** — `backend/tests/test_rag_extract.py`

```python
def test_rag_deps_import():
    import fastembed  # noqa: F401
    import qdrant_client  # noqa: F401
    import pypdf  # noqa: F401
    import docx  # noqa: F401
```

- [x] **Step 4: Run it to verify the deps import cleanly**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_rag_extract.py::test_rag_deps_import -v`
Expected: PASS (1 test). Confirms the RAG stack installed correctly.

- [x] **Step 5: Run the existing suite to confirm no regression**

Run: `.\.venv\Scripts\python.exe -m pytest tests/ -q`
Expected: all M0+M1+M2 tests still pass.

- [x] **Step 6: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/requirements.txt backend/tests/test_rag_extract.py
git commit -m "build(backend): add RAG deps (fastembed, qdrant-client, pypdf, python-docx, python-multipart)"
```

---

### Task 2: RAG config settings

**Files:**
- Modify: `backend/app/core/config.py`

- [x] **Step 1: Add RAG settings to the `Settings` class.** Append after the `access_token_expire_minutes` field:

```python
    # RAG (M3)
    qdrant_collection_name: str = "marketing_docs"
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    rag_chunk_size: int = 800
    rag_chunk_overlap: int = 100
    rag_top_k: int = 5
```

- [x] **Step 2: Run existing tests to confirm no regression**

Run: `.\.venv\Scripts\python.exe -m pytest tests/ -q`
Expected: all tests still pass.

- [x] **Step 3: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/app/core/config.py
git commit -m "feat(backend): add RAG config settings (collection, embedding model, chunk params)"
```

---

### Task 3: Text extraction module

**Files:**
- Create: `backend/app/rag/__init__.py`
- Create: `backend/app/rag/extract.py`
- Test: `backend/tests/test_rag_extract.py` (extend)

- [x] **Step 1: Append extraction tests to `backend/tests/test_rag_extract.py`**

```python
import tempfile
from pathlib import Path

from app.rag.extract import extract_text


def test_extract_txt():
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False, mode="w") as f:
        f.write("Hello world from a text file.")
        f.flush()
        text = extract_text(Path(f.name))
    assert "Hello world" in text


def test_extract_unsupported_raises():
    import pytest

    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as f:
        f.write(b"a,b")
        f.flush()
        with pytest.raises(ValueError, match="Unsupported"):
            extract_text(Path(f.name))
```

- [x] **Step 2: Create `backend/app/rag/__init__.py`**

```python
# RAG subsystem
```

- [x] **Step 3: Create `backend/app/rag/extract.py`**

```python
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
```

- [x] **Step 4: Run the extraction tests**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_rag_extract.py -v`
Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/app/rag/__init__.py backend/app/rag/extract.py backend/tests/test_rag_extract.py
git commit -m "feat(backend): add RAG text extraction (PDF/DOCX/TXT)"
```

---

### Task 4: Text chunking module

**Files:**
- Create: `backend/app/rag/chunk.py`
- Test: `backend/tests/test_rag_chunk.py`

- [x] **Step 1: Write the tests** — `backend/tests/test_rag_chunk.py`

```python
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
        words_current = chunks[i].split()
        words_next = chunks[i + 1].split()
        tail = words_current[-100:]
        head = words_next[:100]
        assert tail == head, f"No overlap between chunk {i} and {i+1}"


def test_empty_text_returns_empty():
    assert chunk_text("") == []
    assert chunk_text("   ") == []
```

- [x] **Step 2: Create `backend/app/rag/chunk.py`**

```python
def chunk_text(
    text: str, chunk_size: int = 800, overlap: int = 100
) -> list[str]:
    """Split text into overlapping chunks of approximately `chunk_size` tokens.

    Uses a simple whitespace-based token approximation.
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
        start += chunk_size - overlap

    return chunks
```

- [x] **Step 3: Run the chunker tests**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_rag_chunk.py -v`
Expected: PASS (3 tests).

- [x] **Step 4: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/app/rag/chunk.py backend/tests/test_rag_chunk.py
git commit -m "feat(backend): add RAG text chunker (word-based, overlapping)"
```

---

### Task 5: Embeddings wrapper + Qdrant store

**Files:**
- Create: `backend/app/rag/embeddings.py`
- Create: `backend/app/rag/qdrant_store.py`

> These modules are integration-level (they talk to fastembed and Qdrant). They are **not unit-tested in isolation** — instead they're mocked at the call site in the ingest and brand-agent tests. This avoids requiring a running Qdrant or downloading the embedding model during CI.

- [x] **Step 1: Create `backend/app/rag/embeddings.py`**

```python
from fastembed import TextEmbedding

from app.core.config import settings

_model: TextEmbedding | None = None


def _get_model() -> TextEmbedding:
    global _model
    if _model is None:
        _model = TextEmbedding(model_name=settings.embedding_model)
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts, returning a list of vectors."""
    model = _get_model()
    return [vec.tolist() for vec in model.embed(texts)]


def embed_query(query: str) -> list[float]:
    """Embed a single query string."""
    return embed_texts([query])[0]
```

- [x] **Step 2: Create `backend/app/rag/qdrant_store.py`**

```python
import uuid

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.core.config import settings

_client: QdrantClient | None = None


def _get_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(url=settings.qdrant_url)
    return _client


def init_collection(vector_size: int = 384) -> None:
    """Create the collection if it doesn't exist (BGE-small = 384 dimensions)."""
    client = _get_client()
    collections = [c.name for c in client.get_collections().collections]
    if settings.qdrant_collection_name not in collections:
        client.create_collection(
            collection_name=settings.qdrant_collection_name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )


def upsert_chunks(
    project_id: int, document_id: int, chunks: list[str], vectors: list[list[float]]
) -> None:
    """Store embedded chunks in Qdrant with project_id + document_id payload."""
    client = _get_client()
    init_collection(vector_size=len(vectors[0]))
    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=vec,
            payload={
                "project_id": project_id,
                "document_id": document_id,
                "chunk_index": i,
                "text": chunk,
            },
        )
        for i, (chunk, vec) in enumerate(zip(chunks, vectors))
    ]
    client.upsert(collection_name=settings.qdrant_collection_name, points=points)


def retrieve(
    project_id: int, query_vector: list[float], top_k: int | None = None
) -> list[str]:
    """Retrieve top-k chunks for a project, filtered by project_id."""
    client = _get_client()
    k = top_k or settings.rag_top_k

    collections = [c.name for c in client.get_collections().collections]
    if settings.qdrant_collection_name not in collections:
        return []

    results = client.query_points(
        collection_name=settings.qdrant_collection_name,
        query=query_vector,
        query_filter={
            "must": [{"key": "project_id", "match": {"value": project_id}}]
        },
        limit=k,
    )
    return [point.payload["text"] for point in results.points if point.payload]


def delete_by_document(document_id: int) -> None:
    """Delete all chunks belonging to a specific document."""
    client = _get_client()
    collections = [c.name for c in client.get_collections().collections]
    if settings.qdrant_collection_name not in collections:
        return
    client.delete(
        collection_name=settings.qdrant_collection_name,
        points_selector={
            "filter": {
                "must": [{"key": "document_id", "match": {"value": document_id}}]
            }
        },
    )
```

- [x] **Step 3: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/app/rag/embeddings.py backend/app/rag/qdrant_store.py
git commit -m "feat(backend): add embeddings wrapper + Qdrant store (upsert/retrieve/delete)"
```

---

### Task 6: Ingest pipeline orchestrator

**Files:**
- Create: `backend/app/rag/ingest.py`
- Test: `backend/tests/test_rag_ingest.py`

- [x] **Step 1: Write the tests** — `backend/tests/test_rag_ingest.py`

```python
from unittest.mock import patch

from app.rag.chunk import chunk_text


def test_chunk_text_integrates_with_extract():
    """Verify the chunk module works on realistic extracted text."""
    text = "This is a test document. " * 500  # ~2500 words
    chunks = chunk_text(text, chunk_size=800, overlap=100)
    assert len(chunks) >= 3
    for c in chunks:
        assert len(c.split()) <= 810


@patch("app.rag.ingest.upsert_chunks")
@patch("app.rag.ingest.embed_texts")
@patch("app.rag.ingest.extract_text")
async def test_ingest_document_orchestrates_pipeline(
    mock_extract, mock_embed, mock_upsert
):
    from app.rag.ingest import ingest_document

    mock_extract.return_value = "word " * 1600
    mock_embed.return_value = [[0.1] * 384, [0.2] * 384, [0.3] * 384]

    count = await ingest_document(b"fake content", "test.txt", project_id=1, document_id=1)

    mock_extract.assert_called_once()
    mock_embed.assert_called_once()
    mock_upsert.assert_called_once()
    assert count >= 1
```

- [x] **Step 2: Create `backend/app/rag/ingest.py`**

```python
import tempfile
from pathlib import Path

from app.core.config import settings
from app.rag.chunk import chunk_text
from app.rag.embeddings import embed_texts
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
        upsert_chunks(project_id, document_id, chunks, vectors)
        return len(chunks)
    finally:
        tmp_path.unlink(missing_ok=True)
```

- [x] **Step 3: Run the ingest tests**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_rag_ingest.py -v`
Expected: PASS (2 tests).

- [x] **Step 4: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/app/rag/ingest.py backend/tests/test_rag_ingest.py
git commit -m "feat(backend): add RAG ingest pipeline (extract → chunk → embed → upsert)"
```

---

### Task 7: Wire Brand Agent to Qdrant retrieval + Document model + Upload API

**Files:**
- Create: `backend/app/models/document.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/app/schemas/document.py`
- Create: `backend/app/services/document_service.py`
- Create: `backend/app/api/documents.py`
- Modify: `backend/app/agents/brand.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_brand_rag.py`
- Test: `backend/tests/test_documents.py`
- Modify: `backend/tests/test_agents.py` (patch brand's embed/retrieve)
- Modify: `backend/tests/test_graph.py` (patch brand's embed/retrieve)
- Modify: `backend/tests/test_generation_service.py` (patch brand's embed/retrieve)
- Modify: `backend/tests/test_generate.py` (patch brand's embed/retrieve)

- [x] **Step 1: Create `backend/app/models/document.py`**

```python
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    filename: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

- [x] **Step 2: Modify `backend/app/models/__init__.py`** to register Document. The full file becomes:

```python
from app.models.document import Document
from app.models.generation_job import GenerationJob
from app.models.project import Project
from app.models.user import User

__all__ = ["Document", "GenerationJob", "Project", "User"]
```

- [x] **Step 3: Create `backend/app/schemas/document.py`**

```python
from datetime import datetime

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: int
    project_id: int
    filename: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [x] **Step 4: Create `backend/app/services/document_service.py`**

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.document import Document
from app.models.project import Project
from app.rag.ingest import ingest_document


async def create_document(
    session: AsyncSession, project_id: int, filename: str
) -> Document:
    doc = Document(project_id=project_id, filename=filename, status="pending")
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return doc


async def list_documents(
    session: AsyncSession, project_id: int, user_id: int
) -> list[Document]:
    result = await session.execute(
        select(Document)
        .join(Project, Document.project_id == Project.id)
        .where(Document.project_id == project_id, Project.user_id == user_id)
        .order_by(Document.created_at.desc())
    )
    return list(result.scalars().all())


async def process_upload(
    session_maker: async_sessionmaker[AsyncSession],
    document_id: int,
    project_id: int,
    file_bytes: bytes,
    filename: str,
) -> None:
    async with session_maker() as session:
        doc = await session.get(Document, document_id)
        if doc is None:
            return
        doc.status = "processing"
        await session.commit()

    try:
        await ingest_document(file_bytes, filename, project_id, document_id)
        async with session_maker() as session:
            doc = await session.get(Document, document_id)
            if doc is not None:
                doc.status = "ready"
                await session.commit()
    except Exception:  # noqa: BLE001
        async with session_maker() as session:
            doc = await session.get(Document, document_id)
            if doc is not None:
                doc.status = "failed"
                await session.commit()
```

- [x] **Step 5: Create `backend/app/api/documents.py`**

```python
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.deps import get_current_user
from app.core.db import get_session, get_session_maker
from app.models.project import Project
from app.models.user import User
from app.schemas.document import DocumentResponse
from app.services import document_service

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    project_id: int,
    file: UploadFile,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    session_maker: async_sessionmaker[AsyncSession] = Depends(get_session_maker),
) -> DocumentResponse:
    project = await session.get(Project, project_id)
    if project is None or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    filename = file.filename or "unknown"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    file_bytes = await file.read()
    doc = await document_service.create_document(session, project_id, filename)

    background_tasks.add_task(
        document_service.process_upload,
        session_maker,
        doc.id,
        project_id,
        file_bytes,
        filename,
    )

    return DocumentResponse.model_validate(doc)


@router.get("", response_model=list[DocumentResponse])
async def list_documents(
    project_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[DocumentResponse]:
    docs = await document_service.list_documents(session, project_id, current_user.id)
    return [DocumentResponse.model_validate(d) for d in docs]
```

- [x] **Step 6: Replace `backend/app/agents/brand.py`** with Qdrant retrieval. The full file becomes:

```python
from typing import Any

from app.rag.embeddings import embed_query
from app.rag.qdrant_store import retrieve
from app.schemas.agents import BrandContext


async def brand(state: dict[str, Any]) -> dict[str, Any]:
    project_id = state.get("project_id", 0)
    brief = state.get("brief", "")

    try:
        query_vector = embed_query(brief)
        chunks = retrieve(project_id, query_vector)
    except Exception:  # noqa: BLE001
        chunks = []

    if chunks:
        brand_notes = (
            f"Retrieved {len(chunks)} relevant brand document chunks. "
            f"Use these to maintain brand consistency."
        )
    else:
        brand_notes = "No brand documents found for this project."

    return {
        "brand_context": BrandContext(
            relevant_context=chunks,
            brand_notes=brand_notes,
        ).model_dump()
    }
```

- [x] **Step 7: Modify `backend/app/main.py`** to include the documents router. The full file becomes:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, documents, generate, projects
from app.core.config import settings

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(documents.router)
app.include_router(generate.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}
```

- [x] **Step 8: Write Brand Agent RAG tests** — `backend/tests/test_brand_rag.py`

```python
from unittest.mock import patch

from app.agents.brand import brand
from app.schemas.agents import BrandContext


def _mock_state(project_id=1):
    return {
        "project_id": project_id,
        "brief": "eco-friendly water bottles",
        "marketing_goal": "brand awareness",
        "provider_available": False,
        "errors": [],
    }


@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_brand_returns_empty_context_when_no_docs(mock_embed, mock_retrieve):
    out = await brand(_mock_state())
    parsed = BrandContext(**out["brand_context"])
    assert parsed.relevant_context == []
    assert parsed.brand_notes


@patch(
    "app.agents.brand.retrieve",
    return_value=["Our brand is premium and eco-focused.", "We value sustainability."],
)
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_brand_returns_retrieved_chunks_as_context(mock_embed, mock_retrieve):
    out = await brand(_mock_state())
    parsed = BrandContext(**out["brand_context"])
    assert len(parsed.relevant_context) == 2
    assert "premium" in parsed.relevant_context[0]
    assert parsed.brand_notes


@patch("app.agents.brand.retrieve", side_effect=Exception("Qdrant down"))
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_brand_handles_qdrant_failure_gracefully(mock_embed, mock_retrieve):
    out = await brand(_mock_state())
    parsed = BrandContext(**out["brand_context"])
    assert parsed.relevant_context == []
```

- [x] **Step 9: Write Document API tests** — `backend/tests/test_documents.py`

```python
from unittest.mock import patch


async def _register(client, email="doc@example.com"):
    resp = await client.post(
        "/auth/register",
        json={"name": "Doc", "email": email, "password": "secret123"},
    )
    return resp.json()["access_token"]


async def _project(client, headers):
    resp = await client.post("/projects", json={"name": "Doc Project"}, headers=headers)
    return resp.json()["id"]


async def test_upload_requires_auth(client):
    resp = await client.post(
        "/documents/upload?project_id=1",
        files={"file": ("test.txt", b"hello", "text/plain")},
    )
    assert resp.status_code in (401, 403)


@patch("app.services.document_service.ingest_document")
async def test_upload_and_list_documents(mock_ingest, client):
    mock_ingest.return_value = 5

    token = await _register(client)
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)

    upload_resp = await client.post(
        f"/documents/upload?project_id={project_id}",
        files={"file": ("brand_guide.txt", b"Our brand is premium.", "text/plain")},
        headers=headers,
    )
    assert upload_resp.status_code == 201
    doc = upload_resp.json()
    assert doc["filename"] == "brand_guide.txt"
    assert doc["status"] == "pending"

    list_resp = await client.get(
        f"/documents?project_id={project_id}", headers=headers
    )
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1
    assert list_resp.json()[0]["filename"] == "brand_guide.txt"


async def test_upload_rejects_unsupported_file_type(client):
    token = await _register(client, "bad@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)

    resp = await client.post(
        f"/documents/upload?project_id={project_id}",
        files={"file": ("data.csv", b"a,b,c", "text/csv")},
        headers=headers,
    )
    assert resp.status_code == 400


async def test_upload_rejects_other_users_project(client):
    token_a = await _register(client, "oa@example.com")
    project_a = await _project(client, {"Authorization": f"Bearer {token_a}"})
    token_b = await _register(client, "ob@example.com")

    resp = await client.post(
        f"/documents/upload?project_id={project_a}",
        files={"file": ("test.txt", b"hello", "text/plain")},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 404
```

- [x] **Step 10: Update M2 tests to patch brand agent's embed/retrieve**

The brand agent now calls `embed_query` and `retrieve` instead of returning static data. Tests from M2 that exercise the brand agent (directly or via the graph/service/API) must patch these two functions:

- `test_agents.py`: `test_brand_returns_empty_context_when_no_docs` uses `@patch`
- `test_graph.py`: both tests use `@patch` on `app.agents.brand.retrieve` and `app.agents.brand.embed_query`
- `test_generation_service.py`: both `run_generation_job` tests use `@patch`
- `test_generate.py`: `test_generate_then_poll_completes_in_mock_mode` uses `@patch`

- [x] **Step 11: Run the full test suite**

Run: `.\.venv\Scripts\python.exe -m pytest tests/ -v`
Expected: PASS (59 tests — M0+M1+M2+M3).

- [x] **Step 12: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/app/models/document.py backend/app/models/__init__.py \
  backend/app/schemas/document.py backend/app/services/document_service.py \
  backend/app/api/documents.py backend/app/agents/brand.py backend/app/main.py \
  backend/tests/test_brand_rag.py backend/tests/test_documents.py \
  backend/tests/test_agents.py backend/tests/test_graph.py \
  backend/tests/test_generation_service.py backend/tests/test_generate.py
git commit -m "feat(backend): wire Brand Agent to Qdrant RAG + document upload/list API"
```

---

### Task 8: Alembic migration for `documents` (Postgres)

**Files:**
- Create: `backend/alembic/versions/<hash>_add_documents.py` (via autogenerate)

> Needs Docker Postgres reachable on `localhost:5432`. The M2 migration (`generation_jobs`) should already be applied.

- [x] **Step 1: Ensure Postgres is up and previous migrations are applied**

```powershell
cd E:\product\mkt_post_build
docker compose up -d db
cd backend
$env:DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/marketing"
.\.venv\Scripts\alembic.exe upgrade head
```

- [x] **Step 2: Autogenerate the `documents` migration**

```powershell
.\.venv\Scripts\alembic.exe revision --autogenerate -m "add documents"
```
Expected: a new file whose `upgrade()` contains `op.create_table("documents", ...)` with columns `id, project_id (FK→projects.id), filename, status, created_at` and an index on `project_id`. It must NOT recreate `users`/`projects`/`generation_jobs`.

- [x] **Step 3: Apply the migration and verify the table exists**

```powershell
.\.venv\Scripts\alembic.exe upgrade head
docker compose exec db psql -U postgres -d marketing -c "\dt"
docker compose exec db psql -U postgres -d marketing -c "\d documents"
```
Expected: `\dt` lists `documents`; `\d documents` shows columns and the FK to `projects`.

- [x] **Step 4: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/alembic/versions/
git commit -m "feat(backend): add Alembic migration for documents"
```

---

### Task 9: Live verification against the Docker stack

**Files:** none (verification only).

- [ ] **Step 1: Rebuild and start the full stack**

```bash
cd E:/product/mkt_post_build
docker compose up --build -d
docker compose ps
```
Expected: all four services Up; `db` healthy. The rebuilt backend image includes the RAG code and new deps.

- [ ] **Step 2: Register a user and capture the token** (or reuse from M2)

```bash
curl -s -X POST http://localhost:8000/auth/register -H "Content-Type: application/json" -d "{\"name\":\"RAG\",\"email\":\"rag-m3@example.com\",\"password\":\"secret123\"}"
```

- [ ] **Step 3: Create a project**

```bash
curl -s -X POST http://localhost:8000/projects -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d "{\"name\":\"RAG Project\"}"
```

- [ ] **Step 4: Upload a brand document**

```bash
curl -s -X POST "http://localhost:8000/documents/upload?project_id=<PROJECT_ID>" -H "Authorization: Bearer <TOKEN>" -F "file=@brand_guide.txt"
```
Expected: HTTP 201 JSON with `status: "pending"`.

- [ ] **Step 5: List documents and verify status reaches `ready`**

```bash
curl -s "http://localhost:8000/documents?project_id=<PROJECT_ID>" -H "Authorization: Bearer <TOKEN>"
```
Expected: document status is `ready` (background ingest completed). If still `processing`, wait a moment and retry.

- [ ] **Step 6: Generate content and verify brand context is populated**

```bash
curl -s -X POST http://localhost:8000/generate -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d "{\"project_id\":<PROJECT_ID>,\"content_type\":\"facebook_post\",\"brief\":\"eco-friendly water bottles\",\"marketing_goal\":\"awareness\"}"
```
Then poll `GET /generate/<JOB_ID>`. Expected: `result.brand_context.relevant_context` contains chunks retrieved from the uploaded document.

- [ ] **Step 7: Confirm unauthenticated upload is rejected**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:8000/documents/upload?project_id=1" -F "file=@brand_guide.txt"
```
Expected: `401` or `403`.

- [ ] **Step 8: No commit needed** (verification only).

---

## Definition of Done (M3)

- `pytest` in `backend/` passes all tests: M0+M1+M2 plus M3 (RAG extraction, chunking, ingest pipeline, brand agent with Qdrant retrieval, document upload/list API, ownership enforcement, unsupported file rejection, Qdrant failure resilience).
- The RAG pipeline runs end-to-end: extract text (PDF/DOCX/TXT) → chunk (~800 words, 100 overlap) → embed (fastembed BGE-small, 384d) → upsert to Qdrant with `project_id` payload.
- `POST /documents/upload` creates a `documents` row (status: pending), schedules background ingest, document reaches `ready` on success or `failed` on error.
- `GET /documents?project_id=N` lists documents for the project, enforcing user ownership.
- The Brand Agent embeds the brief, retrieves top-k chunks from Qdrant filtered by `project_id`, returns `BrandContext(relevant_context=chunks, brand_notes=...)`.
- Brand Agent handles Qdrant/embedding failures gracefully (empty context, no crash).
- Alembic migration creates `documents` table in Postgres; `alembic upgrade head` is clean.
- M2 tests updated to patch brand agent's embed/retrieve calls — no regressions.
- All external RAG calls (fastembed, Qdrant) are mocked in the test suite — tests run offline.
- Live: register → create project → upload doc → list docs (ready) → generate → poll → `brand_context.relevant_context` contains real retrieved chunks.
- All work committed on the feature branch.

---

## Self-review notes

- **Spec coverage:**
  - §5 RAG Subsystem — full pipeline: extract (pypdf/python-docx/txt) → chunk (word-based, ~800/100 overlap) → fastembed (BGE-small-en-v1.5, 384d, local/free) → single Qdrant collection with `project_id` payload filtering → retrieve top-k.
  - §4.2 Brand Agent contract — now performs real retrieval: embeds brief as query, retrieves top-k chunks for the project, returns `BrandContext(relevant_context=chunks, brand_notes=...)`.
  - §8 `documents` table — `id, project_id (FK), filename, status (pending→processing→ready→failed), created_at`.
  - §9 Endpoints — `POST /documents/upload` (multipart file + query param `project_id`) returns 201 with `DocumentResponse`; `GET /documents?project_id=N` lists documents; both auth-guarded and ownership-checked.
  - §14 Error handling — background ingest catches all exceptions and marks document `failed`; Brand Agent catches Qdrant/embed failures and returns empty context (pipeline continues).
- **Intentional M3 scope (deferred):**
  - **Brand Voice** config injection into Copywriter prompt is **M4** (separate from RAG documents).
  - **Content history** table + `/history` endpoints are later milestones.
  - `delete_by_document()` is implemented in `qdrant_store.py` but not exposed via an API endpoint yet (document deletion API is a future enhancement).
- **Test isolation:** All tests mock `embed_query`, `embed_texts`, `retrieve`, `upsert_chunks`, and `ingest_document` at call sites. No fastembed model download, no Qdrant connection required. Tests remain fast (~10s) and offline.
- **Backward compatibility:** M2 tests that exercise the brand agent or full graph/service/API now use `@patch` decorators on `app.agents.brand.embed_query` and `app.agents.brand.retrieve` to avoid import-time Qdrant/fastembed side effects.
