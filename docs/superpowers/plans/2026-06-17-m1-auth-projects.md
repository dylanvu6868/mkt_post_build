# M1 — Auth (JWT) + Projects + DB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add JWT authentication (register/login with bcrypt), project ownership (create/list projects scoped to the authenticated user), an async SQLAlchemy data layer, and an Alembic baseline migration for `users` + `projects`.

**Architecture:** FastAPI routers → service functions → SQLAlchemy 2.0 async models, on Postgres (asyncpg). Auth issues JWTs; a `get_current_user` dependency guards project routes and enforces per-user data isolation. Tests run against an in-memory SQLite engine (StaticPool) by overriding the DB-session dependency — fast, no external DB. Alembic manages the real Postgres schema.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, asyncpg, Alembic, bcrypt, python-jose (JWT), Pydantic v2, pytest + pytest-asyncio + aiosqlite.

**Spec:** `docs/superpowers/specs/2026-06-17-ai-marketing-multiagent-design.md` (milestone **M1**). M0 (scaffold + `/health` + docker-compose) is already merged to `master`.

---

## Preconditions

- Work on a feature branch: `git checkout -b m1-auth-projects` (from `master`).
- The backend local venv exists at `backend/.venv` (Python 3.11). It will get new deps in Task 1.
- The Docker stack from M0 can be started with `docker compose up -d` (Postgres is published on `localhost:5432`). Needed only for Task 7 (migration) and Task 8 (live verify).

## File Structure (created/modified in this plan)

```
backend/
  requirements.txt              # MODIFY: add M1 deps
  pyproject.toml                # MODIFY: add asyncio_mode
  app/
    core/
      db.py                     # CREATE: Base, async engine, async_sessionmaker, get_session
      security.py               # CREATE: bcrypt hash/verify + JWT create/decode
    models/
      __init__.py               # CREATE: import User+Project so Base.metadata sees them
      user.py                   # CREATE: User model
      project.py                # CREATE: Project model
    schemas/
      __init__.py               # CREATE: empty
      auth.py                   # CREATE: Register/Login/Token/User schemas
      project.py                # CREATE: ProjectCreate/ProjectResponse
    services/
      __init__.py               # CREATE: empty
      auth_service.py           # CREATE: user lookup/create/authenticate
      project_service.py        # CREATE: create/list projects
    api/
      __init__.py               # CREATE: empty
      deps.py                   # CREATE: get_current_user dependency
      auth.py                   # CREATE: /auth/register, /auth/login routers
      projects.py               # CREATE: POST/GET /projects routers
    main.py                     # MODIFY: include auth + projects routers
  alembic.ini                   # CREATE (via `alembic init`)
  alembic/
    env.py                      # CREATE via init, then REPLACE with async version
    script.py.mako              # CREATE via init (unchanged)
    versions/
      <hash>_initial.py         # CREATE via autogenerate
  tests/
    conftest.py                 # CREATE: SQLite test engine + async client fixtures
    test_auth.py                # CREATE
    test_projects.py            # CREATE
```

---

### Task 1: M1 dependencies + async DB layer

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/pyproject.toml`
- Create: `backend/app/core/db.py`

- [ ] **Step 1: Replace `backend/requirements.txt` with the full M1 dependency set**

```
fastapi==0.115.5
uvicorn[standard]==0.32.1
pydantic-settings==2.6.1
email-validator==2.2.0
python-dotenv==1.0.1
sqlalchemy[asyncio]==2.0.36
asyncpg==0.30.0
alembic==1.14.0
bcrypt==4.2.1
python-jose[cryptography]==3.3.0
pytest==8.3.4
pytest-asyncio==0.24.0
httpx==0.28.1
aiosqlite==0.20.0
```

- [ ] **Step 2: Install the new deps**

Run (from `backend/`):
```powershell
cd E:\product\mkt_post_build\backend
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```
Expected: installs succeed (sqlalchemy, asyncpg, alembic, bcrypt, python-jose, pytest-asyncio, aiosqlite, email-validator).

- [ ] **Step 3: Replace `backend/pyproject.toml`**

```toml
[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]
asyncio_mode = "auto"
```

- [ ] **Step 4: Create `backend/app/core/db.py`**

```python
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(settings.database_url, echo=False, future=True)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session
```

- [ ] **Step 5: Verify the existing suite still passes**

Run: `.\.venv\Scripts\python.exe -m pytest tests/ -q`
Expected: `2 passed` (M0 tests). `db.py` imports cleanly (engine creation is lazy on first use, so importing does not require a live DB).

- [ ] **Step 6: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/requirements.txt backend/pyproject.toml backend/app/core/db.py
git commit -m "feat(backend): add async DB layer and M1 dependencies"
```

