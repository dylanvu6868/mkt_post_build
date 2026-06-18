# M5 — Frontend + History API

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete frontend (7 pages wired end-to-end against the real backend) and the backend History API, so a user can register, create a project, upload docs, configure brand voice, generate a Facebook Post, and view/delete past generations — all through the browser.

**Architecture:** Next.js 14 App Router with shadcn/ui components, Zustand for auth/project state, TanStack Query for server data + polling. An API client module wraps fetch with JWT injection. All pages except login are protected by an auth guard component. Dark/light theme toggle via next-themes + shadcn's theme provider. The backend adds a `content_history` table and two endpoints (`GET /history`, `DELETE /history/{id}`); the generation service auto-saves completed jobs to history.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS 3, shadcn/ui, Zustand, @tanstack/react-query, next-themes, sonner, FastAPI, SQLAlchemy 2.0 async, Alembic, Pydantic v2, pytest-asyncio.

**Spec:** `docs/superpowers/specs/2026-06-17-ai-marketing-multiagent-design.md` §8 content_history table, §9 `/history` endpoints, §10 Frontend Pages. M0–M4 merged on `main`.

## Global Constraints

- Next.js 14 App Router (`app/` directory, `"use client"` where needed)
- `@/*` path alias maps to the `frontend/` root (already in tsconfig)
- shadcn/ui components installed via `npx shadcn@latest init` and `npx shadcn@latest add <component>`
- All API calls go through a single `services/api.ts` module that injects the JWT from Zustand
- Backend API base URL from `NEXT_PUBLIC_API_URL` env var (default `http://localhost:8000`)
- Ownership enforcement on all backend endpoints (existing pattern)
- Mock mode is the default for backend tests — no external service calls
- JSONB on Postgres, portable JSON on SQLite (tests)

---

## File Structure

```
backend/
  app/
    models/
      content_history.py              # CREATE: ContentHistory model
      __init__.py                     # MODIFY: register ContentHistory
    schemas/
      history.py                      # CREATE: HistoryResponse
    services/
      history_service.py              # CREATE: list_history, delete_history, save_to_history
      generation_service.py           # MODIFY: call save_to_history on job completion
    api/
      history.py                      # CREATE: GET /history, DELETE /history/{id}
    main.py                           # MODIFY: include history router
  alembic/
    versions/<hash>_add_content_history.py  # CREATE via autogenerate
  tests/
    test_history.py                   # CREATE: history API tests

frontend/
  services/
    api.ts                            # CREATE: fetch wrapper with JWT
  store/
    auth.ts                           # CREATE: Zustand auth store (token, user, login/register/logout)
    project.ts                        # CREATE: Zustand active-project store
  hooks/
    use-projects.ts                   # CREATE: TanStack Query hooks for projects
    use-documents.ts                  # CREATE: TanStack Query hooks for documents
    use-brand.ts                      # CREATE: TanStack Query hooks for brand profile
    use-generate.ts                   # CREATE: TanStack Query hooks for generate + poll
    use-history.ts                    # CREATE: TanStack Query hooks for history
  components/
    ui/                               # CREATE: shadcn components (button, input, card, etc.)
    auth-guard.tsx                    # CREATE: redirect to /login if not authenticated
    sidebar.tsx                       # CREATE: navigation sidebar
    theme-provider.tsx                # CREATE: next-themes provider
    theme-toggle.tsx                  # CREATE: dark/light mode toggle button
    providers.tsx                     # CREATE: QueryClient + ThemeProvider + Toaster
  app/
    layout.tsx                        # MODIFY: add providers
    page.tsx                          # MODIFY: redirect to /dashboard or /login
    globals.css                       # MODIFY: shadcn CSS variables for dark/light
    login/
      page.tsx                        # CREATE: register + login forms
    (app)/
      layout.tsx                      # CREATE: authenticated layout with sidebar
      dashboard/
        page.tsx                      # CREATE: overview + recent activity
      projects/
        page.tsx                      # CREATE: create/list projects, select active
      knowledge-base/
        page.tsx                      # CREATE: upload/list documents
      brand-voice/
        page.tsx                      # CREATE: configure brand profile
      generate/
        page.tsx                      # CREATE: content generator with progress polling
      history/
        page.tsx                      # CREATE: list/view/delete past generations
  package.json                        # MODIFY: add dependencies
  tailwind.config.ts                  # MODIFY: shadcn preset + darkMode
  components.json                     # CREATE: shadcn config (via init)
```

---

### Task 1: Backend History API (model + service + endpoints + tests + migration)

**Files:**
- Create: `backend/app/models/content_history.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/app/schemas/history.py`
- Create: `backend/app/services/history_service.py`
- Modify: `backend/app/services/generation_service.py`
- Create: `backend/app/api/history.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_history.py`
- Create: `backend/alembic/versions/<hash>_add_content_history.py` (via autogenerate)

**Interfaces:**
- Consumes: `get_current_user` (auth dependency), `get_session` (DB session), `Project` model, `GenerationJob` model
- Produces: `GET /history?project_id=N` → `list[HistoryResponse]`, `DELETE /history/{id}` → `204`, `save_to_history(session, job)` called by generation_service on completion

