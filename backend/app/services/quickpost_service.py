"""Parses and persists "quickpost" content the chat LLM writes directly in
its own streamed reply (facebook_post/email/tiktok_script), instead of the
chat round-tripping through a separate /generate request. This keeps the
response perceived as real-time — the post is part of the same SSE stream
the user is already watching — while still producing a GenerationJob +
ContentHistory record for quota counting and the history feature, matching
the shape generation_service.run_quick_generation() already uses.
"""
import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.generation_job import GenerationJob
from app.models.project import Project
from app.models.user import User
from app.services import history_service

QUICK_CHAT_TYPES = {"facebook_post", "email", "tiktok_script"}

# A single-line prefix (not a code fence) so the content streams live —
# only this first line needs to be hidden from the user-visible buffer;
# everything after it is the actual post, shown exactly as it's generated.
_MARKER_RE = re.compile(r"^\[QUICKPOST:(\w+)\]\n?")


def extract_quickpost_marker(text: str) -> tuple[str, str] | None:
    """Returns (content_type, raw_content) if the quickpost marker is present
    at the start of text for a known quick-chat type, else None."""
    match = _MARKER_RE.match(text.lstrip())
    if not match or match.group(1) not in QUICK_CHAT_TYPES:
        return None
    raw_content = text.lstrip()[match.end():].strip()
    return match.group(1), raw_content


def parse_quickpost(content_type: str, raw: str) -> dict[str, Any]:
    """Best-effort parse of the LLM's plain-text post into the same
    structured field shape as copywriter.py's DRAFT_SCHEMAS."""
    text = raw.strip()
    hashtags = re.findall(r"#\w+", text)
    text_no_tags = re.sub(r"(?:\s*#\w+)+\s*$", "", text).strip()

    if content_type == "facebook_post":
        parts = text_no_tags.split("\n\n", 1)
        hook = parts[0].lstrip("🔥").strip()
        rest = parts[1].strip() if len(parts) > 1 else ""
        body, cta = rest, ""
        cta_match = re.search(r"👇[^\n]*\n+([\s\S]*)$", rest)
        if cta_match:
            cta = cta_match.group(1).strip()
            body = rest[: cta_match.start()].strip()
        return {
            "hook": hook or text_no_tags[:100],
            "body": body or text_no_tags,
            "cta": cta or "Tìm hiểu thêm ngay!",
            "hashtags": hashtags or ["#marketing"],
        }

    if content_type == "email":
        lines = text_no_tags.split("\n", 1)
        first_line = lines[0].strip()
        subject_match = re.match(r"(?:tiêu đề|subject)\s*:\s*(.+)", first_line, re.IGNORECASE)
        if subject_match:
            subject = subject_match.group(1).strip()
            body = lines[1].strip() if len(lines) > 1 else ""
        else:
            subject = first_line[:50]
            body = text_no_tags
        return {
            "subject": subject or "Thông tin dành cho bạn",
            "body": body or text_no_tags,
            "cta": "",
        }

    if content_type == "tiktok_script":
        parts = text_no_tags.split("\n\n", 1)
        hook = parts[0].strip()
        script = parts[1].strip() if len(parts) > 1 else text_no_tags
        return {
            "hook": hook or text_no_tags[:100],
            "script": script,
            "cta": "Theo dõi để xem thêm!",
        }

    return {"body": text_no_tags}


def format_quickpost_text(content_type: str, parsed: dict[str, Any]) -> str:
    """Builds a clean, readable rendering for the chat Message's content field."""
    if content_type == "facebook_post":
        parts = [parsed.get("hook", ""), "", parsed.get("body", ""), "", parsed.get("cta", "")]
        hashtags = parsed.get("hashtags") or []
        if hashtags:
            parts += ["", " ".join(hashtags)]
        return "\n".join(p for p in parts if p)
    if content_type == "email":
        parts = [f"Tiêu đề: {parsed.get('subject', '')}", "", parsed.get("body", "")]
        return "\n".join(p for p in parts if p)
    if content_type == "tiktok_script":
        parts = [parsed.get("hook", ""), "", parsed.get("script", "")]
        return "\n".join(p for p in parts if p)
    return parsed.get("body", "")


async def get_or_create_default_project(session: AsyncSession, user: User) -> Project:
    result = await session.execute(
        select(Project).where(Project.user_id == user.id).order_by(Project.id).limit(1)
    )
    project = result.scalar_one_or_none()
    if project is not None:
        return project
    project = Project(user_id=user.id, name="Default Project")
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


async def persist_quickpost(
    session_maker: async_sessionmaker[AsyncSession],
    user: User,
    content_type: str,
    raw_content: str,
    brief: str,
) -> dict[str, Any]:
    """Parses and persists an inline-chat quickpost (GenerationJob + history,
    for quota counting and the history feature). Returns the result dict
    ({"draft", "final", "formatted_final"}) for embedding in the chat
    response and the saved Message's metadata_json."""
    parsed = parse_quickpost(content_type, raw_content)
    result = {"draft": parsed, "final": parsed, "formatted_final": parsed}

    async with session_maker() as session:
        project = await get_or_create_default_project(session, user)
        job = GenerationJob(
            project_id=project.id, content_type=content_type, status="done", result_json=result,
        )
        session.add(job)
        await history_service.save_to_history(session, project.id, content_type, brief, result)

    return result
