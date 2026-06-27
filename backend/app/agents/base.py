import json
import re
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import TypeVar

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel

from app.llm.factory import get_chat_model

T = TypeVar("T", bound=BaseModel)

# Langfuse trace_id tự động propagate qua ContextVar
current_trace_id: ContextVar[str | None] = ContextVar("current_trace_id", default=None)


def _post_langfuse(path: str, data: dict) -> None:
    """POST to Langfuse API — silently skip if not configured."""
    import os, base64, requests
    pk = os.getenv("LANGFUSE_PUBLIC_KEY") or ""
    sk = os.getenv("LANGFUSE_SECRET_KEY") or ""
    if not pk or not sk:
        return
    host = os.getenv("LANGFUSE_HOST") or os.getenv("LANGFUSE_BASE_URL") or "https://us.cloud.langfuse.com"
    auth = base64.b64encode(f"{pk}:{sk}".encode()).decode()
    try:
        requests.post(
            f"{host}/api/public/{path}",
            json=data,
            headers={"Authorization": f"Basic {auth}"},
            timeout=5,
        )
    except Exception:
        pass


def _classify_span_type(schema_name: str) -> str:
    """Phân loại observation type dựa trên schema name.

    AGENT: pipeline agents (Research, SEO, Brand, FusedBrief, Review, Plan...)
    TOOL: lab/guard tools (GuardResult, ShieldResponse, PsychoResponse, HookGeneratorResponse...)
    GENERATION: mặc định (copywriter, formatter...)
    """
    tool_schemas = {
        "GuardResult", "ShieldResponse", "PsychoResponse", "PersonaResponse",
        "DNAResponse", "SimulatorResponse", "CinematicResponse", "ReverseResponse",
        "HexBreakerResponse", "TrendJackResponse", "BlindspotResponse", "EvergreenResponse",
        "AudioHookResponse", "HookGeneratorResponse", "ABTestResponse", "CompetitorSpyResponse",
        "RepurposerResponse", "InfluencerMatchResponse", "HashtagUniverseResponse",
        "DialectAdapterResponse", "ROICommentary", "SeoAnalysisResult",
    }
    agent_schemas = {
        "Research", "SEO", "BrandContext", "FusedBrief", "Plan", "Review",
        "Insights", "FAQItem",
    }
    if schema_name in tool_schemas:
        return "TOOL"
    if schema_name in agent_schemas:
        return "AGENT"
    return "GENERATION"


def _trace_span(trace_id: str | None, schema_name: str, system: str, user: str, span_type: str | None = None) -> str | None:
    """Tạo Langfuse span cho agent call. Trả về span_id hoặc None."""
    if not trace_id:
        return None
    span_id = uuid.uuid4().hex
    _post_langfuse("observations", {
        "id": span_id,
        "trace_id": trace_id,
        "name": f"agent_{schema_name}",
        "type": span_type,
        "start_time": datetime.now(timezone.utc).isoformat(),
        "input": {"system": system[:200], "user": user[:200]},
    })
    return span_id


def _end_span(span_id: str | None, output: str | None = None, error: str | None = None) -> None:
    """Kết thúc Langfuse span."""
    if not span_id:
        return
    _post_langfuse("observations", {
        "id": span_id,
        "end_time": datetime.now(timezone.utc).isoformat(),
        "output": output[:1000] if output else None,
        "level": "ERROR" if error else "DEFAULT",
        "status_message": error,
    })


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
    span_type: str = "GENERATION",
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

    effective_trace_id = trace_id or current_trace_id.get()
    effective_span_type = span_type or _classify_span_type(schema.__name__)
    span_id = _trace_span(effective_trace_id, schema.__name__, system, user, effective_span_type)
    llm = get_chat_model(tier, max_tokens=8192, trace_id=effective_trace_id)
    messages = [SystemMessage(content=system), HumanMessage(content=user)]

    try:
        result = await llm.with_structured_output(schema).ainvoke(messages)
        output = result.model_dump() if hasattr(result, "model_dump") else str(result)
        _end_span(span_id, output=json.dumps(output, ensure_ascii=False)[:1000])
        return result
    except Exception as e:
        _end_span(span_id, error=str(e))
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
        print(f"generate_structured fallback failed for {schema.__name__}: {e}")

    raise ValueError(f"Could not parse {schema.__name__} from LLM response")
