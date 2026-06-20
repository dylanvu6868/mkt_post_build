from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "AI Marketing Backend"
    environment: str = "development"
    cors_origins: str = "http://localhost:3000,http://localhost:3001"
    database_url: str = "postgresql+asyncpg://postgres:postgres@db:5432/marketing"
    qdrant_url: str = "http://qdrant:6333"

    # LLM (provider-agnostic; consumed in later milestones)
    llm_provider: str = "deepseek"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    deepseek_api_key: str = ""
    llm_model_fast: str = "deepseek-chat"
    llm_model_smart: str = "deepseek-chat"

    # Auth (consumed in M1)
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 43200  # 30 days

    # Default admin (seeded on first startup)
    admin_email: str = "admin@mktplatform.com"
    admin_password: str = "Admin@123456"

    # OAuth
    google_client_id: str = ""
    google_web_client_id: str = ""
    facebook_app_id: str = ""
    facebook_app_secret: str = ""

    # SePay payment gateway
    sepay_api_key: str = ""

    # RAG (M3)
    qdrant_collection_name: str = "marketing_docs"
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    rag_chunk_size: int = 800
    rag_chunk_overlap: int = 100
    rag_top_k: int = 5


settings = Settings()
