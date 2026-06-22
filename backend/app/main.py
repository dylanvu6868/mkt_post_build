import logging

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from app.api import admin, auth, brand, chat, conversations, documents, generate, history, images, oauth_callbacks, payments, projects, templates, lab
from app.mcp.server import router as mcp_router
from app.core.config import settings
from app.core.rate_limit import limiter

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

if settings.jwt_secret == "change-me":
    logger.warning("JWT_SECRET is using the default value — change it in production!")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if settings.environment == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        return response


app = FastAPI(
    title=settings.app_name,
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.add_middleware(SecurityHeadersMiddleware)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.on_event("startup")
async def ensure_tables():
    from app.core.db import Base, engine
    import app.models  # noqa: F401 — register all models
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.on_event("startup")
async def seed_admin():
    from sqlalchemy import select
    from app.core.db import async_session_maker
    from app.core.security import hash_password
    from app.models.user import User

    try:
        async with async_session_maker() as session:
            result = await session.execute(select(User).where(User.is_admin == True))  # noqa: E712
            if result.scalar_one_or_none() is not None:
                return
            admin_user = User(
                name="Admin",
                email=settings.admin_email,
                password_hash=hash_password(settings.admin_password),
                is_admin=True,
            )
            session.add(admin_user)
            await session.commit()
            logger.info("Default admin created: %s", settings.admin_email)
    except Exception:
        logger.warning("Skipping admin seed — run 'alembic upgrade head' first")


app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(conversations.router)
app.include_router(payments.router)
app.include_router(projects.router)
app.include_router(documents.router)
app.include_router(brand.router)
app.include_router(generate.router)
app.include_router(history.router)
app.include_router(templates.router)
app.include_router(images.router)
app.include_router(oauth_callbacks.router)
app.include_router(mcp_router)
app.include_router(lab.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}
