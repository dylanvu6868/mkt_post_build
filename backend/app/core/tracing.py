import os
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any, Generator

from dotenv import load_dotenv

load_dotenv()

# Langfuse SDK v4 — uses get_client() or direct Langfuse class.
# The deprecated Langfuse class at langfuse.Langfuse doesn't have .trace().
# Instead, SDK v4 uses create_trace_id(), start_observation(), etc.
# For simplicity: only init if env vars are set, then use as singleton.
try:
    from langfuse import Langfuse
    from langfuse._client.client import Langfuse as _LangfuseClient
except ImportError:
    Langfuse = None
    _LangfuseClient = None

try:
    from langfuse.callback import CallbackHandler
except ImportError:
    CallbackHandler = None


def _get_host() -> str | None:
    return os.getenv("LANGFUSE_HOST") or os.getenv("LANGFUSE_BASE_URL") or None


def get_langfuse_client():
    """Initialize Langfuse SDK v4 client with env vars."""
    if not _LangfuseClient:
        return None
    pk = os.getenv("LANGFUSE_PUBLIC_KEY")
    sk = os.getenv("LANGFUSE_SECRET_KEY")
    if not pk or not sk:
        return None
    host = _get_host()
    kwargs = {"public_key": pk, "secret_key": sk}
    if host:
        kwargs["host"] = host
    return _LangfuseClient(**kwargs)


langfuse_client = get_langfuse_client()

# Legacy CallbackHandler for LangChain — optional
if CallbackHandler and os.getenv("LANGFUSE_PUBLIC_KEY") and os.getenv("LANGFUSE_SECRET_KEY"):
    host = _get_host() or "https://cloud.langfuse.com"
    langfuse_handler = CallbackHandler(host=host)
else:
    langfuse_handler = None


def get_langfuse_handler(trace_id: str | None = None) -> "CallbackHandler | None":
    """Tạo CallbackHandler với trace_id để link LangChain spans vào trace đúng."""
    if not CallbackHandler or not os.getenv("LANGFUSE_PUBLIC_KEY") or not os.getenv("LANGFUSE_SECRET_KEY"):
        return None
    host = _get_host() or "https://cloud.langfuse.com"
    if trace_id:
        return CallbackHandler(host=host, trace_id=trace_id)
    return langfuse_handler


# ContextVar lưu observation_id (SDK v4) để agent spans tự động ghi đúng
current_trace_id_ctx: ContextVar[str | None] = ContextVar("current_trace_id_ctx", default=None)


@contextmanager
def trace_request(
    name: str,
    user_id: str | int | None = None,
    session_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> Generator[Any | None, None, None]:
    """Tạo Langfuse trace cho AI request (SDK v4).

    SDK v4 không có trace() method. Dùng create_trace_id() + start_observation().
    Yield trace_id string hoặc None.
    """
    if not langfuse_client:
        yield None
        return

    trace_id = langfuse_client.create_trace_id()
    input_data = {"metadata": metadata or {}}
    if user_id:
        input_data["user_id"] = str(user_id)
    if session_id:
        input_data["session_id"] = session_id

    # Start a generation-level observation as the root span
    trace_context = {"trace_id": trace_id}
    observation = langfuse_client.start_observation(
        name=name,
        as_type="GENERATION",
        input=input_data,
        trace_context=trace_context,
    )
    token = current_trace_id_ctx.set(trace_id)
    try:
        yield trace_id
    finally:
        current_trace_id_ctx.reset(token)
        langfuse_client.flush()
