from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.core.plan_limits import check_project_limit, upgrade_message
from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectResponse
from app.services import project_service

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ProjectResponse:
    allowed, used, limit = await check_project_limit(session, current_user)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Bạn đã dùng hết {limit} dự án ({used}/{limit}). "
                + upgrade_message("tạo thêm dự án")
            ),
        )

    project = await project_service.create_project(
        session, current_user.id, payload.name
    )
    return ProjectResponse.model_validate(project)


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ProjectResponse]:
    projects = await project_service.list_projects(session, current_user.id)
    return [ProjectResponse.model_validate(p) for p in projects]
