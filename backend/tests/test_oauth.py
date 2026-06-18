import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_google_login_invalid_token(client):
    with patch(
        "app.api.auth.verify_google_token", new_callable=AsyncMock, return_value=None
    ):
        resp = await client.post("/auth/google", json={"token": "bad-token"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid Google token"


@pytest.mark.asyncio
async def test_google_login_creates_user(client):
    profile = {"oauth_id": "g-123", "email": "guser@gmail.com", "name": "G User"}
    with patch(
        "app.api.auth.verify_google_token", new_callable=AsyncMock, return_value=profile
    ):
        resp = await client.post("/auth/google", json={"token": "valid-google-token"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "guser@gmail.com"
    assert data["user"]["name"] == "G User"


@pytest.mark.asyncio
async def test_google_login_returns_existing_user(client):
    profile = {"oauth_id": "g-456", "email": "existing@gmail.com", "name": "Existing"}
    with patch(
        "app.api.auth.verify_google_token", new_callable=AsyncMock, return_value=profile
    ):
        resp1 = await client.post("/auth/google", json={"token": "tok1"})
        resp2 = await client.post("/auth/google", json={"token": "tok2"})
    assert resp1.json()["user"]["id"] == resp2.json()["user"]["id"]


@pytest.mark.asyncio
async def test_facebook_login_invalid_token(client):
    with patch(
        "app.api.auth.verify_facebook_token", new_callable=AsyncMock, return_value=None
    ):
        resp = await client.post("/auth/facebook", json={"token": "bad-token"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid Facebook token"


@pytest.mark.asyncio
async def test_facebook_login_creates_user(client):
    profile = {"oauth_id": "fb-789", "email": "fbuser@fb.com", "name": "FB User"}
    with patch(
        "app.api.auth.verify_facebook_token", new_callable=AsyncMock, return_value=profile
    ):
        resp = await client.post("/auth/facebook", json={"token": "valid-fb-token"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "fbuser@fb.com"
