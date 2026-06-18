from unittest.mock import patch


async def _register(client, email="gen@example.com"):
    resp = await client.post(
        "/auth/register",
        json={"name": "Gen", "email": email, "password": "secret123"},
    )
    return resp.json()["access_token"]


async def _project(client, headers):
    resp = await client.post("/projects", json={"name": "Launch"}, headers=headers)
    return resp.json()["id"]


async def test_generate_requires_auth(client):
    resp = await client.post(
        "/generate",
        json={"project_id": 1, "brief": "eco bottles"},
    )
    assert resp.status_code in (401, 403)


@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_generate_then_poll_completes_in_mock_mode(mock_embed, mock_retrieve, client):
    token = await _register(client)
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)

    start = await client.post(
        "/generate",
        json={
            "project_id": project_id,
            "content_type": "facebook_post",
            "brief": "eco-friendly water bottles",
            "marketing_goal": "awareness",
        },
        headers=headers,
    )
    assert start.status_code == 202
    job_id = start.json()["job_id"]
    assert start.json()["status"] in ("queued", "running", "done")

    # FastAPI runs the BackgroundTask before the ASGI response is fully consumed,
    # so by the time the POST returns (mock mode), the job is already done.
    poll = await client.get(f"/generate/{job_id}", headers=headers)
    assert poll.status_code == 200
    body = poll.json()
    assert body["status"] == "done"
    assert body["current_step"] == "reviewer"
    assert body["result"]["final"]["hook"]
    assert 0 <= body["result"]["review"]["score"] <= 100
    assert body["error"] is None


async def test_generate_rejects_unsupported_content_type(client):
    token = await _register(client, "ct@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)
    resp = await client.post(
        "/generate",
        json={
            "project_id": project_id,
            "content_type": "billboard_ad",
            "brief": "x",
        },
        headers=headers,
    )
    assert resp.status_code == 400


async def test_generate_rejects_other_users_project(client):
    token_a = await _register(client, "a@example.com")
    project_a = await _project(client, {"Authorization": f"Bearer {token_a}"})
    token_b = await _register(client, "b@example.com")
    resp = await client.post(
        "/generate",
        json={"project_id": project_a, "brief": "x"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 404


async def test_poll_unknown_job_is_404(client):
    token = await _register(client, "nf@example.com")
    resp = await client.get(
        "/generate/99999", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 404


@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_generate_uses_brand_profile_in_output(mock_embed, mock_retrieve, client):
    token = await _register(client, "bp@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)

    # Upsert brand profile first
    await client.post(
        "/brand-profile",
        json={
            "project_id": project_id,
            "brand_name": "EcoBottle",
            "tone": "friendly",
            "writing_style": "conversational",
            "preferred_words": ["sustainable"],
            "forbidden_words": ["cheap"],
        },
        headers=headers,
    )

    # Generate — should pick up the brand profile
    start = await client.post(
        "/generate",
        json={
            "project_id": project_id,
            "content_type": "facebook_post",
            "brief": "eco-friendly water bottles",
            "marketing_goal": "awareness",
        },
        headers=headers,
    )
    assert start.status_code == 202
    job_id = start.json()["job_id"]

    poll = await client.get(f"/generate/{job_id}", headers=headers)
    assert poll.status_code == 200
    body = poll.json()
    assert body["status"] == "done"
    # The mock copywriter should have injected the brand name into the hook
    assert "EcoBottle" in body["result"]["draft"]["hook"]
