# AI Marketing Multi-Agent SaaS — MVP Design Spec

- **Date:** 2026-06-17
- **Status:** Approved (brainstorming complete) → ready for implementation planning
- **Source brief:** `mvp.txt`

---

## 1. Purpose & Goal

Build a production-ready MVP of an AI-powered marketing content generation platform.
A user provides a brief (product info, target audience, marketing objective); a
multi-agent system researches, gathers brand context, generates content, reviews it,
and returns a polished marketing asset — while honoring per-project brand voice.

**In scope (MVP):** Multi-agent workflow, content generation, RAG knowledge base,
brand voice, content history, JWT auth, Dockerized deployment.

**Out of scope (YAGNI):** analytics, scheduling, payments, social publishing,
multi-tenant org/roles, billing.

---

## 2. Key Decisions (locked during brainstorming)

| # | Decision | Choice |
|---|----------|--------|
| 1 | LLM provider | **Provider-agnostic** via LangChain `init_chat_model`. Both OpenAI + Anthropic keys available. **Default: OpenAI** per spec. |
| 2 | Build strategy | **Vertical slice first** — Facebook Post end-to-end, then expand. |
| 3 | Runtime | **Full `docker-compose`** (Postgres + Qdrant + backend + frontend). |
| 4 | Auth | **Full JWT** (register/login, bcrypt, bearer tokens). |
| 5 | Embeddings | **Local `fastembed` (BAAI/bge-small-en-v1.5)** — free, offline, provider-independent. |
| 6 | First content type | **Facebook Post**. |
| 7 | `/generate` execution | **Async job + polling** (returns `job_id`; client polls per-agent progress). |
| 8 | Reviewer behavior | **Single pass** — score + suggestions + final improved version (no revision loop). |
| 9 | Working cadence | **Check-in at each milestone** (M0–M6). |

---

## 3. System Architecture

Four services orchestrated by `docker-compose`:

```
┌─────────────┐   HTTP/JSON    ┌──────────────┐
│  frontend   │ ◄────────────► │   backend    │
│  Next.js    │  (poll job)    │   FastAPI    │
└─────────────┘                └──────┬───────┘
                                       │
                     ┌─────────────────┼─────────────────┐
                     ▼                 ▼                 ▼
               ┌──────────┐      ┌──────────┐      ┌──────────────┐
               │ Postgres │      │  Qdrant  │      │   LLM APIs   │
               │  (data)  │      │ (vectors)│      │ OpenAI/Claude│
               └──────────┘      └──────────┘      └──────────────┘
```

**Backend stack:** FastAPI, Python 3.12+, SQLAlchemy 2.0 (async, asyncpg), Alembic
migrations, Pydantic v2 schemas, LangGraph + LangChain, fastembed, qdrant-client,
pypdf, python-docx, passlib[bcrypt], python-jose (JWT).

**Frontend stack:** Next.js (App Router) + TypeScript, TailwindCSS, shadcn/ui,
Zustand (client state), TanStack Query (server state + job polling), axios.

**LLM abstraction:** a single `get_llm(tier)` factory returns a LangChain chat model
chosen by env. Switching providers requires no code change.

```
LLM_PROVIDER=openai            # or "anthropic"
LLM_MODEL_FAST=gpt-4o-mini     # planner/research/seo/brand/fusion
LLM_MODEL_SMART=gpt-4o         # copywriter/reviewer
# anthropic equivalents, e.g. claude-haiku-4-5 / claude-sonnet-4-6
```

**Mock fallback:** if no key is configured (or `LLM_PROVIDER=mock`), each agent returns
schema-valid sample data so the full pipeline runs offline for testing.

---

## 4. Multi-Agent Workflow (LangGraph)

A shared graph state (TypedDict) flows through nodes:

```
        Planner
           │  (parallel fan-out)
   ┌───────┼───────┐
   ▼       ▼       ▼
Research  SEO   Brand (RAG)
   └───────┼───────┘
           ▼  (fan-in)
        Fusion  → unified content brief
           ▼
       Copywriter → draft
           ▼
        Reviewer → score + suggestions + FINAL (single pass)
```

