"""Vercel MCP HTTP routes."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.mcp.vercel import tools as vercel_tools
from app.models.user import User

router = APIRouter(prefix="/mcp/vercel", tags=["vercel"])


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
    # Sanitize name for Vercel (lowercase, alphanumeric + hyphens)
    safe_name = "".join(c.lower() if c.isalnum() else "-" for c in body.name.strip())[:100]
    return await vercel_tools.deploy_html(session, user.id, safe_name, body.html, landing_page_id=body.landing_page_id)


@router.get("/status/{deployment_id}")
async def status(
    deployment_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    return await vercel_tools.get_deployment_status(session, user.id, deployment_id)


@router.delete("/deployments/{deployment_id}")
async def delete(
    deployment_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    return await vercel_tools.delete_deployment(session, user.id, deployment_id)


@router.get("/deployments")
async def list_deployments(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    deps = await vercel_tools.list_user_deployments(session, user.id)
    return {"deployments": deps}
