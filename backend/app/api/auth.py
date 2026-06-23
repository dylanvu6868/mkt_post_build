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
    ForgotPasswordRequest,
    LoginRequest,
    OAuthRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
    user_to_response,
)
from app.services import auth_service
from app.services.email_service import email_service
from app.services.oauth_service import find_or_create_oauth_user, verify_facebook_token, verify_google_token

router = APIRouter(prefix="/auth", tags=["auth"])


async def _link_facebook_pages(session: AsyncSession, user_id: int, fb_token: str):
    """Best-effort: save OAuth account + pages when user logs in with Facebook."""
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import select
    from app.core.encryption import encrypt_token
    from app.models.oauth_account import OAuthAccount
    from app.models.meta_page import MetaPage
    from app.mcp.meta.graph_api import get_long_lived_token, get_user_pages
    from app.core.config import settings

    long_data = await get_long_lived_token(settings.meta_app_id, settings.meta_app_secret, fb_token)
    access_token = long_data.get("access_token", fb_token)
    expires_in = long_data.get("expires_in", 5184000)

    existing = (await session.execute(
        select(OAuthAccount).where(OAuthAccount.user_id == user_id, OAuthAccount.provider == "meta")
    )).scalar_one_or_none()

    if existing:
        existing.access_token_enc = encrypt_token(access_token)
        existing.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    else:
        session.add(OAuthAccount(
            user_id=user_id, provider="meta",
            access_token_enc=encrypt_token(access_token),
            token_expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
            scopes="pages_show_list,pages_read_engagement,pages_manage_posts",
        ))
    await session.flush()

    pages = await get_user_pages(access_token)
    for p in pages:
        page_id = p["id"]
        existing_page = (await session.execute(
            select(MetaPage).where(MetaPage.user_id == user_id, MetaPage.page_id == page_id)
        )).scalar_one_or_none()

        page_token = p.get("access_token", "")
        if existing_page:
            existing_page.page_access_token_enc = encrypt_token(page_token)
            existing_page.page_name = p.get("name")
            existing_page.category = p.get("category")
            existing_page.followers_count = p.get("followers_count", 0)
        else:
            session.add(MetaPage(
                user_id=user_id, page_id=page_id,
                page_name=p.get("name"), category=p.get("category"),
                page_access_token_enc=encrypt_token(page_token),
                followers_count=p.get("followers_count", 0),
            ))
    await session.commit()
    logger.info("Auto-linked %d Facebook pages for user %s", len(pages), user_id)


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


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    session: AsyncSession = Depends(get_session),
):
    user = await auth_service.get_user_by_email(session, payload.email)
    if user is None:
        # Don't reveal if email exists or not for security
        logger.info("Forgot password requested for non-existent email=%s", payload.email)
        return {"message": "If the email exists, a reset code has been sent"}

    # Generate and store reset code
    reset_code = await auth_service.create_password_reset_code(session, user.id)
    logger.info("Password reset code generated for user_id=%s email=%s", user.id, user.email)

    # Send email with reset code
    email_sent = await email_service.send_password_reset_code(user.email, reset_code)

    if not email_sent:
        logger.warning("Failed to send password reset email to %s", user.email)
        # Still return success message for security (don't reveal email service issues)
        logger.info("Reset code for %s: %s (email not sent, logged for development)", user.email, reset_code)

    return {"message": "If the email exists, a reset code has been sent"}


@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    session: AsyncSession = Depends(get_session),
):
    user = await auth_service.get_user_by_email(session, payload.email)
    if user is None:
        logger.warning("Reset password failed: email not found email=%s", payload.email)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Email not found"
        )

    success = await auth_service.verify_password_reset_code(
        session, user.id, payload.code, payload.new_password
    )
    if not success:
        logger.warning("Reset password failed: invalid or expired code email=%s", payload.email)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset code"
        )

    logger.info("Password reset successful for user_id=%s email=%s", user.id, user.email)
    return {"message": "Password reset successfully"}
