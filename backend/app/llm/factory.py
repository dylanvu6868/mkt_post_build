from typing import Any

from langchain.chat_models import init_chat_model

from app.core.config import settings


def provider_available() -> bool:
    provider = settings.llm_provider.lower()
    if provider == "openai":
        return bool(settings.openai_api_key)
    if provider == "anthropic":
        return bool(settings.anthropic_api_key)
    if provider == "deepseek":
        return bool(settings.deepseek_api_key)
    return False


def get_chat_model(tier: str) -> Any:
    model = settings.llm_model_smart if tier == "smart" else settings.llm_model_fast
    provider = settings.llm_provider.lower()

    if provider == "deepseek":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            api_key=settings.deepseek_api_key,
            base_url="https://api.deepseek.com",
            temperature=0.7,
        )

    return init_chat_model(
        model, model_provider=provider, temperature=0.7
    )
