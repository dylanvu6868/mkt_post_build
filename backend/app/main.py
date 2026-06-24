import logging

from fastapi import Depends, FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from app.api import admin, auth, brand, chat, conversations, documents, generate, history, images, payments, projects, templates, lab, study, study_questions, frame
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


_RELAXED_CSP = (
    "default-src 'self'; img-src * data:; font-src * data:; "
    "style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; "
    "frame-ancestors 'none'"
)
_STRICT_CSP = "default-src 'self'; frame-ancestors 'none'"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        path = request.url.path
        if path.startswith("/p/") or path == "/mcp/landing/preview":
            response.headers["Content-Security-Policy"] = _RELAXED_CSP
        else:
            response.headers["Content-Security-Policy"] = _STRICT_CSP
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
async def start_scheduler():
    import asyncio
    import os
    if not settings.scheduler_enabled:
        return
    # Never start the infinite loop during pytest — conftest sets ENVIRONMENT=test.
    if os.environ.get("ENVIRONMENT") == "test":
        return
    if not settings.resend_api_key:
        logger.info("Email scheduler disabled: RESEND_API_KEY not set")
        return
    from app.mcp.email.scheduler import scheduler_loop
    asyncio.create_task(scheduler_loop())

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
app.include_router(lab.router)
app.include_router(study.router)
app.include_router(study_questions.router, prefix="/api/study_questions", tags=["Study Questions"])
app.include_router(frame.router)

from app.api.hub_deps import require_hub_tool
from app.mcp.email.templates import router as email_templates_router
from app.mcp.email.contacts import router as email_contacts_router
from app.mcp.email.lists import router as email_lists_router
from app.mcp.email.scheduling import router as email_scheduling_router, public_router as email_unsubscribe_router

app.include_router(mcp_router, dependencies=[Depends(require_hub_tool("email"))])
app.include_router(email_templates_router, dependencies=[Depends(require_hub_tool("email"))])
app.include_router(email_contacts_router, dependencies=[Depends(require_hub_tool("email"))])
app.include_router(email_lists_router, dependencies=[Depends(require_hub_tool("email"))])
app.include_router(email_scheduling_router, dependencies=[Depends(require_hub_tool("email"))])
app.include_router(email_unsubscribe_router)  # public — no gating

from app.mcp.calendar.tools import router as calendar_router
app.include_router(calendar_router, dependencies=[Depends(require_hub_tool("calendar"))])

from app.mcp.seo.tools import router as seo_router
app.include_router(seo_router, dependencies=[Depends(require_hub_tool("seo"))])

from app.mcp.analytics.tools import router as analytics_router
app.include_router(analytics_router, dependencies=[Depends(require_hub_tool("analytics"))])

from app.mcp.landing.tools import router as landing_router, public_router as landing_public_router
app.include_router(landing_router, dependencies=[Depends(require_hub_tool("landing"))])
app.include_router(landing_public_router)  # public — no gating


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}
