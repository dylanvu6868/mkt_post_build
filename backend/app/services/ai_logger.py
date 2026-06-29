"""Background AI call logger — captures token usage, cost, and latency."""
import logging
import time
from typing import Any

from app.core.db import async_session_maker
from app.core.tracing import current_trace_id
from app.models.ai_call_log import AICallLog

logger = logging.getLogger(__name__)

PRICING = {
    "deepseek-chat":      {"input": 0.14 / 1_000_000, "output": 0.28 / 1_000_000},
    "deepseek-reasoner":  {"input": 0.55 / 1_000_000, "output": 2.19 / 1_000_000},
    "gpt-4o-mini":        {"input": 0.15 / 1_000_000, "output": 0.60 / 1_000_000},
    "gpt-4o":             {"input": 2.50 / 1_000_000, "output": 10.0 / 1_000_000},
    "claude-sonnet-4-20250514": {"input": 3.0 / 1_000_000, "output": 15.0 / 1_000_000},
}


def _calc_cost(model: str | None, input_tokens: int, output_tokens: int) -> float:
    if not model:
        return 0.0
    prices = PRICING.get(model, {"input": 0.5 / 1_000_000, "output": 1.5 / 1_000_000})
    return input_tokens * prices["input"] + output_tokens * prices["output"]


async def log_ai_call(
    *,
    call_type: str,
    model: str | None = None,
    provider: str | None = None,
    input_tokens: int = 0,
    output_tokens: int = 0,
    latency_ms: int = 0,
    status: str = "success",
    error_message: str | None = None,
    user_id: int | None = None,
    endpoint: str | None = None,
    tool_name: str | None = None,
    input_preview: str | None = None,
    output_preview: str | None = None,
    session_id: str | None = None,
    conversation_id: int | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Insert an AI call log row. Fire-and-forget — never raises."""
    try:
        trace_id = current_trace_id.get()
        cost = _calc_cost(model, input_tokens, output_tokens)
        async with async_session_maker() as session:
            entry = AICallLog(
                user_id=user_id,
                trace_id=trace_id,
                call_type=call_type,
                endpoint=endpoint,
                tool_name=tool_name,
                model=model,
                provider=provider,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_cost=cost,
                latency_ms=latency_ms,
                status=status,
                error_message=error_message[:500] if error_message else None,
                input_preview=input_preview[:500] if input_preview else None,
                output_preview=output_preview[:500] if output_preview else None,
                session_id=session_id,
                conversation_id=conversation_id,
                metadata_json=metadata,
            )
            session.add(entry)
            await session.commit()
    except Exception as e:
        logger.debug("Failed to log AI call: %s", e)


class AICallTimer:
    """Context manager that measures latency and extracts token usage from LLM response."""

    def __init__(self, **kwargs: Any):
        self.kwargs = kwargs
        self.start = 0.0

    def __enter__(self):
        self.start = time.perf_counter()
        return self

    def __exit__(self, *exc):
        self.kwargs["latency_ms"] = int((time.perf_counter() - self.start) * 1000)
        if exc[0]:
            self.kwargs["status"] = "error"
            self.kwargs["error_message"] = str(exc[1])[:500]
        return False

    async def save(self, response: Any = None):
        if response:
            usage = getattr(response, "usage_metadata", None) or getattr(response, "response_metadata", {}).get("token_usage", {})
            if isinstance(usage, dict):
                self.kwargs["input_tokens"] = usage.get("input_tokens") or usage.get("prompt_tokens", 0)
                self.kwargs["output_tokens"] = usage.get("output_tokens") or usage.get("completion_tokens", 0)
            self.kwargs["output_preview"] = str(getattr(response, "content", ""))[:500]
        await log_ai_call(**self.kwargs)
