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
    jwt_secret: str = "change-me"  # WARNING: MUST change in production
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days. NO refresh token — keep short.

    # Default admin (seeded on first startup)
    admin_email: str = "admin@mktplatform.com"
    admin_password: str = "Admin@123456"

    # OAuth
    google_client_id: str = ""
    google_web_client_id: str = ""

    # SePay payment gateway
    sepay_api_key: str = ""
    # Secret Key for HMAC-SHA256 webhook signature verification (preferred over api_key).
    sepay_webhook_secret: str = ""
    # Bank account that receives transfers (shown on checkout + used for the VietQR).
    # bank_code uses SePay/VietQR short names, e.g. "Vietcombank", "MBBank", "BIDV", "ACB".
    sepay_bank_code: str = ""
    sepay_bank_account: str = ""
    sepay_account_holder: str = ""
    sepay_bank_name: str = ""  # human-readable, e.g. "Ngân hàng Vietcombank"

    # MCP Hub (Phase 2)
    mcp_encryption_key: str = ""
    redis_url: str = "redis://localhost:6379"
    vercel_token: str = ""
    github_token: str = ""
    cloudflare_api_token: str = ""
    cloudflare_account_id: str = ""

    # Meta (Facebook/Instagram) OAuth + Graph API
    meta_app_id: str = ""
    meta_app_secret: str = ""
    meta_redirect_uri: str = "https://vitba.ai/api/meta/oauth/callback"
    meta_api_version: str = "v21.0"

    # Email — Resend API (preferred on Railway where SMTP is blocked)
    resend_api_key: str = ""
    # SMTP fallback (local dev)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    # Scheduler
    scheduler_enabled: bool = True

    # RAG (M3) — multilingual models for Vietnamese support
    qdrant_collection_name: str = "marketing_docs"
    embedding_model: str = "BAAI/bge-m3"
    sparse_embedding_model: str = "Qdrant/bm25"
    reranker_model: str = "BAAI/bge-reranker-v2-m3"
    rag_chunk_size: int = 800
    rag_chunk_overlap: int = 150
    rag_retrieve_k: int = 20
    rag_top_k: int = 5


settings = Settings()
