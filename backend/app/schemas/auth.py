from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.core.plan_limits import get_user_plan
from app.models.user import User


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class OAuthRequest(BaseModel):
    token: str = Field(min_length=1, max_length=4096)


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    is_admin: bool = False
    plan: str = "lite"
    plan_expires_at: str | None = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


def user_to_response(user: User) -> UserResponse:
    expires = user.plan_expires_at
    if isinstance(expires, datetime):
        expires = expires.isoformat()
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        is_admin=user.is_admin,
        plan=get_user_plan(user),
        plan_expires_at=expires,
    )
