# Quick Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route `facebook_post`/`email`/`tiktok_script`/`landing_page`/`marketing_plan` generation through a synchronous 1-2-LLM-call path instead of the 5-7-call multi-agent graph + job-polling pipeline (kept for `seo_blog` only), and fix Vitba Mail/Landing's standalone builders to load the customer's saved `BrandProfile` via `project_id`.

**Architecture:** See `docs/superpowers/specs/2026-06-30-quick-generation-design.md` for full rationale. Part 1 (Tasks 1-4) adds `run_quick_generation()` reusing existing `copywriter`/`reviewer`/`landing_page_coder`/`marketing_planner_rag` agent functions unmodified, branches `POST /generate` on `content_type`, and updates the frontend polling loop to skip itself when the response is already final. Part 2 (Tasks 5-8) adds `project_id` to the Email/Landing builder endpoints and a shared `brand_profile_service` to load `BrandProfile`.

**Tech Stack:** FastAPI, SQLAlchemy async, Pydantic, LangChain (`generate_structured`), pytest + pytest-asyncio (backend), Next.js/Zustand (frontend).

## Global Constraints

- `seo_blog` keeps its exact current behavior: `202 Accepted`, `job_id`, background task, client polling. No task in this plan touches `backend/app/graph/build.py` or `run_generation_job`.
- `copywriter()` (`backend/app/agents/copywriter.py:302`), `reviewer()` (`backend/app/agents/reviewer.py:42`), `landing_page_coder()` (`backend/app/agents/landing_page_coder.py:63`), and `marketing_planner_rag()` (`backend/app/agents/marketing_planner_rag.py:65`) must not be modified — call them as-is.
- `PREMIUM_PLANS = {"pro", "max"}` is defined in `backend/app/graph/build.py:15` — reuse it, do not redefine.
- All Vietnamese-facing error copy must be 100% Vietnamese (existing repo convention).
- `GenerationJob` rows must still be created for quick-path content types (quota/rate-limit counting depends on `GenerationJob.created_at` rows — `backend/app/core/plan_limits.py:90,100-108`).
- Two existing tests in `backend/tests/test_generate.py` (`test_generate_then_poll_completes_in_mock_mode`, `test_generate_uses_brand_profile_in_output`) use `content_type="facebook_post"` and assert the old `202`+polling contract — these **must be updated** in Task 3 to the new `200`+inline-result contract, since `facebook_post` is moving to the quick path.

---

## Part 1: Quick Generation

### Task 1: Extend `JobResponse` schema with `result`/`error`

**Files:**
- Modify: `backend/app/schemas/generation.py:16-18`
- Test: `backend/tests/test_generate.py` (new test in same file, existing style)

**Interfaces:**
- Produces: `JobResponse(job_id: int, status: str, result: dict | None = None, error: str | None = None)` — `result`/`error` default `None` so all existing `JobResponse(job_id=..., status=...)` call sites keep working unchanged.

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/test_generate.py`:

```python
def test_job_response_accepts_result_and_error_fields():
    from app.schemas.generation import JobResponse

    r1 = JobResponse(job_id=1, status="done", result={"draft": {"hook": "x"}})
    assert r1.result == {"draft": {"hook": "x"}}
    assert r1.error is None

    r2 = JobResponse(job_id=1, status="error", error="Có lỗi xảy ra.")
    assert r2.error == "Có lỗi xảy ra."
    assert r2.result is None

    r3 = JobResponse(job_id=1, status="queued")
    assert r3.result is None and r3.error is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_generate.py::test_job_response_accepts_result_and_error_fields -v`
Expected: FAIL with `TypeError: JobResponse.__init__() got an unexpected keyword argument 'result'`

- [ ] **Step 3: Write minimal implementation**

Replace `backend/app/schemas/generation.py:16-18`:

```python
class JobResponse(BaseModel):
    job_id: int
    status: str
    result: dict | None = None
    error: str | None = None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_generate.py::test_job_response_accepts_result_and_error_fields -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/generation.py backend/tests/test_generate.py
git commit -m "feat: add optional result/error fields to JobResponse"
```

---

### Task 2: `run_quick_generation()` in `generation_service.py`

**Files:**
- Modify: `backend/app/services/generation_service.py` (add `import asyncio` at top; extend the `from app.graph.build import build_graph` line; add two new functions after `run_generation_job`)
- Test: `backend/tests/test_generation_service.py`

**Interfaces:**
- Consumes: `copywriter(state: dict) -> dict` (`app.agents.copywriter`), `reviewer(state: dict) -> dict` (`app.agents.reviewer`), `landing_page_coder(state: dict) -> dict` (`app.agents.landing_page_coder`, returns `{"final": {...}, "formatted_final": {...}}` — no `"draft"` key), `marketing_planner_rag(state: dict) -> dict` (`app.agents.marketing_planner_rag`, same shape as `landing_page_coder`), `brand(state: dict) -> dict` (`app.agents.brand`, returns `{"brand_output": {"relevant_context": list[str], "brand_notes": str}}`), `PREMIUM_PLANS: set[str]` (`app.graph.build`), `history_service.save_to_history(session, project_id, content_type, prompt, output, score=None)` (already imported in this file), `GenerationJob` model (already imported), `_RESULT_KEYS = ("draft", "final", "formatted_final")` (already defined in this file at line 15).
- Produces: `async def run_quick_generation(session_maker, job_id: int, initial_state: dict) -> tuple[dict | None, str | None]` — returns `(result, None)` on success or `(None, error_message)` on failure. Task 3 calls this directly.

- [ ] **Step 1: Write the failing tests**

Add to `backend/tests/test_generation_service.py` (reuses the existing `_initial_state()` helper already in that file):

```python
from app.services.generation_service import run_quick_generation


