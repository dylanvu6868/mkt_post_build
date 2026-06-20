from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.deps import get_current_user
from app.core.db import get_session, get_session_maker
from app.core.plan_limits import check_kb_file_limit, upgrade_message
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
    # Verify project ownership
    project = await session.get(Project, project_id)
    if project is None or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    allowed, used, limit = await check_kb_file_limit(session, current_user)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Bạn đã dùng hết {limit} tài liệu Knowledge Base ({used}/{limit}). "
                + upgrade_message("tải thêm tài liệu KB")
            ),
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
