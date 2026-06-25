import os
from contextlib import contextmanager
from typing import Any, Generator

from dotenv import load_dotenv

load_dotenv() # Ensure .env is loaded into os.environ

try:
    from langfuse import Langfuse
    from langfuse.callback import CallbackHandler
except ImportError:
    Langfuse = None
    CallbackHandler = None

# Instantiate the Langfuse client based on env variables
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


@contextmanager
def trace_request(
    name: str,
    user_id: str | int | None = None,
    session_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> Generator[Any | None, None, None]:
    """Create a Langfuse trace for an AI request.

    All child observations (generate_structured, model callbacks) will be
    grouped under this trace with user_id inherited automatically.
    Yields the trace object (or None if Langfuse is disabled).
    """
    if not langfuse_client:
        yield None
        return
    with langfuse_client.start_as_current_observation(
        as_type="trace",
        name=name,
        user_id=str(user_id) if user_id is not None else None,
        session_id=session_id,
        metadata=metadata or {},
    ) as trace:
        yield trace
