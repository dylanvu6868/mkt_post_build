# M2 — LLM Abstraction + LangGraph 7-Agent Pipeline (Facebook Post) + Async Job/Poll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the provider-agnostic LLM factory and a LangGraph 7-agent pipeline (planner → research/seo/brand in parallel → fusion → copywriter → reviewer) that generates a structured **Facebook Post**, runs fully offline in mock mode, and is driven by an async `POST /generate` → background job → `GET /generate/{job_id}` poll loop.

**Architecture:** A single `get_chat_model(tier)` factory chooses OpenAI/Anthropic via env; `provider_available()` decides real-vs-mock. Each agent is an `async` LangGraph node returning a validated Pydantic object (`.model_dump()` into a shared `GraphState` TypedDict). When no key is configured every agent returns deterministic, schema-valid mock data, so the whole graph runs with no network. `POST /generate` persists a `generation_jobs` row and schedules a FastAPI `BackgroundTask` that streams the graph, updating `current_step` per node and writing the final result; the client polls `GET /generate/{job_id}`.

**Tech Stack:** LangGraph + LangChain (`init_chat_model`, `with_structured_output`), `langchain-openai`, `langchain-anthropic`, Pydantic v2, FastAPI `BackgroundTasks`, SQLAlchemy 2.0 async, Alembic, pytest + pytest-asyncio (mock-mode = deterministic, no key).

**Spec:** `docs/superpowers/specs/2026-06-17-ai-marketing-multiagent-design.md` (milestone **M2**, sections §3 LLM abstraction, §4 multi-agent workflow, §6 Facebook Post fields, §8 `generation_jobs`, §9 `/generate` endpoints, §14 error handling). M0 (scaffold) and M1 (auth + projects + DB + Alembic baseline) are already merged to `master`.

---

## Preconditions

- Work on a feature branch: `git checkout -b m2-llm-pipeline` (from `master`).
- The backend local venv exists at `backend/.venv` (Python 3.11). It gets new deps in Task 1.
- `config.py` already defines `llm_provider`, `openai_api_key`, `anthropic_api_key`, `llm_model_fast`, `llm_model_smart` (added in M0). No config change is needed; M2 consumes them.
- The Docker stack can be started with `docker compose up -d` (Postgres published on `localhost:5432`). Needed only for Task 10 (migration) and Task 11 (live verify).
- **Mock mode is the default for all tests:** `settings.llm_provider="openai"` with an empty `openai_api_key` ⇒ `provider_available()` is `False` ⇒ every agent returns deterministic mock data. No test calls a real LLM.

## File Structure (created/modified in this plan)

```
backend/
  requirements.txt                       # MODIFY: add langchain/langgraph deps
  app/
    core/
      db.py                              # MODIFY: add get_session_maker() dependency
    llm/
      __init__.py                        # CREATE: empty
      factory.py                         # CREATE: provider_available() + get_chat_model(tier)
    schemas/
      agents.py                          # CREATE: Plan/Research/SEO/BrandContext/FusedBrief/FacebookPostDraft/Review
      generation.py                      # CREATE: GenerateRequest/JobResponse/JobStatusResponse
    agents/
      __init__.py                        # CREATE: empty
      base.py                            # CREATE: generate_structured() helper
      planner.py                         # CREATE: deterministic plan node
      research.py                        # CREATE
      seo.py                             # CREATE
      brand.py                           # CREATE (M2: empty RAG context; RAG wired in M3)
      fusion.py                          # CREATE
      copywriter.py                      # CREATE
      reviewer.py                        # CREATE
    graph/
      __init__.py                        # CREATE: empty
      state.py                           # CREATE: GraphState TypedDict + reducers
      build.py                           # CREATE: build_graph() compiled LangGraph
    models/
      __init__.py                        # MODIFY: register GenerationJob
      generation_job.py                  # CREATE: generation_jobs model
    services/
      generation_service.py              # CREATE: create_job / run_generation_job / get_job_for_user
    api/
      generate.py                        # CREATE: POST /generate, GET /generate/{job_id}
    main.py                              # MODIFY: include generate router
  alembic/
    versions/<hash>_add_generation_jobs.py  # CREATE via autogenerate
  tests/
    conftest.py                          # MODIFY: also override get_session_maker
    test_llm_factory.py                  # CREATE
    test_agent_schemas.py                # CREATE
    test_agents.py                       # CREATE
    test_graph.py                        # CREATE
    test_generation_service.py           # CREATE
    test_generate.py                     # CREATE
```

---

### Task 1: M2 dependencies (LangChain + LangGraph)

**Files:**
- Modify: `backend/requirements.txt`
- Test: `backend/tests/test_llm_factory.py` (import-only smoke, expanded in Task 2)

- [ ] **Step 1: Append the M2 deps to `backend/requirements.txt`.** The full file becomes:

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
langchain==0.3.14
langchain-openai==0.2.14
langchain-anthropic==0.3.1
langgraph==0.2.62
```

- [ ] **Step 2: Install the new deps** (from `backend/`)

```powershell
cd E:\product\mkt_post_build\backend
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```
Expected: installs succeed (langchain, langchain-core, langchain-openai, langchain-anthropic, langgraph and their deps).
> If pip reports a version-resolution conflict, drop the four pins to `langchain`, `langchain-openai`, `langchain-anthropic`, `langgraph` (unpinned) and let pip resolve a compatible `langchain-core`; then re-pin to whatever it installed (`pip freeze | findstr langchain`).

- [ ] **Step 3: Write an import smoke test** — `backend/tests/test_llm_factory.py`

```python
def test_langgraph_and_langchain_import():
    import langgraph  # noqa: F401
    from langchain.chat_models import init_chat_model  # noqa: F401
    from langchain_core.messages import HumanMessage, SystemMessage  # noqa: F401
    from langgraph.graph import END, START, StateGraph  # noqa: F401
```

- [ ] **Step 4: Run it to verify the deps import cleanly**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_llm_factory.py -v`
Expected: PASS (1 test). Confirms the LangChain/LangGraph stack installed correctly.

- [ ] **Step 5: Run the existing suite to confirm no regression**

