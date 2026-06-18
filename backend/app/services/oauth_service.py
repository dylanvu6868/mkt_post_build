import logging

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User

logger = logging.getLogger(__name__)

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v19.0/me"


async def verify_google_token(id_token: str) -> dict | None:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            GOOGLE_TOKENINFO_URL, params={"id_token": id_token}
        )
    if resp.status_code != 200:
        return None
    data = resp.json()
    if data.get("aud") != settings.google_client_id:
        return None
    return {
        "oauth_id": data["sub"],
        "email": data["email"],
        "name": data.get("name", data.get("email", "")),
    }


async def verify_facebook_token(access_token: str) -> dict | None:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            FACEBOOK_GRAPH_URL,
            params={"fields": "id,name,email", "access_token": access_token},
        )
    if resp.status_code != 200:
        return None
    data = resp.json()
    if "email" not in data:
        return None
    return {
        "oauth_id": data["id"],
        "email": data["email"],
        "name": data.get("name", data.get("email", "")),
    }


async def find_or_create_oauth_user(
    session: AsyncSession,
    provider: str,
    oauth_id: str,
    email: str,
    name: str,
) -> User:
    result = await session.execute(
        select(User).where(User.oauth_provider == provider, User.oauth_id == oauth_id)
    )
    user = result.scalar_one_or_none()
    if user is not None:
        return user

    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is not None:
        user.oauth_provider = provider
        user.oauth_id = oauth_id
        await session.commit()
        await session.refresh(user)
        return user

    user = User(
        name=name,
        email=email,
        password_hash=None,
        oauth_provider=provider,
        oauth_id=oauth_id,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    logger.info("OAuth user created user_id=%s provider=%s email=%s", user.id, provider, email)
    return user
