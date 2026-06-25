"""Meta (Facebook/Instagram) Graph API helpers."""

import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

GRAPH_BASE = "https://graph.facebook.com"

# Permissions needed for publishing + insights + comments
META_SCOPES = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "pages_manage_engagement",
    "pages_read_user_content",
    "read_insights",
]


def oauth_authorize_url(state: str) -> str:
    """Build the Facebook OAuth authorize redirect URL."""
    params = {
        "client_id": settings.meta_app_id,
        "redirect_uri": settings.meta_redirect_uri,
        "state": state,
        "scope": ",".join(META_SCOPES),
        "response_type": "code",
        "auth_type": "rerequest",
    }
    from urllib.parse import urlencode
    return f"https://www.facebook.com/{settings.meta_api_version}/dialog/oauth?{urlencode(params)}"


async def exchange_code_for_token(code: str) -> dict[str, Any]:
    """Exchange OAuth code for a long-lived user access token."""
    params = {
        "client_id": settings.meta_app_id,
        "client_secret": settings.meta_app_secret,
        "redirect_uri": settings.meta_redirect_uri,
        "code": code,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{GRAPH_BASE}/{settings.meta_api_version}/oauth/access_token", params=params)
        resp.raise_for_status()
        return resp.json()


async def exchange_for_long_lived(short_token: str) -> dict[str, Any]:
    """Exchange a short-lived user token for a long-lived (60 days) one."""
    params = {
        "grant_type": "fb_exchange_token",
        "client_id": settings.meta_app_id,
        "client_secret": settings.meta_app_secret,
        "fb_exchange_token": short_token,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{GRAPH_BASE}/{settings.meta_api_version}/oauth/access_token", params=params)
        resp.raise_for_status()
        return resp.json()


async def graph_get(path: str, access_token: str, **params) -> dict[str, Any]:
    """Authenticated GET to the Graph API."""
    params = {**params, "access_token": access_token}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{GRAPH_BASE}/{settings.meta_api_version}/{path}", params=params)
        data = resp.json()
        if resp.status_code >= 400:
            logger.warning("Meta GET %s failed: %s", path, data)
        return data


async def graph_post(path: str, access_token: str, **payload) -> dict[str, Any]:
    """Authenticated POST to the Graph API."""
    payload = {**payload, "access_token": access_token}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{GRAPH_BASE}/{settings.meta_api_version}/{path}", data=payload)
        data = resp.json()
        if resp.status_code >= 400:
            logger.warning("Meta POST %s failed: %s", path, data)
        return data
