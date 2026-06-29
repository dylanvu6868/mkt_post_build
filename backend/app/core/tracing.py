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


def _log_observation_bg(**kwargs) -> None:
    """Fire-and-forget: log an observation to ai_call_logs via background thread."""
    import threading, asyncio
    def _run():
        try:
            from app.services.ai_logger import log_ai_call
            loop = asyncio.new_event_loop()
            loop.run_until_complete(log_ai_call(**kwargs))
            loop.close()
        except Exception:
            pass
    threading.Thread(target=_run, daemon=True).start()


def get_langfuse_handler(trace_id: str | None = None):
    """Return a per-request LangChain callback handler that POSTs to Langfuse REST API.

    Returns None if Langfuse is disabled.
    """
    if not ENABLED or not trace_id:
        return None

    class _RestCallbackHandler:
        """LangChain callback handler that posts observations to Langfuse REST.

        Covers all 7 Langfuse observation types:
        - GENERATION: LLM calls (on_llm_start, on_chat_model_start)
        - SPAN: chain steps (on_chain_start)
        - TOOL: tool calls (on_tool_start)
        - RETRIEVER: RAG retrieval (on_retriever_start)
        - AGENT: ReAct agent steps (on_agent_start)
        - TEXT: streaming tokens (on_llm_new_token — logged at end)
        - SELECT: model/tool selection (on_chat_model_start metadata)
        """

        raise_error = False
        run_inline = False
        ignore_llm = False
        ignore_chain = False
        ignore_agent = False
        ignore_retriever = False
        ignore_chat_model = False

        def __init__(self, trace_id: str):
            self.trace_id = trace_id
            self._stack: list[dict] = []  # [{id, type, name}] stack

        def _push(self, obs_type: str, name: str, inp: dict | None = None) -> str:
            import uuid
            span_id = uuid.uuid4().hex
            self._stack.append({"id": span_id, "type": obs_type, "name": name})
            _post("observations", {
                "id": span_id,
                "trace_id": self.trace_id,
                "name": name,
                "type": obs_type,
                "start_time": datetime.now(timezone.utc).isoformat(),
                "input": inp or {},
            })
            return span_id

        def _pop(self, output: str | None = None, error: str | None = None) -> None:
            if not self._stack:
                return
            entry = self._stack.pop()
            data: dict = {
                "id": entry["id"],
                "end_time": datetime.now(timezone.utc).isoformat(),
            }
            if output:
                data["output"] = output[:1000]
            if error:
                data["level"] = "ERROR"
                data["status_message"] = error[:500]
            _post("observations", data)
            _log_observation_bg(
                call_type="trace",
                observation_type=entry["type"],
                tool_name=entry["name"],
                status="error" if error else "success",
                error_message=error,
                output_preview=output,
            )

        # ── LLM / Chat Model ── GENERATION ──

        def on_llm_start(self, serialized, prompts, **kwargs):
            name = serialized.get("name", "llm") if isinstance(serialized, dict) else "llm"
            self._push("GENERATION", name, {"prompts": [p[:500] for p in (prompts or [])]})

        def on_chat_model_start(self, serialized, messages, **kwargs):
            name = serialized.get("name", "chat_model") if isinstance(serialized, dict) else "chat_model"
            model_name = serialized.get("id", [None])[-1] if isinstance(serialized, dict) else None
            inp: dict = {"model": model_name}
            try:
                inp["messages"] = str(messages[0][0])[:500] if messages and messages[0] else ""
            except Exception:
                pass
            self._push("GENERATION", name, inp)

        def on_llm_end(self, response, **kwargs):
            output = ""
            try:
                output = str(response.generations[0][0].text)[:1000] if response.generations else ""
            except Exception:
                pass
            self._pop(output=output)

        def on_llm_error(self, error, **kwargs):
            self._pop(error=str(error))

        def on_llm_new_token(self, token, **kwargs):
            pass  # Streaming tokens — too noisy to log individually

        # ── Chain ── SPAN ──

        def on_chain_start(self, serialized, inputs, **kwargs):
            name = serialized.get("name", "chain") if isinstance(serialized, dict) else "chain"
            self._push("SPAN", name, {"inputs": str(inputs)[:500]})

        def on_chain_end(self, outputs, **kwargs):
            self._pop(output=str(outputs)[:1000])

        def on_chain_error(self, error, **kwargs):
            self._pop(error=str(error))

        # ── Tool ── TOOL ──

        def on_tool_start(self, serialized, input_str, **kwargs):
            name = serialized.get("name", "tool") if isinstance(serialized, dict) else "tool"
            self._push("TOOL", name, {"input": str(input_str)[:500]})

        def on_tool_end(self, output, **kwargs):
            self._pop(output=str(output)[:1000])

        def on_tool_error(self, error, **kwargs):
            self._pop(error=str(error))

        # ── Retriever ── RETRIEVER ──

        def on_retriever_start(self, serialized, query, **kwargs):
            name = serialized.get("name", "retriever") if isinstance(serialized, dict) else "retriever"
            self._push("RETRIEVER", name, {"query": str(query)[:500]})

        def on_retriever_end(self, documents, **kwargs):
            doc_count = len(documents) if hasattr(documents, "__len__") else 0
            self._pop(output=f"Retrieved {doc_count} documents")

        def on_retriever_error(self, error, **kwargs):
            self._pop(error=str(error))

        # ── Agent ── AGENT ──

        def on_agent_start(self, serialized, inputs, **kwargs):
            name = serialized.get("name", "agent") if isinstance(serialized, dict) else "agent"
            self._push("AGENT", name, {"inputs": str(inputs)[:500]})

        def on_agent_end(self, output, **kwargs):
            self._pop(output=str(output)[:1000])

        def on_agent_action(self, action, **kwargs):
            tool = getattr(action, "tool", "unknown")
            self._push("TOOL", f"agent_call_{tool}", {"tool": tool, "input": str(getattr(action, "tool_input", ""))[:300]})

        def on_agent_finish(self, finish, **kwargs):
            self._pop(output=str(getattr(finish, "return_values", ""))[:500])

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