Run: `.\.venv\Scripts\python.exe -m pytest tests/ -q`
Expected: all M0+M1 tests still pass.

- [ ] **Step 6: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/requirements.txt backend/tests/test_llm_factory.py
git commit -m "build(backend): add LangChain + LangGraph deps for M2 pipeline"
```

---

### Task 2: Provider-agnostic LLM factory

**Files:**
- Create: `backend/app/llm/__init__.py` (empty)
- Create: `backend/app/llm/factory.py`
- Test: `backend/tests/test_llm_factory.py` (extend)

- [ ] **Step 1: Add failing tests to `backend/tests/test_llm_factory.py`** (append below the import smoke test)

```python
def test_provider_unavailable_when_openai_key_missing(monkeypatch):
    from app.core.config import settings
    from app.llm.factory import provider_available

    monkeypatch.setattr(settings, "llm_provider", "openai")
    monkeypatch.setattr(settings, "openai_api_key", "")
    assert provider_available() is False


def test_provider_available_when_openai_key_present(monkeypatch):
    from app.core.config import settings
    from app.llm.factory import provider_available

    monkeypatch.setattr(settings, "llm_provider", "openai")
    monkeypatch.setattr(settings, "openai_api_key", "sk-test")
    assert provider_available() is True


def test_anthropic_provider_uses_anthropic_key(monkeypatch):
    from app.core.config import settings
    from app.llm.factory import provider_available

    monkeypatch.setattr(settings, "llm_provider", "anthropic")
    monkeypatch.setattr(settings, "anthropic_api_key", "")
    assert provider_available() is False
    monkeypatch.setattr(settings, "anthropic_api_key", "key")
    assert provider_available() is True


def test_mock_provider_is_unavailable(monkeypatch):
    from app.core.config import settings
    from app.llm.factory import provider_available

    monkeypatch.setattr(settings, "llm_provider", "mock")
    monkeypatch.setattr(settings, "openai_api_key", "sk-test")
    assert provider_available() is False
```

- [ ] **Step 2: Run to verify it fails**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_llm_factory.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.llm.factory'`.

- [ ] **Step 3: Create `backend/app/llm/__init__.py`** (empty file)

- [ ] **Step 4: Create `backend/app/llm/factory.py`**

```python
from typing import Any

from langchain.chat_models import init_chat_model

from app.core.config import settings


def provider_available() -> bool:
    """True only when a real LLM should be called (a non-mock provider with a key)."""
    provider = settings.llm_provider.lower()
    if provider == "openai":
        return bool(settings.openai_api_key)
    if provider == "anthropic":
        return bool(settings.anthropic_api_key)
    return False  # "mock" or anything unrecognized → run agents in mock mode


def get_chat_model(tier: str) -> Any:
    """Return a LangChain chat model for the given tier ("fast" | "smart")."""
    model = settings.llm_model_smart if tier == "smart" else settings.llm_model_fast
    return init_chat_model(
        model, model_provider=settings.llm_provider, temperature=0.7
    )
```

- [ ] **Step 5: Run to verify it passes**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_llm_factory.py -v`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/app/llm/ backend/tests/test_llm_factory.py
git commit -m "feat(backend): add provider-agnostic LLM factory with mock detection"
```

---

### Task 3: Agent IO schemas (Pydantic)

**Files:**
- Create: `backend/app/schemas/agents.py`
- Test: `backend/tests/test_agent_schemas.py`

- [ ] **Step 1: Write the failing test** — `backend/tests/test_agent_schemas.py`

```python
import pytest
from pydantic import ValidationError

from app.schemas.agents import (
    BrandContext,
    FacebookPostDraft,
    FusedBrief,
    Plan,
    Research,
    Review,
    SEO,
)


def test_plan_defaults_to_three_branches():
    assert Plan().tasks == ["research", "seo", "brand"]


def test_facebook_post_draft_fields():
    draft = FacebookPostDraft(
        hook="h", body="b", cta="c", hashtags=["#x"]
    )
    assert draft.model_dump() == {
        "hook": "h",
        "body": "b",
        "cta": "c",
        "hashtags": ["#x"],
    }


def test_review_nests_final_content_as_facebook_post():
    review = Review(
        score=90,
        suggestions=["tighten"],
        final_content=FacebookPostDraft(hook="h", body="b", cta="c", hashtags=[]),
    )
    dumped = review.model_dump()
    assert dumped["score"] == 90
    assert dumped["final_content"]["hook"] == "h"


def test_research_requires_all_fields():
    with pytest.raises(ValidationError):
        Research(pain_points=["x"])  # missing other required fields


def test_seo_and_brand_and_fusion_shapes():
    seo = SEO(
        primary_keyword="k",
        secondary_keywords=["a"],
        search_intent="informational",
        meta_description="m",
    )
    brand = BrandContext(relevant_context=[], brand_notes="none")
    fused = FusedBrief(unified_brief="brief")
    assert seo.primary_keyword == "k"
    assert brand.relevant_context == []
    assert fused.unified_brief == "brief"
```

- [ ] **Step 2: Run to verify it fails**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_agent_schemas.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.schemas.agents'`.

- [ ] **Step 3: Create `backend/app/schemas/agents.py`**

```python
from pydantic import BaseModel, Field


class Plan(BaseModel):
    tasks: list[str] = Field(default_factory=lambda: ["research", "seo", "brand"])


class Research(BaseModel):
    pain_points: list[str]
    customer_motivations: list[str]
    product_benefits: list[str]
    industry_context: str


class SEO(BaseModel):
    primary_keyword: str
    secondary_keywords: list[str]
    search_intent: str
    meta_description: str


class BrandContext(BaseModel):
    relevant_context: list[str]
    brand_notes: str


class FusedBrief(BaseModel):
    unified_brief: str


class FacebookPostDraft(BaseModel):
    hook: str
    body: str
    cta: str
    hashtags: list[str]


class Review(BaseModel):
    score: int
    suggestions: list[str]
    final_content: FacebookPostDraft
```

