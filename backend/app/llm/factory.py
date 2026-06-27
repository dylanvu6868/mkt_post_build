from typing import Any

from langchain.chat_models import init_chat_model

from app.core.config import settings
from app.core.tracing import langfuse_handler, get_langfuse_handler


def provider_available() -> bool:
    provider = settings.llm_provider.lower()
    if provider == "openai":
        return bool(settings.openai_api_key)
    if provider == "anthropic":
        return bool(settings.anthropic_api_key)
    if provider == "deepseek":
        return bool(settings.deepseek_api_key)
    return False


def get_chat_model(tier: str, max_tokens: int | None = None, trace_id: str | None = None) -> Any:
    # "reasoning" is a legacy alias — use smart model for quality
    if tier in ("smart", "reasoning"):
        model = settings.llm_model_smart
        temperature = 0.5
    else:
        model = settings.llm_model_fast
        temperature = 0.7
    provider = settings.llm_provider.lower()
    tokens = max_tokens or 4096

    if provider == "deepseek":
        from langchain_openai import ChatOpenAI
        chat_model = ChatOpenAI(
            model=model,
            api_key=settings.deepseek_api_key,
            base_url="https://api.deepseek.com",
            temperature=temperature,
            timeout=180,
            max_tokens=tokens,
        )
    else:
        chat_model = init_chat_model(
            model, model_provider=provider, temperature=temperature,
            max_tokens=tokens,
        )

    # Use per-request handler with trace_id when available, fallback to global handler
    handler = get_langfuse_handler(trace_id) if trace_id else langfuse_handler
    if handler:
        chat_model = chat_model.with_config({"callbacks": [handler]})

    return chat_model
