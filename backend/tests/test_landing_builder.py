"""Tests for landing builder endpoints (templates, render, save-from-template)."""

import pytest
from unittest.mock import patch, AsyncMock

from app.models.user import User
from app.models.landing_page import LandingPage


async def _register(client, email="builder@example.com"):
    resp = await client.post(
        "/auth/register",
        json={"name": "Builder", "email": email, "password": "secret123"},
    )
    data = resp.json()
    return data["access_token"], data["user"]["id"]


async def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ── Template listing ─────────────────────────────────────────────────


async def test_get_landing_templates(client, session_maker, promote):
    token, uid = await _register(client)
    await promote(uid)
    resp = await client.get("/mcp/landing/templates", headers=await _auth_headers(token))
    assert resp.status_code == 200
    templates = resp.json()
    assert len(templates) == 3
    assert all("id" in t and "name" in t for t in templates)


# ── Render endpoint ──────────────────────────────────────────────────


async def test_render_landing_template(client, session_maker, promote):
    token, uid = await _register(client)
    await promote(uid)
    resp = await client.post(
        "/mcp/landing/render",
        json={"template_id": "m1", "content": {"brand_name": "TestCorp"}},
        headers=await _auth_headers(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "html" in data
    assert "TestCorp" in data["html"]


async def test_render_landing_invalid_template(client, session_maker, promote):
    token, uid = await _register(client)
    await promote(uid)
    resp = await client.post(
        "/mcp/landing/render",
        json={"template_id": "nonexistent", "content": {}},
        headers=await _auth_headers(token),
    )
    assert resp.status_code == 400


# ── Save from template ───────────────────────────────────────────────


async def test_save_from_template(client, session_maker, promote):
    token, uid = await _register(client)
    await promote(uid)
    resp = await client.post(
        "/mcp/landing/save-from-template",
        json={"title": "My Landing", "html": "<h1>Hello</h1>"},
        headers=await _auth_headers(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "My Landing"
    assert "id" in data


async def test_save_from_template_no_html(client, session_maker, promote):
    token, uid = await _register(client)
    await promote(uid)
    resp = await client.post(
        "/mcp/landing/save-from-template",
        json={"title": "Empty", "html": ""},
        headers=await _auth_headers(token),
    )
    assert resp.status_code == 400


# ── Onboard endpoint (mocked LLM) ────────────────────────────────────


@patch("app.llm.factory.get_chat_model")
async def test_onboard_generate(mock_get_model, client, session_maker, promote):
    from unittest.mock import MagicMock
    mock_llm = MagicMock()
    mock_structured = MagicMock()
    mock_resp = MagicMock()
    mock_resp.model_dump.return_value = {
        "brand_name": "TestBrand",
        "hero_title": "Test Hero",
        "hero_subtitle": "Test Subtitle",
        "hero_cta_text": "Get Started",
        "hero_cta_link": "#",
        "about_title": "About",
        "about_text": "About text",
        "cta_title": "CTA",
        "cta_text": "CTA text",
        "cta_button_text": "Sign Up",
        "cta_button_link": "#",
        "contact_phone": "",
        "contact_email": "",
        "contact_address": "",
        "social_facebook": "",
        "social_twitter": "",
        "social_instagram": "",
        "social_linkedin": "",
                "footer_copyright": "© 2026 TestBrand",
    }
    mock_structured.ainvoke = AsyncMock(return_value=mock_resp)
    mock_llm.with_structured_output.return_value = mock_structured
    mock_get_model.return_value = mock_llm

    token, uid = await _register(client)
    await promote(uid)
    resp = await client.post(
        "/mcp/landing/onboard",
        json={
            "purpose": "SaaS Platform",
            "color_palette": "Ocean Blue: #2563EB, #0EA5E9",
            "typography": "Inter + Inter",
            "brand_name": "TestBrand",
        },
        headers=await _auth_headers(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "html" in data
    assert "DOCTYPE" in data["html"]


# ── Email builder templates ──────────────────────────────────────────


async def test_get_email_builder_templates(client, session_maker, promote):
    token, uid = await _register(client)
    await promote(uid)
    resp = await client.get("/mcp/email/builder/templates", headers=await _auth_headers(token))
    assert resp.status_code == 200
    templates = resp.json()
    assert len(templates) == 2


async def test_render_email_template(client, session_maker, promote):
    token, uid = await _register(client)
    await promote(uid)
    resp = await client.post(
        "/mcp/email/builder/render",
        json={"template_id": "m1", "content": {"hero_title": "Welcome"}},
        headers=await _auth_headers(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "html" in data