- [ ] **Step 4: Run to verify it passes**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_agent_schemas.py -v`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/app/schemas/agents.py backend/tests/test_agent_schemas.py
git commit -m "feat(backend): add agent IO schemas (plan/research/seo/brand/fusion/draft/review)"
```

---

### Task 4: Base helper + upstream agents (planner, research, seo, brand)

**Files:**
- Create: `backend/app/agents/__init__.py` (empty)
- Create: `backend/app/agents/base.py`
- Create: `backend/app/agents/planner.py`
- Create: `backend/app/agents/research.py`
- Create: `backend/app/agents/seo.py`
- Create: `backend/app/agents/brand.py`
- Test: `backend/tests/test_agents.py`

> All agents are `async` LangGraph nodes: input is the shared `GraphState` dict, output is a dict of state updates. In mock mode (`state["provider_available"]` falsy) they return deterministic, schema-valid data. The real path calls `generate_structured(...)`.

- [ ] **Step 1: Write the failing test** — `backend/tests/test_agents.py`

```python
from app.agents.brand import brand
from app.agents.planner import planner
from app.agents.research import research
from app.agents.seo import seo
from app.schemas.agents import BrandContext, Plan, Research, SEO


def _mock_state():
    return {
        "brief": "eco-friendly water bottles",
        "marketing_goal": "brand awareness",
        "provider_available": False,
        "errors": [],
    }


async def test_planner_returns_fixed_three_branches():
    out = await planner(_mock_state())
    Plan(**out["plan"])  # validates shape
    assert out["plan"]["tasks"] == ["research", "seo", "brand"]


async def test_research_mock_is_schema_valid_and_nonempty():
    out = await research(_mock_state())
    parsed = Research(**out["research"])
    assert parsed.pain_points
    assert parsed.product_benefits


async def test_seo_mock_uses_brief_as_keyword_source():
    out = await seo(_mock_state())
    parsed = SEO(**out["seo"])
    assert parsed.primary_keyword
    assert parsed.secondary_keywords


async def test_brand_mock_returns_empty_context_in_m2():
    out = await brand(_mock_state())
    parsed = BrandContext(**out["brand_context"])
    assert parsed.relevant_context == []
    assert parsed.brand_notes
```

- [ ] **Step 2: Run to verify it fails**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_agents.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.agents.planner'`.

- [ ] **Step 3: Create `backend/app/agents/__init__.py`** (empty file)

- [ ] **Step 4: Create `backend/app/agents/base.py`**

```python
from typing import TypeVar

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel

from app.llm.factory import get_chat_model

T = TypeVar("T", bound=BaseModel)


async def generate_structured(
    tier: str, system: str, user: str, schema: type[T]
) -> T:
    """Call the tier's chat model and coerce the reply into `schema`."""
    llm = get_chat_model(tier).with_structured_output(schema)
    return await llm.ainvoke(
        [SystemMessage(content=system), HumanMessage(content=user)]
    )
```

- [ ] **Step 5: Create `backend/app/agents/planner.py`**

```python
from typing import Any

from app.schemas.agents import Plan


async def planner(state: dict[str, Any]) -> dict[str, Any]:
    """Deterministic node: the parallel fan-out is fixed, so no LLM call is needed."""
    return {"plan": Plan().model_dump()}
```

- [ ] **Step 6: Create `backend/app/agents/research.py`**

```python
from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import Research

SYSTEM = (
    "You are a market research analyst. Given a product brief and marketing goal, "
    "return structured research: pain points, customer motivations, product "
    "benefits, and a short industry context."
)


async def research(state: dict[str, Any]) -> dict[str, Any]:
    brief = state["brief"]
    if not state.get("provider_available"):
        return {
            "research": Research(
                pain_points=[f"Buyers find it hard to choose the right {brief}."],
                customer_motivations=[
                    "Save time",
                    "Trust the brand",
                    "Get value for money",
                ],
                product_benefits=["High quality", "Easy to use", "Affordable"],
                industry_context=f"Demand for {brief} is growing steadily.",
            ).model_dump()
        }
    user = f"Product/brief: {brief}\nMarketing goal: {state.get('marketing_goal', '')}"
    result = await generate_structured("fast", SYSTEM, user, Research)
    return {"research": result.model_dump()}
```

- [ ] **Step 7: Create `backend/app/agents/seo.py`**

```python
from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import SEO

SYSTEM = (
    "You are an SEO strategist. Given a product brief, return the primary keyword, "
    "secondary keywords, the dominant search intent, and a meta description."
)


async def seo(state: dict[str, Any]) -> dict[str, Any]:
    brief = state["brief"]
    if not state.get("provider_available"):
        return {
            "seo": SEO(
                primary_keyword=brief,
                secondary_keywords=[f"best {brief}", f"{brief} guide"],
                search_intent="informational",
                meta_description=f"Everything you need to know about {brief}.",
            ).model_dump()
        }
    user = f"Product/brief: {brief}"
    result = await generate_structured("fast", SYSTEM, user, SEO)
    return {"seo": result.model_dump()}
```

- [ ] **Step 8: Create `backend/app/agents/brand.py`**

```python
from typing import Any

from app.schemas.agents import BrandContext


async def brand(state: dict[str, Any]) -> dict[str, Any]:
    """M2 has no RAG yet (wired in M3), so return an empty grounded context.

    Kept as a graph node so the 7-agent topology and fan-in are exercised now;
    M3 replaces the body with a Qdrant retrieval filtered by project_id.
    """
    return {
        "brand_context": BrandContext(
            relevant_context=[],
            brand_notes="No brand documents ingested yet (RAG arrives in M3).",
        ).model_dump()
    }
```

- [ ] **Step 9: Run the agent tests to verify they pass**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_agents.py -v`
Expected: PASS (4 tests).

- [ ] **Step 10: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/app/agents/__init__.py backend/app/agents/base.py backend/app/agents/planner.py backend/app/agents/research.py backend/app/agents/seo.py backend/app/agents/brand.py backend/tests/test_agents.py
git commit -m "feat(backend): add base helper + planner/research/seo/brand agents (mock-capable)"
```

---

