"""Vercel MCP tools — deploy HTML landing pages to Vercel, check status, delete."""

import base64
import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.deployment import Deployment
from app.services.audit import log_action

logger = logging.getLogger(__name__)

VERCEL_BASE = "https://api.vercel.com"


def _headers() -> dict:
    return {"Authorization": f"Bearer {settings.vercel_token}", "Content-Type": "application/json"}


def _has_token() -> bool:
    return bool(settings.vercel_token)


async def deploy_html(
    session: AsyncSession,
    user_id: int,
    name: str,
    html: str,
    *,
    landing_page_id: int | None = None,
) -> dict[str, Any]:
    """Deploy a single HTML file to Vercel as a static site.

    Returns {"deployment_url": ..., "deployment_id": ...} or {"error": ...}.
    """
    if not _has_token():
        return {"error": "VERCEL_TOKEN chưa cấu hình trên server."}

    # Vercel expects files as a list of {file, data} where data is base64-encoded.
    encoded = base64.b64encode(html.encode()).decode()
    payload: dict[str, Any] = {
        "name": name,
        "files": [{"file": "index.html", "data": encoded}],
        "projectSettings": {
            "framework": None,
            "buildCommand": None,
            "outputDirectory": None,
            "installCommand": None,
        },
        "target": "production",
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(f"{VERCEL_BASE}/v13/deployments", headers=_headers(), json=payload)
        data = resp.json()
        if resp.status_code >= 400:
            logger.warning("Vercel deploy failed: %s", data)
            return {"error": data.get("error", {}).get("message", "Lỗi deploy Vercel")}

    dep_id = data.get("id")
    url = data.get("url")
    inspection_url = data.get("inspector")

    # Track deployment
    dep = Deployment(
        user_id=user_id,
        platform="vercel",
        project_name=name,
        deployment_url=f"https://{url}" if url else None,
        status=data.get("status", "QUEUED"),
        platform_deployment_id=dep_id,
    )
    session.add(dep)
    await session.flush()
    await log_action(session, user_id, "vercel.deploy", "deployment", str(dep.id),
                     {"name": name, "deployment_id": dep_id, "url": url})
    await session.commit()

    return {
        "deployment_id": dep_id,
        "deployment_url": f"https://{url}" if url else None,
        "inspection_url": inspection_url,
        "status": data.get("status", "QUEUED"),
        "db_id": dep.id,
    }


async def get_deployment_status(session: AsyncSession, user_id: int, deployment_id: str) -> dict[str, Any]:
    """Check the status of a Vercel deployment."""
    if not _has_token():
        return {"error": "VERCEL_TOKEN chưa cấu hình."}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{VERCEL_BASE}/v13/deployments/{deployment_id}", headers=_headers())
        data = resp.json()
        if resp.status_code >= 400:
            return {"error": data.get("error", {}).get("message", "Lỗi kiểm tra deployment")}
    return {
        "deployment_id": data.get("id"),
        "status": data.get("status"),
        "url": data.get("url"),
        "ready": data.get("ready"),
    }


async def delete_deployment(session: AsyncSession, user_id: int, deployment_id: str) -> dict[str, Any]:
    """Delete a Vercel deployment (used for rollback/cleanup)."""
    if not _has_token():
        return {"error": "VERCEL_TOKEN chưa cấu hình."}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.delete(f"{VERCEL_BASE}/v13/deployments/{deployment_id}", headers=_headers())
        if resp.status_code >= 400:
            data = resp.json()
            return {"error": data.get("error", {}).get("message", "Lỗi xóa deployment")}
    await log_action(session, user_id, "vercel.delete", "deployment", deployment_id)
    return {"deleted": True, "deployment_id": deployment_id}


async def list_user_deployments(session: AsyncSession, user_id: int) -> list[dict[str, Any]]:
    rows = (
        await session.execute(
            select(Deployment)
            .where(Deployment.user_id == user_id, Deployment.platform == "vercel")
            .order_by(Deployment.created_at.desc())
        )
    ).scalars().all()
    return [
        {
            "id": d.id,
            "name": d.project_name,
            "url": d.deployment_url,
            "status": d.status,
            "vercel_id": d.platform_deployment_id,
            "created_at": str(d.created_at),
        }
        for d in rows
    ]