### 4.1 Graph state (shape)

```
GraphState = {
  # inputs
  project_id, content_type, brief, marketing_goal, brand_profile,
  # agent outputs
  plan, research, seo, brand_context, fused_brief, draft, review, final,
  # control
  provider_available: bool, errors: list
}
```

### 4.2 Agent contracts (all return validated Pydantic JSON)

| Agent | Model tier | Output (key fields) |
|-------|-----------|---------------------|
| **Planner** | fast | `{ tasks: ["research","seo","brand"] }` |
| **Research** | fast | `pain_points[], customer_motivations[], product_benefits[], industry_context` |
| **SEO** | fast | `primary_keyword, secondary_keywords[], search_intent, meta_description` |
| **Brand** | fast | `relevant_context[]` (retrieved chunks) + summarized brand notes |
| **Fusion** | fast | `unified_brief` (merged guidance for the writer) |
| **Copywriter** | smart | structured content per content type (see §6) using framework AIDA/PAS/FAB/Storytelling |
| **Reviewer** | smart | `score (0–100), suggestions[], final_content` |

- Research, SEO, Brand run **in parallel** (LangGraph branches from Planner), then
  **fan-in** to Fusion.
- Copywriter consumes the fused brief **and** the project's brand voice config.
- Reviewer produces the final improved version directly (single pass).

---

## 5. RAG Subsystem

```
Upload (PDF/DOCX/TXT) → extract text → chunk (~800 tokens, 100 overlap)
→ fastembed (BGE-small) → upsert to Qdrant → retrieve (top-k, project-filtered)
```

- **Single Qdrant collection**, each point carries `project_id` in payload; retrieval
  filters by `project_id` so a project only sees its own documents.
- Text extraction: `pypdf` (PDF), `python-docx` (DOCX), plain read (TXT).
- The **Brand Agent** builds a query from the brief, retrieves top-k chunks for the
  project, and feeds them as grounded context.

---

## 6. Supported Content Types

Each produces a structured object. **Facebook Post is the first vertical slice; the
other four are added in M6.**

| Type | Output fields |
|------|---------------|
| Facebook Post | hook, body, cta, hashtags[] |
| SEO Blog | seo_title, meta_description, outline[], blog_content, faq[] |
| Email | subject, body, cta |
| Landing Page | headline, subheadline, benefits[], cta |
| TikTok Script | hook, script, cta |

---

## 7. Brand Voice Module

Per-project config consumed by the Copywriter agent:
`brand_name, tone, writing_style, preferred_words[], forbidden_words[]`.
Injected into the Copywriter prompt; forbidden words are checked and avoided.

---

## 8. Data Model

SQLAlchemy 2.0 async models + Alembic migrations.

```
users(id, name, email UNIQUE, password_hash, created_at)
projects(id, user_id FK, name, created_at)
documents(id, project_id FK, filename, status, created_at)
brand_profiles(id, project_id FK UNIQUE, brand_name, tone, style,
               preferred_words JSONB, forbidden_words JSONB)
content_history(id, project_id FK, content_type, prompt, output JSONB,
                score, created_at)
generation_jobs(id, project_id FK, content_type, status,        # queued|running|done|error
                current_step, result_json JSONB, error, created_at, updated_at)
```

All project-scoped queries enforce ownership via the authenticated `user_id`.

---