### Task 5: Downstream agents (fusion, copywriter, reviewer)

**Files:**
- Create: `backend/app/agents/fusion.py`
- Create: `backend/app/agents/copywriter.py`
- Create: `backend/app/agents/reviewer.py`
- Test: `backend/tests/test_agents.py` (extend)

- [ ] **Step 1: Append failing tests to `backend/tests/test_agents.py`**

```python
from app.agents.copywriter import copywriter
from app.agents.fusion import fusion
from app.agents.reviewer import reviewer
from app.schemas.agents import FacebookPostDraft, FusedBrief, Review


def _downstream_state():
    return {
        "brief": "eco-friendly water bottles",
        "marketing_goal": "brand awareness",
        "provider_available": False,
        "brand_profile": {},
        "research": {
            "pain_points": ["p"],
            "customer_motivations": ["m"],
            "product_benefits": ["b"],
            "industry_context": "c",
        },
        "seo": {
            "primary_keyword": "eco water bottle",
            "secondary_keywords": ["reusable bottle"],
            "search_intent": "informational",
            "meta_description": "m",
        },
        "brand_context": {"relevant_context": [], "brand_notes": "none"},
        "errors": [],
    }


async def test_fusion_mock_produces_unified_brief():
    out = await fusion(_downstream_state())
    parsed = FusedBrief(**out["fused_brief"])
    assert parsed.unified_brief


async def test_copywriter_mock_produces_facebook_post():
    state = _downstream_state()
    state["fused_brief"] = {"unified_brief": "write a post"}
    out = await copywriter(state)
    parsed = FacebookPostDraft(**out["draft"])
    assert parsed.hook and parsed.body and parsed.cta
    assert parsed.hashtags


async def test_reviewer_mock_scores_and_returns_final():
    state = _downstream_state()
    state["draft"] = {
        "hook": "h",
        "body": "b",
        "cta": "Buy now",
        "hashtags": ["#eco"],
    }
    out = await reviewer(state)
    review = Review(**out["review"])
    assert 0 <= review.score <= 100
    assert review.suggestions
    # `final` is the improved post, surfaced as its own state key
    FacebookPostDraft(**out["final"])
    assert out["final"]["hook"]
```

- [ ] **Step 2: Run to verify it fails**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_agents.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.agents.fusion'`.

- [ ] **Step 3: Create `backend/app/agents/fusion.py`**

```python
from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import FusedBrief

SYSTEM = (
    "You merge research, SEO, and brand context into a single concise creative "
    "brief that a copywriter can act on directly."
)


async def fusion(state: dict[str, Any]) -> dict[str, Any]:
    brief = state["brief"]
    if not state.get("provider_available"):
        keyword = (state.get("seo") or {}).get("primary_keyword", brief)
        goal = state.get("marketing_goal") or "engagement"
        return {
            "fused_brief": FusedBrief(
                unified_brief=(
                    f"Write a Facebook post about {brief}. "
                    f"Lead with the primary keyword '{keyword}'. "
                    f"Emphasize the product benefits and address the audience's "
                    f"pain points. Goal: {goal}."
                )
            ).model_dump()
        }
    user = (
        f"Brief: {brief}\n"
        f"Research: {state.get('research')}\n"
        f"SEO: {state.get('seo')}\n"
        f"Brand context: {state.get('brand_context')}"
    )
    result = await generate_structured("fast", SYSTEM, user, FusedBrief)
    return {"fused_brief": result.model_dump()}
```

- [ ] **Step 4: Create `backend/app/agents/copywriter.py`**

```python
from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import FacebookPostDraft

SYSTEM = (
    "You are an expert Facebook copywriter. Use the AIDA framework. Honor the "
    "brand voice (tone, preferred and forbidden words) if provided. Return a "
    "structured post with a hook, body, CTA, and hashtags."
)


async def copywriter(state: dict[str, Any]) -> dict[str, Any]:
    brief = state["brief"]
    if not state.get("provider_available"):
        tag = (brief.replace(" ", "") or "marketing").lower()
        return {
            "draft": FacebookPostDraft(
                hook=f"Struggling with {brief}? You're not alone. 🚀",
                body=(
                    f"Meet the smarter way to handle {brief}. Built to save you "
                    f"time and deliver real results — so you can focus on what "
                    f"matters most."
                ),
                cta="👉 Learn more today!",
                hashtags=[f"#{tag}", "#marketing", "#growth"],
            ).model_dump()
        }
    user = (
        f"Topic: {brief}\n"
        f"Creative brief: {state.get('fused_brief')}\n"
        f"Brand voice: {state.get('brand_profile') or {}}"
    )
    result = await generate_structured("smart", SYSTEM, user, FacebookPostDraft)
    return {"draft": result.model_dump()}
```

- [ ] **Step 5: Create `backend/app/agents/reviewer.py`**

```python
from typing import Any

from app.agents.base import generate_structured
from app.schemas.agents import FacebookPostDraft, Review

SYSTEM = (
    "You are a senior content editor. Score the draft from 0 to 100, list concrete "
    "suggestions, and return an improved final version of the Facebook post "
    "(single pass — no further revision)."
)


async def reviewer(state: dict[str, Any]) -> dict[str, Any]:
    draft = state.get("draft", {})
    if not state.get("provider_available"):
        final = dict(draft)
        final["cta"] = f"{final.get('cta', '')} Limited time only!".strip()
        review = Review(
            score=85,
            suggestions=["Tighten the hook.", "Add urgency to the CTA."],
            final_content=FacebookPostDraft(**final),
        )
        return {
            "review": review.model_dump(),
            "final": review.final_content.model_dump(),
        }
    user = f"Brief: {state['brief']}\nDraft to review: {draft}"
    result = await generate_structured("smart", SYSTEM, user, Review)
    return {
        "review": result.model_dump(),
        "final": result.final_content.model_dump(),
    }
```

- [ ] **Step 6: Run the agent tests to verify they pass**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_agents.py -v`
Expected: PASS (4 upstream + 3 downstream = 7 tests).

- [ ] **Step 7: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/app/agents/fusion.py backend/app/agents/copywriter.py backend/app/agents/reviewer.py backend/tests/test_agents.py
git commit -m "feat(backend): add fusion/copywriter/reviewer agents (mock-capable)"
```

