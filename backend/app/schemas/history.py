from datetime import datetime
from typing import Any

from pydantic import BaseModel


class HistoryResponse(BaseModel):
    id: int
    project_id: int
    content_type: str
    prompt: str
    output: dict[str, Any] | None = None
    score: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
