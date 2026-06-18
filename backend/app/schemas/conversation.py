from datetime import datetime

from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    title: str = Field(default="New conversation", max_length=255)
    folder: str | None = Field(default=None, max_length=255)


class ConversationUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    folder: str | None = None
    is_pinned: bool | None = None


class ConversationResponse(BaseModel):
    id: int
    title: str
    folder: str | None
    is_pinned: bool
    created_at: datetime
    updated_at: datetime
    last_message: str | None = None

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    metadata_json: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
