# AI Marketing Multi-Agent Platform

An AI-powered marketing content generation platform. A multi-agent system (LangGraph) researches, gathers brand context, generates content, reviews it, and returns a polished marketing asset — all while honoring per-project brand voice.

## Features

- **Multi-Agent Pipeline** — 7 specialized AI agents (Planner, Research, SEO, Brand, Fusion, Copywriter, Reviewer) orchestrated via LangGraph
- **5 Content Types** — Facebook Post, SEO Blog, Email, Landing Page, TikTok Script
- **Brand Voice** — Per-project tone, style, preferred/forbidden words injected into generation
- **RAG Knowledge Base** — Upload PDF/DOCX/TXT documents; Brand agent retrieves relevant context via Qdrant vector search
- **Content History** — Auto-saved generations with score, viewable and deletable
- **JWT Auth** — Register/login with bcrypt password hashing
- **Dark/Light Theme** — Toggle between themes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, Python 3.12+, SQLAlchemy 2.0 (async), Alembic, Pydantic v2 |
| AI/ML | LangGraph, LangChain, OpenAI / Anthropic (provider-agnostic) |
| Embeddings | fastembed (BAAI/bge-small-en-v1.5) — local, free |
| Vector DB | Qdrant |
| Database | PostgreSQL 16 |
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS 3, shadcn/ui |
| State | Zustand (client), TanStack Query (server) |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- An OpenAI or Anthropic API key (optional — runs in mock mode without one)

### 1. Clone and configure

```bash
git clone https://github.com/dylanvu6868/mkt_post_build.git
cd mkt_post_build
cp .env.example .env
# Edit .env — add your API key(s) or leave blank for mock mode
```

### 2. Start the stack

```bash
docker compose up --build -d
```

This starts 4 services:
- **db** — PostgreSQL 16 on port 5432
- **qdrant** — Qdrant vector DB on port 6333
- **backend** — FastAPI on port 8000
- **frontend** — Next.js on port 3000

### 3. Run migrations

```bash
docker compose exec backend alembic upgrade head
```

### 4. Open the app

Visit [http://localhost:3000](http://localhost:3000)

1. Register an account
2. Create a project
3. (Optional) Upload brand documents in Knowledge Base
4. (Optional) Configure Brand Voice
5. Go to Generate → pick a content type → enter a brief → Generate
6. View results in History

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create user, return JWT |
| POST | `/auth/login` | Login, return JWT |
| POST | `/projects` | Create project |
| GET | `/projects` | List user's projects |
| POST | `/documents/upload` | Upload + ingest document into RAG |
| GET | `/documents` | List documents for a project |
| POST | `/brand-profile` | Upsert brand voice config |
| GET | `/brand-profile` | Get brand voice config |
| POST | `/generate` | Start generation pipeline (async) |
| GET | `/generate/{job_id}` | Poll job status + result |
| GET | `/history` | List content history |
| DELETE | `/history/{id}` | Delete a history item |
| GET | `/health` | Health check |

## Development

### Backend (without Docker)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend (without Docker)

```bash
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
cd backend
python -m pytest tests/ -v
```

Tests use in-memory SQLite and mock mode (no API keys needed).

## Mock Mode

When no LLM API key is configured (or `LLM_PROVIDER=mock`), every agent returns schema-valid sample data. The full pipeline runs offline — useful for development and testing.

## License

MIT