---

### Task 6: GraphState + LangGraph assembly + end-to-end mock run

**Files:**
- Create: `backend/app/graph/__init__.py` (empty)
- Create: `backend/app/graph/state.py`
- Create: `backend/app/graph/build.py`
- Test: `backend/tests/test_graph.py`

- [ ] **Step 1: Write the failing test** — `backend/tests/test_graph.py`

```python
from app.graph.build import build_graph


def _initial_state():
    return {
        "project_id": 1,
        "content_type": "facebook_post",
        "brief": "eco-friendly water bottles",
        "marketing_goal": "brand awareness",
        "brand_profile": {},
        "provider_available": False,
        "errors": [],
    }


async def test_graph_runs_all_seven_agents_end_to_end_in_mock_mode():
    graph = build_graph()
    final = await graph.ainvoke(_initial_state())

    # planner → research/seo/brand (parallel) → fusion → copywriter → reviewer
    assert final["plan"]["tasks"] == ["research", "seo", "brand"]
    assert final["research"]["pain_points"]
    assert final["seo"]["primary_keyword"]
    assert final["brand_context"]["brand_notes"]
    assert final["fused_brief"]["unified_brief"]
    assert final["draft"]["hook"]
    assert 0 <= final["review"]["score"] <= 100
    assert final["final"]["hook"]


async def test_graph_is_deterministic_in_mock_mode():
    graph = build_graph()
    a = await graph.ainvoke(_initial_state())
    b = await graph.ainvoke(_initial_state())
    assert a["final"] == b["final"]
```

- [ ] **Step 2: Run to verify it fails**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_graph.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.graph.build'`.

- [ ] **Step 3: Create `backend/app/graph/__init__.py`** (empty file)

- [ ] **Step 4: Create `backend/app/graph/state.py`**

```python
import operator
from typing import Annotated, Any, TypedDict


class GraphState(TypedDict, total=False):
    # inputs
    project_id: int
    content_type: str
    brief: str
    marketing_goal: str
    brand_profile: dict[str, Any]
    # agent outputs (stored as JSON-serializable dicts)
    plan: dict[str, Any]
    research: dict[str, Any]
    seo: dict[str, Any]
    brand_context: dict[str, Any]
    fused_brief: dict[str, Any]
    draft: dict[str, Any]
    review: dict[str, Any]
    final: dict[str, Any]
    # control
    provider_available: bool
    errors: Annotated[list[str], operator.add]  # reducer: parallel branches append
```

> `errors` uses an `operator.add` reducer so the three parallel nodes can append
> concurrently without a write conflict. Every other output key is written by a
> single node, so no reducer is required.

- [ ] **Step 5: Create `backend/app/graph/build.py`**

```python
from langgraph.graph import END, START, StateGraph

from app.agents.brand import brand
from app.agents.copywriter import copywriter
from app.agents.fusion import fusion
from app.agents.planner import planner
from app.agents.research import research
from app.agents.reviewer import reviewer
from app.agents.seo import seo
from app.graph.state import GraphState


def build_graph():
    """Assemble and compile the 7-agent Facebook Post pipeline."""
    graph = StateGraph(GraphState)

    graph.add_node("planner", planner)
    graph.add_node("research", research)
    graph.add_node("seo", seo)
    graph.add_node("brand", brand)
    graph.add_node("fusion", fusion)
    graph.add_node("copywriter", copywriter)
    graph.add_node("reviewer", reviewer)

    graph.add_edge(START, "planner")
    # fan-out
    graph.add_edge("planner", "research")
    graph.add_edge("planner", "seo")
    graph.add_edge("planner", "brand")
    # fan-in: fusion runs after all three parallel branches complete
    graph.add_edge("research", "fusion")
    graph.add_edge("seo", "fusion")
    graph.add_edge("brand", "fusion")
    # linear tail
    graph.add_edge("fusion", "copywriter")
    graph.add_edge("copywriter", "reviewer")
    graph.add_edge("reviewer", END)

    return graph.compile()
```

- [ ] **Step 6: Run the graph test to verify it passes**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_graph.py -v`
Expected: PASS (2 tests). Confirms the parallel fan-out/fan-in and deterministic mock output.

- [ ] **Step 7: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/app/graph/ backend/tests/test_graph.py
git commit -m "feat(backend): assemble LangGraph 7-agent Facebook Post pipeline"
```

---

### Task 7: generation_jobs model + session-maker dependency

**Files:**
- Create: `backend/app/models/generation_job.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/app/core/db.py`
- Test: `backend/tests/test_models.py` (extend)

- [ ] **Step 1: Append a failing test to `backend/tests/test_models.py`**

```python
async def test_generation_job_persists_with_json_result():
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from sqlalchemy.pool import StaticPool

    from app.core.db import Base
    import app.models  # noqa: F401  registers all models on Base.metadata
    from app.models.generation_job import GenerationJob

    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async with maker() as session:
        job = GenerationJob(
            project_id=1,
            content_type="facebook_post",
            status="queued",
        )
        session.add(job)
        await session.commit()
        await session.refresh(job)
        assert job.id is not None
        assert job.status == "queued"
        assert job.current_step is None
        assert job.result_json is None
        assert job.created_at is not None

        job.status = "done"
        job.result_json = {"final": {"hook": "h"}}
        await session.commit()
        await session.refresh(job)
        assert job.result_json["final"]["hook"] == "h"

    await engine.dispose()


def test_get_session_maker_returns_configured_maker():
    from app.core.db import async_session_maker, get_session_maker

    assert get_session_maker() is async_session_maker
```

- [ ] **Step 2: Run to verify it fails**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_models.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.models.generation_job'`.

- [ ] **Step 3: Create `backend/app/models/generation_job.py`**

```python
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    content_type: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default="queued")
    current_step: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # JSONB on Postgres, portable JSON on SQLite (tests)
    result_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

- [ ] **Step 4: Modify `backend/app/models/__init__.py`** to register the new model. The full file becomes:

```python
from app.models.generation_job import GenerationJob
from app.models.project import Project
from app.models.user import User

