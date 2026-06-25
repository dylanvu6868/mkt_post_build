"""GitHub MCP tools — create repo, commit files, get repo info."""

import base64
import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

GITHUB_BASE = "https://api.github.com"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.github_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _has_token() -> bool:
    return bool(settings.github_token)


async def get_user_info() -> dict[str, Any]:
    if not _has_token():
        return {"error": "GITHUB_TOKEN chưa cấu hình."}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{GITHUB_BASE}/user", headers=_headers())
        data = resp.json()
        if resp.status_code >= 400:
            return {"error": data.get("message", "Lỗi GitHub API")}
    return data


async def create_repo(name: str, private: bool = True, description: str = "") -> dict[str, Any]:
    if not _has_token():
        return {"error": "GITHUB_TOKEN chưa cấu hình."}
    payload = {"name": name, "private": private, "description": description, "auto_init": True}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{GITHUB_BASE}/user/repos", headers=_headers(), json=payload)
        data = resp.json()
        if resp.status_code >= 400:
            return {"error": data.get("message", "Lỗi tạo repo")}
    return {
        "repo": data.get("full_name"),
        "html_url": data.get("html_url"),
        "clone_url": data.get("clone_url"),
        "default_branch": data.get("default_branch", "main"),
    }


async def commit_file(
    owner: str,
    repo: str,
    path: str,
    content: str,
    message: str,
    branch: str = "main",
) -> dict[str, Any]:
    """Create or update a file in a GitHub repo (single commit)."""
    if not _has_token():
        return {"error": "GITHUB_TOKEN chưa cấu hình."}
    encoded = base64.b64encode(content.encode()).decode()

    # Check if file exists to get its current SHA (needed for updates)
    async with httpx.AsyncClient(timeout=30) as client:
        get_resp = await client.get(
            f"{GITHUB_BASE}/repos/{owner}/{repo}/contents/{path}?ref={branch}",
            headers=_headers(),
        )
        sha = None
        if get_resp.status_code == 200:
            sha = get_resp.json().get("sha")

        payload = {"message": message, "content": encoded, "branch": branch}
        if sha:
            payload["sha"] = sha

        resp = await client.put(
            f"{GITHUB_BASE}/repos/{owner}/{repo}/contents/{path}",
            headers=_headers(),
            json=payload,
        )
        data = resp.json()
        if resp.status_code >= 400:
            return {"error": data.get("message", "Lỗi commit file")}
    return {
        "commit_sha": data.get("commit", {}).get("sha"),
        "commit_url": data.get("commit", {}).get("html_url"),
        "path": path,
    }


async def get_repo_info(owner: str, repo: str) -> dict[str, Any]:
    if not _has_token():
        return {"error": "GITHUB_TOKEN chưa cấu hình."}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{GITHUB_BASE}/repos/{owner}/{repo}", headers=_headers())
        data = resp.json()
        if resp.status_code >= 400:
            return {"error": data.get("message", "Repo không tồn tại")}
    return {
        "full_name": data.get("full_name"),
        "html_url": data.get("html_url"),
        "default_branch": data.get("default_branch"),
        "stars": data.get("stargazers_count"),
        "private": data.get("private"),
    }