---

### Task 2: User and Project models

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/project.py`
- Test: `backend/tests/test_models.py`

- [ ] **Step 1: Write the failing test** — `backend/tests/test_models.py`

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.db import Base
import app.models  # noqa: F401  registers all models on Base.metadata
from app.models.project import Project
from app.models.user import User


async def test_user_and_project_persist_and_relate():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async with maker() as session:
        user = User(name="Alice", email="alice@example.com", password_hash="x")
        session.add(user)
        await session.commit()
        await session.refresh(user)

        project = Project(user_id=user.id, name="Launch")
        session.add(project)
        await session.commit()

        rows = (await session.execute(select(Project).where(Project.user_id == user.id))).scalars().all()
        assert len(rows) == 1
        assert rows[0].name == "Launch"
        assert user.id is not None
        assert user.created_at is not None

    await engine.dispose()
```

- [ ] **Step 2: Run it to verify it fails**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_models.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.models'`.

- [ ] **Step 3: Create `backend/app/models/user.py`**

```python
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

- [ ] **Step 4: Create `backend/app/models/project.py`**

```python
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

- [ ] **Step 5: Create `backend/app/models/__init__.py`**

```python
from app.models.project import Project
from app.models.user import User

__all__ = ["Project", "User"]
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_models.py -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/app/models/ backend/tests/test_models.py
git commit -m "feat(backend): add User and Project models"
```

---

### Task 3: Security helpers (password hashing + JWT)

**Files:**
- Create: `backend/app/core/security.py`
- Test: `backend/tests/test_security.py`

- [ ] **Step 1: Write the failing test** — `backend/tests/test_security.py`

```python
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_roundtrip():
    h = hash_password("secret123")
    assert h != "secret123"
    assert verify_password("secret123", h) is True
    assert verify_password("wrong", h) is False


def test_jwt_roundtrip():
    token = create_access_token("42")
    assert decode_access_token(token) == "42"


def test_decode_invalid_token_returns_none():
    assert decode_access_token("not-a-real-token") is None
```

- [ ] **Step 2: Run it to verify it fails**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_security.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.core.security'`.

- [ ] **Step 3: Create `backend/app/core/security.py`**

```python
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    claims = {"sub": subject, "exp": expire}
    return jwt.encode(claims, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
    except JWTError:
        return None
    return payload.get("sub")
```

> Note: bcrypt has a 72-byte password limit; passwords longer than that raise. For the MVP we accept normal-length passwords and do not truncate (YAGNI).

- [ ] **Step 4: Run the test to verify it passes**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_security.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/app/core/security.py backend/tests/test_security.py
git commit -m "feat(backend): add password hashing and JWT helpers"
```

---

### Task 4: Async test harness (conftest)

**Files:**
- Create: `backend/tests/conftest.py`
- Test: `backend/tests/test_smoke_async.py`

- [ ] **Step 1: Create `backend/tests/conftest.py`**

```python
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  register models on Base.metadata
from app.core.db import Base, get_session
from app.main import app


@pytest_asyncio.fixture
async def session_maker():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    yield maker
    await engine.dispose()


@pytest_asyncio.fixture
async def client(session_maker):
    async def override_get_session():
        async with session_maker() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