- [ ] **Step 1: Write failing tests** — `backend/tests/test_history.py`

```python
from unittest.mock import patch


async def _register(client, email="hist@example.com"):
    resp = await client.post(
        "/auth/register",
        json={"name": "Hist", "email": email, "password": "secret123"},
    )
    return resp.json()["access_token"]


async def _project(client, headers):
    resp = await client.post(
        "/projects", json={"name": "Hist Project"}, headers=headers
    )
    return resp.json()["id"]


async def test_history_requires_auth(client):
    resp = await client.get("/history?project_id=1")
    assert resp.status_code in (401, 403)


@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_history_populated_after_generate(mock_embed, mock_retrieve, client):
    token = await _register(client)
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)

    # Generate a post
    start = await client.post(
        "/generate",
        json={
            "project_id": project_id,
            "content_type": "facebook_post",
            "brief": "test history",
            "marketing_goal": "awareness",
        },
        headers=headers,
    )
    assert start.status_code == 202

    # Poll until done
    job_id = start.json()["job_id"]
    poll = await client.get(f"/generate/{job_id}", headers=headers)
    assert poll.json()["status"] == "done"

    # History should have one entry
    hist = await client.get(f"/history?project_id={project_id}", headers=headers)
    assert hist.status_code == 200
    items = hist.json()
    assert len(items) == 1
    assert items[0]["content_type"] == "facebook_post"
    assert items[0]["prompt"] == "test history"
    assert items[0]["output"] is not None
    assert items[0]["project_id"] == project_id


@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_delete_history_item(mock_embed, mock_retrieve, client):
    token = await _register(client, "del@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)

    # Generate
    start = await client.post(
        "/generate",
        json={
            "project_id": project_id,
            "content_type": "facebook_post",
            "brief": "to delete",
            "marketing_goal": "awareness",
        },
        headers=headers,
    )
    job_id = start.json()["job_id"]
    await client.get(f"/generate/{job_id}", headers=headers)

    # Get history
    hist = await client.get(f"/history?project_id={project_id}", headers=headers)
    item_id = hist.json()[0]["id"]

    # Delete
    del_resp = await client.delete(f"/history/{item_id}", headers=headers)
    assert del_resp.status_code == 204

    # History should be empty
    hist2 = await client.get(f"/history?project_id={project_id}", headers=headers)
    assert len(hist2.json()) == 0


async def test_history_rejects_other_users_project(client):
    token_a = await _register(client, "ha@example.com")
    project_a = await _project(client, {"Authorization": f"Bearer {token_a}"})
    token_b = await _register(client, "hb@example.com")

    resp = await client.get(
        f"/history?project_id={project_a}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 404
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_history.py -v`
Expected: FAIL — 404/405 on `/history`.

- [ ] **Step 3: Create `backend/app/models/content_history.py`**

```python
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class ContentHistory(Base):
    __tablename__ = "content_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    content_type: Mapped[str] = mapped_column(String(50))
    prompt: Mapped[str] = mapped_column(Text)
    output: Mapped[dict[str, Any] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

- [ ] **Step 4: Modify `backend/app/models/__init__.py`** — add ContentHistory import

```python
from app.models.brand_profile import BrandProfile
from app.models.content_history import ContentHistory
from app.models.document import Document
from app.models.generation_job import GenerationJob
from app.models.project import Project
from app.models.user import User

__all__ = ["BrandProfile", "ContentHistory", "Document", "GenerationJob", "Project", "User"]
```

- [ ] **Step 5: Create `backend/app/schemas/history.py`**

```python
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class HistoryResponse(BaseModel):
    id: int
    project_id: int
    content_type: str
    prompt: str
    output: dict[str, Any] | None = None
    score: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 6: Create `backend/app/services/history_service.py`**

```python
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content_history import ContentHistory
from app.models.project import Project


async def save_to_history(
    session: AsyncSession,
    project_id: int,
    content_type: str,
    prompt: str,
    output: dict[str, Any],
    score: float | None = None,
) -> ContentHistory:
    entry = ContentHistory(
        project_id=project_id,
        content_type=content_type,
        prompt=prompt,
        output=output,
        score=score,
    )
    session.add(entry)
    await session.commit()
    await session.refresh(entry)
    return entry


async def list_history(
    session: AsyncSession, project_id: int, user_id: int
) -> list[ContentHistory]:
    result = await session.execute(
        select(ContentHistory)
        .join(Project, ContentHistory.project_id == Project.id)
        .where(ContentHistory.project_id == project_id, Project.user_id == user_id)
        .order_by(ContentHistory.created_at.desc())
    )
    return list(result.scalars().all())


async def delete_history(
    session: AsyncSession, history_id: int, user_id: int
) -> bool:
    result = await session.execute(
        select(ContentHistory)
        .join(Project, ContentHistory.project_id == Project.id)
        .where(ContentHistory.id == history_id, Project.user_id == user_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        return False
    await session.delete(entry)
    await session.commit()
    return True
```

