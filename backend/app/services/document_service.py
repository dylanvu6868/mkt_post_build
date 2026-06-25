import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.document import Document
from app.models.project import Project
from app.rag.ingest import ingest_document

logger = logging.getLogger(__name__)


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
    """List documents for a project owned by user_id."""
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
    """Background task: run the RAG ingest pipeline and update document status."""
    async with session_maker() as session:
        doc = await session.get(Document, document_id)
        if doc is None:
            return
        doc.status = "processing"
        await session.commit()

    try:
        chunk_count = await ingest_document(file_bytes, filename, project_id, document_id)
        async with session_maker() as session:
            doc = await session.get(Document, document_id)
            if doc is not None:
                doc.status = "ready"
                await session.commit()
        logger.info("Document %s ingested: %d chunks (project %s)", filename, chunk_count, project_id)
    except Exception as e:
        logger.exception("Document ingest failed for '%s' (doc_id=%s): %s", filename, document_id, e)
        async with session_maker() as session:
            doc = await session.get(Document, document_id)
            if doc is not None:
                doc.status = "failed"
                await session.commit()
