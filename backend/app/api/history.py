from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.project import Project
from app.models.user import User
from app.schemas.history import HistoryResponse
from app.services import history_service

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=list[HistoryResponse])
async def list_history(
    project_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[HistoryResponse]:
    project = await session.get(Project, project_id)
    if project is None or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    items = await history_service.list_history(
        session, project_id, current_user.id, current_user
    )
    return [HistoryResponse.model_validate(i) for i in items]


@router.delete("/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_history_item(
    history_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    deleted = await history_service.delete_history(session, history_id, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History item not found",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
