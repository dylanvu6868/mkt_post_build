"""GitHub MCP HTTP routes."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.mcp.github import tools as github_tools
from app.models.user import User

router = APIRouter(prefix="/mcp/github", tags=["github"])


class CreateRepoReq(BaseModel):
    name: str
    private: bool = True
    description: str = ""


class CommitReq(BaseModel):
    owner: str
    repo: str
    path: str
    content: str
    message: str
    branch: str = "main"


class RepoInfoReq(BaseModel):
    owner: str
    repo: str


@router.get("/user")
async def user_info(user: User = Depends(get_current_user)) -> dict[str, Any]:
    return await github_tools.get_user_info()


@router.post("/repos")
async def create_repo(body: CreateRepoReq, user: User = Depends(get_current_user)) -> dict[str, Any]:
    if not body.name.strip():
        raise HTTPException(400, "Tên repo là bắt buộc.")
    return await github_tools.create_repo(body.name, body.private, body.description)


@router.post("/commit")
async def commit_file(body: CommitReq, user: User = Depends(get_current_user)) -> dict[str, Any]:
    return await github_tools.commit_file(body.owner, body.repo, body.path, body.content, body.message, body.branch)


@router.get("/repos/{owner}/{repo}")
async def repo_info(owner: str, repo: str, user: User = Depends(get_current_user)) -> dict[str, Any]:
    return await github_tools.get_repo_info(owner, repo)