- [ ] **Step 7: Modify `backend/app/services/generation_service.py`** — add history save on job completion

The full modified `run_generation_job` function:

```python
async def run_generation_job(
    session_maker: async_sessionmaker[AsyncSession],
    job_id: int,
    initial_state: dict[str, Any],
) -> None:
    """Background entrypoint: run the graph, stream progress, persist result."""
    graph = build_graph()

    async with session_maker() as session:
        job = await session.get(GenerationJob, job_id)
        if job is None:
            return
        job.status = "running"
        await session.commit()

    state: dict[str, Any] = dict(initial_state)
    try:
        async for update in graph.astream(initial_state, stream_mode="updates"):
            for node, delta in update.items():
                for key, value in (delta or {}).items():
                    if key == "errors":
                        state.setdefault("errors", [])
                        state["errors"].extend(value)
                    else:
                        state[key] = value
                await _set_step(session_maker, job_id, node)

        result = {key: state.get(key) for key in _RESULT_KEYS}
        async with session_maker() as session:
            job = await session.get(GenerationJob, job_id)
            if job is not None:
                job.status = "done"
                job.result_json = result
                await session.commit()

            review = result.get("review") or {}
            score = review.get("score") if isinstance(review, dict) else None
            await history_service.save_to_history(
                session,
                initial_state["project_id"],
                initial_state["content_type"],
                initial_state["brief"],
                result,
                score=score,
            )
    except Exception as exc:  # noqa: BLE001
        async with session_maker() as session:
            job = await session.get(GenerationJob, job_id)
            if job is not None:
                job.status = "error"
                job.error = str(exc)
                await session.commit()
```

Add import at the top of the file:

```python
from app.services import history_service
```

- [ ] **Step 8: Create `backend/app/api/history.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.project import Project
from app.models.user import User
from app.schemas.history import HistoryResponse
from app.services import history_service

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=list[HistoryResponse])
async def list_history(
    project_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[HistoryResponse]:
    project = await session.get(Project, project_id)
    if project is None or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    items = await history_service.list_history(session, project_id, current_user.id)
    return [HistoryResponse.model_validate(i) for i in items]


@router.delete("/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_history_item(
    history_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    deleted = await history_service.delete_history(session, history_id, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History item not found",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

- [ ] **Step 9: Modify `backend/app/main.py`** — add history router

```python
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
```

- [ ] **Step 10: Run the full backend test suite**

Run: `.\.venv\Scripts\python.exe -m pytest tests/ -v`
Expected: All existing M0–M4 tests PASS plus new history tests PASS.

- [ ] **Step 11: Autogenerate Alembic migration for content_history**

```powershell
docker compose up -d db
$env:DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/marketing"
cd E:\product\mkt_post_build\backend
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\alembic.exe revision --autogenerate -m "add content_history"
.\.venv\Scripts\alembic.exe upgrade head
```

Verify: migration creates only `content_history` table with columns: `id, project_id (FK), content_type, prompt, output (JSONB), score (Float), created_at`. downgrade drops it.

- [ ] **Step 12: Commit**

```bash
git add backend/app/models/content_history.py backend/app/models/__init__.py \
  backend/app/schemas/history.py backend/app/services/history_service.py \
  backend/app/services/generation_service.py backend/app/api/history.py \
  backend/app/main.py backend/tests/test_history.py \
  backend/alembic/versions/
git commit -m "feat(backend): add content_history model + GET/DELETE /history endpoints"
```

---

### Task 2: Frontend scaffolding — dependencies, API client, stores, providers, auth guard, layout

**Files:**
- Modify: `frontend/package.json` (add deps)
- Modify: `frontend/tailwind.config.ts` (shadcn + darkMode)
- Modify: `frontend/app/globals.css` (shadcn CSS variables)
- Create: `frontend/components.json` (via shadcn init)
- Create: `frontend/lib/utils.ts` (cn utility — created by shadcn init)
- Create: `frontend/services/api.ts`
- Create: `frontend/store/auth.ts`
- Create: `frontend/store/project.ts`
- Create: `frontend/components/theme-provider.tsx`
- Create: `frontend/components/theme-toggle.tsx`
- Create: `frontend/components/auth-guard.tsx`
- Create: `frontend/components/sidebar.tsx`
- Create: `frontend/components/providers.tsx`
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/page.tsx`
- Install shadcn components: button, input, card, label, select, textarea, badge, dropdown-menu, separator, tabs, dialog

**Interfaces:**
- Produces: `api` client (`services/api.ts`), `useAuthStore` (Zustand), `useProjectStore` (Zustand), `<Providers>` wrapper, `<AuthGuard>` wrapper, `<Sidebar>` nav, `<ThemeToggle>` button

- [ ] **Step 1: Install npm dependencies**

```powershell
cd E:\product\mkt_post_build\frontend
npm install zustand @tanstack/react-query next-themes sonner
```

- [ ] **Step 2: Initialize shadcn/ui**

```powershell
npx shadcn@latest init -d
```

