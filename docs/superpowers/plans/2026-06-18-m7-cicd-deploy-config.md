# M7 — CI/CD Pipeline + Production Deploy Config

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GitHub Actions CI pipeline, production-optimized Dockerfiles, a production docker-compose, configurable CORS, and security headers — making the project deploy-ready.

**Architecture:** GitHub Actions runs on every push/PR: backend pytest + frontend build + Docker build check. Dockerfiles become multi-stage (build → slim runtime). A new `docker-compose.prod.yml` overrides dev defaults with production settings. CORS origins move from hardcoded `localhost:3000` to a `Settings` field. A Starlette middleware adds security headers (X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security).

**Tech Stack:** GitHub Actions, Docker multi-stage builds, FastAPI/Starlette middleware, pydantic-settings.

## Global Constraints

- Python 3.12+, FastAPI, Pydantic v2, pytest-asyncio
- Next.js 14, Node 20, `npx shadcn@2.3.0` (NOT `@latest`)
- All backend tests must pass (75 currently)
- Frontend `npm run build` must succeed
- Docker Compose must start all 4 services
- No new Python/npm dependencies unless strictly necessary

---

## File Structure

```
.github/
  workflows/
    ci.yml                             # CREATE: GitHub Actions CI pipeline

backend/
  Dockerfile                           # MODIFY: multi-stage build
  .dockerignore                        # MODIFY: tighten exclusions
  app/
    core/
      config.py                        # MODIFY: add cors_origins, environment settings
    main.py                            # MODIFY: configurable CORS + security headers middleware

frontend/
  Dockerfile                           # MODIFY: multi-stage build
  .dockerignore                        # MODIFY: tighten exclusions
  next.config.mjs                      # MODIFY: add output: "standalone"

docker-compose.prod.yml                # CREATE: production overrides
```

---

### Task 1: GitHub Actions CI pipeline

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `backend/requirements.txt`, `frontend/package.json`, existing pytest suite, existing `npm run build`
- Produces: CI pipeline that runs on push/PR to `main`, testing backend (pytest) and frontend (build) in parallel, plus a Docker build check

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
          cache-dependency-path: backend/requirements.txt

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run tests
        run: python -m pytest tests/ -v --tb=short

  frontend-build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

  docker-build:
    runs-on: ubuntu-latest
    needs: [backend-test, frontend-build]
    steps:
      - uses: actions/checkout@v4

      - name: Build backend image
        run: docker build -t mkt-backend ./backend

      - name: Build frontend image
        run: docker build -t mkt-frontend ./frontend
```

- [ ] **Step 2: Verify file structure**

Run (PowerShell): `Test-Path .github/workflows/ci.yml`
Expected: `True`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions pipeline (test + build + docker)"
```

---

### Task 2: Multi-stage Dockerfiles + tightened .dockerignore

**Files:**
- Modify: `backend/Dockerfile`
- Modify: `backend/.dockerignore`
- Modify: `frontend/Dockerfile`
- Modify: `frontend/.dockerignore`
- Modify: `frontend/next.config.mjs`

**Interfaces:**
- Consumes: existing Dockerfiles, existing `.dockerignore` files
- Produces: optimized images — backend ~150MB slimmer (no pip cache, no build tools), frontend uses standalone output (no node_modules in runtime)

- [ ] **Step 1: Replace `backend/Dockerfile` with multi-stage build**

```dockerfile
# ---- build stage ----
FROM python:3.12-slim AS builder

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---- runtime stage ----
FROM python:3.12-slim

WORKDIR /app

COPY --from=builder /install /usr/local

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Update `backend/.dockerignore`**

```
.venv
__pycache__
*.pyc
.pytest_cache
tests
.git
.env
*.md
```

- [ ] **Step 3: Enable standalone output in `frontend/next.config.mjs`**

Read `frontend/next.config.mjs` first. Then set `output: "standalone"`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 4: Replace `frontend/Dockerfile` with multi-stage build**

```dockerfile
# ---- build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime stage ----
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

- [ ] **Step 5: Update `frontend/.dockerignore`**

```
node_modules
.next
npm-debug.log
.git
*.md
```

- [ ] **Step 6: Verify Docker builds locally**

Run (PowerShell):
```powershell
docker build -t mkt-backend ./backend
docker build -t mkt-frontend ./frontend
```
Expected: Both build successfully.

- [ ] **Step 7: Verify existing `docker compose up` still works**

Run (PowerShell):
```powershell
docker compose up --build -d
docker compose ps
```
Expected: All 4 services Up.

