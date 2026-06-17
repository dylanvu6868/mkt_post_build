from unittest.mock import patch


async def _register(client, email="brand@example.com"):
    resp = await client.post(
        "/auth/register",
        json={"name": "Brand", "email": email, "password": "secret123"},
    )
    return resp.json()["access_token"]


async def _project(client, headers):
    resp = await client.post(
        "/projects", json={"name": "Brand Project"}, headers=headers
    )
    return resp.json()["id"]


async def test_upsert_brand_profile_requires_auth(client):
    resp = await client.post(
        "/brand-profile",
        json={"project_id": 1, "brand_name": "Acme"},
    )
    assert resp.status_code in (401, 403)


async def test_upsert_and_get_brand_profile(client):
    token = await _register(client)
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)

    # Create
    create_resp = await client.post(
        "/brand-profile",
        json={
            "project_id": project_id,
            "brand_name": "EcoBottle",
            "tone": "friendly",
            "writing_style": "conversational",
            "preferred_words": ["sustainable", "eco-friendly"],
            "forbidden_words": ["cheap", "plastic"],
        },
        headers=headers,
    )
    assert create_resp.status_code == 200
    body = create_resp.json()
    assert body["brand_name"] == "EcoBottle"
    assert body["tone"] == "friendly"
    assert body["preferred_words"] == ["sustainable", "eco-friendly"]
    assert body["forbidden_words"] == ["cheap", "plastic"]

    # Read
    get_resp = await client.get(
        f"/brand-profile?project_id={project_id}", headers=headers
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["brand_name"] == "EcoBottle"

    # Update (upsert same project_id)
    update_resp = await client.post(
        "/brand-profile",
        json={
            "project_id": project_id,
            "brand_name": "EcoBottle Pro",
            "tone": "professional",
            "writing_style": "formal",
            "preferred_words": ["premium"],
            "forbidden_words": ["budget"],
        },
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["brand_name"] == "EcoBottle Pro"
    assert update_resp.json()["tone"] == "professional"

    # Read again — should reflect update
    get_resp2 = await client.get(
        f"/brand-profile?project_id={project_id}", headers=headers
    )
    assert get_resp2.json()["brand_name"] == "EcoBottle Pro"


async def test_get_brand_profile_returns_404_when_none(client):
    token = await _register(client, "nobrand@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)

    resp = await client.get(
        f"/brand-profile?project_id={project_id}", headers=headers
    )
    assert resp.status_code == 404


async def test_brand_profile_rejects_other_users_project(client):
    token_a = await _register(client, "bpa@example.com")
    project_a = await _project(client, {"Authorization": f"Bearer {token_a}"})
    token_b = await _register(client, "bpb@example.com")

    # User B cannot upsert brand profile for user A's project
    resp = await client.post(
        "/brand-profile",
        json={"project_id": project_a, "brand_name": "Hacked"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 404

    # User B cannot read brand profile for user A's project
    resp = await client.get(
        f"/brand-profile?project_id={project_a}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 404