__all__ = ["GenerationJob", "Project", "User"]
```

- [ ] **Step 5: Modify `backend/app/core/db.py`** — add a `get_session_maker` dependency at the end of the file (keep all existing content):

```python
def get_session_maker() -> async_sessionmaker[AsyncSession]:
    """Dependency that exposes the session factory.

    Background tasks must open their OWN session (the request's get_session is
    already closed by the time a FastAPI BackgroundTask runs), so the generate
    endpoint injects this factory and hands it to the job runner.
    """
    return async_session_maker
```

> `async_sessionmaker` and `AsyncSession` are already imported at the top of `db.py` (added in M1), so no new imports are needed.

- [ ] **Step 6: Run the model tests to verify they pass**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_models.py -v`
Expected: PASS (the M1 model test + 2 new tests).

- [ ] **Step 7: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/app/models/generation_job.py backend/app/models/__init__.py backend/app/core/db.py backend/tests/test_models.py
git commit -m "feat(backend): add generation_jobs model + session-maker dependency"
```

---

### Task 8: Generation orchestration service

**Files:**
- Create: `backend/app/services/generation_service.py`
- Test: `backend/tests/test_generation_service.py`

> The runner streams the graph with `stream_mode="updates"`, accumulating the
> per-node deltas into a local state dict (so it does one pass, not two) while
> persisting `current_step` after each node. Each DB touch opens its own session
> from the injected maker.

- [ ] **Step 1: Write the failing test** — `backend/tests/test_generation_service.py`

```python
from app.models.generation_job import GenerationJob
from app.services.generation_service import (
    create_job,
    get_job_for_user,
    run_generation_job,
)


def _initial_state(brief="eco-friendly water bottles"):
    return {
        "project_id": 1,
        "content_type": "facebook_post",
        "brief": brief,
        "marketing_goal": "awareness",
        "brand_profile": {},
        "provider_available": False,
        "errors": [],
    }


async def test_run_generation_job_completes_and_stores_result(session_maker):
    async with session_maker() as session:
        job = await create_job(
            session,
            project_id=1,
            content_type="facebook_post",
            brief="eco-friendly water bottles",
            marketing_goal="awareness",
        )
        job_id = job.id
        assert job.status == "queued"

    await run_generation_job(session_maker, job_id, _initial_state())

    async with session_maker() as session:
        done = await session.get(GenerationJob, job_id)
        assert done.status == "done"
        assert done.current_step == "reviewer"  # last node streamed
        assert done.result_json["final"]["hook"]
        assert 0 <= done.result_json["review"]["score"] <= 100


async def test_run_generation_job_records_error_on_failure(session_maker):
    async with session_maker() as session:
        job = await create_job(
            session,
            project_id=1,
            content_type="facebook_post",
            brief="x",
            marketing_goal="",
        )
        job_id = job.id

    # A state missing the required "brief" key makes the agents raise → job errors.
    bad_state = {"provider_available": False, "errors": []}
    await run_generation_job(session_maker, job_id, bad_state)

    async with session_maker() as session:
        failed = await session.get(GenerationJob, job_id)
        assert failed.status == "error"
        assert failed.error


async def test_get_job_for_user_enforces_ownership(session_maker):
    from app.models.project import Project
    from app.models.user import User

    async with session_maker() as session:
        owner = User(name="O", email="o@example.com", password_hash="x")
        other = User(name="X", email="x@example.com", password_hash="x")
        session.add_all([owner, other])
        await session.commit()
        await session.refresh(owner)
        await session.refresh(other)
        project = Project(user_id=owner.id, name="P")
        session.add(project)
        await session.commit()
        await session.refresh(project)
        job = await create_job(
            session, project.id, "facebook_post", "brief", ""
        )
        job_id, owner_id, other_id = job.id, owner.id, other.id

    async with session_maker() as session:
        assert (await get_job_for_user(session, job_id, owner_id)) is not None
        assert (await get_job_for_user(session, job_id, other_id)) is None
```

- [ ] **Step 2: Run to verify it fails**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_generation_service.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.generation_service'`.

- [ ] **Step 3: Create `backend/app/services/generation_service.py`**

```python
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.graph.build import build_graph
from app.models.generation_job import GenerationJob
from app.models.project import Project

_RESULT_KEYS = (
    "plan",
    "research",
    "seo",
    "brand_context",
    "fused_brief",
    "draft",
    "review",
    "final",
)


async def create_job(
    session: AsyncSession,
    project_id: int,
    content_type: str,
    brief: str,
    marketing_goal: str,
) -> GenerationJob:
    job = GenerationJob(
        project_id=project_id, content_type=content_type, status="queued"
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)
    return job


async def get_job_for_user(
    session: AsyncSession, job_id: int, user_id: int
) -> GenerationJob | None:
    result = await session.execute(
        select(GenerationJob)
        .join(Project, GenerationJob.project_id == Project.id)
        .where(GenerationJob.id == job_id, Project.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def _set_step(
    session_maker: async_sessionmaker[AsyncSession], job_id: int, step: str
) -> None:
    async with session_maker() as session:
        job = await session.get(GenerationJob, job_id)
        if job is not None:
            job.current_step = step
            await session.commit()


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
    except Exception as exc:  # noqa: BLE001 — any agent/LLM failure marks the job errored
        async with session_maker() as session:
            job = await session.get(GenerationJob, job_id)
            if job is not None:
                job.status = "error"
                job.error = str(exc)
                await session.commit()
```

- [ ] **Step 4: Run the service tests to verify they pass**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_generation_service.py -v`
Expected: PASS (3 tests). The success path streams all 7 nodes (last `current_step` is `reviewer`); the error path marks the job `error`; ownership is enforced via the project join.

- [ ] **Step 5: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/app/services/generation_service.py backend/tests/test_generation_service.py
git commit -m "feat(backend): add generation orchestration service (stream + persist)"
```

---

### Task 9: `/generate` + poll endpoints (async job)

