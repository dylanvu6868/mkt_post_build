import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.api.deps import get_current_user
from app.core.db import get_session
from app.core.plan_limits import get_limits, get_history_retention_days, get_user_plan, get_usage_stats
from app.core.rate_limit import limiter
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    OAuthRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    user_to_response,
)
from app.services import auth_service
from app.services.oauth_service import find_or_create_oauth_user, verify_facebook_token, verify_google_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED
)
@limiter.limit("5/minute")
async def register(
    request: Request,
    payload: RegisterRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    existing = await auth_service.get_user_by_email(session, payload.email)
    if existing is not None:
        logger.warning("Register failed: email already exists email=%s", payload.email)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )
    user = await auth_service.create_user(
        session, payload.name, payload.email, payload.password
    )
    logger.info("User registered user_id=%s email=%s", user.id, payload.email)
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=user_to_response(user))


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    payload: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    user = await auth_service.authenticate(session, payload.email, payload.password)
    if user is None:
        logger.warning("Login failed: invalid credentials email=%s", payload.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    if user.is_banned:
        logger.warning("Login blocked: banned user email=%s", payload.email)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account is banned"
        )
    logger.info("User logged in user_id=%s email=%s", user.id, payload.email)
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=user_to_response(user))


@router.post("/google", response_model=TokenResponse)
@limiter.limit("10/minute")
async def google_login(
    request: Request,
    payload: OAuthRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    profile = await verify_google_token(payload.token)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token"
        )
    user = await find_or_create_oauth_user(
        session, "google", profile["oauth_id"], profile["email"], profile["name"]
    )
    logger.info("Google login user_id=%s email=%s", user.id, profile["email"])
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=user_to_response(user))


@router.post("/facebook", response_model=TokenResponse)
@limiter.limit("10/minute")
async def facebook_login(
    request: Request,
    payload: OAuthRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    profile = await verify_facebook_token(payload.token)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Facebook token"
        )
    user = await find_or_create_oauth_user(
        session, "facebook", profile["oauth_id"], profile["email"], profile["name"]
    )
    logger.info("Facebook login user_id=%s email=%s", user.id, profile["email"])
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=user_to_response(user))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return user_to_response(current_user)


@router.get("/me/limits")
async def get_my_limits(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    plan = get_user_plan(current_user)
    limits = get_limits(current_user)
    usage = await get_usage_stats(session, current_user)
    return {
        "plan": plan,
        "plan_expires_at": (
            current_user.plan_expires_at.isoformat()
            if current_user.plan_expires_at
            else None
        ),
        "limits": {
            "daily_generations": limits["daily_generations"],
            "content_types": sorted(limits["content_types"]),
            "max_projects": limits["max_projects"],
            "max_conversations": limits["max_conversations"],
            "max_kb_files": limits["max_kb_files"],
            "max_brand_profiles": limits["max_brand_profiles"],
            "history_retention_days": get_history_retention_days(current_user),
        },
        "usage": usage,
    }
