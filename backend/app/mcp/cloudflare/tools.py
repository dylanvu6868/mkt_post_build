"""Cloudflare MCP tools — deploy HTML landing pages to Cloudflare Pages, check status, delete."""

import logging
from typing import Any
import json
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import tempfile
import zipfile
import os

from app.core.config import settings
from app.models.deployment import Deployment
from app.services.audit import log_action

logger = logging.getLogger(__name__)

CLOUDFLARE_BASE = "https://api.cloudflare.com/client/v4"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.cloudflare_api_token}"
    }


def _has_token() -> bool:
    return bool(settings.cloudflare_api_token) and bool(settings.cloudflare_account_id)


async def _ensure_project_exists(client: httpx.AsyncClient, name: str) -> bool:
    """Ensure the Cloudflare Pages project exists, creating it if it doesn't."""
    acc_id = settings.cloudflare_account_id
    resp = await client.get(
        f"{CLOUDFLARE_BASE}/accounts/{acc_id}/pages/projects/{name}",
        headers=_headers()
    )
    if resp.status_code == 200:
        return True
    
    # Need to create project
    create_payload = {
        "name": name,
        "production_branch": "main"
    }
    create_resp = await client.post(
        f"{CLOUDFLARE_BASE}/accounts/{acc_id}/pages/projects",
        headers=_headers(),
        json=create_payload
    )
    return create_resp.status_code < 400


async def deploy_html(
    session: AsyncSession,
    user_id: int,
    name: str,
    html: str,
    *,
    landing_page_id: int | None = None,
) -> dict[str, Any]:
    """Deploy a single HTML file to Cloudflare Pages as a static site.

    Returns {"deployment_url": ..., "deployment_id": ...} or {"error": ...}.
    """
    if not _has_token():
        return {"error": "CLOUDFLARE_API_TOKEN hoặc CLOUDFLARE_ACCOUNT_ID chưa cấu hình trên server."}

    acc_id = settings.cloudflare_account_id

    async with httpx.AsyncClient(timeout=60) as client:
        # Ensure project exists
        project_exists = await _ensure_project_exists(client, name)
        if not project_exists:
            return {"error": f"Không thể tạo Cloudflare Pages project {name}."}

        # Create a temporary zip file containing index.html
        fd, path = tempfile.mkstemp(suffix=".zip")
        os.close(fd)
        try:
            with zipfile.ZipFile(path, "w") as zipf:
                zipf.writestr("index.html", html)
            
            with open(path, "rb") as f:
                files = {"file": ("upload.zip", f, "application/zip")}
                resp = await client.post(
                    f"{CLOUDFLARE_BASE}/accounts/{acc_id}/pages/projects/{name}/deployments",
                    headers=_headers(),
                    files=files
                )
        finally:
            os.remove(path)

        data = resp.json()
        if resp.status_code >= 400:
            logger.warning("Cloudflare deploy failed: %s", data)
            return {"error": "Lỗi deploy Cloudflare: " + str(data.get("errors", [""])[0])}

    result_data = data.get("result", {})
    dep_id = result_data.get("id")
    url = result_data.get("url")
    
    # Track deployment
    dep = Deployment(
        user_id=user_id,
        platform="cloudflare",
        project_name=name,
        deployment_url=url,
        status="QUEUED",
        platform_deployment_id=dep_id,
    )
    session.add(dep)
    await session.flush()
    await log_action(session, user_id, "cloudflare.deploy", "deployment", str(dep.id),
                     {"name": name, "deployment_id": dep_id, "url": url})
    await session.commit()

    return {
        "deployment_id": dep_id,
        "deployment_url": url,
        "status": "QUEUED",
        "db_id": dep.id,
    }


async def get_deployment_status(session: AsyncSession, user_id: int, project_name: str, deployment_id: str) -> dict[str, Any]:
    """Check the status of a Cloudflare deployment."""
    if not _has_token():
        return {"error": "CLOUDFLARE_API_TOKEN chưa cấu hình."}
    acc_id = settings.cloudflare_account_id
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{CLOUDFLARE_BASE}/accounts/{acc_id}/pages/projects/{project_name}/deployments/{deployment_id}", 
            headers=_headers()
        )
        data = resp.json()
        if resp.status_code >= 400:
            return {"error": "Lỗi kiểm tra deployment"}
    
    res = data.get("result", {})
    return {
        "deployment_id": res.get("id"),
        "status": res.get("latest_stage", {}).get("status"),
        "url": res.get("url"),
    }


async def delete_deployment(session: AsyncSession, user_id: int, project_name: str, deployment_id: str) -> dict[str, Any]:
    """Delete a Cloudflare deployment (used for rollback/cleanup)."""
    if not _has_token():
        return {"error": "CLOUDFLARE_API_TOKEN chưa cấu hình."}
    acc_id = settings.cloudflare_account_id
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.delete(
            f"{CLOUDFLARE_BASE}/accounts/{acc_id}/pages/projects/{project_name}/deployments/{deployment_id}", 
            headers=_headers()
        )
        if resp.status_code >= 400:
            return {"error": "Lỗi xóa deployment"}
    await log_action(session, user_id, "cloudflare.delete", "deployment", deployment_id)
    return {"deleted": True, "deployment_id": deployment_id}


async def list_user_deployments(session: AsyncSession, user_id: int) -> list[dict[str, Any]]:
    rows = (
        await session.execute(
            select(Deployment)
            .where(Deployment.user_id == user_id, Deployment.platform == "cloudflare")
            .order_by(Deployment.created_at.desc())
        )
    ).scalars().all()
    return [
        {
            "id": d.id,
            "name": d.project_name,
            "url": d.deployment_url,
            "status": d.status,
            "cloudflare_id": d.platform_deployment_id,
            "created_at": str(d.created_at),
        }
        for d in rows
    ]
