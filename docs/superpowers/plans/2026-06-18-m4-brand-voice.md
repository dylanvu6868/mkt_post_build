# M4 — Brand Voice Config Applied to Copywriter

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-project brand profile (brand_name, tone, writing_style, preferred_words[], forbidden_words[]) persisted in the DB, an upsert/read API, and inject it into the Copywriter agent's prompt so generated content honors the project's brand voice. The `/generate` endpoint loads the profile and passes it through the graph as `brand_profile`.

**Architecture:** A `brand_profiles` table with a UNIQUE constraint on `project_id` (one profile per project). `POST /brand-profile` upserts (create-or-update) the profile; `GET /brand-profile?project_id=N` reads it. The `POST /generate` endpoint queries the profile for the project and injects it as `brand_profile` in the graph's initial state. The Copywriter agent formats `brand_profile` into an explicit prompt section (tone, preferred words, forbidden words). In mock mode the copywriter weaves `brand_name` and `tone` into the mock output to prove the injection works. `JSONB` on Postgres, portable `JSON` on SQLite (tests).

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, Alembic, Pydantic v2, pytest + pytest-asyncio.

**Spec:** `docs/superpowers/specs/2026-06-17-ai-marketing-multiagent-design.md` (milestone **M4**, §7 Brand Voice Module, §8 `brand_profiles` table, §9 `/brand-profile` endpoint, §4.2 Copywriter contract). M0–M3 are already merged to `master`.

---

## Preconditions

- Work on a feature branch: `git checkout -b m4-brand-voice` (from `master`).
- The backend local venv exists at `backend/.venv` (Python 3.11). No new deps needed — all required packages are installed from M0–M3.
- The Docker stack can be started with `docker compose up -d` (Postgres). Needed only for Task 2 (migration) and Task 3 (live verify).
- **Mock mode is the default for all tests:** no LLM, no Qdrant, no fastembed calls.

## File Structure (created/modified in this plan)

```
backend/
  app/
    models/
      brand_profile.py                   # CREATE: BrandProfile model (1-to-1 with project)
      __init__.py                        # MODIFY: register BrandProfile
    schemas/
      brand.py                           # CREATE: BrandProfileUpsert + BrandProfileResponse
    services/
      brand_service.py                   # CREATE: upsert_brand_profile, get_brand_profile
    api/
      brand.py                           # CREATE: POST /brand-profile, GET /brand-profile
    agents/
      copywriter.py                      # MODIFY: format brand_profile into prompt; mock output uses brand_name/tone
    api/
      generate.py                        # MODIFY: load brand_profile from DB before building initial_state
    main.py                              # MODIFY: include brand router
  alembic/
    versions/<hash>_add_brand_profiles.py  # CREATE via autogenerate
  tests/
    test_brand_profile.py                # CREATE: upsert/read API + ownership tests
    test_agents.py                       # MODIFY: add copywriter-with-brand-profile test
    test_generate.py                     # MODIFY: add generate-with-brand-profile test
```

---

### Task 1: BrandProfile model + schema + service + API + Copywriter injection

**Files:**
- Create: `backend/app/models/brand_profile.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/app/schemas/brand.py`
- Create: `backend/app/services/brand_service.py`
- Create: `backend/app/api/brand.py`
- Modify: `backend/app/agents/copywriter.py`
- Modify: `backend/app/api/generate.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_brand_profile.py`
- Modify: `backend/tests/test_agents.py`
- Modify: `backend/tests/test_generate.py`

- [ ] **Step 1: Write the failing tests** — `backend/tests/test_brand_profile.py`

