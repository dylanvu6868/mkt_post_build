# M0 — Scaffold & Docker Compose Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the monorepo skeleton so `docker compose up` brings up Postgres + Qdrant + a FastAPI backend (with a passing `/health` endpoint) + a Next.js frontend that displays the backend health status.

**Architecture:** Monorepo with `backend/` (FastAPI, Python 3.12) and `frontend/` (Next.js App Router + Tailwind). A root `docker-compose.yml` orchestrates four services. Postgres uses a healthcheck; the backend waits for it. The frontend calls the backend `/health` over HTTP. No business logic yet — this milestone only proves the stack boots and the pieces can talk.

**Tech Stack:** FastAPI, uvicorn, pydantic-settings, pytest, httpx, Next.js 14, React 18, TypeScript, TailwindCSS, Docker Compose, Postgres 16, Qdrant.

**Spec:** `docs/superpowers/specs/2026-06-17-ai-marketing-multiagent-design.md` (this plan covers milestone **M0** only).

---

## File Structure (created in this plan)

```
.env.example                      # template for all env vars used across milestones
docker-compose.yml                # 4 services: db, qdrant, backend, frontend
backend/
  requirements.txt                # M0 deps only (more added in later milestones)
  pyproject.toml                  # pytest config (pythonpath, testpaths)
  Dockerfile                      # python:3.12-slim image
  app/
    __init__.py
    main.py                       # FastAPI app + /health
    core/
      __init__.py
      config.py                   # Settings (pydantic-settings)
  tests/
    __init__.py
    test_config.py                # Settings loads
    test_health.py                # GET /health -> 200 ok
frontend/
  package.json
  tsconfig.json
  next.config.mjs
  postcss.config.mjs
  tailwind.config.ts
  Dockerfile                      # node:20-alpine build + start
  app/
    globals.css
    layout.tsx
    page.tsx                      # fetches backend /health, shows status
```

> **Note on env files:** `.env` (the real, git-ignored file) is created by copying `.env.example` in Task 6. `.env.example` is committed; `.env` is not (already in `.gitignore`).

---

### Task 1: Backend settings config

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py` (empty)
- Create: `backend/app/core/__init__.py` (empty)
- Create: `backend/app/core/config.py`
- Create: `backend/tests/__init__.py` (empty)
- Test: `backend/tests/test_config.py`

- [ ] **Step 1: Create `backend/requirements.txt`**

```
fastapi==0.115.5
uvicorn[standard]==0.32.1
pydantic-settings==2.6.1
python-dotenv==1.0.1
pytest==8.3.4
httpx==0.28.1
```

- [ ] **Step 2: Create `backend/pyproject.toml`**

```toml
[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]
```

- [ ] **Step 3: Create the empty package files**

Create empty files: `backend/app/__init__.py`, `backend/app/core/__init__.py`, `backend/tests/__init__.py`.

- [ ] **Step 4: Write the failing test** — `backend/tests/test_config.py`

```python
from app.core.config import Settings


def test_settings_have_sensible_defaults():
    s = Settings()
    assert s.app_name == "AI Marketing Backend"
    assert s.qdrant_url.startswith("http")
    assert s.database_url.startswith("postgresql")
    assert s.llm_provider == "openai"
```

- [ ] **Step 5: Set up the local Python env and run the test to verify it fails**

Run (from `backend/`, PowerShell):
```powershell
python -m venv .venv; .\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pytest tests/test_config.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'app.core.config'`.

- [ ] **Step 6: Write minimal implementation** — `backend/app/core/config.py`

```python
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
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_config.py -v`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/requirements.txt backend/pyproject.toml backend/app/__init__.py backend/app/core/__init__.py backend/app/core/config.py backend/tests/__init__.py backend/tests/test_config.py
git commit -m "feat(backend): add settings config with tests"
```

---

### Task 2: FastAPI app with `/health` endpoint

**Files:**
- Create: `backend/app/main.py`
- Test: `backend/tests/test_health.py`

- [ ] **Step 1: Write the failing test** — `backend/tests/test_health.py`

```python
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "AI Marketing Backend"
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `backend/`): `.\.venv\Scripts\python.exe -m pytest tests/test_health.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.main'`.

- [ ] **Step 3: Write minimal implementation** — `backend/app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `.\.venv\Scripts\python.exe -m pytest tests/ -v`
Expected: PASS (both `test_config.py` and `test_health.py`).

- [ ] **Step 5: Commit**

```bash
git add backend/app/main.py backend/tests/test_health.py
git commit -m "feat(backend): add FastAPI app with /health endpoint"
```

---

### Task 3: Backend Dockerfile

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

- [ ] **Step 1: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Create `backend/.dockerignore`**

```
.venv
__pycache__
*.pyc
.pytest_cache
tests
```

- [ ] **Step 3: Verify the image builds**

Run (from repo root): `docker build -t marketing-backend ./backend`
Expected: build succeeds, ends with `naming to docker.io/library/marketing-backend`.

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore
git commit -m "build(backend): add Dockerfile"
```

---