@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_run_quick_generation_facebook_post_free_plan_skips_reviewer(
    mock_embed, mock_retrieve, session_maker
):
    async with session_maker() as session:
        job = await create_job(session, 1, "facebook_post", "eco bottles", "awareness")
        job_id = job.id

    state = _initial_state()
    state["user_plan"] = "free"
    result, error = await run_quick_generation(session_maker, job_id, state)

    assert error is None
    assert result["draft"]["hook"]
    assert "review" not in (result.get("final") or {})

    async with session_maker() as session:
        done = await session.get(GenerationJob, job_id)
        assert done.status == "done"
        assert done.result_json["draft"]["hook"]


@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_run_quick_generation_premium_plan_runs_reviewer(
    mock_embed, mock_retrieve, session_maker
):
    async with session_maker() as session:
        job = await create_job(session, 1, "facebook_post", "eco bottles", "awareness")
        job_id = job.id

    state = _initial_state()
    state["user_plan"] = "pro"
    result, error = await run_quick_generation(session_maker, job_id, state)

    assert error is None
    # provider_available=False -> reviewer's mock-mode review with score=0 is recorded
    async with session_maker() as session:
        done = await session.get(GenerationJob, job_id)
        assert done.status == "done"


async def test_run_quick_generation_landing_page_uses_landing_coder(session_maker):
    async with session_maker() as session:
        job = await create_job(session, 1, "landing_page", "eco bottles", "")
        job_id = job.id

    state = _initial_state()
    state["content_type"] = "landing_page"
    state["user_plan"] = "free"
    with patch(
        "app.agents.landing_page_coder.landing_page_coder",
        return_value={"final": {"body": "<html>x</html>"}, "formatted_final": {"body": "<html>x</html>"}},
    ):
        result, error = await run_quick_generation(session_maker, job_id, state)

    assert error is None
    assert result["final"]["body"] == "<html>x</html>"


async def test_run_quick_generation_handles_exception_with_friendly_message(session_maker):
    async with session_maker() as session:
        job = await create_job(session, 1, "facebook_post", "eco bottles", "awareness")
        job_id = job.id

    state = _initial_state()
    state["user_plan"] = "free"
    with patch("app.agents.copywriter.copywriter", side_effect=RuntimeError("boom")):
        result, error = await run_quick_generation(session_maker, job_id, state)

    assert result is None
    assert error == "Có lỗi xảy ra trong quá trình tạo nội dung. Vui lòng thử lại sau ít phút."
    assert "boom" not in error

    async with session_maker() as session:
        failed = await session.get(GenerationJob, job_id)
        assert failed.status == "error"
        assert failed.error == error
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_generation_service.py -k run_quick_generation -v`
Expected: FAIL with `ImportError: cannot import name 'run_quick_generation'`

- [ ] **Step 3: Write minimal implementation**

In `backend/app/services/generation_service.py`, change the top imports (line 1-13) — add `import asyncio` and extend the build import:

```python
import asyncio
import logging
from typing import Any

from sqlalchemy import select

logger = logging.getLogger(__name__)
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.graph.build import build_graph, PREMIUM_PLANS
from app.models.generation_job import GenerationJob
from app.models.project import Project
from app.services import history_service
from app.core.tracing import get_langfuse_handler, trace_request, current_trace_id
```

Then append at the end of the file (after `run_generation_job`'s closing line):

```python
async def _inject_brand_rag(state: dict[str, Any]) -> dict[str, Any]:
    """Best-effort brand-doc RAG lookup, folded into a synthetic fused_output
    so copywriter()'s existing fused_output handling picks it up unmodified."""
    from app.agents.brand import brand

    brand_delta = await brand(state)
    brand_output = brand_delta.get("brand_output") or {}
    chunks = brand_output.get("relevant_context") or []
    if chunks:
        state["fused_output"] = {"unified_brief": "\n".join(chunks)}
    return state


