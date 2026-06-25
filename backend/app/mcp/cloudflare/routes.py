"""Cloudflare MCP HTTP routes."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.mcp.cloudflare import tools as cloudflare_tools
from app.models.user import User

router = APIRouter(prefix="/mcp/cloudflare", tags=["cloudflare"])


class DeployReq(BaseModel):
    name: str
    html: str
    landing_page_id: int | None = None


@router.post("/deploy")
async def deploy(
    body: DeployReq,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    if not body.name.strip() or not body.html.strip():
        raise HTTPException(400, "Tên và HTML là bắt buộc.")
    # Sanitize name for Cloudflare (lowercase, alphanumeric + hyphens)
    safe_name = "".join(c.lower() if c.isalnum() else "-" for c in body.name.strip())[:100]
    return await cloudflare_tools.deploy_html(session, user.id, safe_name, body.html, landing_page_id=body.landing_page_id)


@router.get("/status/{project_name}/{deployment_id}")
async def status(
    project_name: str,
    deployment_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    return await cloudflare_tools.get_deployment_status(session, user.id, project_name, deployment_id)


@router.delete("/deployments/{project_name}/{deployment_id}")
async def delete(
    project_name: str,
    deployment_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    return await cloudflare_tools.delete_deployment(session, user.id, project_name, deployment_id)


@router.get("/deployments")
async def list_deployments(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    deps = await cloudflare_tools.list_user_deployments(session, user.id)
    return {"deployments": deps}
