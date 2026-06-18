import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.core.db import get_session
from app.core.rate_limit import limiter
from app.core.security import create_access_token
from app.schemas.auth import LoginRequest, OAuthRequest, RegisterRequest, TokenResponse, UserResponse
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
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


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
    logger.info("User logged in user_id=%s email=%s", user.id, payload.email)
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


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
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


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
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))