```python
from unittest.mock import patch


async def _register(client, email="brand@example.com"):
    resp = await client.post(
        "/auth/register",
        json={"name": "Brand", "email": email, "password": "secret123"},
    )
    return resp.json()["access_token"]


async def _project(client, headers):
    resp = await client.post(
        "/projects", json={"name": "Brand Project"}, headers=headers
    )
    return resp.json()["id"]


async def test_upsert_brand_profile_requires_auth(client):
    resp = await client.post(
        "/brand-profile",
        json={"project_id": 1, "brand_name": "Acme"},
    )
    assert resp.status_code in (401, 403)


async def test_upsert_and_get_brand_profile(client):
    token = await _register(client)
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)

    # Create
    create_resp = await client.post(
        "/brand-profile",
        json={
            "project_id": project_id,
            "brand_name": "EcoBottle",
            "tone": "friendly",
            "writing_style": "conversational",
            "preferred_words": ["sustainable", "eco-friendly"],
            "forbidden_words": ["cheap", "plastic"],
        },
        headers=headers,
    )
    assert create_resp.status_code == 200
    body = create_resp.json()
    assert body["brand_name"] == "EcoBottle"
    assert body["tone"] == "friendly"
    assert body["preferred_words"] == ["sustainable", "eco-friendly"]
    assert body["forbidden_words"] == ["cheap", "plastic"]

    # Read
    get_resp = await client.get(
        f"/brand-profile?project_id={project_id}", headers=headers
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["brand_name"] == "EcoBottle"

    # Update (upsert same project_id)
    update_resp = await client.post(
        "/brand-profile",
        json={
            "project_id": project_id,
            "brand_name": "EcoBottle Pro",
            "tone": "professional",
            "writing_style": "formal",
            "preferred_words": ["premium"],
            "forbidden_words": ["budget"],
        },
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["brand_name"] == "EcoBottle Pro"
    assert update_resp.json()["tone"] == "professional"

    # Read again — should reflect update
    get_resp2 = await client.get(
        f"/brand-profile?project_id={project_id}", headers=headers
    )
    assert get_resp2.json()["brand_name"] == "EcoBottle Pro"


async def test_get_brand_profile_returns_404_when_none(client):
    token = await _register(client, "nobrand@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)

    resp = await client.get(
        f"/brand-profile?project_id={project_id}", headers=headers
    )
    assert resp.status_code == 404


async def test_brand_profile_rejects_other_users_project(client):
    token_a = await _register(client, "bpa@example.com")
    project_a = await _project(client, {"Authorization": f"Bearer {token_a}"})
    token_b = await _register(client, "bpb@example.com")

    # User B cannot upsert brand profile for user A's project
    resp = await client.post(
        "/brand-profile",
        json={"project_id": project_a, "brand_name": "Hacked"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 404

    # User B cannot read brand profile for user A's project
    resp = await client.get(
        f"/brand-profile?project_id={project_a}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 404
```

