import os
from contextlib import contextmanager
from typing import Any, Generator

from dotenv import load_dotenv

load_dotenv()

try:
    from langfuse import Langfuse
    from langfuse.callback import CallbackHandler
except ImportError:
    Langfuse = None
    CallbackHandler = None


def get_langfuse_client():
    if Langfuse and os.getenv("LANGFUSE_PUBLIC_KEY") and os.getenv("LANGFUSE_SECRET_KEY"):
        host = os.getenv("LANGFUSE_HOST", os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com"))
        return Langfuse(host=host)
    return None


langfuse_client = get_langfuse_client()

if CallbackHandler and os.getenv("LANGFUSE_PUBLIC_KEY") and os.getenv("LANGFUSE_SECRET_KEY"):
    host = os.getenv("LANGFUSE_HOST", os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com"))
    langfuse_handler = CallbackHandler(host=host)
else:
    langfuse_handler = None


def get_langfuse_handler(trace_id: str | None = None) -> "CallbackHandler | None":
    """Tạo CallbackHandler với trace_id để link LangChain spans vào trace đúng.

    Dùng khi có trace context (generate pipeline, lab tool calls).
    Trả về None nếu Langfuse chưa được cấu hình.
    """
    if not CallbackHandler or not os.getenv("LANGFUSE_PUBLIC_KEY") or not os.getenv("LANGFUSE_SECRET_KEY"):
        return None
    host = os.getenv("LANGFUSE_HOST", os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com"))
    if trace_id:
        return CallbackHandler(host=host, trace_id=trace_id)
    return langfuse_handler


@contextmanager
def trace_request(
    name: str,
    user_id: str | int | None = None,
    session_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> Generator[Any | None, None, None]:
    """Tạo Langfuse trace cho AI request (SDK v2).

    Yield trace object (có .id) hoặc None nếu Langfuse không được cấu hình.
    Dùng trace.id để tạo per-request CallbackHandler với get_langfuse_handler(trace.id).
    """
    if not langfuse_client:
        yield None
        return

    trace = langfuse_client.trace(
        name=name,
        user_id=str(user_id) if user_id is not None else None,
        session_id=session_id,
        metadata=metadata or {},
    )
    yield trace