- [ ] **Step 8: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore frontend/Dockerfile frontend/.dockerignore frontend/next.config.mjs
git commit -m "build: multi-stage Dockerfiles + standalone Next.js output"
```

---

### Task 3: Configurable CORS + security headers + production compose

**Files:**
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/main.py`
- Modify: `backend/tests/test_smoke_async.py`
- Create: `docker-compose.prod.yml`
- Modify: `.env.example`

**Interfaces:**
- Consumes: existing `Settings` class, existing `app` FastAPI instance, existing `docker-compose.yml`
- Produces: `Settings.cors_origins` (comma-separated string, default `http://localhost:3000`), `Settings.environment` (dev/production), security headers middleware, production compose overrides

- [ ] **Step 1: Add `cors_origins` and `environment` to `backend/app/core/config.py`**

Add two new fields to the `Settings` class after `app_name`:

```python
    environment: str = "development"
    cors_origins: str = "http://localhost:3000"
```

- [ ] **Step 2: Update `backend/app/main.py`** — configurable CORS + security headers

Replace the entire file:

```python
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api import auth, brand, documents, generate, history, projects
from app.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
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
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SecurityHeadersMiddleware)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(documents.router)
app.include_router(brand.router)
app.include_router(generate.router)
app.include_router(history.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}
```

- [ ] **Step 3: Write test for security headers**

Append to `backend/tests/test_smoke_async.py`:

```python
@pytest.mark.asyncio
async def test_health_returns_security_headers(client):
    resp = await client.get("/health")
    assert resp.headers["x-content-type-options"] == "nosniff"
    assert resp.headers["x-frame-options"] == "DENY"
    assert resp.headers["x-xss-protection"] == "1; mode=block"
```

- [ ] **Step 4: Run tests**

Run (PowerShell): `.\.venv\Scripts\python.exe -m pytest tests/test_smoke_async.py -v`
Expected: PASS

- [ ] **Step 5: Create `docker-compose.prod.yml`**

```yaml
services:
  db:
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-marketing}

  qdrant:
    restart: unless-stopped

  backend:
    restart: unless-stopped
    environment:
      ENVIRONMENT: production
      CORS_ORIGINS: ${CORS_ORIGINS:-https://yourdomain.com}
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  frontend:
    restart: unless-stopped
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-https://api.yourdomain.com}
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

Usage: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`

- [ ] **Step 6: Update `.env.example`** — add new settings

Append to `.env.example`:

```
# Application environment (development | production)
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000

# Production database (override for docker-compose.prod.yml)
# POSTGRES_USER=postgres
# POSTGRES_PASSWORD=strong-password-here
# POSTGRES_DB=marketing
```

- [ ] **Step 7: Run full backend test suite**

Run (PowerShell): `.\.venv\Scripts\python.exe -m pytest tests/ -v`
Expected: All tests PASS (76 — 75 existing + 1 new security headers test).

- [ ] **Step 8: Verify Docker dev stack still works**

Run (PowerShell):
```powershell
docker compose up --build -d
docker compose ps
```
Expected: All 4 services Up.

- [ ] **Step 9: Commit**

```bash
git add backend/app/core/config.py backend/app/main.py \
  backend/tests/test_smoke_async.py docker-compose.prod.yml .env.example
git commit -m "feat: configurable CORS + security headers + production docker-compose"
```

---

## Definition of Done (M7)

- GitHub Actions CI pipeline runs backend tests, frontend build, and Docker build on push/PR to `main`
- Backend Dockerfile is multi-stage (build + runtime), no pip cache in final image
- Frontend Dockerfile is multi-stage with standalone Next.js output
- `docker-compose.prod.yml` provides production overrides (restart policies, health checks, env-configurable DB credentials)
- CORS origins configurable via `CORS_ORIGINS` env var (comma-separated)
- Security headers added: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, HSTS (production only)
- Swagger/ReDoc disabled in production mode
- All backend tests pass (76+)
- Frontend build succeeds
- Docker dev stack still works

## Self-review notes

- **Spec coverage:** CI (GitHub Actions test + build + docker) ✓, multi-stage Dockerfiles (backend + frontend) ✓, docker-compose.prod.yml ✓, CORS configuration ✓, security headers ✓, health checks (backend + frontend in prod compose) ✓
- **No placeholders:** every step has complete code
- **Type consistency:** `Settings.cors_origins` is `str` (comma-separated), parsed in `main.py` via `.split(",")`. `Settings.environment` is `str`, compared to `"production"` in middleware and docs_url. Both consistent across files.
