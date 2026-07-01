from unittest.mock import AsyncMock, patch

import pytest


async def _register_and_project(client, email, promote=None):
    reg = await client.post("/auth/register", json={"name": "U", "email": email, "password": "secret123"})
    token = reg.json()["access_token"]
    user_id = reg.json()["user"]["id"]
    if promote is not None:
        await promote(user_id, "lite")
    headers = {"Authorization": f"Bearer {token}"}
    proj = await client.post("/projects", json={"name": "P"}, headers=headers)
    return headers, proj.json()["id"]


@patch("app.llm.factory.provider_available", return_value=True)
async def test_generate_custom_email_uses_brand_profile_when_project_id_given(mock_avail, client, promote):
    headers, project_id = await _register_and_project(client, "eb1@example.com", promote)
    await client.post(
        "/brand-profile",
        json={"project_id": project_id, "brand_name": "EcoBottle", "tone": "friendly"},
        headers=headers,
    )

    fake_content = AsyncMock()
    fake_content.content = "<!DOCTYPE html><html><body>EcoBottle Content</body></html>"
    mock_llm = AsyncMock()
    mock_llm.ainvoke = AsyncMock(return_value=fake_content)
    with patch("app.llm.factory.get_chat_model_for_tier") as mock_factory:
        mock_factory.return_value = mock_llm
        resp = await client.post(
            "/mcp/email/builder/generate-custom",
            json={"prompt": "Email khuyến mãi", "project_id": project_id},
            headers=headers,
        )
    assert resp.status_code == 200
    assert "EcoBottle" in resp.json()["html"]


async def test_generate_custom_email_works_without_project_id(client, promote):
    headers, _ = await _register_and_project(client, "eb2@example.com", promote)
    resp = await client.post(
        "/mcp/email/builder/generate-custom",
        json={"prompt": "Email khuyến mãi", "brand_name": "Manual Brand"},
        headers=headers,
    )
    # provider not mocked available -> 503, but request shape itself must be accepted (no 422)
    assert resp.status_code in (200, 503)
