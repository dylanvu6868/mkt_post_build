from app.core.config import Settings


def test_settings_have_sensible_defaults():
    s = Settings()
    assert s.app_name == "AI Marketing Backend"
    assert s.qdrant_url.startswith("http")
    assert s.database_url.startswith("postgresql")
    assert s.llm_provider == "openai"
