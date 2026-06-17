from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "AI Marketing Backend"
    database_url: str = "postgresql+asyncpg://postgres:postgres@db:5432/marketing"
    qdrant_url: str = "http://qdrant:6333"

    # LLM (provider-agnostic; consumed in later milestones)
    llm_provider: str = "openai"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    llm_model_fast: str = "gpt-4o-mini"
    llm_model_smart: str = "gpt-4o"

    # Auth (consumed in M1)
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440


settings = Settings()
