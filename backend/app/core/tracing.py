import os
import base64
import logging
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, Generator

import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── Config ──────────────────────────────────────────────────────────
_PK = os.getenv("LANGFUSE_PUBLIC_KEY") or ""
_SK = os.getenv("LANGFUSE_SECRET_KEY") or ""
_HOST = os.getenv("LANGFUSE_HOST") or os.getenv("LANGFUSE_BASE_URL") or "https://us.cloud.langfuse.com"
_BASIC_AUTH = base64.b64encode(f"{_PK}:{_SK}".encode()).decode() if _PK and _SK else None
ENABLED = bool(_PK and _SK)

# Legacy exports — kept as None to not break existing imports
langfuse_client = None
CallbackHandler = None


def get_langfuse_handler(trace_id: str | None = None):
    """Return a per-request LangChain callback handler that POSTs to Langfuse REST API.

    Returns None if Langfuse is disabled.
    """
    if not ENABLED or not trace_id:
        return None

    class _RestCallbackHandler:
        """Minimal LangChain callback handler that posts observations to Langfuse REST."""

        def __init__(self, trace_id: str):
            self.trace_id = trace_id
            self._spans: list[str] = []

        def on_llm_start(self, serialized, prompts, **kwargs):
            import uuid
            self._span_id = uuid.uuid4().hex
            self._spans.append(self._span_id)
            _post("observations", {
                "id": self._span_id,
                "trace_id": self.trace_id,
                "name": (serialized.get("name", "llm") if isinstance(serialized, dict) else "llm"),
                "type": "GENERATION",
                "start_time": datetime.now(timezone.utc).isoformat(),
                "input": {"prompts": [p[:500] for p in (prompts or [])]},
            })

        def on_llm_end(self, response, **kwargs):
            if self._spans:
                span_id = self._spans.pop()
                output = ""
                try:
                    output = str(response.generations[0][0].text)[:1000] if response.generations else ""
                except Exception:
                    pass
                _post("observations", {
                    "id": span_id,
                    "end_time": datetime.now(timezone.utc).isoformat(),
                    "output": output,
                })

        def on_llm_error(self, error, **kwargs):
            if self._spans:
                span_id = self._spans.pop()
                _post("observations", {
                    "id": span_id,
                    "end_time": datetime.now(timezone.utc).isoformat(),
                    "level": "ERROR",
                    "status_message": str(error)[:500],
                })

        def on_chain_start(self, serialized, inputs, **kwargs):
            import uuid
            span_id = uuid.uuid4().hex
            self._spans.append(span_id)
            name = serialized.get("name", "chain") if isinstance(serialized, dict) else "chain"
            _post("observations", {
                "id": span_id,
                "trace_id": self.trace_id,
                "name": name,
                "type": "SPAN",
                "start_time": datetime.now(timezone.utc).isoformat(),
                "input": {"inputs": str(inputs)[:500]},
            })

        def on_chain_end(self, outputs, **kwargs):
            if self._spans:
                span_id = self._spans.pop()
                _post("observations", {
                    "id": span_id,
                    "end_time": datetime.now(timezone.utc).isoformat(),
                    "output": str(outputs)[:1000],
                })

        def on_tool_start(self, serialized, input_str, **kwargs):
            import uuid
            span_id = uuid.uuid4().hex
            self._spans.append(span_id)
            name = serialized.get("name", "tool") if isinstance(serialized, dict) else "tool"
            _post("observations", {
                "id": span_id,
                "trace_id": self.trace_id,
                "name": name,
                "type": "TOOL",
                "start_time": datetime.now(timezone.utc).isoformat(),
                "input": {"input": str(input_str)[:500]},
            })

        def on_tool_end(self, output, **kwargs):
            if self._spans:
                span_id = self._spans.pop()
                _post("observations", {
                    "id": span_id,
                    "end_time": datetime.now(timezone.utc).isoformat(),
                    "output": str(output)[:1000],
                })

    return _RestCallbackHandler(trace_id)


# Legacy alias
langfuse_handler = get_langfuse_handler() if ENABLED else None


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
    except Exception as e:
        logger.debug("Langfuse POST failed: %s", e)


# Unified ContextVar — single source of truth for trace_id propagation
current_trace_id: ContextVar[str | None] = ContextVar("current_trace_id", default=None)

# Legacy alias for backward compat
current_trace_id_ctx = current_trace_id


@contextmanager
def trace_request(
    name: str,
    user_id: str | int | None = None,
    session_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> Generator[str | None, None, None]:
    """Tạo Langfuse trace + root span qua REST API.

    Sets current_trace_id ContextVar so generate_structured and
    get_chat_model can auto-attach child observations.
    """
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

    # POST root span (not GENERATION — it's a span wrapping the request)
    root_span_id = uuid.uuid4().hex
    _post("observations", {
        "id": root_span_id,
        "trace_id": trace_id,
        "name": name,
        "type": "SPAN",
        "start_time": now,
        "metadata": metadata or {},
    })

    token = current_trace_id.set(trace_id)
    try:
        yield trace_id
    finally:
        # End root span
        _post("observations", {
            "id": root_span_id,
            "end_time": datetime.now(timezone.utc).isoformat(),
        })
        current_trace_id.reset(token)