**Files:**
- Create: `backend/app/schemas/generation.py`
- Create: `backend/app/api/generate.py`
- Modify: `backend/app/main.py`
- Modify: `backend/tests/conftest.py`
- Test: `backend/tests/test_generate.py`

- [ ] **Step 1: Modify `backend/tests/conftest.py`** to also override `get_session_maker` so the background task uses the same in-memory engine. The full file becomes:

```python
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  register models on Base.metadata
from app.core.db import Base, get_session, get_session_maker
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
    app.dependency_overrides[get_session_maker] = lambda: session_maker
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
```

- [ ] **Step 2: Write the failing test** — `backend/tests/test_generate.py`

```python
async def _register(client, email="gen@example.com"):
    resp = await client.post(
        "/auth/register",
        json={"name": "Gen", "email": email, "password": "secret123"},
    )
    return resp.json()["access_token"]


async def _project(client, headers):
    resp = await client.post("/projects", json={"name": "Launch"}, headers=headers)
    return resp.json()["id"]


async def test_generate_requires_auth(client):
    resp = await client.post(
        "/generate",
        json={"project_id": 1, "brief": "eco bottles"},
    )
    assert resp.status_code in (401, 403)


async def test_generate_then_poll_completes_in_mock_mode(client):
    token = await _register(client)
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)

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
    assert start.json()["status"] in ("queued", "running", "done")

    # FastAPI runs the BackgroundTask before the ASGI response is fully consumed,
    # so by the time the POST returns (mock mode), the job is already done.
    poll = await client.get(f"/generate/{job_id}", headers=headers)
    assert poll.status_code == 200
    body = poll.json()
    assert body["status"] == "done"
    assert body["current_step"] == "reviewer"
    assert body["result"]["final"]["hook"]
    assert 0 <= body["result"]["review"]["score"] <= 100
    assert body["error"] is None


async def test_generate_rejects_unsupported_content_type(client):
    token = await _register(client, "ct@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)
    resp = await client.post(
        "/generate",
        json={
            "project_id": project_id,
            "content_type": "tiktok_script",
            "brief": "x",
        },
        headers=headers,
    )
    assert resp.status_code == 400


async def test_generate_rejects_other_users_project(client):
    token_a = await _register(client, "a@example.com")
    project_a = await _project(client, {"Authorization": f"Bearer {token_a}"})
    token_b = await _register(client, "b@example.com")
    resp = await client.post(
        "/generate",
        json={"project_id": project_a, "brief": "x"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 404


async def test_poll_unknown_job_is_404(client):
    token = await _register(client, "nf@example.com")
    resp = await client.get(
        "/generate/99999", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 404
```

- [ ] **Step 3: Run to verify it fails**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_generate.py -v`
Expected: FAIL — 404/405 on `/generate` (route not defined yet).

- [ ] **Step 4: Create `backend/app/schemas/generation.py`**

```python
from pydantic import BaseModel


class GenerateRequest(BaseModel):
    project_id: int
    content_type: str = "facebook_post"
    brief: str
    marketing_goal: str = ""


class JobResponse(BaseModel):
    job_id: int
    status: str


class JobStatusResponse(BaseModel):
    id: int
    status: str
    current_step: str | None = None
    result: dict | None = None
    error: str | None = None
```

- [ ] **Step 5: Create `backend/app/api/generate.py`**

```python
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.deps import get_current_user
from app.core.db import get_session, get_session_maker
from app.llm.factory import provider_available
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
        "brand_profile": {},
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

- [ ] **Step 6: Modify `backend/app/main.py`** to include the generate router. The full file becomes:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, generate, projects
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
app.include_router(generate.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}
```

- [ ] **Step 7: Run the generate tests to verify they pass**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_generate.py -v`
Expected: PASS (5 tests).

- [ ] **Step 8: Run the full suite**

Run: `.\.venv\Scripts\python.exe -m pytest tests/ -q`
Expected: all tests pass (M0+M1 plus M2: factory, agent schemas, agents, graph, models, generation service, generate API).