## 9. API Endpoints

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/register` | create user, return JWT |
| POST | `/auth/login` | return JWT |
| POST | `/projects` | create project (auth) |
| GET | `/projects` | list user's projects (auth) |
| POST | `/documents/upload` | upload + ingest into RAG (auth) |
| POST | `/brand-profile` | upsert brand voice for a project (auth) |
| POST | `/generate` | start pipeline, returns `{ job_id }` (auth) |
| GET | `/generate/{job_id}` | poll status + current_step + result (auth) |
| GET | `/history` | list content history (auth) |
| DELETE | `/history/{id}` | delete a history item (auth) |

Async execution: `POST /generate` enqueues a background task (FastAPI `BackgroundTasks`
for the MVP; upgradeable to Celery/Arq later), updating `generation_jobs.current_step`
as each agent completes so the client can show per-agent progress.

---

## 10. Frontend Pages

App Router pages, all (except login) gated behind JWT:

1. **Login** — register/login.
2. **Dashboard** — overview + recent activity.
3. **Projects** — create/list projects, select active project.
4. **Knowledge Base** — upload/list documents, ingestion status.
5. **Brand Voice** — configure brand profile.
6. **Content Generator** — select type, enter topic, generate, watch per-agent progress
   (TanStack Query polling), view final result + score + suggestions.
7. **History** — list/view/delete past generations.

User flow: Create Project → Upload Docs → Configure Brand Voice → Select Content Type
→ Enter Topic → Generate → Review → Save to History.

---

## 11. Folder Structure

```
backend/
  app/
    api/            # routers: auth, projects, documents, brand, generate, history
    agents/         # planner/ research/ seo/ brand/ fusion/ copywriter/ reviewer/
    graph/          # LangGraph assembly + GraphState
    llm/            # provider-agnostic factory (get_llm) + mock
    rag/            # extract, chunk, embed, qdrant client, retrieve
    models/         # SQLAlchemy models
    schemas/        # Pydantic request/response + agent IO
    services/       # business logic (auth, projects, generation orchestration)
    core/           # config, security (JWT), db session
    main.py
  alembic/
  Dockerfile
frontend/
  app/              # routes/pages
  components/       # UI (shadcn)
  hooks/            # data + polling hooks
  services/         # API client
  store/            # Zustand stores
  Dockerfile
docker-compose.yml
.env.example
README.md
```

---

## 12. Build Plan (milestones)

Vertical slice = **Facebook Post**. Check-in at each milestone.

| Milestone | Deliverable |
|-----------|-------------|
| **M0** | Monorepo scaffold + `docker-compose` (Postgres/Qdrant/backend/frontend) up with health checks |
| **M1** | JWT auth (register/login) + Projects CRUD + DB models + Alembic baseline |
| **M2** | LLM abstraction + LangGraph 7-agent pipeline for Facebook Post + async job/poll (mock-capable) |
| **M3** | RAG: upload → chunk → embed → Qdrant → retrieve, wired into Brand Agent |
| **M4** | Brand Voice config applied to Copywriter |
| **M5** | Frontend: all 7 pages wired end-to-end; Facebook Post works against real backend |
| **M6** | Expand remaining 4 content types + README + polish |

---

## 13. Testing Strategy

- **Backend unit:** agent IO schema validation, LLM factory/mock, RAG chunking,
  auth/JWT, ownership enforcement (pytest).
- **Workflow:** LangGraph pipeline runs end-to-end with mock LLM (deterministic, no key).
- **API:** endpoint integration tests (httpx + test DB).
- **Frontend:** key flows (login, generate + poll, history) — component/integration as
  scoped per milestone.
- TDD where practical, following the repo's testing skills.

---

## 14. Error Handling

- LLM/API failures: caught per-agent, recorded in `GraphState.errors`; job moves to
  `error` with a readable message; partial progress preserved in `current_step`.
- Missing keys: automatic mock fallback (configurable) instead of hard failure.
- Upload/parse failures: document marked failed, surfaced to the user.
- All endpoints return typed error responses; frontend shows actionable messages.

---

## 15. Open Assumptions

- Single-user-per-account; no team/org sharing in MVP.
- `BackgroundTasks` is sufficient for MVP concurrency; queue (Celery/Arq) is a
  documented future upgrade, not built now.
- Default models: `gpt-4o-mini` (fast tier), `gpt-4o` (smart tier); overridable by env.
