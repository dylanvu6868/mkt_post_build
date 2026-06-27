import json
import re
from contextvars import ContextVar
from typing import TypeVar

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel

from app.llm.factory import get_chat_model

T = TypeVar("T", bound=BaseModel)

# ContextVar để Langfuse trace_id tự động propagate qua các agent calls
# mà không cần pass trace_id thủ công qua từng hàm.
current_trace_id: ContextVar[str | None] = ContextVar("current_trace_id", default=None)


def _extract_json(text: str) -> dict | None:
    text = re.sub(r"```(?:json)?\s*", "", text).replace("```", "")
    m = re.search(r"arguments:\s*(\{.*)", text, re.DOTALL)
    if m:
        text = m.group(1)
    start = text.find("{")
    if start == -1:
        return None
    depth, end = 0, start
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    try:
        return json.loads(text[start:end])
    except json.JSONDecodeError:
        return None


async def generate_structured(
    tier: str, system: str, user: str, schema: type[T],
    trace_id: str | None = None,
) -> T:
    from app.core.config import settings
    if tier == "smart" and settings.llm_provider.lower() == "deepseek" and settings.llm_model_smart == "deepseek-reasoner":
        import logging
        logging.getLogger(__name__).warning(
            "deepseek-reasoner does not support structured output. "
            "Falling back to fast model (%s) silently. Set llm_model_smart to a chat model (e.g. deepseek-chat) for smart tier.",
            settings.llm_model_fast,
        )
        tier = "fast"

    # Dùng trace_id từ ContextVar nếu không được pass trực tiếp
    effective_trace_id = trace_id or current_trace_id.get()
    llm = get_chat_model(tier, trace_id=effective_trace_id)
    messages = [SystemMessage(content=system), HumanMessage(content=user)]

    # Tạo generation span qua Langfuse SDK v4 nếu có parent trace
    from app.core.tracing import current_trace_id_ctx, langfuse_client
    parent_trace_id = current_trace_id_ctx.get()
    span = None
    if parent_trace_id and langfuse_client:
        span = langfuse_client.start_as_current_observation(
            name=f"generate_structured_{schema.__name__}",
            as_type="GENERATION",
            trace_context={"trace_id": parent_trace_id},
            input=[{"role": "system", "content": system[:200]}, {"role": "user", "content": user[:200]}],
            end_on_exit=False,
        )
        span.__enter__()

    try:
        result = await llm.with_structured_output(schema).ainvoke(messages)
        if span:
            span.__exit__(None, None, None)
        return result
    except Exception as e:
        if span:
            span.__exit__(type(e), e, e.__traceback__)
        import logging
        logging.getLogger(__name__).warning(
            "Structured output failed for %s: %s. Falling back to JSON extraction.",
            schema.__name__, e,
        )

    json_hint = (
        f"\n\nIMPORTANT: Return your answer as a single JSON object matching this schema — "
        f"no markdown fences, no function calls, just raw JSON:\n"
        f"{json.dumps(schema.model_json_schema(), ensure_ascii=False)}"
    )
    messages_fb = [
        SystemMessage(content=system + json_hint),
        HumanMessage(content=user),
    ]

    try:
        raw = await llm.ainvoke(messages_fb)
        text = raw.content if hasattr(raw, "content") else str(raw)
        data = _extract_json(text)
        if data:
            return schema.model_validate(data)
    except Exception as e:
        if span:
            span.__exit__(type(e), e, e.__traceback__)
        print(f"generate_structured fallback failed for {schema.__name__}: {e}")

    raise ValueError(f"Could not parse {schema.__name__} from LLM response")