```

- [ ] **Step 2: Write a smoke test** — `backend/tests/test_smoke_async.py`

```python
async def test_health_through_async_client(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
```

- [ ] **Step 3: Run it to verify the harness works**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_smoke_async.py -v`
Expected: PASS. (This confirms `asyncio_mode = "auto"`, the async client fixture, and the SQLite StaticPool engine all work together.)

- [ ] **Step 4: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/tests/conftest.py backend/tests/test_smoke_async.py
git commit -m "test(backend): add async test client + in-memory DB harness"
```

---

### Task 5: Auth schemas, service, and endpoints

**Files:**
- Create: `backend/app/schemas/__init__.py` (empty)
- Create: `backend/app/schemas/auth.py`
- Create: `backend/app/services/__init__.py` (empty)
- Create: `backend/app/services/auth_service.py`
- Create: `backend/app/api/__init__.py` (empty)
- Create: `backend/app/api/auth.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_auth.py`

- [ ] **Step 1: Write the failing test** — `backend/tests/test_auth.py`

```python
async def test_register_returns_token_and_user(client):
    resp = await client.post(
        "/auth/register",
        json={"name": "Alice", "email": "alice@example.com", "password": "secret123"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "alice@example.com"
    assert "password" not in body["user"]
    assert "password_hash" not in body["user"]


async def test_register_duplicate_email_conflicts(client):
    payload = {"name": "Bob", "email": "bob@example.com", "password": "secret123"}
    first = await client.post("/auth/register", json=payload)
    assert first.status_code == 201
    second = await client.post("/auth/register", json=payload)
    assert second.status_code == 409


async def test_login_with_valid_credentials(client):
    await client.post(
        "/auth/register",
        json={"name": "Carol", "email": "carol@example.com", "password": "secret123"},
    )
    resp = await client.post(
        "/auth/login", json={"email": "carol@example.com", "password": "secret123"}
    )
    assert resp.status_code == 200
    assert resp.json()["access_token"]


async def test_login_with_wrong_password_rejected(client):
    await client.post(
        "/auth/register",
        json={"name": "Dave", "email": "dave@example.com", "password": "secret123"},
    )
    resp = await client.post(
        "/auth/login", json={"email": "dave@example.com", "password": "wrong"}
    )
    assert resp.status_code == 401
```

- [ ] **Step 2: Run it to verify it fails**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_auth.py -v`
Expected: FAIL — 404 on `/auth/register` (route not defined yet).

- [ ] **Step 3: Create `backend/app/schemas/__init__.py`** (empty file)

- [ ] **Step 4: Create `backend/app/schemas/auth.py`**

```python
from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
```

- [ ] **Step 5: Create `backend/app/services/__init__.py`** (empty file)

- [ ] **Step 6: Create `backend/app/services/auth_service.py`**

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.user import User


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(
    session: AsyncSession, name: str, email: str, password: str
) -> User:
    user = User(name=name, email=email, password_hash=hash_password(password))
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def authenticate(
    session: AsyncSession, email: str, password: str
) -> User | None:
    user = await get_user_by_email(session, email)
    if user is None or not verify_password(password, user.password_hash):
        return None
    return user
```

- [ ] **Step 7: Create `backend/app/api/__init__.py`** (empty file)

- [ ] **Step 8: Create `backend/app/api/auth.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.security import create_access_token
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED
)
async def register(
    payload: RegisterRequest, session: AsyncSession = Depends(get_session)
) -> TokenResponse:
    existing = await auth_service.get_user_by_email(session, payload.email)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )
    user = await auth_service.create_user(
        session, payload.name, payload.email, payload.password
    )
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest, session: AsyncSession = Depends(get_session)
) -> TokenResponse:
    user = await auth_service.authenticate(session, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))
```

- [ ] **Step 9: Modify `backend/app/main.py`** to include the auth router. The full file becomes:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth
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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}
```

- [ ] **Step 10: Run the auth tests to verify they pass**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_auth.py -v`
Expected: PASS (4 tests).

- [ ] **Step 11: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/app/schemas/ backend/app/services/ backend/app/api/ backend/app/main.py backend/tests/test_auth.py
git commit -m "feat(backend): add register/login auth endpoints"
```

---

### Task 6: Auth dependency + Projects endpoints

**Files:**
- Create: `backend/app/api/deps.py`
- Create: `backend/app/schemas/project.py`
- Create: `backend/app/services/project_service.py`
- Create: `backend/app/api/projects.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_projects.py`

- [ ] **Step 1: Write the failing test** — `backend/tests/test_projects.py`

