"""Universal template engine for Vitba Landing Page + Vitba Mail builders.

Uses BeautifulSoup to inject user-provided content into pre-made HTML templates
via element-ID slot maps. Supports text, image-src, link-href, and CSS-variable
overrides.
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup

def extract_html_from_response(content: str) -> str:
    """Robustly extract HTML from LLM response, handling markdown blocks and conversational padding."""
    html = content.strip()
    # Find everything from <!DOCTYPE html> or <html> to </html>
    match = re.search(r'(<!DOCTYPE\s+html[^>]*>.*?</html>|<html[^>]*>.*?</html>)', html, re.IGNORECASE | re.DOTALL)
    if match:
        html = match.group(1)
    else:
        # Fallback: strip markdown blocks if present
        if "```html" in html:
            html = html.split("```html")[1].split("```")[0].strip()
        elif "```" in html:
            html = html.split("```")[1].split("```")[0].strip()
    
    # Ensure it has a DOCTYPE if it looks like a full document
    if "<html" in html.lower() and not html.lower().startswith("<!doctype"):
        html = f"<!DOCTYPE html>\n{html}"
    return html.strip()

TEMPLATES_ROOT = Path(os.getenv(
    "TEMPLATES_DIR",
    Path(__file__).resolve().parents[3] / "templates" / "landing",
))


# ---------------------------------------------------------------------------
# Content schemas (universal — what the user fills in the form)
# ---------------------------------------------------------------------------

LANDING_SLOTS = [
    "brand_name", "logo_url",
    "hero_title", "hero_highlight", "hero_subtitle", "hero_image_url",
    "hero_cta_text", "hero_cta_link",
    "about_title", "about_text",
    "cta_title", "cta_text", "cta_button_text", "cta_button_link",
    "contact_phone", "contact_email", "contact_address",
    "social_facebook", "social_twitter", "social_instagram", "social_linkedin",
    "primary_color", "secondary_color", "accent_color",
    "footer_copyright",
]

EMAIL_SLOTS = [
    "logo_url", "brand_name",
    "hero_title", "hero_subtitle", "hero_body", "hero_image_url",
    "hero_cta_text", "hero_cta_link",
    "about_title", "about_body", "about_image_url",
    "cta_title", "cta_body", "cta_button_text", "cta_button_link",
    "contact_email", "contact_phone", "contact_website", "contact_address",
    "social_facebook", "social_twitter", "social_instagram",
    "copyright_text",
    "primary_color", "bg_color",
]


# ---------------------------------------------------------------------------
# Slot maps — per template, maps universal slot → CSS selector + type
# ---------------------------------------------------------------------------

# Landing m1 — SynapseAI
LANDING_M1_SLOTS: dict[str, dict[str, str]] = {
    "brand_name": {"sel": "#iujkdn", "type": "text"},
    "logo_url": {"sel": "#iujkdn", "type": "html"},  # replace text with <img>
    "hero_title": {"sel": "#ibjy2l", "type": "text"},
    "hero_highlight": {"sel": "#itga5", "type": "text"},
    "hero_subtitle": {"sel": "#iherodesc-2", "type": "text"},
    "hero_image_url": {"sel": "#i73skr-2", "type": "attr:src"},
    "hero_cta_text": {"sel": "#ibtn-text-5", "type": "text"},
    "about_title": {"sel": "#iexptitle", "type": "text"},
    "about_text": {"sel": "#iexpdesc-2-2", "type": "text"},
    "cta_title": {"sel": "#ictacardtitle-2-2-2", "type": "text"},
    "cta_text": {"sel": "#ictacarddesc-2", "type": "text"},
    "cta_button_text": {"sel": "#ibtn-text-5-3-2-2", "type": "text"},
    "contact_phone": {"sel": "#ifootphone", "type": "text"},
    "contact_email": {"sel": "#ifootmail", "type": "text"},
    "contact_address": {"sel": "#ifootaddress", "type": "text"},
    "social_facebook": {"sel": "#i42q34j", "type": "attr:href"},
    "social_twitter": {"sel": "#ie2yvaa", "type": "attr:href"},
    "social_instagram": {"sel": "#ibfbu8g", "type": "attr:href"},
    "social_linkedin": {"sel": "#iyttlep", "type": "attr:href"},
    "footer_copyright": {"sel": "#ifootcopy", "type": "text"},
}

# Landing m3 — Axiom (event style)
LANDING_M3_SLOTS: dict[str, dict[str, str]] = {
    "brand_name": {"sel": ".brand-name", "type": "text"},
    "hero_title": {"sel": ".hero-title", "type": "text"},
    "hero_subtitle": {"sel": ".hero-desc", "type": "text"},
    "cta_title": {"sel": ".cta-title", "type": "text"},
    "cta_text": {"sel": ".cta-desc", "type": "text"},
    "cta_button_text": {"sel": ".cta-btn-text", "type": "text"},
    "contact_email": {"sel": ".footer-email", "type": "text"},
    "footer_copyright": {"sel": ".footer-copy", "type": "text"},
}

# Fallback generic slots for m2 (uses class-based selectors)
LANDING_M2_SLOTS: dict[str, dict[str, str]] = {
    "brand_name": {"sel": ".brand-name", "type": "text"},
    "hero_title": {"sel": ".hero-title, h1", "type": "text"},
    "hero_subtitle": {"sel": ".hero-desc, .hero-subtitle", "type": "text"},
    "cta_title": {"sel": ".cta-title", "type": "text"},
    "cta_text": {"sel": ".cta-desc", "type": "text"},
    "contact_email": {"sel": ".footer-email", "type": "text"},
    "footer_copyright": {"sel": ".footer-copy", "type": "text"},
}

# Email m1 — Serenity Spa
EMAIL_M1_SLOTS: dict[str, dict[str, str]] = {
    "logo_url": {"sel": "img[alt='Logo']", "type": "attr:src"},
    "brand_name": {"sel": "img[alt='Logo']", "type": "attr:alt"},
    "hero_title": {"sel": ".hero-title", "type": "text"},
    "hero_subtitle": {"sel": ".hero-subtitle", "type": "text"},
    "hero_body": {"sel": ".hero-body", "type": "text"},
    "hero_image_url": {"sel": "img[alt='Hero Image']", "type": "attr:src"},
    "hero_cta_text": {"sel": ".hero-cta-text", "type": "text"},
    "about_title": {"sel": ".about-title", "type": "text"},
    "about_body": {"sel": ".about-body", "type": "text"},
    "cta_title": {"sel": ".cta-title", "type": "text"},
    "cta_body": {"sel": ".cta-body", "type": "text"},
    "cta_button_text": {"sel": ".cta-btn-text", "type": "text"},
    "contact_email": {"sel": ".contact-email", "type": "text"},
    "contact_phone": {"sel": ".contact-phone", "type": "text"},
    "contact_website": {"sel": ".contact-website", "type": "text"},
    "copyright_text": {"sel": ".copyright-text", "type": "text"},
}

# Email m2 — MediLink
EMAIL_M2_SLOTS: dict[str, dict[str, str]] = {
    "logo_url": {"sel": "img[alt='MediLink Logo']", "type": "attr:src"},
    "hero_image_url": {"sel": "img[alt='MediLink Hero Banner']", "type": "attr:src"},
    "about_title": {"sel": ".about-title", "type": "text"},
    "cta_title": {"sel": ".cta-title", "type": "text"},
    "cta_body": {"sel": ".cta-body", "type": "text"},
    "cta_button_text": {"sel": ".cta-btn-text", "type": "text"},
    "contact_email": {"sel": ".contact-email", "type": "text"},
    "contact_phone": {"sel": ".contact-phone", "type": "text"},
    "copyright_text": {"sel": ".copyright-text", "type": "text"},
}


# ---------------------------------------------------------------------------
# Template registry
# ---------------------------------------------------------------------------

LANDING_TEMPLATES = {
    "m1": {
        "id": "m1",
        "name": "SynapseAI — SaaS/AI",
        "category": "SaaS",
        "description": "Landing page cho sản phẩm SaaS, AI platform. Header + Hero + Features + Pricing + Testimonials + Footer.",
        "dir": TEMPLATES_ROOT / "m1",
        "slots": LANDING_M1_SLOTS,
        "colors": {"primary": "#12D393", "secondary": "#D1D1D1", "accent": "#02130D"},
    },
    "m2": {
        "id": "m2",
        "name": "TechForge — Digital Platform",
        "category": "Technology",
        "description": "Landing page cho nền tảng số, giải pháp công nghệ. Phong cách hiện đại.",
        "dir": TEMPLATES_ROOT / "m2",
        "slots": LANDING_M2_SLOTS,
        "colors": {"primary": "#2563EB", "secondary": "#D1D1D1", "accent": "#0F172A"},
    },
    "m3": {
        "id": "m3",
        "name": "Axiom — Event/Conference",
        "category": "Event",
        "description": "Landing page cho sự kiện, hội nghị. Hero + Speakers + Schedule + CTA.",
        "dir": TEMPLATES_ROOT / "m3",
        "slots": LANDING_M3_SLOTS,
        "colors": {"primary": "#6366F1", "secondary": "#D1D1D1", "accent": "#1E1B4B"},
    },
}

EMAIL_TEMPLATES = {
    "m1": {
        "id": "m1",
        "name": "Serenity — Spa/Wellness",
        "category": "Lifestyle",
        "description": "Email template cho spa, wellness, lifestyle brand. Hero + About + Services + Team + CTA + Footer.",
        "file": Path(os.getenv(
            "EMAIL_TEMPLATES_DIR",
            Path(__file__).resolve().parents[3] / "templates" / "email",
        )) / "m1.html",
        "slots": EMAIL_M1_SLOTS,
        "colors": {"primary": "#FF6B81", "bg": "#EEF2F5"},
    },
    "m2": {
        "id": "m2",
        "name": "MediLink — Medical/Professional",
        "category": "Professional",
        "description": "Email template cho y tế, chuyên nghiệp. Hero + Services + Testimonials + CTA + Footer.",
        "file": Path(os.getenv(
            "EMAIL_TEMPLATES_DIR",
            Path(__file__).resolve().parents[3] / "templates" / "email",
        )) / "m2.html",
        "slots": EMAIL_M2_SLOTS,
        "colors": {"primary": "#0056D2", "bg": "#FFFFFF"},
    },
}


# ---------------------------------------------------------------------------
# Render engine
# ---------------------------------------------------------------------------

def _load_landing_html(template_id: str) -> str:
    """Load landing template HTML, inlining the external CSS."""
    meta = LANDING_TEMPLATES[template_id]
    html = (meta["dir"] / "index.html").read_text(encoding="utf-8")
    css_file = meta["dir"] / "style.css"
    if css_file.exists():
        css = css_file.read_text(encoding="utf-8")
        # Inline CSS into <head> before </head>
        style_tag = f"<style>\n{css}\n</style>"
        html = html.replace("</head>", f"{style_tag}\n</head>", 1)
        # Remove the external <link rel="stylesheet" href="./style.css">
        html = html.replace('<link rel="stylesheet" href="./style.css">', "")
    return html


def _load_email_html(template_id: str) -> str:
    """Load email template HTML (CSS is already inline in MJML output)."""
    meta = EMAIL_TEMPLATES[template_id]
    return meta["file"].read_text(encoding="utf-8")


def _apply_slot(soup: BeautifulSoup, slot_name: str, value: Any, mapping: dict[str, str]) -> None:
    """Apply a single content slot to the parsed soup."""
    if not value:
        return
    sel = mapping["sel"]
    typ = mapping["type"]

    try:
        el = soup.select_one(sel)
    except Exception:
        return
    if el is None:
        return

    if typ == "text":
        el.string = str(value)
    elif typ == "html":
        el.clear()
        el.append(BeautifulSoup(str(value), "html.parser"))
    elif typ == "attr:src":
        el["src"] = str(value)
    elif typ == "attr:href":
        el["href"] = str(value)
    elif typ == "attr:alt":
        el["alt"] = str(value)


def _inject_color_overrides(html: str, colors: dict[str, str]) -> str:
    """Inject CSS variable overrides into <head>."""
    if not colors:
        return html
    vars_css = "\n".join(f"  {k}: {v};" for k, v in colors.items())
    override = f"<style>\n:root {{\n{vars_css}\n}}\n</style>\n"
    return html.replace("</head>", f"{override}</head>", 1)


def render_landing(template_id: str, content: dict[str, Any]) -> str:
    """Render a landing page template with user content injected.

    Args:
        template_id: "m1", "m2", or "m3"
        content: dict of slot_name → value (see LANDING_SLOTS)

    Returns: complete self-contained HTML string
    """
    if template_id not in LANDING_TEMPLATES:
        raise ValueError(f"Unknown landing template: {template_id}")

    meta = LANDING_TEMPLATES[template_id]
    html = _load_landing_html(template_id)
    soup = BeautifulSoup(html, "html.parser")

    # Apply content slots
    for slot_name, value in content.items():
        mapping = meta["slots"].get(slot_name)
        if mapping:
            _apply_slot(soup, slot_name, value, mapping)

    html = str(soup)

    # Inject color overrides
    color_map = {
        "--gjs-t-color-primary": content.get("primary_color"),
        "--gjs-t-color-secondary": content.get("secondary_color"),
        "--gjs-t-color-accent": content.get("accent_color"),
    }
    color_map = {k: v for k, v in color_map.items() if v}
    html = _inject_color_overrides(html, color_map)

    return html


def render_email(template_id: str, content: dict[str, Any]) -> str:
    """Render an email template with user content injected.

    Args:
        template_id: "m1" or "m2"
        content: dict of slot_name → value (see EMAIL_SLOTS)

    Returns: complete HTML email string
    """
    if template_id not in EMAIL_TEMPLATES:
        raise ValueError(f"Unknown email template: {template_id}")

    meta = EMAIL_TEMPLATES[template_id]
    html = _load_email_html(template_id)
    soup = BeautifulSoup(html, "html.parser")

    # Apply content slots
    for slot_name, value in content.items():
        mapping = meta["slots"].get(slot_name)
        if mapping:
            _apply_slot(soup, slot_name, value, mapping)

    html = str(soup)

    # For emails, colors are inline — do targeted replacement
    primary = content.get("primary_color")
    if primary:
        default_primary = meta["colors"]["primary"]
        if default_primary and default_primary != primary:
            html = html.replace(default_primary, primary)

    return html


def list_landing_templates() -> list[dict]:
    """Return template metadata for the gallery."""
    result = []
    for tid, meta in LANDING_TEMPLATES.items():
        result.append({
            "id": meta["id"],
            "name": meta["name"],
            "category": meta["category"],
            "description": meta["description"],
            "colors": meta["colors"],
            "slots": list(meta["slots"].keys()),
        })
    return result


def list_email_templates() -> list[dict]:
    """Return email template metadata for the gallery."""
    result = []
    for tid, meta in EMAIL_TEMPLATES.items():
        result.append({
            "id": meta["id"],
            "name": meta["name"],
            "category": meta["category"],
            "description": meta["description"],
            "colors": meta["colors"],
            "slots": list(meta["slots"].keys()),
        })
    return result


# ---------------------------------------------------------------------------
# AI generation helpers — feed template patterns to LLM as style reference
# ---------------------------------------------------------------------------

def get_landing_style_reference() -> str:
    """Extract key CSS patterns + section structures from landing templates
    to use as style reference for AI generation. Returns a condensed string
    that captures design patterns without dumping full HTML.
    """
    parts = []
    for tid, meta in LANDING_TEMPLATES.items():
        css_path = meta["dir"] / "style.css"
        if css_path.exists():
            css = css_path.read_text(encoding="utf-8")
            # Extract CSS variables + key class definitions (first 2000 chars)
            condensed = css[:2000]
            parts.append(f"/* Template {tid} ({meta['name']}) — colors: {meta['colors']} */\n{condensed}")
    return "\n\n".join(parts)[:6000]


def get_email_style_reference() -> str:
    """Extract key patterns from email templates for AI reference."""
    parts = []
    # Provide the first template as a structural example
    first_template_id = list(EMAIL_TEMPLATES.keys())[0]
    first_html = EMAIL_TEMPLATES[first_template_id]["file"].read_text(encoding="utf-8")
    
    # Extract the skeleton (first 2500 chars to show <head>, CSS, and outer tables)
    skeleton = first_html[:2500]
    parts.append("## MẪU CẤU TRÚC CODE EMAIL (Học từ mẫu này, sử dụng table layout và inline CSS):")
    parts.append(skeleton + "\n...\n<!-- End of structure example -->\n")
    
    for tid, meta in EMAIL_TEMPLATES.items():
        html = meta["file"].read_text(encoding="utf-8")
        sections = re.findall(r"<!--\s*([^<>]+?)\s*-->", html)
        sections = [s for s in sections if not s.startswith("[if") and not s.startswith("endif")]
        colors = set(re.findall(r"#[0-9A-Fa-f]{6}", html))
        parts.append(
            f"Template {tid} ({meta['name']}): sections={sections}, colors={colors}"
        )
    return "\n".join(parts)[:4000]
