from typing import Any

from langchain.chat_models import init_chat_model

from app.core.config import settings


def provider_available() -> bool:
    """True only when a real LLM should be called (a non-mock provider with a key)."""
    provider = settings.llm_provider.lower()
    if provider == "openai":
        return bool(settings.openai_api_key)
    if provider == "anthropic":
        return bool(settings.anthropic_api_key)
    return False  # "mock" or anything unrecognized → run agents in mock mode


def get_chat_model(tier: str) -> Any:
    """Return a LangChain chat model for the given tier ("fast" | "smart")."""
    model = settings.llm_model_smart if tier == "smart" else settings.llm_model_fast
    return init_chat_model(
        model, model_provider=settings.llm_provider, temperature=0.7
    )
