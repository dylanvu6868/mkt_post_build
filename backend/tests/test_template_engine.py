"""Tests for the Vitba template engine (landing + email)."""

import pytest

from app.mcp.landing.template_engine import (
    render_landing,
    render_email,
    list_landing_templates,
    list_email_templates,
    get_landing_style_reference,
    get_email_style_reference,
    LANDING_TEMPLATES,
    EMAIL_TEMPLATES,
)


# ── Listing ──────────────────────────────────────────────────────────


def test_list_landing_templates_returns_3():
    templates = list_landing_templates()
    assert len(templates) == 3
    ids = {t["id"] for t in templates}
    assert ids == {"m1", "m2", "m3"}
    for t in templates:
        assert t["name"]
        assert t["category"]
        assert t["description"]
        assert "primary" in t["colors"]
        assert len(t["slots"]) > 0


def test_list_email_templates_returns_2():
    templates = list_email_templates()
    assert len(templates) == 2
    ids = {t["id"] for t in templates}
    assert ids == {"m1", "m2"}
    for t in templates:
        assert t["name"]
        assert "primary" in t["colors"]


# ── Landing render ───────────────────────────────────────────────────


def test_render_landing_m1_basic():
    html = render_landing("m1", {"brand_name": "TestBrand"})
    assert "<!DOCTYPE html>" in html or "<html" in html
    assert "TestBrand" in html


def test_render_landing_m1_hero_title():
    html = render_landing("m1", {"hero_title": "Build Amazing Pages"})
    assert "Build Amazing Pages" in html


def test_render_landing_m1_color_override():
    html = render_landing("m1", {"primary_color": "#FF0000"})
    assert "#FF0000" in html


def test_render_landing_m1_empty_content():
    html = render_landing("m1", {})
    assert len(html) > 1000


def test_render_landing_unknown_template_raises():
    with pytest.raises(ValueError, match="Unknown landing template"):
        render_landing("nonexistent", {})


def test_render_landing_css_inlined():
    html = render_landing("m1", {})
    assert "<style>" in html


# ── Email render ─────────────────────────────────────────────────────


def test_render_email_m1_basic():
    html = render_email("m1", {"hero_title": "Welcome Email"})
    assert "<!DOCTYPE html>" in html or "<html" in html


def test_render_email_m1_color_replacement():
    html = render_email("m1", {"primary_color": "#00FF00"})
    assert "#00FF00" in html


def test_render_email_unknown_template_raises():
    with pytest.raises(ValueError, match="Unknown email template"):
        render_email("nonexistent", {})


def test_render_email_m2_basic():
    html = render_email("m2", {"about_title": "About Us"})
    assert len(html) > 1000


# ── Style references ─────────────────────────────────────────────────


def test_get_landing_style_reference_nonempty():
    ref = get_landing_style_reference()
    assert len(ref) > 100
    assert "Template" in ref or "template" in ref.lower()


def test_get_email_style_reference_nonempty():
    ref = get_email_style_reference()
    assert len(ref) > 50
    assert "Template" in ref or "template" in ref.lower()


# ── Slot maps exist ──────────────────────────────────────────────────


def test_landing_templates_have_slots():
    for tid, meta in LANDING_TEMPLATES.items():
        assert len(meta["slots"]) > 0, f"Template {tid} has no slots"
        for slot_name, mapping in meta["slots"].items():
            assert "sel" in mapping, f"Slot {slot_name} in {tid} missing 'sel'"
            assert "type" in mapping, f"Slot {slot_name} in {tid} missing 'type'"


def test_email_templates_have_slots():
    for tid, meta in EMAIL_TEMPLATES.items():
        assert len(meta["slots"]) > 0, f"Email template {tid} has no slots"