```python
async def _register(client, email="user@example.com"):
    resp = await client.post(
        "/auth/register",
        json={"name": "User", "email": email, "password": "secret123"},
    )
    return resp.json()["access_token"]


async def test_create_project_requires_auth(client):
    resp = await client.post("/projects", json={"name": "My Project"})
    assert resp.status_code in (401, 403)


async def test_create_and_list_projects(client):
    token = await _register(client)
    headers = {"Authorization": f"Bearer {token}"}

    create = await client.post("/projects", json={"name": "Launch"}, headers=headers)
    assert create.status_code == 201
    assert create.json()["name"] == "Launch"
    assert create.json()["id"]

    listing = await client.get("/projects", headers=headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1
    assert listing.json()[0]["name"] == "Launch"


async def test_projects_isolated_per_user(client):
    token_a = await _register(client, "a@example.com")
    token_b = await _register(client, "b@example.com")
    await client.post(
        "/projects",
        json={"name": "A's project"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    listing_b = await client.get(
        "/projects", headers={"Authorization": f"Bearer {token_b}"}
    )
    assert listing_b.status_code == 200
    assert listing_b.json() == []
```

- [ ] **Step 2: Run it to verify it fails**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_projects.py -v`
Expected: FAIL — 404 on `/projects` (route not defined yet).

- [ ] **Step 3: Create `backend/app/api/deps.py`**

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.security import decode_access_token
from app.models.user import User

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    subject = decode_access_token(credentials.credentials)
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )
    user = await session.get(User, int(subject))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return user
```

- [ ] **Step 4: Create `backend/app/schemas/project.py`**

```python
from datetime import datetime

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str


class ProjectResponse(BaseModel):
    id: int
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 5: Create `backend/app/services/project_service.py`**

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project


async def create_project(session: AsyncSession, user_id: int, name: str) -> Project:
    project = Project(user_id=user_id, name=name)
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


async def list_projects(session: AsyncSession, user_id: int) -> list[Project]:
    result = await session.execute(
        select(Project)
        .where(Project.user_id == user_id)
        .order_by(Project.created_at.desc())
    )
    return list(result.scalars().all())
```

- [ ] **Step 6: Create `backend/app/api/projects.py`**

```python
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectResponse
from app.services import project_service

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ProjectResponse:
    project = await project_service.create_project(
        session, current_user.id, payload.name
    )
    return ProjectResponse.model_validate(project)


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ProjectResponse]:
    projects = await project_service.list_projects(session, current_user.id)
    return [ProjectResponse.model_validate(p) for p in projects]
```

- [ ] **Step 7: Modify `backend/app/main.py`** to also include the projects router. The full file becomes:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, projects
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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}
```

- [ ] **Step 8: Run the full suite to verify everything passes**

Run: `.\.venv\Scripts\python.exe -m pytest tests/ -q`
Expected: PASS — all tests (config, health, models, security, smoke, auth=4, projects=3).

- [ ] **Step 9: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/app/api/deps.py backend/app/schemas/project.py backend/app/services/project_service.py backend/app/api/projects.py backend/app/main.py backend/tests/test_projects.py
git commit -m "feat(backend): add project create/list endpoints with auth + isolation"
```

---

### Task 7: Alembic baseline migration (Postgres)

**Files:**
- Create: `backend/alembic.ini` (via `alembic init`)
- Create: `backend/alembic/` (via `alembic init`), then REPLACE `backend/alembic/env.py`
- Create: `backend/alembic/versions/<hash>_initial.py` (via autogenerate)

> This task needs the Docker Postgres running and reachable on `localhost:5432`. Start it: `docker compose up -d db` (from repo root).

- [ ] **Step 1: Scaffold Alembic** (from `backend/`)

```powershell
cd E:\product\mkt_post_build\backend
.\.venv\Scripts\alembic.exe init alembic
```
Expected: creates `alembic.ini`, `alembic/env.py`, `alembic/script.py.mako`, `alembic/versions/`.

- [ ] **Step 2: Replace `backend/alembic/env.py`** with this async, settings-driven version:

```python
import asyncio
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings  # noqa: E402
from app.core.db import Base  # noqa: E402
import app.models  # noqa: E402,F401  register models on Base.metadata

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_async_migrations())
```

- [ ] **Step 3: Ensure Postgres is up and generate the initial migration**

