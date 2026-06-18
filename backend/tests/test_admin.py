import pytest


async def _register(client, email="admin@example.com"):
    resp = await client.post(
        "/auth/register",
        json={"name": "Admin", "email": email, "password": "secret123"},
    )
    return resp.json()["access_token"]


async def _make_admin(client, session_maker, email="admin@example.com"):
    token = await _register(client, email)
    from app.models.user import User
    from sqlalchemy import select

    async with session_maker() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one()
        user.is_admin = True
        await session.commit()
    return token


@pytest.mark.asyncio
async def test_admin_list_users(client, session_maker):
    token = await _make_admin(client, session_maker)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await client.get("/admin/users", headers=headers)
    assert resp.status_code == 200
    users = resp.json()
    assert len(users) == 1
    assert users[0]["email"] == "admin@example.com"
    assert users[0]["is_admin"] is True


@pytest.mark.asyncio
async def test_admin_requires_admin_role(client):
    token = await _register(client, "regular@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    resp = await client.get("/admin/users", headers=headers)
    assert resp.status_code == 403
    assert resp.json()["detail"] == "Admin access required"


@pytest.mark.asyncio
async def test_admin_ban_user(client, session_maker):
    token = await _make_admin(client, session_maker)
    user_token = await _register(client, "victim@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    users = (await client.get("/admin/users", headers=headers)).json()
    victim = next(u for u in users if u["email"] == "victim@example.com")

    resp = await client.patch(f"/admin/users/{victim['id']}/ban", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["is_banned"] is True

    victim_headers = {"Authorization": f"Bearer {user_token}"}
    resp = await client.get("/projects", headers=victim_headers)
    assert resp.status_code == 403
    assert resp.json()["detail"] == "Account is banned"


@pytest.mark.asyncio
async def test_admin_cannot_ban_self(client, session_maker):
    token = await _make_admin(client, session_maker)
    headers = {"Authorization": f"Bearer {token}"}
    users = (await client.get("/admin/users", headers=headers)).json()
    admin_user = users[0]
    resp = await client.patch(f"/admin/users/{admin_user['id']}/ban", headers=headers)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_admin_delete_user(client, session_maker):
    token = await _make_admin(client, session_maker)
    await _register(client, "todelete@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    users = (await client.get("/admin/users", headers=headers)).json()
    target = next(u for u in users if u["email"] == "todelete@example.com")

    resp = await client.delete(f"/admin/users/{target['id']}", headers=headers)
    assert resp.status_code == 204

    users_after = (await client.get("/admin/users", headers=headers)).json()
    assert all(u["email"] != "todelete@example.com" for u in users_after)


@pytest.mark.asyncio
async def test_admin_analytics(client, session_maker):
    token = await _make_admin(client, session_maker)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await client.get("/admin/analytics", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "users" in data
    assert data["users"]["total"] >= 1
    assert "content" in data
    assert "jobs" in data


@pytest.mark.asyncio
async def test_admin_list_content(client, session_maker):
    token = await _make_admin(client, session_maker)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await client.get("/admin/content", headers=headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
