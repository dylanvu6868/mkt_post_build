import pytest


@pytest.mark.asyncio
async def test_register_returns_token_and_user(client):
    resp = await client.post(
        "/auth/register",
        json={"name": "Alice", "email": "alice@example.com", "password": "secret123"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "alice@example.com"
    assert "password" not in body["user"]
    assert "password_hash" not in body["user"]


@pytest.mark.asyncio
async def test_register_duplicate_email_conflicts(client):
    payload = {"name": "Bob", "email": "bob@example.com", "password": "secret123"}
    first = await client.post("/auth/register", json=payload)
    assert first.status_code == 201
    second = await client.post("/auth/register", json=payload)
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_login_with_valid_credentials(client):
    await client.post(
        "/auth/register",
        json={"name": "Carol", "email": "carol@example.com", "password": "secret123"},
    )
    resp = await client.post(
        "/auth/login", json={"email": "carol@example.com", "password": "secret123"}
    )
    assert resp.status_code == 200
    assert resp.json()["access_token"]


@pytest.mark.asyncio
async def test_login_with_wrong_password_rejected(client):
    await client.post(
        "/auth/register",
        json={"name": "Dave", "email": "dave@example.com", "password": "secret123"},
    )
    resp = await client.post(
        "/auth/login", json={"email": "dave@example.com", "password": "wrong"}
    )
    assert resp.status_code == 401