- [ ] **Step 2: Run to verify it fails**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_brand_profile.py -v`
Expected: FAIL — 404/405 on `/brand-profile` (route not defined yet).

- [ ] **Step 3: Create `backend/app/models/brand_profile.py`**

```python
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class BrandProfile(Base):
    __tablename__ = "brand_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), unique=True, index=True
    )
    brand_name: Mapped[str] = mapped_column(String(255), default="")
    tone: Mapped[str] = mapped_column(String(100), default="")
    writing_style: Mapped[str] = mapped_column(String(100), default="")
    preferred_words: Mapped[list[Any] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )
    forbidden_words: Mapped[list[Any] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

- [ ] **Step 4: Modify `backend/app/models/__init__.py`** to register BrandProfile. The full file becomes:

```python
from app.models.brand_profile import BrandProfile
from app.models.document import Document
from app.models.generation_job import GenerationJob
from app.models.project import Project
from app.models.user import User

__all__ = ["BrandProfile", "Document", "GenerationJob", "Project", "User"]
```

- [ ] **Step 5: Create `backend/app/schemas/brand.py`**

```python
from pydantic import BaseModel, Field


class BrandProfileUpsert(BaseModel):
    project_id: int
    brand_name: str = ""
    tone: str = ""
    writing_style: str = ""
    preferred_words: list[str] = Field(default_factory=list)
    forbidden_words: list[str] = Field(default_factory=list)


class BrandProfileResponse(BaseModel):
    id: int
    project_id: int
    brand_name: str
    tone: str
    writing_style: str
    preferred_words: list[str]
    forbidden_words: list[str]

    model_config = {"from_attributes": True}
```

- [ ] **Step 6: Create `backend/app/services/brand_service.py`**

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.brand_profile import BrandProfile
from app.models.project import Project


async def upsert_brand_profile(
    session: AsyncSession,
    project_id: int,
    brand_name: str,
    tone: str,
    writing_style: str,
    preferred_words: list[str],
    forbidden_words: list[str],
) -> BrandProfile:
    result = await session.execute(
        select(BrandProfile).where(BrandProfile.project_id == project_id)
    )
    profile = result.scalar_one_or_none()

    if profile is None:
        profile = BrandProfile(
            project_id=project_id,
            brand_name=brand_name,
            tone=tone,
            writing_style=writing_style,
            preferred_words=preferred_words,
            forbidden_words=forbidden_words,
        )
        session.add(profile)
    else:
        profile.brand_name = brand_name
        profile.tone = tone
        profile.writing_style = writing_style
        profile.preferred_words = preferred_words
        profile.forbidden_words = forbidden_words

    await session.commit()
    await session.refresh(profile)
    return profile


async def get_brand_profile(
    session: AsyncSession, project_id: int, user_id: int
) -> BrandProfile | None:
    result = await session.execute(
        select(BrandProfile)
        .join(Project, BrandProfile.project_id == Project.id)
        .where(BrandProfile.project_id == project_id, Project.user_id == user_id)
    )
    return result.scalar_one_or_none()
```

- [ ] **Step 7: Create `backend/app/api/brand.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.project import Project
from app.models.user import User
from app.schemas.brand import BrandProfileResponse, BrandProfileUpsert
from app.services import brand_service

router = APIRouter(prefix="/brand-profile", tags=["brand-profile"])


@router.post("", response_model=BrandProfileResponse)
async def upsert_brand_profile(
    payload: BrandProfileUpsert,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> BrandProfileResponse:
    project = await session.get(Project, payload.project_id)
    if project is None or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    profile = await brand_service.upsert_brand_profile(
        session,
        payload.project_id,
        payload.brand_name,
        payload.tone,
        payload.writing_style,
        payload.preferred_words,
        payload.forbidden_words,
    )
    return BrandProfileResponse.model_validate(profile)


@router.get("", response_model=BrandProfileResponse)
async def get_brand_profile(
    project_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> BrandProfileResponse:
    profile = await brand_service.get_brand_profile(
        session, project_id, current_user.id
    )
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand profile not found",
        )
    return BrandProfileResponse.model_validate(profile)
```

- [ ] **Step 8: Modify `backend/app/main.py`** to include the brand router. The full file becomes:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, brand, documents, generate, projects
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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}
```

- [ ] **Step 9: Modify `backend/app/agents/copywriter.py`** to inject `brand_profile` into the prompt and mock output. The full file becomes:

```python
from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import FacebookPostDraft

SYSTEM = (
    "You are an expert Facebook copywriter. Use the AIDA framework. Honor the "
    "brand voice (tone, preferred and forbidden words) if provided. Return a "
    "structured post with a hook, body, CTA, and hashtags."
)


def _format_brand_voice(brand_profile: dict[str, Any]) -> str:
    """Format brand_profile dict into a prompt section for the LLM."""
    if not brand_profile:
        return ""

    parts: list[str] = []
    if brand_profile.get("brand_name"):
        parts.append(f"Brand name: {brand_profile['brand_name']}")
    if brand_profile.get("tone"):
        parts.append(f"Tone: {brand_profile['tone']}")
    if brand_profile.get("writing_style"):
        parts.append(f"Writing style: {brand_profile['writing_style']}")
    if brand_profile.get("preferred_words"):
        parts.append(
            f"Preferred words (use these): {', '.join(brand_profile['preferred_words'])}"
        )
    if brand_profile.get("forbidden_words"):
        parts.append(
            f"Forbidden words (NEVER use these): {', '.join(brand_profile['forbidden_words'])}"
        )

    if not parts:
        return ""
    return "Brand voice:\n" + "\n".join(parts)


async def copywriter(state: dict[str, Any]) -> dict[str, Any]:
    brief = state["brief"]
    brand_profile = state.get("brand_profile") or {}

    if not state.get("provider_available"):
        brand_name = brand_profile.get("brand_name", "")
        tone = brand_profile.get("tone", "")
        tag = (brief.replace(" ", "") or "marketing").lower()

        hook_prefix = f"{brand_name}: " if brand_name else ""
        tone_note = f" Our {tone} approach sets us apart." if tone else ""

        return {
            "draft": FacebookPostDraft(
                hook=f"{hook_prefix}Struggling with {brief}? You're not alone. 🚀",
                body=(
                    f"Meet the smarter way to handle {brief}. Built to save you "
                    f"time and deliver real results — so you can focus on what "
                    f"matters most.{tone_note}"
                ),
                cta="👉 Learn more today!",
                hashtags=[f"#{tag}", "#marketing", "#growth"],
            ).model_dump()
        }

    brand_voice_section = _format_brand_voice(brand_profile)
    user = (
        f"Topic: {brief}\n"
        f"Creative brief: {state.get('fused_brief')}\n"
        f"{brand_voice_section}"
    )
    result = await generate_structured("smart", SYSTEM, user, FacebookPostDraft)
    return {"draft": result.model_dump()}
```

- [ ] **Step 10: Modify `backend/app/api/generate.py`** to load the brand profile from DB before building `initial_state`. The full file becomes:

```python
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.deps import get_current_user
from app.core.db import get_session, get_session_maker
from app.llm.factory import provider_available
from app.models.brand_profile import BrandProfile
from app.models.project import Project
from app.models.user import User
from app.schemas.generation import GenerateRequest, JobResponse, JobStatusResponse
from app.services import generation_service

router = APIRouter(prefix="/generate", tags=["generate"])

SUPPORTED_CONTENT_TYPES = {"facebook_post"}


@router.post("", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_generation(
    payload: GenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    session_maker: async_sessionmaker[AsyncSession] = Depends(get_session_maker),
) -> JobResponse:
    if payload.content_type not in SUPPORTED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported content_type: {payload.content_type}",
        )
    project = await session.get(Project, payload.project_id)
    if project is None or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # Load brand profile for this project (may be None)
    result = await session.execute(
        select(BrandProfile).where(BrandProfile.project_id == payload.project_id)
    )
    profile = result.scalar_one_or_none()
    brand_profile_data: dict = {}
    if profile is not None:
        brand_profile_data = {
            "brand_name": profile.brand_name,
            "tone": profile.tone,
            "writing_style": profile.writing_style,
            "preferred_words": profile.preferred_words or [],
            "forbidden_words": profile.forbidden_words or [],
        }

    job = await generation_service.create_job(
        session,
        payload.project_id,
        payload.content_type,
        payload.brief,
        payload.marketing_goal,
    )
    initial_state = {
        "project_id": payload.project_id,
        "content_type": payload.content_type,
        "brief": payload.brief,
        "marketing_goal": payload.marketing_goal,
        "brand_profile": brand_profile_data,
        "provider_available": provider_available(),
        "errors": [],
    }
    background_tasks.add_task(
        generation_service.run_generation_job, session_maker, job.id, initial_state
    )
    return JobResponse(job_id=job.id, status=job.status)


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_generation(
    job_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> JobStatusResponse:
    job = await generation_service.get_job_for_user(session, job_id, current_user.id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job not found"
        )
    return JobStatusResponse(
        id=job.id,
        status=job.status,
        current_step=job.current_step,
        result=job.result_json,
        error=job.error,
    )
```

- [ ] **Step 11: Append copywriter-with-brand-profile test to `backend/tests/test_agents.py`**

Add at the end of the existing file:

```python
async def test_copywriter_mock_uses_brand_profile():
    state = _downstream_state()
    state["fused_brief"] = {"unified_brief": "write a post"}
    state["brand_profile"] = {
        "brand_name": "EcoBottle",
        "tone": "friendly",
        "writing_style": "conversational",
        "preferred_words": ["sustainable"],
        "forbidden_words": ["cheap"],
    }
    out = await copywriter(state)
    parsed = FacebookPostDraft(**out["draft"])
    # Mock output should include brand_name in the hook
    assert "EcoBottle" in parsed.hook
    # Mock output should include tone in the body
    assert "friendly" in parsed.body
```

- [ ] **Step 12: Append generate-with-brand-profile test to `backend/tests/test_generate.py`**

Add at the end of the existing file:

```python
@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_generate_uses_brand_profile_in_output(mock_embed, mock_retrieve, client):
    token = await _register(client, "bp@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)

    # Upsert brand profile first
    await client.post(
        "/brand-profile",
        json={
            "project_id": project_id,
            "brand_name": "EcoBottle",
            "tone": "friendly",
            "writing_style": "conversational",
            "preferred_words": ["sustainable"],
            "forbidden_words": ["cheap"],
        },
        headers=headers,
    )

    # Generate — should pick up the brand profile
    start = await client.post(
        "/generate",
        json={
            "project_id": project_id,
            "content_type": "facebook_post",
            "brief": "eco-friendly water bottles",
            "marketing_goal": "awareness",
        },
        headers=headers,
    )
    assert start.status_code == 202
    job_id = start.json()["job_id"]

    poll = await client.get(f"/generate/{job_id}", headers=headers)
    assert poll.status_code == 200
    body = poll.json()
    assert body["status"] == "done"
    # The mock copywriter should have injected the brand name into the hook
    assert "EcoBottle" in body["result"]["draft"]["hook"]
```

- [ ] **Step 13: Run the full test suite**

Run: `.\.venv\Scripts\python.exe -m pytest tests/ -v`
Expected: PASS — all M0+M1+M2+M3 tests plus the new M4 tests (brand profile upsert/read, ownership, copywriter injection, generate-with-brand-profile).

- [ ] **Step 14: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/app/models/brand_profile.py backend/app/models/__init__.py \
  backend/app/schemas/brand.py backend/app/services/brand_service.py \
  backend/app/api/brand.py backend/app/agents/copywriter.py \
  backend/app/api/generate.py backend/app/main.py \
  backend/tests/test_brand_profile.py backend/tests/test_agents.py \
  backend/tests/test_generate.py
git commit -m "feat(backend): add brand voice config (upsert/read API + Copywriter injection)"
```

---

### Task 2: Alembic migration for `brand_profiles` (Postgres)

**Files:**
- Create: `backend/alembic/versions/<hash>_add_brand_profiles.py` (via autogenerate)

> Needs Docker Postgres reachable on `localhost:5432`. The M3 migration (`documents`) should already be applied.

- [ ] **Step 1: Ensure Postgres is up and previous migrations are applied**

```powershell
cd E:\product\mkt_post_build
docker compose up -d db
cd backend
$env:DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/marketing"
.\.venv\Scripts\alembic.exe upgrade head
```
Expected: `alembic upgrade head` is clean (M0–M3 migrations applied).

- [ ] **Step 2: Autogenerate the `brand_profiles` migration**

```powershell
.\.venv\Scripts\alembic.exe revision --autogenerate -m "add brand_profiles"
```
Expected: a new file whose `upgrade()` contains `op.create_table("brand_profiles", ...)` with columns `id, project_id (FK→projects.id, UNIQUE), brand_name, tone, writing_style, preferred_words (JSONB), forbidden_words (JSONB), created_at, updated_at`. It must NOT recreate any existing tables.

- [ ] **Step 3: Apply the migration and verify the table exists**

```powershell
.\.venv\Scripts\alembic.exe upgrade head
docker compose exec db psql -U postgres -d marketing -c "\dt"
docker compose exec db psql -U postgres -d marketing -c "\d brand_profiles"
```
Expected: `\dt` lists `brand_profiles`; `\d brand_profiles` shows the UNIQUE constraint on `project_id` and JSONB columns for `preferred_words`/`forbidden_words`.

- [ ] **Step 4: Sanity-check the generated migration file**

Open the file. Confirm `upgrade()` creates only `brand_profiles` and `downgrade()` drops it.

- [ ] **Step 5: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/alembic/versions/
git commit -m "feat(backend): add Alembic migration for brand_profiles"
```

---

### Task 3: Live verification against the Docker stack

**Files:** none (verification only).

- [ ] **Step 1: Rebuild and start the full stack**

```bash
cd E:/product/mkt_post_build
docker compose up --build -d
docker compose ps
```
Expected: all four services Up; `db` healthy.

- [ ] **Step 2: Register a user and capture the token** (or reuse from M3)

```bash
curl -s -X POST http://localhost:8000/auth/register -H "Content-Type: application/json" -d "{\"name\":\"Voice\",\"email\":\"voice-m4@example.com\",\"password\":\"secret123\"}"
```

- [ ] **Step 3: Create a project**

```bash
curl -s -X POST http://localhost:8000/projects -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d "{\"name\":\"Voice Project\"}"
```

- [ ] **Step 4: Upsert a brand profile**

```bash
curl -s -X POST http://localhost:8000/brand-profile -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d "{\"project_id\":<PROJECT_ID>,\"brand_name\":\"EcoBottle\",\"tone\":\"friendly\",\"writing_style\":\"conversational\",\"preferred_words\":[\"sustainable\",\"eco-friendly\"],\"forbidden_words\":[\"cheap\",\"plastic\"]}"
```
Expected: JSON with the full brand profile.

- [ ] **Step 5: Read the brand profile back**

```bash
curl -s "http://localhost:8000/brand-profile?project_id=<PROJECT_ID>" -H "Authorization: Bearer <TOKEN>"
```
Expected: same profile data.

- [ ] **Step 6: Generate content and verify brand voice is injected**

```bash
curl -s -X POST http://localhost:8000/generate -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d "{\"project_id\":<PROJECT_ID>,\"content_type\":\"facebook_post\",\"brief\":\"eco-friendly water bottles\",\"marketing_goal\":\"awareness\"}"
```
Then poll `GET /generate/<JOB_ID>`. Expected: `result.draft.hook` contains "EcoBottle" (the brand_name from the profile).

- [ ] **Step 7: Generate without brand profile — verify default behavior**

Create a second project (no brand profile) and generate. Expected: output uses default mock text without brand name.

- [ ] **Step 8: Confirm unauthenticated brand profile access is rejected**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8000/brand-profile -H "Content-Type: application/json" -d "{\"project_id\":1,\"brand_name\":\"Hacked\"}"
```
Expected: `401` or `403`.

- [ ] **Step 9: No commit needed** (verification only).

---

## Definition of Done (M4)

- `pytest` in `backend/` passes all tests: M0+M1+M2+M3 plus M4 (brand profile upsert/read API, ownership enforcement, 404 on missing profile, copywriter brand injection in mock mode, generate-with-brand-profile e2e).
- `POST /brand-profile` upserts a `brand_profiles` row (one per project, UNIQUE constraint on `project_id`); `GET /brand-profile?project_id=N` reads it. Both auth-guarded and ownership-checked.
- `POST /generate` loads the project's brand profile from DB and passes it as `brand_profile` in the graph's initial state.
- The Copywriter agent formats `brand_profile` into the LLM prompt (brand name, tone, writing style, preferred words, forbidden words). In mock mode the output includes `brand_name` in the hook and `tone` in the body.
- Projects with no brand profile generate content normally (empty `brand_profile`).
- Alembic migration creates `brand_profiles` table in Postgres with UNIQUE constraint on `project_id` and JSONB columns; `alembic upgrade head` is clean.
- Existing M0–M3 tests still pass with no regressions.
- Live: register → create project → upsert brand profile → generate → poll → draft reflects brand voice.
- All work committed on the feature branch.

---

## Self-review notes

- **Spec coverage:**
  - §7 Brand Voice Module — `brand_name, tone, writing_style, preferred_words[], forbidden_words[]` per-project config; injected into Copywriter prompt; forbidden words formatted as "NEVER use these".
  - §8 `brand_profiles` table — `id, project_id (FK, UNIQUE), brand_name, tone, writing_style (String), preferred_words (JSONB), forbidden_words (JSONB), created_at, updated_at`.
  - §9 `/brand-profile` endpoint — `POST` for upsert (create-or-update), `GET ?project_id=N` for read. Auth-guarded, ownership-enforced.
  - §4.2 Copywriter contract — consumes the fused brief **and** the project's brand voice config.
- **Intentional M4 scope (deferred):**
  - **Reviewer** does not separately re-check forbidden words — the spec says "injected into the Copywriter prompt; forbidden words are checked and avoided" which is satisfied by the prompt instruction. A code-level post-check is a possible future enhancement but not in the spec.
  - **Content history** is later milestone scope.
  - **Frontend brand voice page** is **M5** scope.
- **Type consistency:** `brand_profile` key in `GraphState` is `dict[str, Any]` (already defined in M2). The generate endpoint populates it from `BrandProfile` model fields. The Copywriter reads `brand_profile.get("brand_name")` etc. — same keys throughout.
- **Backward compatibility:** existing tests that pass `brand_profile: {}` or omit it continue to work because `_format_brand_voice({})` returns `""` and the mock path uses `brand_profile.get("brand_name", "")` which defaults to empty string — no brand injection.
