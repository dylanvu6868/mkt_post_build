"""Hub plan-gating dependency factory."""

from fastapi import Depends, HTTPException

from app.api.deps import get_current_user
from app.core.plan_limits import get_limits
from app.models.user import User


def require_hub_tool(tool: str):
    async def _dep(user: User = Depends(get_current_user)) -> User:
        if tool not in get_limits(user).get("hub_tools", set()):
            raise HTTPException(
                status_code=403,
                detail="Gói của bạn chưa mở công cụ này trong Marketing Hub. Vui lòng nâng cấp lên Pro để dùng toàn bộ Hub (gói Lite có Email, SEO, Content Calendar).",
            )
        return user
    return _dep
