from unittest.mock import patch


async def _register(client, email="hist@example.com"):
    resp = await client.post(
        "/auth/register",
        json={"name": "Hist", "email": email, "password": "secret123"},
    )
    return resp.json()["access_token"]


async def _project(client, headers):
    resp = await client.post(
        "/projects", json={"name": "Hist Project"}, headers=headers
    )
    return resp.json()["id"]


async def test_history_requires_auth(client):
    resp = await client.get("/history?project_id=1")
    assert resp.status_code in (401, 403)


@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_history_populated_after_generate(mock_embed, mock_retrieve, client):
    token = await _register(client)
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)

    # Generate a post
    start = await client.post(
        "/generate",
        json={
            "project_id": project_id,
            "content_type": "facebook_post",
            "brief": "test history",
            "marketing_goal": "awareness",
        },
        headers=headers,
    )
    assert start.status_code == 202

    # Poll until done
    job_id = start.json()["job_id"]
    poll = await client.get(f"/generate/{job_id}", headers=headers)
    assert poll.json()["status"] == "done"

    # History should have one entry
    hist = await client.get(f"/history?project_id={project_id}", headers=headers)
    assert hist.status_code == 200
    items = hist.json()
    assert len(items) == 1
    assert items[0]["content_type"] == "facebook_post"
    assert items[0]["prompt"] == "test history"
    assert items[0]["output"] is not None
    assert items[0]["project_id"] == project_id


@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_delete_history_item(mock_embed, mock_retrieve, client):
    token = await _register(client, "del@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)

    # Generate
    start = await client.post(
        "/generate",
        json={
            "project_id": project_id,
            "content_type": "facebook_post",
            "brief": "to delete",
            "marketing_goal": "awareness",
        },
        headers=headers,
    )
    job_id = start.json()["job_id"]
    await client.get(f"/generate/{job_id}", headers=headers)

    # Get history
    hist = await client.get(f"/history?project_id={project_id}", headers=headers)
    item_id = hist.json()[0]["id"]

    # Delete
    del_resp = await client.delete(f"/history/{item_id}", headers=headers)
    assert del_resp.status_code == 204

    # History should be empty
    hist2 = await client.get(f"/history?project_id={project_id}", headers=headers)
    assert len(hist2.json()) == 0


async def test_history_rejects_other_users_project(client):
    token_a = await _register(client, "ha@example.com")
    project_a = await _project(client, {"Authorization": f"Bearer {token_a}"})
    token_b = await _register(client, "hb@example.com")

    resp = await client.get(
        f"/history?project_id={project_a}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 404