async def run_quick_generation(
    session_maker: async_sessionmaker[AsyncSession],
    job_id: int,
    initial_state: dict[str, Any],
) -> tuple[dict | None, str | None]:
    """Synchronous 1-2 LLM-call generation for non-SEO-blog content types.
    Returns (result, error) -- exactly one is non-None."""
    from app.agents.copywriter import copywriter
    from app.agents.reviewer import reviewer
    from app.agents.landing_page_coder import landing_page_coder
    from app.agents.marketing_planner_rag import marketing_planner_rag

    state = dict(initial_state)
    user_plan = state.get("user_plan", "free")
    content_type = state.get("content_type")

    try:
        async with asyncio.timeout(45):
            if content_type == "landing_page":
                delta = await landing_page_coder(state)
            elif content_type == "marketing_plan":
                delta = await marketing_planner_rag(state)
            else:
                state = await _inject_brand_rag(state)
                delta = await copywriter(state)
                state.update(delta)
                if user_plan in PREMIUM_PLANS:
                    review_delta = await reviewer(state)
                    state.update(review_delta)
                    delta = state
    except Exception as exc:
        logger.error("Quick generation failed job_id=%s error=%s", job_id, exc)
        message = (
            "Quá trình tạo nội dung mất quá nhiều thời gian. Vui lòng thử lại."
            if isinstance(exc, asyncio.TimeoutError)
            else "Có lỗi xảy ra trong quá trình tạo nội dung. Vui lòng thử lại sau ít phút."
        )
        async with session_maker() as session:
            job = await session.get(GenerationJob, job_id)
            if job is not None:
                job.status = "error"
                job.error = message
                await session.commit()
        return None, message

    result = {key: delta.get(key) for key in _RESULT_KEYS}
    async with session_maker() as session:
        job = await session.get(GenerationJob, job_id)
        if job is not None:
            job.status = "done"
            job.result_json = result
            await session.commit()
        score = (delta.get("review") or {}).get("score")
        await history_service.save_to_history(
            session, state["project_id"], content_type, state["brief"], result, score=score
        )
    return result, None
