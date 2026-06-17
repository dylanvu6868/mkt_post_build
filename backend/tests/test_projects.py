import pytest


async def _register(client, email="user@example.com"):
    resp = await client.post(
        "/auth/register",
        json={"name": "User", "email": email, "password": "secret123"},
    )
    return resp.json()["access_token"]


async def test_create_project_requires_auth(client):
    resp = await client.post("/projects", json={"name": "My Project"})
    assert resp.status_code in (401, 403)


async def test_create_and_list_projects(client):
    token = await _register(client)
    headers = {"Authorization": f"Bearer {token}"}

    create = await client.post("/projects", json={"name": "Launch"}, headers=headers)
    assert create.status_code == 201
    assert create.json()["name"] == "Launch"
    assert create.json()["id"]

    listing = await client.get("/projects", headers=headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1
    assert listing.json()[0]["name"] == "Launch"


async def test_projects_isolated_per_user(client):
    token_a = await _register(client, "a@example.com")
    token_b = await _register(client, "b@example.com")
    await client.post(
        "/projects",
        json={"name": "A's project"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    listing_b = await client.get(
        "/projects", headers={"Authorization": f"Bearer {token_b}"}
    )
    assert listing_b.status_code == 200
    assert listing_b.json() == []