- [ ] **Step 9: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/app/schemas/generation.py backend/app/api/generate.py backend/app/main.py backend/tests/conftest.py backend/tests/test_generate.py
git commit -m "feat(backend): add async /generate + poll endpoints (BackgroundTasks)"
```

---

### Task 10: Alembic migration for `generation_jobs` (Postgres)

**Files:**
- Create: `backend/alembic/versions/<hash>_add_generation_jobs.py` (via autogenerate)

> Needs Docker Postgres reachable on `localhost:5432`. Start it: `docker compose up -d db` (from repo root). The M1 baseline migration already created `users` + `projects` in this volume.

- [ ] **Step 1: Ensure Postgres is up and the baseline is applied**

```powershell
cd E:\product\mkt_post_build
docker compose up -d db
cd backend
$env:DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/marketing"
.\.venv\Scripts\alembic.exe upgrade head
```
Expected: `alembic upgrade head` is clean (baseline already applied or applies now).

- [ ] **Step 2: Autogenerate the `generation_jobs` migration**

```powershell
.\.venv\Scripts\alembic.exe revision --autogenerate -m "add generation_jobs"
```
Expected: a new file in `alembic/versions/` whose `upgrade()` contains `op.create_table("generation_jobs", ...)` with columns `id, project_id (FK→projects.id), content_type, status, current_step, result_json (JSONB), error, created_at, updated_at`. (It must NOT recreate `users`/`projects`. If those appear, `import app.models` isn't registering models in `env.py` — re-check and regenerate.)

- [ ] **Step 3: Apply the migration and verify the table exists**

```powershell
.\.venv\Scripts\alembic.exe upgrade head
docker compose exec db psql -U postgres -d marketing -c "\dt"
docker compose exec db psql -U postgres -d marketing -c "\d generation_jobs"
```
Expected: `\dt` lists `generation_jobs`; `\d generation_jobs` shows the `result_json` column typed `jsonb` and the FK to `projects`.

- [ ] **Step 4: Sanity-check the generated migration file**

Open `backend/alembic/versions/<hash>_add_generation_jobs.py`. Confirm `upgrade()` creates only `generation_jobs` and `downgrade()` drops it.

- [ ] **Step 5: Commit**

```bash
cd E:/product/mkt_post_build
git add backend/alembic/versions/
git commit -m "feat(backend): add Alembic migration for generation_jobs"
```

---

### Task 11: Live verification against the Docker stack

**Files:** none (verification only).

> If `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY` with `LLM_PROVIDER=anthropic`) is set in `.env`, the pipeline calls the real API; otherwise it runs in mock mode. Either way the job reaches `status: "done"`.

- [ ] **Step 1: Rebuild and start the full stack**

```bash
cd E:/product/mkt_post_build
docker compose up --build -d
docker compose ps
```
Expected: all four services Up; `db` healthy. The rebuilt backend image now includes the agents/graph/generate code and the LangChain deps. (The `generation_jobs` table already exists from Task 10 in the same Postgres volume; the backend does not auto-migrate.)

- [ ] **Step 2: Register a user and capture the token**

```bash
curl -s -X POST http://localhost:8000/auth/register -H "Content-Type: application/json" -d "{\"name\":\"Live\",\"email\":\"live-m2@example.com\",\"password\":\"secret123\"}"
```
Expected: JSON with `access_token`. Copy it.

- [ ] **Step 3: Create a project**

```bash
curl -s -X POST http://localhost:8000/projects -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d "{\"name\":\"M2 Project\"}"
```
Expected: JSON with a project `id`. Copy it.

- [ ] **Step 4: Start a generation job**

```bash
curl -s -X POST http://localhost:8000/generate -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d "{\"project_id\":<PROJECT_ID>,\"content_type\":\"facebook_post\",\"brief\":\"eco-friendly water bottles\",\"marketing_goal\":\"awareness\"}"
```
Expected: HTTP 202-style JSON `{ "job_id": <id>, "status": "queued" }`. Copy the `job_id`.

- [ ] **Step 5: Poll until done**

```bash
curl -s http://localhost:8000/generate/<JOB_ID> -H "Authorization: Bearer <TOKEN>"
```
Expected: JSON with `status` progressing to `"done"`, `current_step":"reviewer"`, and a `result` object containing `draft`, `review` (with `score` + `suggestions`), and `final` (hook/body/cta/hashtags). Re-run the command a few times if `status` is still `running` (real-LLM mode takes a few seconds; mock mode is immediate).

- [ ] **Step 6: Confirm unauthenticated generate is rejected**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8000/generate -H "Content-Type: application/json" -d "{\"project_id\":1,\"brief\":\"nope\"}"
```
Expected: `401` or `403`.

- [ ] **Step 7: No commit needed** (verification only). If everything passed, M2 is done.

---

## Definition of Done (M2)

- `pytest` in `backend/` passes all tests: M0+M1 plus M2 (LLM factory, agent schemas, 7 agents, graph e2e + determinism, generation_jobs model + session-maker, generation service success/error/ownership, `/generate` + poll API).
- The LangGraph pipeline runs end-to-end **offline** (mock mode) and is deterministic.
- `POST /generate` returns a `job_id`; the background task streams the graph, updating `current_step` per node; `GET /generate/{job_id}` returns `done` with the structured Facebook Post (`final`) + `review` score/suggestions.
- Project ownership is enforced on both endpoints; unsupported content types are rejected (400); unknown jobs return 404.
- Alembic migration creates `generation_jobs` in Postgres; `alembic upgrade head` is clean.
- Live: register → create project → generate → poll reaches `done` with a real result, in mock or real-LLM mode.
- All work committed on `m2-llm-pipeline`.

---

## Self-review notes

- **Spec coverage:**
  - §3 LLM abstraction — `get_chat_model(tier)` via `init_chat_model` (provider/model from env); mock fallback when no key (`provider_available()`).
  - §4 multi-agent workflow — all 7 nodes; planner → research/seo/brand **parallel** fan-out → fusion fan-in → copywriter → reviewer; each returns validated Pydantic (`with_structured_output` on the real path); reviewer is single-pass (score + suggestions + `final_content`).
  - §6 Facebook Post fields — `FacebookPostDraft(hook, body, cta, hashtags[])`.
  - §8 `generation_jobs` — model + migration (status/current_step/result_json/error/timestamps); `JSON().with_variant(JSONB, "postgresql")` keeps SQLite tests portable while Postgres gets JSONB.
  - §9 `/generate` (returns `job_id`) + `/generate/{job_id}` (status + current_step + result), auth-guarded, async via `BackgroundTasks`, per-node `current_step` updates.
  - §14 error handling — orchestrator-level try/except marks the job `error` with a readable message and preserves partial progress via `current_step`.
- **Intentional M2 scope cuts (deferred, documented):**
  - **Brand agent** returns empty RAG context now; Qdrant retrieval is **M3**.
  - **Brand voice** is passed through as an empty `brand_profile`; real config injection is **M4**.
  - **Planner** is deterministic (the fan-out is static), so it makes no LLM call — YAGNI.
  - Per-agent (vs orchestrator-level) error annotation into `errors[]` is a documented future refinement.
  - `content_history` table + `/history` endpoints are **not** in M2 (later milestones); M2 persists only to `generation_jobs`.
  - Only `facebook_post` is supported; the other four content types are **M6**.
- **Async correctness:** background tasks open their own session via the injected `get_session_maker` (the request's `get_session` is already closed when a FastAPI `BackgroundTask` runs); tests override both `get_session` and `get_session_maker` to the same in-memory StaticPool engine, and FastAPI runs the background task before the ASGI response is consumed, so the poll observes `done` deterministically.
- **Type consistency:** `provider_available`/`get_chat_model`, `generate_structured`, every agent's `state -> {key: ...}` contract, the `GraphState` keys, `build_graph`, `GenerationJob`, `create_job`/`run_generation_job`/`get_job_for_user`, `get_session_maker`, and `GenerateRequest`/`JobResponse`/`JobStatusResponse` are referenced consistently across tasks. Reviewer emits both `review` and `final`; the service collects `final` into `result_json`; the API surfaces it as `result.final`.
```
