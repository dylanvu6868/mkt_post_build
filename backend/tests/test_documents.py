from unittest.mock import patch


async def _register(client, email="doc@example.com"):
    resp = await client.post(
        "/auth/register",
        json={"name": "Doc", "email": email, "password": "secret123"},
    )
    return resp.json()["access_token"]


async def _project(client, headers):
    resp = await client.post("/projects", json={"name": "Doc Project"}, headers=headers)
    return resp.json()["id"]


async def test_upload_requires_auth(client):
    resp = await client.post(
        "/documents/upload?project_id=1",
        files={"file": ("test.txt", b"hello", "text/plain")},
    )
    assert resp.status_code in (401, 403)


@patch("app.services.document_service.ingest_document")
async def test_upload_and_list_documents(mock_ingest, client):
    mock_ingest.return_value = 5  # pretend 5 chunks

    token = await _register(client)
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)

    # Upload — project_id is a query parameter
    upload_resp = await client.post(
        f"/documents/upload?project_id={project_id}",
        files={"file": ("brand_guide.txt", b"Our brand is premium.", "text/plain")},
        headers=headers,
    )
    assert upload_resp.status_code == 201
    doc = upload_resp.json()
    assert doc["filename"] == "brand_guide.txt"
    assert doc["status"] == "pending"  # background processing hasn't started yet in test

    # List
    list_resp = await client.get(
        f"/documents?project_id={project_id}", headers=headers
    )
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1
    assert list_resp.json()[0]["filename"] == "brand_guide.txt"


async def test_upload_rejects_unsupported_file_type(client):
    token = await _register(client, "bad@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)

    resp = await client.post(
        f"/documents/upload?project_id={project_id}",
        files={"file": ("data.csv", b"a,b,c", "text/csv")},
        headers=headers,
    )
    assert resp.status_code == 400


async def test_upload_rejects_other_users_project(client):
    token_a = await _register(client, "oa@example.com")
    project_a = await _project(client, {"Authorization": f"Bearer {token_a}"})
    token_b = await _register(client, "ob@example.com")

    resp = await client.post(
        f"/documents/upload?project_id={project_a}",
        files={"file": ("test.txt", b"hello", "text/plain")},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 404
