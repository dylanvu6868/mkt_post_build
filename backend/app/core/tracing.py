import os
import json
import base64
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, Generator

import requests
from dotenv import load_dotenv

load_dotenv()

# ── Config ──────────────────────────────────────────────────────────
_PK = os.getenv("LANGFUSE_PUBLIC_KEY") or ""
_SK = os.getenv("LANGFUSE_SECRET_KEY") or ""
_HOST = os.getenv("LANGFUSE_HOST") or os.getenv("LANGFUSE_BASE_URL") or "https://us.cloud.langfuse.com"
_BASIC_AUTH = base64.b64encode(f"{_PK}:{_SK}".encode()).decode() if _PK and _SK else None
ENABLED = bool(_PK and _SK)

# Legacy exports — kept as None to not break existing imports
langfuse_client = None
langfuse_handler = None
CallbackHandler = None


def get_langfuse_handler(trace_id: str | None = None) -> None:
    """Legacy — always returns None. Use REST API instead."""
    return None


def _post(path: str, data: dict) -> None:
    """POST to Langfuse REST API, silently ignore failures."""
    if not ENABLED:
        return
    try:
        requests.post(
            f"{_HOST}/api/public/{path}",
            json=data,
            headers={"Authorization": f"Basic {_BASIC_AUTH}"},
            timeout=5,
        )
    except Exception:
        pass


# ContextVar trace_id để agent spans tự động ghi đúng parent
current_trace_id_ctx: ContextVar[str | None] = ContextVar("current_trace_id_ctx", default=None)


@contextmanager
def trace_request(
    name: str,
    user_id: str | int | None = None,
    session_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> Generator[str | None, None, None]:
    """Tạo Langfuse trace + root observation qua REST API."""
    if not ENABLED:
        yield None
        return

    import uuid
    trace_id = uuid.uuid4().hex
    now = datetime.now(timezone.utc).isoformat()

    # POST trace
    _post("traces", {
        "id": trace_id,
        "name": name,
        "timestamp": now,
        "user_id": str(user_id) if user_id else None,
        "session_id": session_id,
        "metadata": metadata or {},
    })

    # POST root observation (generation)
    _post("observations", {
        "id": uuid.uuid4().hex,
        "trace_id": trace_id,
        "name": name,
        "type": "GENERATION",
        "start_time": now,
        "metadata": metadata or {},
    })

    token = current_trace_id_ctx.set(trace_id)
    try:
        yield trace_id
    finally:
        current_trace_id_ctx.reset(token)
