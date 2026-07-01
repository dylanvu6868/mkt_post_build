"""Vitba Report — Headless Chrome HTML-to-PDF export endpoint."""
import base64
import os
import subprocess
import tempfile
import uuid
import logging
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.api.deps import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/report", tags=["report-pdf"])

_TEMPLATE_DIR = Path(__file__).resolve().parent.parent.parent / "templates" / "report"
# Logo path: works in both local dev and Railway container
_LOGO_CANDIDATES = [
    Path(__file__).resolve().parent.parent.parent.parent.parent / "frontend" / "public" / "logo.png",
    Path("/app/frontend/public/logo.png"),
]

_jinja_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATE_DIR)),
    autoescape=select_autoescape(["html"]),
)


def _get_logo_b64() -> str:
    for path in _LOGO_CANDIDATES:
        if path.is_file():
            data = path.read_bytes()
            return f"data:image/png;base64,{base64.b64encode(data).decode()}"
    return ""


def _markdown_to_html(md: str) -> str:
    try:
        import markdown as md_lib
        return md_lib.markdown(md, extensions=["tables", "fenced_code", "nl2br", "sane_lists"])
    except ImportError:
        import re
        html = md
        for level in range(6, 0, -1):
            html = re.sub(rf"^{'#' * level}\s+(.+)$", rf"<h{level}>\1</h{level}>", html, flags=re.MULTILINE)
        html = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", html)
        html = re.sub(r"\*(.+?)\*", r"<em>\1</em>", html)
        return html


def _get_chrome_path() -> str:
    env_path = os.getenv("CHROME_EXECUTABLE_PATH", "").strip()
    if env_path and os.path.isfile(env_path):
        return env_path
    for path in [
        "/usr/bin/chromium", "/usr/bin/chromium-browser",
        "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ]:
        if os.path.isfile(path):
            return path
    raise FileNotFoundError("Chrome/Chromium not found. Set CHROME_EXECUTABLE_PATH.")


class ReportExportRequest(BaseModel):
    name: str = ""
    industry: str = ""
    product: str = ""
    business_model: str = ""
    target_market: str = ""
    target_customer: str = ""
    price: str = ""
    stage: str = ""
    goal_3m: str = ""
    goal_6m: str = ""
    goal_12m: str = ""
    budget: str = ""
    resources: str = ""
    competitors: str = ""
    strengths: str = ""
    weaknesses: str = ""
    markdown_content: str = ""  # AI-generated detailed report content


@router.post("/export-pdf")
async def export_report_pdf(
    body: ReportExportRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        template = _jinja_env.get_template("vitba_report_template.html")
    except Exception as exc:
        logger.error("Template not found: %s", exc)
        raise HTTPException(500, "Report template not found on server.")

    logo_b64 = _get_logo_b64()
    content_html = _markdown_to_html(body.markdown_content) if body.markdown_content else ""

    html_content = template.render(
        name=body.name or "Dự án của bạn",
        industry=body.industry or "—",
        product=body.product or "—",
        business_model=body.business_model or "—",
        target_market=body.target_market or "—",
        target_customer=body.target_customer or "—",
        price=body.price or "—",
        stage=body.stage or "—",
        goal_3m=body.goal_3m or "—",
        goal_6m=body.goal_6m or "—",
        goal_12m=body.goal_12m or "—",
        budget=body.budget or "—",
        resources=body.resources or "—",
        competitors=body.competitors or "—",
        strengths=body.strengths or "—",
        weaknesses=body.weaknesses or "—",
        created_date=datetime.now().strftime("%d/%m/%Y"),
        logo_b64=logo_b64,
        content_html=content_html,
    )

    run_id = uuid.uuid4().hex[:8]
    tmp_dir = tempfile.gettempdir()
    html_path = os.path.join(tmp_dir, f"vitba_report_{run_id}.html")
    pdf_path = os.path.join(tmp_dir, f"vitba_report_{run_id}.pdf")

    try:
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        try:
            chrome = _get_chrome_path()
        except FileNotFoundError as exc:
            logger.error(str(exc))
            raise HTTPException(503, "PDF renderer chưa được cài đặt trên server.")

        file_url = f"file:///{html_path.replace(os.sep, '/')}"
        result = subprocess.run(
            [chrome, "--headless", "--disable-gpu", "--no-pdf-header-footer",
             "--disable-extensions", "--no-sandbox", "--disable-setuid-sandbox",
             f"--print-to-pdf={pdf_path}", file_url],
            capture_output=True, timeout=60,
        )
        if result.returncode != 0:
            err = result.stderr.decode(errors="replace")[:500]
            logger.error("Chrome PDF error: %s", err)
            raise HTTPException(500, "Xuất PDF thất bại. Vui lòng thử lại.")

        if not os.path.isfile(pdf_path) or os.path.getsize(pdf_path) == 0:
            raise HTTPException(500, "File PDF không được tạo ra.")

        safe_name = "".join(c if c.isalnum() or c in "-_" else "-"
                            for c in (body.name or "bao-cao").lower())
        filename = f"vitba-report-{safe_name}-{datetime.now().strftime('%Y%m%d')}.pdf"
        return FileResponse(path=pdf_path, media_type="application/pdf", filename=filename)

    finally:
        try:
            os.remove(html_path)
        except Exception:
            pass
