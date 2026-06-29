"""Session memory management endpoints."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.services.memory import save_memory, get_memory, delete_memory

router = APIRouter(prefix="/api/memory", tags=["memory"])


class MemorySave(BaseModel):
    key: str
    value: str
    category: str = "general"


class MemoryDelete(BaseModel):
    key: str


@router.get("")
async def list_memory(user: User = Depends(get_current_user)):
    memories = await get_memory(user.id)
    return {"memories": [{"key": k, "value": v} for k, v in memories.items()]}


@router.post("")
async def set_memory(body: MemorySave, user: User = Depends(get_current_user)):
    await save_memory(user.id, body.key, body.value, body.category)
    return {"status": "ok", "key": body.key}


@router.delete("/{key}")
async def remove_memory(key: str, user: User = Depends(get_current_user)):
    await delete_memory(user.id, key)
    return {"status": "ok"}