### Task 4: Frontend scaffold (Next.js + Tailwind)

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/next.config.mjs`
- Create: `frontend/postcss.config.mjs`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/app/globals.css`
- Create: `frontend/app/layout.tsx`
- Create: `frontend/app/page.tsx`

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.18",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "@types/node": "20.14.10",
    "@types/react": "18.3.3",
    "@types/react-dom": "18.3.0",
    "autoprefixer": "10.4.20",
    "postcss": "8.4.49",
    "tailwindcss": "3.4.15",
    "typescript": "5.6.3"
  }
}
```

- [ ] **Step 2: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `frontend/next.config.mjs`**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

- [ ] **Step 4: Create `frontend/postcss.config.mjs`**

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

- [ ] **Step 5: Create `frontend/tailwind.config.ts`**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 6: Create `frontend/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: Create `frontend/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Marketing Platform",
  description: "Multi-agent marketing content generation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Create `frontend/app/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    fetch(`${base}/health`)
      .then((r) => r.json())
      .then((d) => setStatus(d.status))
      .catch(() => setStatus("backend unreachable"));
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          AI Marketing Platform
        </h1>
        <p className="mt-2 text-gray-600">
          Backend status: <span className="font-mono">{status}</span>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 9: Verify the frontend builds**

Run (from `frontend/`):
```powershell
npm install
npm run build
```
Expected: `npm run build` completes with "Compiled successfully" / route list. (A `next-env.d.ts` is auto-generated; that is fine.)

- [ ] **Step 10: Commit**

```bash
git add frontend/package.json frontend/tsconfig.json frontend/next.config.mjs frontend/postcss.config.mjs frontend/tailwind.config.ts frontend/app/globals.css frontend/app/layout.tsx frontend/app/page.tsx
git commit -m "feat(frontend): scaffold Next.js app with health status page"
```

---

### Task 5: Frontend Dockerfile

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/.dockerignore`

- [ ] **Step 1: Create `frontend/Dockerfile`**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

- [ ] **Step 2: Create `frontend/.dockerignore`**

```
node_modules
.next
npm-debug.log
```

- [ ] **Step 3: Commit**

```bash
git add frontend/Dockerfile frontend/.dockerignore
git commit -m "build(frontend): add Dockerfile"
```

---

### Task 6: Docker Compose + env template

**Files:**
- Create: `.env.example`
- Create: `docker-compose.yml`

- [ ] **Step 1: Create `.env.example`**

```
# LLM (provider-agnostic; default OpenAI per spec)
LLM_PROVIDER=openai
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
LLM_MODEL_FAST=gpt-4o-mini
LLM_MODEL_SMART=gpt-4o

# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/marketing

# Qdrant
QDRANT_URL=http://qdrant:6333

# Auth (used from M1)
JWT_SECRET=change-me-in-prod
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

- [ ] **Step 2: Create `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: marketing
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 10

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_storage:/qdrant/storage

  backend:
    build: ./backend
    env_file: .env
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
      qdrant:
        condition: service_started

  frontend:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
  qdrant_storage:
```

- [ ] **Step 3: Create the real `.env` from the template**

Run (from repo root, PowerShell): `Copy-Item .env.example .env`
(`.env` is git-ignored; never commit it.)

- [ ] **Step 4: Bring the whole stack up and verify**

Run (from repo root):
```bash
docker compose up --build -d
docker compose ps
```
Expected: all four services listed; `db` shows `(healthy)`.

- [ ] **Step 5: Verify backend health through the running container**

Run: `curl http://localhost:8000/health`
Expected: `{"status":"ok","service":"AI Marketing Backend"}`

- [ ] **Step 6: Verify the frontend renders the backend status**

Open `http://localhost:3000` in a browser.
Expected: page shows "Backend status: ok".

- [ ] **Step 7: Verify Qdrant is reachable**

Run: `curl http://localhost:6333/healthz`
Expected: HTTP 200 (Qdrant health response).

- [ ] **Step 8: Tear down (optional) and commit**

```bash
docker compose down
git add .env.example docker-compose.yml
git commit -m "build: add docker-compose for full stack (db, qdrant, backend, frontend)"
```

---

## Definition of Done (M0)

- `docker compose up --build` brings up all four services; `db` is healthy.
- `GET http://localhost:8000/health` returns `{"status":"ok","service":"AI Marketing Backend"}`.
- `http://localhost:3000` displays "Backend status: ok".
- `GET http://localhost:6333/healthz` returns 200.
- `pytest` in `backend/` passes (2 test files).
- All work committed; `.env` is NOT committed.

---

## Roadmap (future plans — NOT part of this plan)

Each milestone gets its own spec-aligned plan when we reach it:

- **M1:** JWT auth (register/login, bcrypt) + Projects CRUD + SQLAlchemy async models + Alembic baseline.
- **M2:** Provider-agnostic LLM factory + mock + LangGraph 7-agent pipeline for Facebook Post + async job/poll.
- **M3:** RAG (upload → extract → chunk → fastembed → Qdrant → retrieve) wired into Brand Agent.
- **M4:** Brand Voice config applied to Copywriter.
- **M5:** Frontend — all 7 pages wired end-to-end; Facebook Post works against real backend.
- **M6:** Expand remaining 4 content types + README + polish.
