from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, brand, documents, generate, history, projects
from app.core.config import settings

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(documents.router)
app.include_router(brand.router)
app.include_router(generate.router)
app.include_router(history.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}