Run (from `backend/`, PowerShell — note the host-reachable `localhost` URL override):
```powershell
cd E:\product\mkt_post_build
docker compose up -d db
cd backend
$env:DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/marketing"
.\.venv\Scripts\alembic.exe revision --autogenerate -m "initial users and projects"
```
Expected: a new file appears in `alembic/versions/` containing `op.create_table("users", ...)` and `op.create_table("projects", ...)`.

- [ ] **Step 4: Apply the migration and verify the tables exist**

```powershell
.\.venv\Scripts\alembic.exe upgrade head
docker compose exec db psql -U postgres -d marketing -c "\dt"
```
Expected: `alembic upgrade` succeeds; `\dt` lists `users`, `projects`, and `alembic_version`.

- [ ] **Step 5: Open and sanity-check the generated migration**

Open `backend/alembic/versions/<hash>_initial.py`. Confirm `upgrade()` creates both tables with the expected columns (id, name, email/unique, password_hash, created_at for users; id, user_id FK, name, created_at for projects) and `downgrade()` drops them. If autogenerate added nothing (empty migration), the models weren't imported — re-check `import app.models` in `env.py` and regenerate.

- [ ] **Step 6: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/alembic.ini backend/alembic/
git commit -m "feat(backend): add Alembic baseline migration for users and projects"
```

---

### Task 8: Live verification against the Docker stack

**Files:** none (verification only).

- [ ] **Step 1: Rebuild and start the full stack**

Run (from repo root):
```bash
cd E:/product/mkt_post_build
docker compose up --build -d
docker compose ps
```
Expected: all four services Up; `db` healthy. (The rebuilt backend image now contains the auth/projects code and Alembic files.)

> The backend does NOT auto-run migrations. The tables were created in Task 7 against the same Postgres volume, so they already exist. (Future milestones may add a startup migration step; not in M1.)

- [ ] **Step 2: Register a user**

```bash
curl -s -X POST http://localhost:8000/auth/register -H "Content-Type: application/json" -d "{\"name\":\"Live\",\"email\":\"live@example.com\",\"password\":\"secret123\"}"
```
Expected: JSON with `access_token`, `token_type":"bearer"`, and a `user` object. Copy the `access_token` value.

- [ ] **Step 3: Create a project with the token**

```bash
curl -s -X POST http://localhost:8000/projects -H "Content-Type: application/json" -H "Authorization: Bearer <PASTE_TOKEN>" -d "{\"name\":\"Live Project\"}"
```
Expected: `201`-style JSON with `id`, `name":"Live Project"`, `created_at`.

- [ ] **Step 4: List projects**

```bash
curl -s http://localhost:8000/projects -H "Authorization: Bearer <PASTE_TOKEN>"
```
Expected: a JSON array containing the project created in Step 3.

- [ ] **Step 5: Confirm unauthenticated access is rejected**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8000/projects -H "Content-Type: application/json" -d "{\"name\":\"nope\"}"
```
Expected: `401` or `403`.

- [ ] **Step 6: No commit needed** (verification only). If everything passed, M1 is done.

---

## Definition of Done (M1)

- `pytest` in `backend/` passes all tests (config, health, models, security, smoke, 4 auth, 3 projects).
- Alembic migration creates `users` + `projects` in Postgres; `alembic upgrade head` is clean.
- Live: register → returns JWT; create/list projects works with the token; projects are isolated per user; unauthenticated project access is rejected.
- All work committed on `m1-auth-projects`.

---

## Self-review notes

- **Spec coverage:** users/projects tables (§8), `/auth/register`, `/auth/login`, `POST /projects`, `GET /projects` (§9), JWT + bcrypt + ownership isolation (§4 auth), Alembic (§3 tech stack). The remaining tables (documents, brand_profiles, content_history, generation_jobs) belong to later milestones and are intentionally NOT created here.
- **Test DB choice:** SQLite (StaticPool, in-memory) for unit/integration speed; Postgres via Alembic for the real schema. `users`/`projects` use only portable column types, so SQLite is faithful for M1.
- **Type consistency:** `get_session`, `Base`, `User`, `Project`, `create_access_token`/`decode_access_token`, `get_user_by_email`/`create_user`/`authenticate`, `create_project`/`list_projects`, `get_current_user`, and the `TokenResponse`/`ProjectResponse` schemas are referenced consistently across tasks.
