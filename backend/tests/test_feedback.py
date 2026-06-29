"""Tests for user feedback API."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.models.user_feedback import UserFeedback


async def _register(client, email="feedback@example.com"):
    resp = await client.post(
        "/auth/register",
        json={"name": "User", "email": email, "password": "secret123"},
    )
    data = resp.json()
    return data["access_token"], data["user"]["id"]


async def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


async def test_create_feedback_up(client):
    token, uid = await _register(client)
    resp = await client.post(
        "/api/feedback",
        json={"rating": "up", "message_id": 1},
        headers=await _auth_headers(token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["rating"] == "up"


async def test_create_feedback_down(client):
    token, uid = await _register(client)
    resp = await client.post(
        "/api/feedback",
        json={"rating": "down", "message_id": 1, "comment": "Sai thông tin"},
        headers=await _auth_headers(token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["rating"] == "down"
    assert data["comment"] == "Sai thông tin"


async def test_create_feedback_invalid_rating(client):
    token, uid = await _register(client)
    resp = await client.post(
        "/api/feedback",
        json={"rating": "meh", "message_id": 1},
        headers=await _auth_headers(token),
    )
    assert resp.status_code == 422


async def test_create_feedback_no_target(client):
    token, uid = await _register(client)
    resp = await client.post(
        "/api/feedback",
        json={"rating": "up"},
        headers=await _auth_headers(token),
    )
    assert resp.status_code == 400


async def test_feedback_stats(client):
    token, uid = await _register(client)
    await client.post("/api/feedback", json={"rating": "up", "message_id": 1}, headers=await _auth_headers(token))
    await client.post("/api/feedback", json={"rating": "down", "message_id": 2}, headers=await _auth_headers(token))
    await client.post("/api/feedback", json={"rating": "up", "message_id": 3}, headers=await _auth_headers(token))
    resp = await client.get("/api/feedback/stats", headers=await _auth_headers(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert data["up"] == 2
    assert data["down"] == 1
    assert data["satisfaction_pct"] == 66.7