```

Add the new test imports at the top of `backend/tests/test_generation_service.py`:

```python
from app.services.generation_service import (
    create_job,
    get_job_for_user,
    run_generation_job,
    run_quick_generation,
)
```

(replaces the existing 3-name import with the 4-name version.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_generation_service.py -v`
Expected: All PASS (existing + 4 new tests)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/generation_service.py backend/tests/test_generation_service.py
git commit -m "feat: add run_quick_generation for synchronous single-call content types"
```

---

### Task 3: Branch `POST /generate` on content_type

**Files:**
- Modify: `backend/app/api/generate.py:129-157`
- Modify (update existing tests for the new contract): `backend/tests/test_generate.py`

**Interfaces:**
- Consumes: `generation_service.run_quick_generation(session_maker, job_id, initial_state)` (Task 2), `JobResponse(job_id, status, result=None, error=None)` (Task 1).

- [ ] **Step 1: Write the failing/updated tests**

In `backend/tests/test_generate.py`, replace `test_generate_then_poll_completes_in_mock_mode` (lines 25-55) with:

```python
@patch("app.api.generate.provider_available", return_value=False)
@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_generate_facebook_post_returns_synchronously(mock_embed, mock_retrieve, mock_provider, client):
    token = await _register(client)
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)

    resp = await client.post(
        "/generate",
        json={
            "project_id": project_id,
            "content_type": "facebook_post",
            "brief": "eco-friendly water bottles",
            "marketing_goal": "awareness",
        },
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "done"
    assert body["job_id"]
    assert body["result"]["draft"]["hook"]
    assert body["error"] is None


@patch("app.api.generate.provider_available", return_value=False)
async def test_generate_seo_blog_still_returns_202_and_polls(mock_provider, client):
    token = await _register(client, "seo@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)

    start = await client.post(
        "/generate",
        json={
            "project_id": project_id,
            "content_type": "seo_blog",
            "brief": "eco-friendly water bottles",
            "marketing_goal": "awareness",
        },
        headers=headers,
    )
    assert start.status_code == 202
    job_id = start.json()["job_id"]
    assert start.json()["status"] in ("queued", "running", "done")

    poll = await client.get(f"/generate/{job_id}", headers=headers)
    assert poll.status_code == 200
    assert poll.json()["status"] == "done"
```

Replace `test_generate_uses_brand_profile_in_output` (lines 94-136) with:

```python
@patch("app.api.generate.provider_available", return_value=False)
@patch("app.agents.brand.retrieve", return_value=[])
@patch("app.agents.brand.embed_query", return_value=[0.1] * 384)
async def test_generate_uses_brand_profile_in_output(mock_embed, mock_retrieve, mock_provider, client):
    token = await _register(client, "bp@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    project_id = await _project(client, headers)

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

    resp = await client.post(
        "/generate",
        json={
            "project_id": project_id,
            "content_type": "facebook_post",
            "brief": "eco-friendly water bottles",
            "marketing_goal": "awareness",
        },
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "done"
    assert "EcoBottle" in body["result"]["draft"]["hook"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_generate.py -v`
Expected: `test_generate_facebook_post_returns_synchronously` and `test_generate_seo_blog_still_returns_202_and_polls` FAIL (old code always returns 202 for every content_type); `test_generate_uses_brand_profile_in_output` FAILs on `assert resp.status_code == 200` (gets 202).

- [ ] **Step 3: Write minimal implementation**

Replace `backend/app/api/generate.py:129-157`:

```python
    job = await generation_service.create_job(
        session,
        payload.project_id,
        payload.content_type,
        payload.brief,
        payload.marketing_goal,
    )
    initial_state = {
        "user_id": current_user.id,   # NEW — needed for trace_request() in run_generation_job
        "project_id": payload.project_id,
        "content_type": payload.content_type,
        "brief": payload.brief,
        "marketing_goal": payload.marketing_goal,
        "brand_profile": brand_profile_data,
        "custom_template": custom_template,
        "user_plan": user_plan,
        "industry": payload.industry,
        "target_audience": payload.target_audience,
        "tone": payload.tone,
        "cta_text": payload.cta_text,
        "custom_structure": payload.custom_structure,
        "formatted_final": {},
        "provider_available": provider_available(),
        "errors": [],
    }

    if payload.content_type == "seo_blog":
        background_tasks.add_task(
            generation_service.run_generation_job, session_maker, job.id, initial_state
        )
        return JobResponse(job_id=job.id, status=job.status)

    result, error = await generation_service.run_quick_generation(
        session_maker, job.id, initial_state
    )
    if error:
        return JobResponse(job_id=job.id, status="error", error=error)
    return JobResponse(job_id=job.id, status="done", result=result)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_generate.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/generate.py backend/tests/test_generate.py
git commit -m "feat: branch POST /generate on content_type — quick path for all but seo_blog"
```

---

### Task 4: Frontend — skip polling when the response is already final

**Files:**
- Modify: `frontend/store/chat.ts:427-574` (the `startGeneration` action)

**Interfaces:**
- Consumes: the new `JobResponse` shape from Task 3 — `{job_id, status: "queued" | "done" | "error", result?, error?}`.

- [ ] **Step 1: Identify the manual test (no frontend test framework covers this file)**

Manual verification plan (run after Step 3): start the frontend dev server, open a chat conversation, send a message that triggers `facebook_post` generation (e.g. "Viết bài facebook về sản phẩm nước rửa tay hữu cơ"), confirm the result renders within ~5-10s with no intermediate "Đang xử lý..." polling text, then repeat with a message that triggers `seo_blog` generation and confirm the existing polling/progress-step UI still appears.

- [ ] **Step 2: (no automated failing test for this step — frontend logic change verified manually per Step 1)**

- [ ] **Step 3: Implement the branch**

In `frontend/store/chat.ts`, replace the `startGeneration` action body from `const res = await fetch(...)` (current line ~436) through the end of the `try` block (current line ~573) with:

```typescript
      startGeneration: async (payload: any, targetConvId?: number) => {
        const convId = targetConvId || get().activeConversationId;
        if (!convId) return;

        const token = getToken();
        const baseUrl = API_BASE_URL;
        const isFg = () => get().activeConversationId === convId;

        const handleResult = (statusData: any) => {
          if (statusData.status === "error") {
            if (isFg()) {
              set({
                contentPanel: { visible: false, generating: false, result: { error: statusData.error } },
                streamContent: "",
              });
            }
            set((s) => {
              if (!s.backgroundTasks[convId]) return s;
              return { backgroundTasks: { ...s.backgroundTasks, [convId]: { ...s.backgroundTasks[convId], status: "error" } } };
            });
            return;
          }

          if (statusData.status === "done" && statusData.result) {
            let draftText = "";
            if (statusData.result.draft) {
              const d = statusData.result.draft;
              if (payload.content_type === "facebook_post") {
                draftText = [d.hook, "", d.body, "", d.cta, "", d.hashtags?.join(" ")].filter(Boolean).join("\n");
              } else if (payload.content_type === "seo_blog") {
                const faqText = d.faq?.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n") ?? "";
                draftText = [d.seo_title, d.meta_description, "", d.blog_content, "", faqText].filter(Boolean).join("\n");
              } else if (payload.content_type === "email") {
                draftText = [`Subject: ${d.subject}`, "", d.body, "", d.cta].filter(Boolean).join("\n");
              } else if (payload.content_type === "landing_page") {
                draftText = [d.headline, d.subheadline, "", d.benefits?.map((b: string) => `• ${b}`).join("\n"), "", d.cta].filter(Boolean).join("\n");
              } else if (payload.content_type === "tiktok_script") {
                draftText = [`[HOOK] ${d.hook}`, "", d.script, "", `[CTA] ${d.cta}`].filter(Boolean).join("\n");
              } else {
                draftText = JSON.stringify(d, null, 2);
              }
            } else if (statusData.result.final) {
              const f = statusData.result.final;
              draftText = f.body || JSON.stringify(f, null, 2);
            }

            if (isFg()) {
              set({ contentPanel: { visible: false, generating: false, result: null }, streamContent: "" });
              _saveGenerationResult(baseUrl, token, convId, draftText, set, get);
              const resultMsg: ChatMessage = {
                id: Date.now() + 1,
                conversation_id: convId,
                role: "assistant",
                content: draftText,
                metadata_json: { ...statusData.result, _contentType: payload.content_type } as Record<string, unknown> | null,
                created_at: new Date().toISOString(),
              };
              set((s) => ({
                messages: [...s.messages, resultMsg],
                conversations: s.conversations.map((c) =>
                  c.id === convId ? { ...c, updated_at: new Date().toISOString() } : c
                ),
              }));
            } else {
              _saveGenerationResult(baseUrl, token, convId, draftText, set, get);
              set((s) => ({
                backgroundTasks: {
                  ...s.backgroundTasks,
                  [convId]: {
                    ...(s.backgroundTasks[convId] || { convId, title: "Cuộc trò chuyện", type: "generation" as const }),
                    status: "done" as const,
                  },
                },
              }));
            }
          }
        };

        try {
          const res = await fetch(`${baseUrl}/generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({ detail: "Không thể tạo nội dung" }));
            const message = typeof body.detail === "string" ? body.detail : "Không thể tạo nội dung";
            if (isFg()) {
              set({
                contentPanel: { visible: false, generating: false, result: { error: message, upgradeRequired: res.status === 403 || res.status === 429 } },
                streamContent: "",
              });
            }
            set((s) => {
              if (!s.backgroundTasks[convId]) return s;
              return { backgroundTasks: { ...s.backgroundTasks, [convId]: { ...s.backgroundTasks[convId], status: "error" } } };
            });
            return;
          }
          const data = await res.json();

          if (data.status === "done" || data.status === "error") {
            handleResult(data);
            return;
          }

          const jobId = data.job_id;
          let isPolling = true;
          while (isPolling) {
            await sleepUntilVisible(800);
            const statusRes = await fetch(`${baseUrl}/generate/${jobId}`, {
              headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            if (!statusRes.ok) continue;
            const statusData = await statusRes.json();

            if (statusData.status === "error" || (statusData.status === "done" && statusData.result)) {
              handleResult(statusData);
              isPolling = false;
              break;
            } else {
              const step = statusData.current_step || "chuẩn bị";
              const stepMap: Record<string, string> = {
                planner: "Lên kế hoạch",
                research: "Nghiên cứu thị trường",
                seo: "Tối ưu hóa SEO",
                brand: "Phân tích thương hiệu",
                fusion: "Tổng hợp dữ liệu",
                copywriter: "Viết nội dung",
                reviewer: "Kiểm duyệt & Đánh giá",
              };
              if (isFg()) {
                set({ streamContent: `Đang xử lý: ${stepMap[step] || step}...` });
              }
              set((s) => {
                if (!s.backgroundTasks[convId]) return s;
                return {
                  backgroundTasks: {
                    ...s.backgroundTasks,
                    [convId]: { ...s.backgroundTasks[convId], step: stepMap[step] || step },
                  },
                };
              });
            }
          }
        } catch (err) {
          console.error(err);
        }
      },
```

- [ ] **Step 4: Manual verification**

Run: `cd frontend && npm run dev`, then follow the Step 1 manual test plan in a browser.
Expected: `facebook_post`/`email`/`tiktok_script`/`landing_page`/`marketing_plan` resolve immediately with no polling UI; `seo_blog` still shows the step-by-step "Đang xử lý: ..." progress text.

- [ ] **Step 5: Commit**

```bash
git add frontend/store/chat.ts
git commit -m "feat: skip generation polling when /generate already returns the final result"
```

---

## Part 2: Email/Landing Builder — Brand Profile Wiring

### Task 5: `brand_profile_service.py` — shared BrandProfile loader

**Files:**
- Create: `backend/app/services/brand_profile_service.py`
- Test: `backend/tests/test_brand_profile_service.py`

**Interfaces:**
- Produces: `async def load_brand_profile(session: AsyncSession, project_id: int, user_id: int) -> dict` (returns `{}` if the project doesn't exist, isn't owned by `user_id`, or has no `BrandProfile`; otherwise returns `{brand_name, tone, writing_style, preferred_words, forbidden_words}`). `def format_brand_voice(brand_profile: dict) -> str` (returns `""` for an empty dict, otherwise a "Brand voice:\n..." block — same format as `copywriter.py`'s private `_format_brand_voice`, duplicated here intentionally since the two modules must not import each other's private helpers).

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_brand_profile_service.py`:

```python
from app.services.brand_profile_service import load_brand_profile, format_brand_voice


async def test_load_brand_profile_returns_empty_for_unowned_project(session_maker):
    from app.models.project import Project
    from app.models.user import User

    async with session_maker() as session:
        owner = User(name="O", email="o2@example.com", password_hash="x")
        other = User(name="X", email="x2@example.com", password_hash="x")
        session.add_all([owner, other])
        await session.commit()
        await session.refresh(owner)
        await session.refresh(other)
        project = Project(user_id=owner.id, name="P")
        session.add(project)
        await session.commit()
        await session.refresh(project)
        project_id, other_id = project.id, other.id

    async with session_maker() as session:
        result = await load_brand_profile(session, project_id, other_id)
        assert result == {}


async def test_load_brand_profile_returns_fields_when_present(session_maker):
    from app.models.project import Project
    from app.models.user import User
    from app.models.brand_profile import BrandProfile

    async with session_maker() as session:
        owner = User(name="O3", email="o3@example.com", password_hash="x")
        session.add(owner)
        await session.commit()
        await session.refresh(owner)
        project = Project(user_id=owner.id, name="P3")
        session.add(project)
        await session.commit()
        await session.refresh(project)
        profile = BrandProfile(
            project_id=project.id,
            brand_name="EcoBottle",
            tone="friendly",
            writing_style="conversational",
            preferred_words=["sustainable"],
            forbidden_words=["cheap"],
        )
        session.add(profile)
        await session.commit()
        project_id, owner_id = project.id, owner.id

    async with session_maker() as session:
        result = await load_brand_profile(session, project_id, owner_id)
        assert result["brand_name"] == "EcoBottle"
        assert result["preferred_words"] == ["sustainable"]


def test_format_brand_voice_empty_dict_returns_empty_string():
    assert format_brand_voice({}) == ""


def test_format_brand_voice_formats_present_fields():
    text = format_brand_voice({"brand_name": "EcoBottle", "tone": "friendly"})
    assert "EcoBottle" in text
    assert "friendly" in text
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_brand_profile_service.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.brand_profile_service'`

- [ ] **Step 3: Write minimal implementation**

Create `backend/app/services/brand_profile_service.py`:

```python
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.brand_profile import BrandProfile
from app.models.project import Project


async def load_brand_profile(session: AsyncSession, project_id: int, user_id: int) -> dict:
    """Loads the BrandProfile for project_id, scoped to user_id ownership.
    Returns {} if the project doesn't exist, isn't owned by user_id, or has no profile."""
    project = await session.get(Project, project_id)
    if project is None or project.user_id != user_id:
        return {}

    result = await session.execute(
        select(BrandProfile).where(BrandProfile.project_id == project_id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        return {}

    return {
        "brand_name": profile.brand_name,
        "tone": profile.tone,
        "writing_style": profile.writing_style,
        "preferred_words": profile.preferred_words or [],
        "forbidden_words": profile.forbidden_words or [],
    }


def format_brand_voice(brand_profile: dict[str, Any]) -> str:
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_brand_profile_service.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/brand_profile_service.py backend/tests/test_brand_profile_service.py
git commit -m "feat: add shared brand_profile_service for project-scoped BrandProfile lookup"
```

---

### Task 6: Wire `project_id` into Vitba Mail builder endpoints

**Files:**
- Modify: `backend/app/mcp/email/builder.py`
- Test: `backend/tests/test_email_builder.py` (create if it doesn't already exist — check with `ls backend/tests/test_email_builder.py` first; if it exists, add to it instead)

**Interfaces:**
- Consumes: `load_brand_profile(session, project_id, user_id) -> dict`, `format_brand_voice(brand_profile) -> str` (Task 5).

- [ ] **Step 1: Write the failing tests**

Create or append to `backend/tests/test_email_builder.py`:

```python
from unittest.mock import AsyncMock, patch

import pytest


async def _register_and_project(client, email):
    reg = await client.post("/auth/register", json={"name": "U", "email": email, "password": "secret123"})
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    proj = await client.post("/projects", json={"name": "P"}, headers=headers)
    return headers, proj.json()["id"]


@patch("app.mcp.email.builder.provider_available", return_value=True)
async def test_generate_custom_email_uses_brand_profile_when_project_id_given(mock_avail, client):
    headers, project_id = await _register_and_project(client, "eb1@example.com")
    await client.post(
        "/brand-profile",
        json={"project_id": project_id, "brand_name": "EcoBottle", "tone": "friendly"},
        headers=headers,
    )

    fake_content = AsyncMock()
    fake_content.model_dump = lambda: {
        "hero_title": "t", "hero_subtitle": "s", "hero_body": "b", "hero_image_url": "",
        "hero_cta_text": "Mua ngay", "hero_cta_link": "#", "about_title": "a", "about_body": "ab",
        "about_image_url": "", "cta_title": "c", "cta_body": "cb", "cta_button_text": "Đi",
        "cta_button_link": "#", "contact_email": "", "contact_phone": "", "contact_website": "",
        "contact_address": "", "copyright_text": "",
    }
    mock_llm = AsyncMock()
    mock_llm.ainvoke = AsyncMock(return_value=fake_content)
    with patch("app.mcp.email.builder.get_chat_model_for_tier") as mock_factory:
        mock_factory.return_value.with_structured_output.return_value = mock_llm
        resp = await client.post(
            "/mcp/email/builder/generate-custom",
            json={"prompt": "Email khuyến mãi", "project_id": project_id},
            headers=headers,
        )
    assert resp.status_code == 200
    assert "EcoBottle" in resp.json()["html"]


async def test_generate_custom_email_works_without_project_id(client):
    headers, _ = await _register_and_project(client, "eb2@example.com")
    resp = await client.post(
        "/mcp/email/builder/generate-custom",
        json={"prompt": "Email khuyến mãi", "brand_name": "Manual Brand"},
        headers=headers,
    )
    # provider not mocked available -> 503, but request shape itself must be accepted (no 422)
    assert resp.status_code in (200, 503)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_email_builder.py -v`
Expected: FAIL — `generate-custom` doesn't accept `project_id` (422) or doesn't inject `EcoBottle`.

- [ ] **Step 3: Write minimal implementation**

In `backend/app/mcp/email/builder.py`:

Replace the imports block (lines 6-15):

```python
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.user import User
from app.services.brand_profile_service import load_brand_profile, format_brand_voice
from app.services.storage import save_upload
from app.mcp.landing.template_engine import (
    render_email,
    list_email_templates,
)
```

Replace `GenerateCustomReq` (lines 25-31):

```python
class GenerateCustomReq(BaseModel):
    prompt: str
    project_id: int | None = None
    brand_name: str = ""
    logo_url: str = ""
    primary_color: str = ""
    cta_text: str = ""
    cta_link: str = ""
```

Replace `generate_custom_email`'s signature and the `user_msg` construction (lines 63-98):

```python
@router.post("/generate-custom")
async def generate_custom_email(
    body: GenerateCustomReq,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """AI generates custom email content and renders it into a template."""
    from app.llm.factory import get_chat_model_for_tier as get_chat_model, provider_available
    if not provider_available():
        raise HTTPException(503, "LLM provider not configured")

    brand_profile = {}
    if body.project_id is not None:
        brand_profile = await load_brand_profile(session, body.project_id, user.id)
    brand_name = brand_profile.get("brand_name") or body.brand_name
    brand_voice = format_brand_voice(brand_profile)

    from pydantic import BaseModel, Field
    class EmailContent(BaseModel):
        hero_title: str = Field(description="Tiêu đề chính của hero section")
        hero_subtitle: str = Field(description="Phụ đề hero section")
        hero_body: str = Field(description="Nội dung hero section")
        hero_image_url: str = Field(description="URL ảnh minh họa hero (để trống nếu không có)")
        hero_cta_text: str = Field(description="Chữ trên nút CTA chính")
        hero_cta_link: str = Field(description="Link cho nút CTA chính")
        about_title: str = Field(description="Tiêu đề phần giới thiệu")
        about_body: str = Field(description="Nội dung giới thiệu")
        about_image_url: str = Field(description="URL ảnh giới thiệu")
        cta_title: str = Field(description="Tiêu đề phần CTA cuối")
        cta_body: str = Field(description="Nội dung CTA cuối")
        cta_button_text: str = Field(description="Chữ trên nút CTA cuối")
        cta_button_link: str = Field(description="Link nút CTA cuối")
        contact_email: str = Field(description="Email liên hệ")
        contact_phone: str = Field(description="Số điện thoại liên hệ")
        contact_website: str = Field(description="Website liên hệ")
        contact_address: str = Field(description="Địa chỉ")
        copyright_text: str = Field(description="Dòng bản quyền footer")

    system = """Bạn là AI Copywriter cho Vitba AI. Nhiệm vụ: Viết nội dung cho email marketing.
Viết nội dung hấp dẫn, chuyên nghiệp bằng tiếng Việt. Không bỏ trống các trường (dùng nội dung giả định phù hợp nếu cần)."""

    user_msg = f"""Mô tả email: {body.prompt}
Brand: {brand_name or "(tự đặt)"}
Nút CTA: {body.cta_text}
{brand_voice}

Tạo nội dung cho các phần của email."""
```

(rest of the function — the `trace_request`, `llm.ainvoke`, and `content_dict` block — stays unchanged, just swap any remaining `body.brand_name` reference for `brand_name` in the `content_dict["brand_name"] = body.brand_name` line, change it to `content_dict["brand_name"] = brand_name`.)

Apply the identical pattern to `onboard_generate` (lines 120-184): add `project_id: int | None = None` to `OnboardReq`, add `session: AsyncSession = Depends(get_session)` to the endpoint signature, load `brand_profile`/`brand_name`/`brand_voice` the same way, inject `brand_voice` into `user_msg`, and use `brand_name` (not `body.brand_name`) when setting `content_dict["brand_name"]`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_email_builder.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/mcp/email/builder.py backend/tests/test_email_builder.py
git commit -m "feat: load BrandProfile by project_id in Vitba Mail builder"
```

---

### Task 7: Wire `project_id` into Vitba Landing builder endpoints

**Files:**
- Modify: `backend/app/mcp/landing/tools.py`
- Test: `backend/tests/test_landing.py` (existing file — add to it)

**Interfaces:**
- Consumes: `load_brand_profile`, `format_brand_voice` (Task 5).

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/test_landing.py`:

```python
@patch("app.mcp.landing.tools.provider_available", return_value=True)
async def test_generate_custom_landing_uses_brand_profile_when_project_id_given(mock_avail, client):
    reg = await client.post("/auth/register", json={"name": "U", "email": "lb1@example.com", "password": "secret123"})
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    proj = await client.post("/projects", json={"name": "P"}, headers=headers)
    project_id = proj.json()["id"]
    await client.post(
        "/brand-profile",
        json={"project_id": project_id, "brand_name": "EcoBottle", "tone": "friendly"},
        headers=headers,
    )

    from unittest.mock import AsyncMock
    fake_resp = AsyncMock()
    fake_resp.content = "<!DOCTYPE html><html><body>EcoBottle landing</body></html>"
    mock_llm = AsyncMock()
    mock_llm.ainvoke = AsyncMock(return_value=fake_resp)
    with patch("app.mcp.landing.tools.get_chat_model_for_tier") as mock_factory:
        mock_factory.return_value = mock_llm
        resp = await client.post(
            "/mcp/landing/generate-custom",
            json={"prompt": "Landing page bán nước hữu cơ", "project_id": project_id},
            headers=headers,
        )
    assert resp.status_code == 200
    assert "EcoBottle" in resp.json()["html"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_landing.py -k brand_profile -v`
Expected: FAIL — `generate-custom` doesn't accept `project_id` (422) or system prompt doesn't reference brand name (assertion fails because `EcoBottle` isn't injected into the system prompt's `images_context`/`user_msg`, only `body.brand_name` is, which is empty here).

- [ ] **Step 3: Write minimal implementation**

In `backend/app/mcp/landing/tools.py`, add to the imports block (after line 16's `from app.services.audit import log_action`):

```python
from app.services.brand_profile_service import load_brand_profile, format_brand_voice
```

Add `project_id: int | None = None` to `GenerateReq` (line 44-55), `GenerateCustomReq` (line 261-268), and `OnboardReq` (line 330-336).

In `generate_page` (already has `session` — line 83), after the existing rate-limit check, before building `user_msg` (around line 91-119):

```python
    brand_profile = {}
    if body.project_id is not None:
        brand_profile = await load_brand_profile(session, body.project_id, user.id)
    brand_voice = format_brand_voice(brand_profile)
    effective_brand_name = brand_profile.get("brand_name") or body.product
```

Then change the `user_msg` f-string (line 113-119) to include `{brand_voice}` before the closing instruction line, and change `content_dict["brand_name"] = body.product` (line 129) to `content_dict["brand_name"] = effective_brand_name`.

In `generate_custom_landing` (line 271-272), add `session: AsyncSession = Depends(get_session)` to the signature. After the `provider_available()` check (line 277), before `style_ref = get_landing_style_reference()`:

```python
    brand_profile = {}
    if body.project_id is not None:
        brand_profile = await load_brand_profile(session, body.project_id, user.id)
    brand_name = brand_profile.get("brand_name") or body.brand_name
    brand_voice = format_brand_voice(brand_profile)
```

Then in `user_msg` (line 308-312), change `Brand: {body.brand_name or "(tự đặt tên phù hợp)"}` to `Brand: {brand_name or "(tự đặt tên phù hợp)"}` and append `{brand_voice}` on its own line before the closing instruction.

In `onboard_generate` (landing, line 339-340), add `session: AsyncSession = Depends(get_session)` to the signature. After the `provider_available()` check, before building `user_msg`:

```python
    brand_profile = {}
    if body.project_id is not None:
        brand_profile = await load_brand_profile(session, body.project_id, user.id)
    brand_name = brand_profile.get("brand_name") or body.brand_name
    brand_voice = format_brand_voice(brand_profile)
```

Change `user_msg` (line 367-371) to use `brand_name` instead of `body.brand_name` and append `{brand_voice}`. Change `content_dict["brand_name"] = body.brand_name` (line 381) to `content_dict["brand_name"] = brand_name`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_landing.py -v`
Expected: PASS (note: this file already has one pre-existing unrelated failure per prior session notes — `test_generate_success_mocked` — confirm that failure count doesn't increase, i.e. only that one pre-existing failure remains, not two)

- [ ] **Step 5: Commit**

```bash
git add backend/app/mcp/landing/tools.py backend/tests/test_landing.py
git commit -m "feat: load BrandProfile by project_id in Vitba Landing builder"
```

---

### Task 8: Frontend — send `project_id` from Email/Landing builder pages

**Files:**
- Modify: `frontend/app/hub/email/builder.tsx:1-4,149-155`
- Modify: `frontend/app/hub/landing/builder.tsx:1-4,155-161`

**Interfaces:**
- Consumes: `useProjectStore` (`frontend/store/project.ts`, exports `useProjectStore` with `activeProject: Project | null` state) — same access pattern already used in `frontend/store/chat.ts:337` (`useProjectStore.getState().activeProject?.id`).

- [ ] **Step 1: Manual test plan**

After Step 3, manually verify: open a project with a saved Brand Profile, navigate to Vitba Mail or Vitba Landing builder, run the onboarding wizard, confirm the generated content reflects the saved brand tone/name even when the in-wizard "Tên brand" field is left blank.

- [ ] **Step 2: (no automated failing test — frontend-only wiring, verified manually per Step 1)**

- [ ] **Step 3: Implement**

In `frontend/app/hub/email/builder.tsx`, add the import after line 4 (`import { api, API_BASE_URL, getToken } from "@/services/api";`):

```typescript
import { useProjectStore } from "@/store/project";
```

In `handleGenerate` (lines 149-155), change the `api.post` call body:

```typescript
      const res = await api.post<{ html: string }>("/mcp/email/builder/onboard", {
        purpose: finalPurpose,
        color_palette: finalColor,
        typography: finalFont,
        brand_name: brandName,
        logo_url: logoUrl,
        project_id: useProjectStore.getState().activeProject?.id,
      });
```

Apply the identical change to `frontend/app/hub/landing/builder.tsx`: add the same import after line 4, and in `handleGenerate` (lines 155-161) add `project_id: useProjectStore.getState().activeProject?.id,` to the `api.post("/mcp/landing/onboard", {...})` body.

- [ ] **Step 4: Manual verification**

Run: `cd frontend && npm run dev`, follow the Step 1 manual test plan.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/hub/email/builder.tsx frontend/app/hub/landing/builder.tsx
git commit -m "feat: send active project_id from Email/Landing builder wizards"
```
