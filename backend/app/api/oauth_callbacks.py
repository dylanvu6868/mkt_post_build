from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_session
from app.core.encryption import encrypt_token
from app.api.deps import get_current_user
from app.models.meta_page import MetaPage
from app.models.oauth_account import OAuthAccount
from app.models.user import User
from app.mcp.meta.graph_api import exchange_code_for_token, get_long_lived_token, get_user_pages
from app.services.audit import log_action

router = APIRouter(prefix="/oauth", tags=["oauth"])


@router.get("/meta/url")
async def meta_oauth_url(user: User = Depends(get_current_user)):
    scopes = "pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content"
    url = (
        f"https://www.facebook.com/v21.0/dialog/oauth"
        f"?client_id={settings.meta_app_id}"
        f"&redirect_uri={settings.meta_redirect_uri}"
        f"&scope={scopes}"
        f"&state={user.id}"
    )
    return {"url": url}


@router.get("/callback/meta")
async def meta_callback(
    code: str = Query(...),
    state: str = Query(""),
    session: AsyncSession = Depends(get_session),
):
    user_id = int(state) if state.isdigit() else 0
    if not user_id:
        raise HTTPException(400, "Invalid state")

    token_data = await exchange_code_for_token(
        settings.meta_app_id, settings.meta_app_secret, settings.meta_redirect_uri, code,
    )
    short_token = token_data.get("access_token", "")
    if not short_token:
        raise HTTPException(400, "Failed to exchange code")

    long_data = await get_long_lived_token(settings.meta_app_id, settings.meta_app_secret, short_token)
    access_token = long_data.get("access_token", short_token)
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
    await session.commit()

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

    await log_action(session, user_id, "oauth.meta_linked", "oauth_account", "meta",
                     {"pages_count": len(pages)})

    return {"status": "connected", "pages": len(pages)}
