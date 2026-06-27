def test_langgraph_and_langchain_import():
    import langgraph  # noqa: F401
    from langchain.chat_models import init_chat_model  # noqa: F401
    from langchain_core.messages import HumanMessage, SystemMessage  # noqa: F401
    from langgraph.graph import END, START, StateGraph  # noqa: F401


def test_provider_unavailable_when_openai_key_missing(monkeypatch):
    from app.core.config import settings
    from app.llm.factory import provider_available

    monkeypatch.setattr(settings, "llm_provider", "openai")
    monkeypatch.setattr(settings, "openai_api_key", "")
    assert provider_available() is False


def test_provider_available_when_openai_key_present(monkeypatch):
    from app.core.config import settings
    from app.llm.factory import provider_available

    monkeypatch.setattr(settings, "llm_provider", "openai")
    monkeypatch.setattr(settings, "openai_api_key", "sk-test")
    assert provider_available() is True


def test_anthropic_provider_uses_anthropic_key(monkeypatch):
    from app.core.config import settings
    from app.llm.factory import provider_available

    monkeypatch.setattr(settings, "llm_provider", "anthropic")
    monkeypatch.setattr(settings, "anthropic_api_key", "")
    assert provider_available() is False
    monkeypatch.setattr(settings, "anthropic_api_key", "key")
    assert provider_available() is True


def test_mock_provider_is_unavailable(monkeypatch):
    from app.core.config import settings
    from app.llm.factory import provider_available

    monkeypatch.setattr(settings, "llm_provider", "mock")
    monkeypatch.setattr(settings, "openai_api_key", "sk-test")
    assert provider_available() is False


def test_get_chat_model_default_max_tokens(monkeypatch):
    from app.core.config import settings
    from app.llm.factory import get_chat_model

    monkeypatch.setattr(settings, "llm_provider", "deepseek")
    monkeypatch.setattr(settings, "deepseek_api_key", "sk-test")
    model = get_chat_model("fast")
    assert model is not None


def test_get_chat_model_custom_max_tokens(monkeypatch):
    from app.core.config import settings
    from app.llm.factory import get_chat_model

    monkeypatch.setattr(settings, "llm_provider", "deepseek")
    monkeypatch.setattr(settings, "deepseek_api_key", "sk-test")
    model = get_chat_model("smart", max_tokens=8192)
    assert model is not None


def test_get_chat_model_smart_tier(monkeypatch):
    from app.core.config import settings
    from app.llm.factory import get_chat_model

    monkeypatch.setattr(settings, "llm_provider", "deepseek")
    monkeypatch.setattr(settings, "deepseek_api_key", "sk-test")
    monkeypatch.setattr(settings, "llm_model_smart", "deepseek-chat")
    model = get_chat_model("smart")
    assert model is not None