This creates `components.json`, `lib/utils.ts`, updates `tailwind.config.ts` and `globals.css`. Select: TypeScript, style "default", base color "neutral", CSS variables YES.

- [ ] **Step 3: Install shadcn components**

```powershell
npx shadcn@latest add button input card label select textarea badge dropdown-menu separator tabs dialog
```

- [ ] **Step 4: Update `frontend/tailwind.config.ts`** for dark mode

After shadcn init, ensure `darkMode: "class"` is present in the config (shadcn init should add it, but verify).

- [ ] **Step 5: Update `frontend/app/globals.css`** for dark/light theme

shadcn init writes the CSS variables. Verify both `:root` and `.dark` sections exist. If not, ensure they are present with shadcn's default neutral palette.

- [ ] **Step 6: Create `frontend/services/api.ts`**

```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
```

- [ ] **Step 7: Create `frontend/store/auth.ts`**

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/services/api";

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,

      login: async (email, password) => {
        const data = await api.post<{
          access_token: string;
          user: User;
        }>("/auth/login", { email, password });
        set({ token: data.access_token, user: data.user });
      },

      register: async (name, email, password) => {
        const data = await api.post<{
          access_token: string;
          user: User;
        }>("/auth/register", { name, email, password });
        set({ token: data.access_token, user: data.user });
      },

      logout: () => set({ token: null, user: null }),
    }),
    { name: "auth-storage" },
  ),
);
```

- [ ] **Step 8: Create `frontend/store/project.ts`**

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Project {
  id: number;
  name: string;
  created_at: string;
}

interface ProjectState {
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      activeProject: null,
      setActiveProject: (project) => set({ activeProject: project }),
    }),
    { name: "project-storage" },
  ),
);
```

- [ ] **Step 9: Create `frontend/components/theme-provider.tsx`**

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 10: Create `frontend/components/theme-toggle.tsx`**

```tsx
"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </Button>
  );
}
```

- [ ] **Step 11: Create `frontend/components/auth-guard.tsx`**

```tsx
"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  useEffect(() => {
    if (!token) router.replace("/login");
  }, [token, router]);

  if (!token) return null;
  return <>{children}</>;
}
```

- [ ] **Step 12: Create `frontend/components/sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useProjectStore } from "@/store/project";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/knowledge-base", label: "Knowledge Base" },
  { href: "/brand-voice", label: "Brand Voice" },
  { href: "/generate", label: "Generate" },
  { href: "/history", label: "History" },
];

export function Sidebar() {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const activeProject = useProjectStore((s) => s.activeProject);

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card p-4">
      <div className="mb-6">
        <h1 className="text-lg font-bold">AI Marketing</h1>
        {activeProject && (
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {activeProject.name}
          </p>
        )}
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm transition-colors",
              pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto space-y-2 border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate">
            {user?.email}
          </span>
          <ThemeToggle />
        </div>
        <button
          onClick={logout}
          className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 13: Create `frontend/components/providers.tsx`**

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 14: Modify `frontend/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

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
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 15: Modify `frontend/app/page.tsx`** — redirect to dashboard or login

```tsx
"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  useEffect(() => {
    router.replace(token ? "/dashboard" : "/login");
  }, [token, router]);

  return null;
}
```

- [ ] **Step 16: Verify build passes**

```powershell
cd E:\product\mkt_post_build\frontend
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 17: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): scaffold shadcn/ui, API client, stores, providers, auth guard, sidebar"
```

---

### Task 3: Login page

**Files:**
- Create: `frontend/app/login/page.tsx`

**Interfaces:**
- Consumes: `useAuthStore.login()`, `useAuthStore.register()` from `store/auth.ts`, `ApiError` from `services/api.ts`

- [ ] **Step 1: Create `frontend/app/login/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError } from "@/services/api";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuthStore();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
      router.push("/dashboard");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Login failed",
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    try {
      await register(regName, regEmail, regPassword);
      router.push("/dashboard");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Registration failed",
      );
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">AI Marketing Platform</CardTitle>
          <CardDescription>
            Sign in or create an account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loginLoading}>
                  {loginLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Name</Label>
                  <Input
                    id="reg-name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={regLoading}>
                  {regLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

```powershell
cd E:\product\mkt_post_build\frontend
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/login/
git commit -m "feat(frontend): add login/register page"
```

---

### Task 4: Dashboard + Projects pages + TanStack Query hooks

**Files:**
- Create: `frontend/hooks/use-projects.ts`
- Create: `frontend/hooks/use-history.ts`
- Create: `frontend/app/(app)/layout.tsx`
- Create: `frontend/app/(app)/dashboard/page.tsx`
- Create: `frontend/app/(app)/projects/page.tsx`

**Interfaces:**
- Consumes: `api` from `services/api.ts`, `useProjectStore` from `store/project.ts`, `<AuthGuard>`, `<Sidebar>`
- Produces: `useProjects()`, `useCreateProject()` hooks, `useHistory()`, `useDeleteHistory()` hooks

- [ ] **Step 1: Create `frontend/hooks/use-projects.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

interface Project {
  id: number;
  name: string;
  created_at: string;
}

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => api.get("/projects"),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.post<Project>("/projects", { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}
```

- [ ] **Step 2: Create `frontend/hooks/use-history.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

interface HistoryItem {
  id: number;
  project_id: number;
  content_type: string;
  prompt: string;
  output: Record<string, unknown> | null;
  score: number | null;
  created_at: string;
}

export function useHistory(projectId: number | undefined) {
  return useQuery<HistoryItem[]>({
    queryKey: ["history", projectId],
    queryFn: () => api.get(`/history?project_id=${projectId}`),
    enabled: !!projectId,
  });
}

export function useDeleteHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (historyId: number) =>
      api.delete(`/history/${historyId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["history"] }),
  });
}
```

- [ ] **Step 3: Create shared authenticated layout `frontend/app/(app)/layout.tsx`**

```tsx
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { Sidebar } from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </AuthGuard>
  );
}
```

- [ ] **Step 4: Create `frontend/app/(app)/dashboard/page.tsx`**

```tsx
"use client";

import { useProjectStore } from "@/store/project";
import { useHistory } from "@/hooks/use-history";
import { useProjects } from "@/hooks/use-projects";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { data: projects } = useProjects();
  const { data: history } = useHistory(activeProject?.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total Projects</CardDescription>
            <CardTitle className="text-3xl">{projects?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active Project</CardDescription>
            <CardTitle className="text-lg truncate">
              {activeProject?.name ?? "None selected"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Generated Content</CardDescription>
            <CardTitle className="text-3xl">{history?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {activeProject && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest generations for {activeProject.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!history?.length ? (
              <p className="text-sm text-muted-foreground">
                No content generated yet. Go to Generate to create your first post.
              </p>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.prompt}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.content_type} &middot;{" "}
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {item.score !== null && (
                      <span className="text-sm font-mono">
                        {item.score}/10
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create `frontend/app/(app)/projects/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useProjects, useCreateProject } from "@/hooks/use-projects";
import { useProjectStore } from "@/store/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const { activeProject, setActiveProject } = useProjectStore();
  const [name, setName] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const project = await createProject.mutateAsync(name.trim());
      setActiveProject(project);
      setName("");
      toast.success("Project created");
    } catch {
      toast.error("Failed to create project");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Projects</h1>

      <Card>
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-2">
            <Input
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="max-w-sm"
            />
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? "Creating..." : "Create"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <p className="text-muted-foreground">Loading projects...</p>
        )}
        {projects?.map((project) => (
          <Card
            key={project.id}
            className={
              activeProject?.id === project.id ? "border-primary" : ""
            }
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">{project.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {new Date(project.created_at).toLocaleDateString()}
                </p>
              </div>
              {activeProject?.id === project.id ? (
                <Badge>Active</Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveProject(project)}
                >
                  Select
                </Button>
              )}
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify build**

```powershell
cd E:\product\mkt_post_build\frontend
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add dashboard + projects pages with TanStack Query hooks"
```

---

### Task 5: Knowledge Base + Brand Voice pages

**Files:**
- Create: `frontend/hooks/use-documents.ts`
- Create: `frontend/hooks/use-brand.ts`
- Create: `frontend/app/(app)/knowledge-base/page.tsx`
- Create: `frontend/app/(app)/brand-voice/page.tsx`

**Interfaces:**
- Consumes: `api`, `useProjectStore`, shadcn components
- Produces: `useDocuments()`, `useUploadDocument()`, `useBrandProfile()`, `useUpsertBrand()` hooks

- [ ] **Step 1: Create `frontend/hooks/use-documents.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

interface Document {
  id: number;
  project_id: number;
  filename: string;
  status: string;
  created_at: string;
}

export function useDocuments(projectId: number | undefined) {
  return useQuery<Document[]>({
    queryKey: ["documents", projectId],
    queryFn: () => api.get(`/documents?project_id=${projectId}`),
    enabled: !!projectId,
    refetchInterval: 5000,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, file }: { projectId: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post<Document>(
        `/documents/upload?project_id=${projectId}`,
        formData,
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });
}
```

- [ ] **Step 2: Create `frontend/hooks/use-brand.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

interface BrandProfile {
  id: number;
  project_id: number;
  brand_name: string;
  tone: string;
  writing_style: string;
  preferred_words: string[];
  forbidden_words: string[];
}

interface BrandProfileUpsert {
  project_id: number;
  brand_name: string;
  tone: string;
  writing_style: string;
  preferred_words: string[];
  forbidden_words: string[];
}

export function useBrandProfile(projectId: number | undefined) {
  return useQuery<BrandProfile>({
    queryKey: ["brand-profile", projectId],
    queryFn: () => api.get(`/brand-profile?project_id=${projectId}`),
    enabled: !!projectId,
    retry: false,
  });
}

export function useUpsertBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BrandProfileUpsert) =>
      api.post<BrandProfile>("/brand-profile", data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["brand-profile"] }),
  });
}
```

- [ ] **Step 3: Create `frontend/app/(app)/knowledge-base/page.tsx`**

```tsx
"use client";

import { useRef } from "react";
import { useProjectStore } from "@/store/project";
import { useDocuments, useUploadDocument } from "@/hooks/use-documents";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function KnowledgeBasePage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { data: documents, isLoading } = useDocuments(activeProject?.id);
  const upload = useUploadDocument();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProject) return;
    try {
      await upload.mutateAsync({ projectId: activeProject.id, file });
      toast.success("Document uploaded");
    } catch {
      toast.error("Upload failed");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Select a project first from the Projects page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
          >
            {upload.isPending ? "Uploading..." : "Upload Document"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            Upload PDF, DOCX, or TXT files for brand context
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
          {!isLoading && !documents?.length && (
            <p className="text-sm text-muted-foreground">
              No documents uploaded yet.
            </p>
          )}
          {documents && documents.length > 0 && (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <span className="text-sm">{doc.filename}</span>
                  <Badge
                    variant={doc.status === "done" ? "default" : "secondary"}
                  >
                    {doc.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/app/(app)/brand-voice/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useProjectStore } from "@/store/project";
import { useBrandProfile, useUpsertBrand } from "@/hooks/use-brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function BrandVoicePage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { data: profile, isLoading } = useBrandProfile(activeProject?.id);
  const upsert = useUpsertBrand();

  const [brandName, setBrandName] = useState("");
  const [tone, setTone] = useState("");
  const [writingStyle, setWritingStyle] = useState("");
  const [preferredWords, setPreferredWords] = useState("");
  const [forbiddenWords, setForbiddenWords] = useState("");

  useEffect(() => {
    if (profile) {
      setBrandName(profile.brand_name);
      setTone(profile.tone);
      setWritingStyle(profile.writing_style);
      setPreferredWords(profile.preferred_words.join(", "));
      setForbiddenWords(profile.forbidden_words.join(", "));
    }
  }, [profile]);

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Brand Voice</h1>
        <p className="text-muted-foreground">
          Select a project first from the Projects page.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsert.mutateAsync({
        project_id: activeProject.id,
        brand_name: brandName,
        tone,
        writing_style: writingStyle,
        preferred_words: preferredWords
          .split(",")
          .map((w) => w.trim())
          .filter(Boolean),
        forbidden_words: forbiddenWords
          .split(",")
          .map((w) => w.trim())
          .filter(Boolean),
      });
      toast.success("Brand voice saved");
    } catch {
      toast.error("Failed to save brand voice");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Brand Voice</h1>

      <Card>
        <CardHeader>
          <CardTitle>Configure Brand Profile</CardTitle>
          <CardDescription>
            Define your brand's tone and style for generated content
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <Label htmlFor="brand-name">Brand Name</Label>
                <Input
                  id="brand-name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. EcoBottle"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Input
                  id="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="e.g. friendly, professional, bold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="style">Writing Style</Label>
                <Input
                  id="style"
                  value={writingStyle}
                  onChange={(e) => setWritingStyle(e.target.value)}
                  placeholder="e.g. conversational, formal, casual"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferred">
                  Preferred Words (comma-separated)
                </Label>
                <Input
                  id="preferred"
                  value={preferredWords}
                  onChange={(e) => setPreferredWords(e.target.value)}
                  placeholder="e.g. sustainable, premium, innovative"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="forbidden">
                  Forbidden Words (comma-separated)
                </Label>
                <Input
                  id="forbidden"
                  value={forbiddenWords}
                  onChange={(e) => setForbiddenWords(e.target.value)}
                  placeholder="e.g. cheap, basic, generic"
                />
              </div>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? "Saving..." : "Save Brand Voice"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

```powershell
cd E:\product\mkt_post_build\frontend
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add knowledge-base + brand-voice pages"
```

---

### Task 6: Content Generator page (generate + poll per-agent progress)

**Files:**
- Create: `frontend/hooks/use-generate.ts`
- Create: `frontend/app/(app)/generate/page.tsx`

**Interfaces:**
- Consumes: `api`, `useProjectStore`, shadcn components
- Produces: `useGenerate()` hook with start/reset/polling

- [ ] **Step 1: Create `frontend/hooks/use-generate.ts`**

```typescript
import { useState, useCallback } from "react";
import { api } from "@/services/api";

interface JobStatus {
  id: number;
  status: "queued" | "running" | "done" | "error";
  current_step: string | null;
  result: Record<string, unknown> | null;
  error: string | null;
}

export function useGenerate() {
  const [jobId, setJobId] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [polling, setPolling] = useState(false);

  const start = useCallback(
    async (payload: {
      project_id: number;
      content_type: string;
      brief: string;
      marketing_goal: string;
    }) => {
      setJobStatus(null);
      const data = await api.post<{ job_id: number; status: string }>(
        "/generate",
        payload,
      );
      setJobId(data.job_id);
      setPolling(true);

      const poll = async () => {
        const status = await api.get<JobStatus>(`/generate/${data.job_id}`);
        setJobStatus(status);
        if (status.status === "done" || status.status === "error") {
          setPolling(false);
          return;
        }
        setTimeout(poll, 1000);
      };
      poll();
    },
    [],
  );

  const reset = useCallback(() => {
    setJobId(null);
    setJobStatus(null);
    setPolling(false);
  }, []);

  return { start, jobId, jobStatus, polling, reset };
}
```

- [ ] **Step 2: Create `frontend/app/(app)/generate/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/project";
import { useGenerate } from "@/hooks/use-generate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const AGENT_STEPS = [
  "planner",
  "research",
  "seo",
  "brand",
  "fusion",
  "copywriter",
  "reviewer",
];

export default function GeneratePage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { start, jobStatus, polling, reset } = useGenerate();

  const [brief, setBrief] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Content Generator</h1>
        <p className="text-muted-foreground">
          Select a project first from the Projects page.
        </p>
      </div>
    );
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brief.trim()) return;
    setLoading(true);
    try {
      await start({
        project_id: activeProject.id,
        content_type: "facebook_post",
        brief: brief.trim(),
        marketing_goal: goal.trim(),
      });
    } catch {
      toast.error("Failed to start generation");
    } finally {
      setLoading(false);
    }
  };

  const draft = jobStatus?.result?.draft as
    | { hook?: string; body?: string; cta?: string; hashtags?: string[] }
    | undefined;

  const review = jobStatus?.result?.review as
    | { score?: number; suggestions?: string[]; final_version?: Record<string, unknown> }
    | undefined;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Content Generator</h1>

      {!jobStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Facebook Post</CardTitle>
            <CardDescription>
              Describe your topic and the AI agents will create content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <Label htmlFor="brief">Topic / Brief</Label>
                <Textarea
                  id="brief"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="e.g. eco-friendly water bottles for active lifestyles"
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal">Marketing Goal (optional)</Label>
                <Input
                  id="goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. awareness, engagement, conversion"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Starting..." : "Generate"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {jobStatus && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Agent Pipeline
                <Badge
                  variant={
                    jobStatus.status === "done"
                      ? "default"
                      : jobStatus.status === "error"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {jobStatus.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {AGENT_STEPS.map((step) => {
                  const currentIdx = AGENT_STEPS.indexOf(
                    jobStatus.current_step ?? "",
                  );
                  const stepIdx = AGENT_STEPS.indexOf(step);
                  let variant: "default" | "secondary" | "outline" = "outline";
                  if (
                    jobStatus.status === "done" ||
                    stepIdx < currentIdx
                  ) {
                    variant = "default";
                  } else if (stepIdx === currentIdx) {
                    variant = "secondary";
                  }
                  return (
                    <Badge key={step} variant={variant}>
                      {step}
                    </Badge>
                  );
                })}
              </div>
              {polling && (
                <p className="mt-3 text-sm text-muted-foreground animate-pulse">
                  Processing...
                </p>
              )}
              {jobStatus.status === "error" && (
                <p className="mt-3 text-sm text-destructive">
                  Error: {jobStatus.error}
                </p>
              )}
            </CardContent>
          </Card>

          {jobStatus.status === "done" && draft && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Generated Post
                  {review?.score != null && (
                    <Badge variant="secondary">
                      Score: {review.score}/10
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    HOOK
                  </p>
                  <p className="text-lg font-semibold">{draft.hook}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    BODY
                  </p>
                  <p className="whitespace-pre-wrap">{draft.body}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    CTA
                  </p>
                  <p className="font-medium">{draft.cta}</p>
                </div>
                {draft.hashtags && (
                  <div className="flex gap-1 flex-wrap">
                    {draft.hashtags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                {review?.suggestions && review.suggestions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      REVIEWER SUGGESTIONS
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {review.suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {(jobStatus.status === "done" || jobStatus.status === "error") && (
            <Button
              variant="outline"
              onClick={() => {
                reset();
                setBrief("");
                setGoal("");
              }}
            >
              Generate Another
            </Button>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```powershell
cd E:\product\mkt_post_build\frontend
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add content generator page with agent progress polling"
```

---

### Task 7: History page

**Files:**
- Create: `frontend/app/(app)/history/page.tsx`

**Interfaces:**
- Consumes: `useHistory()`, `useDeleteHistory()` from `hooks/use-history.ts`, `useProjectStore`, shadcn components

- [ ] **Step 1: Create `frontend/app/(app)/history/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/project";
import { useHistory, useDeleteHistory } from "@/hooks/use-history";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface HistoryItem {
  id: number;
  project_id: number;
  content_type: string;
  prompt: string;
  output: Record<string, unknown> | null;
  score: number | null;
  created_at: string;
}

export default function HistoryPage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { data: history, isLoading } = useHistory(activeProject?.id);
  const deleteHistory = useDeleteHistory();
  const [selected, setSelected] = useState<HistoryItem | null>(null);

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-muted-foreground">
          Select a project first from the Projects page.
        </p>
      </div>
    );
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteHistory.mutateAsync(id);
      setSelected(null);
      toast.success("History item deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const getDraft = (item: HistoryItem) =>
    item.output?.draft as
      | { hook?: string; body?: string; cta?: string; hashtags?: string[] }
      | undefined;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">History</h1>

      {isLoading && (
        <p className="text-muted-foreground">Loading history...</p>
      )}

      {!isLoading && !history?.length && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No content generated yet. Go to Generate to create your first post.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {history?.map((item) => (
          <Card key={item.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">{item.prompt}</CardTitle>
                <CardDescription>
                  {item.content_type} &middot;{" "}
                  {new Date(item.created_at).toLocaleDateString()}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {item.score !== null && (
                  <Badge variant="secondary">{item.score}/10</Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected(item)}
                >
                  View
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  disabled={deleteHistory.isPending}
                >
                  Delete
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.prompt}</DialogTitle>
          </DialogHeader>
          {selected && getDraft(selected) && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  HOOK
                </p>
                <p className="text-lg font-semibold">
                  {getDraft(selected)?.hook}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  BODY
                </p>
                <p className="whitespace-pre-wrap">
                  {getDraft(selected)?.body}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  CTA
                </p>
                <p className="font-medium">{getDraft(selected)?.cta}</p>
              </div>
              {getDraft(selected)?.hashtags && (
                <div className="flex gap-1 flex-wrap">
                  {getDraft(selected)!.hashtags!.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```powershell
cd E:\product\mkt_post_build\frontend
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add history page with view/delete"
```

---

### Task 8: End-to-end live verification

**Files:** none (verification only).

- [ ] **Step 1: Rebuild and start the full Docker stack**

```powershell
cd E:\product\mkt_post_build
docker compose up --build -d
docker compose ps
```

Expected: all 4 services Up.

- [ ] **Step 2: Open browser at `http://localhost:3000`**

Expected: redirects to `/login`.

- [ ] **Step 3: Register a new account**

Fill in register form: name, email, password. Click "Create Account".
Expected: redirected to `/dashboard`.

- [ ] **Step 4: Create a project**

Navigate to Projects. Enter "Demo Project", click Create.
Expected: project card appears with "Active" badge.

- [ ] **Step 5: Configure brand voice**

Navigate to Brand Voice. Fill in: Brand Name "EcoBottle", Tone "friendly", Style "conversational", Preferred "sustainable, eco-friendly", Forbidden "cheap, plastic". Click Save.
Expected: toast "Brand voice saved".

- [ ] **Step 6: Generate a Facebook Post**

Navigate to Generate. Enter brief "eco-friendly water bottles for active lifestyles", goal "awareness". Click Generate.
Expected: agent pipeline badges light up as each step completes. Final result shows hook (contains "EcoBottle"), body, CTA, hashtags.

- [ ] **Step 7: Check History**

Navigate to History.
Expected: one entry with the brief. Click "View" — dialog shows the full post. Click "Delete" — entry removed.

- [ ] **Step 8: Toggle dark/light mode**

Click the theme toggle in the sidebar.
Expected: UI switches between dark and light themes.

- [ ] **Step 9: Verify auth guard**

Open `/dashboard` in an incognito window (not logged in).
Expected: redirected to `/login`.

---

## Definition of Done (M5)

- Backend: `content_history` table exists, `GET /history?project_id=N` and `DELETE /history/{id}` work with auth + ownership, generation_service auto-saves completed jobs to history. All backend tests pass (M0–M4 + history).
- Frontend: 7 pages functional — Login, Dashboard, Projects, Knowledge Base, Brand Voice, Content Generator, History. All wired to real backend API.
- shadcn/ui components, Zustand stores (auth + active project), TanStack Query hooks (projects, documents, brand, generate, history).
- Dark/light theme toggle works.
- Auth guard protects all pages except login.
- Docker `frontend` container builds and runs.
- Full user flow works: Register → Create Project → Upload Doc → Brand Voice → Generate → Poll → View Result → History → Delete.
- Alembic migration for `content_history` applied to Postgres.

---

## Self-review notes

- **Spec coverage:**
  - §8 `content_history` table — `id, project_id FK, content_type, prompt, output JSONB, score, created_at` ✓
  - §9 `GET /history` + `DELETE /history/{id}` — auth-guarded, ownership-enforced ✓
  - §10 all 7 pages — Login, Dashboard, Projects, Knowledge Base, Brand Voice, Content Generator, History ✓
  - TanStack Query polling for generate progress ✓
  - Per-agent progress display (current_step badge highlighting) ✓
  - Dark/light theme toggle (user choice: support both) ✓
- **Type consistency:** `HistoryItem` interface in hooks matches `HistoryResponse` schema (id, project_id, content_type, prompt, output, score, created_at). `Project` interface in hooks matches `ProjectResponse` schema. `BrandProfile` interface in hooks matches `BrandProfileResponse` schema.
- **No placeholders:** every step has complete code.
- **Intentional M5 scope (deferred to M6):**
  - Remaining 4 content types (SEO Blog, Email, Landing Page, TikTok Script) — M6
  - README and final polish — M6
  - Frontend tests — not in spec for M5; the live verification task covers the golden path
