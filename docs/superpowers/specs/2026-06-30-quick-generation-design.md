# Quick Generation (Bypass Multi-Agent Pipeline) — Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement the plan derived from this spec.

**Goal:** Stop routing `facebook_post`, `email`, `tiktok_script`, `landing_page`, and `marketing_plan` generation through the 5-7-LLM-call multi-agent graph + background-job + polling machinery. Replace with a synchronous, 1-2-LLM-call path that reuses existing agent code. Keep the full multi-agent pipeline (`planner → research → seo → brand → fusion → copywriter → reviewer → formatter`) for `seo_blog` only.

**Architecture:** `POST /generate` keeps one entrypoint but branches on `content_type`. `seo_blog` keeps today's `create_job` + `background_tasks.add_task(run_generation_job, ...)` + client polling. All other content types call a new `run_quick_generation()` directly inside the request handler (`await`ed, no background task), reusing the existing `copywriter()` and `reviewer()` node functions unmodified. The response embeds the finished result — no `job_id` round-trip needed, though a `GenerationJob` row is still written for quota/rate-limit/history bookkeeping.

**Tech Stack:** FastAPI, SQLAlchemy async, LangChain `generate_structured` (existing), no new dependencies.

## Global Constraints

- `seo_blog` is unaffected — same graph, same job+polling flow, same files (`backend/app/graph/build.py`, `backend/app/services/generation_service.py::run_generation_job`).
- `copywriter()` (`backend/app/agents/copywriter.py:302`) and `reviewer()` (`backend/app/agents/reviewer.py:42`) must be called **unmodified** — both already tolerate a minimal state dict (no `fused_output`/`research_output`/`seo_output` required) and already have their own try/except fallbacks.
- `GenerationJob` rows must still be created for quick-path content types — `check_daily_generation_limit` (`backend/app/core/plan_limits.py:90`) and the per-minute rate check in `generate.py:60-71` both count `GenerationJob.created_at` rows. Skipping job creation would silently break quota/rate-limit enforcement.
- Reviewer (quality score) step stays **premium-gated**, same plan check used by the existing graph (`build.py` gates `reviewer` on plan — mirror that same check in the quick path).
- All Vietnamese-facing copy (errors, etc.) must be 100% Vietnamese, matching existing convention.
- No new guard-agent call at `/generate` — the brief reaching `/generate` already passed `run_guard_agent` once in the chat flow that produced the ```generate block (`chat.py:573-580`). `/generate` remains reachable directly (not chat-only), same as today; this spec does not change that exposure.

---

## Quick Generation Flow

### 1. Routing in `start_generation` (`backend/app/api/generate.py`)

After the existing guard/rate-limit/brand-profile/template loading (lines 43-127, all unchanged), branch:

```python
job = await generation_service.create_job(
    session, payload.project_id, payload.content_type, payload.brief, payload.marketing_goal
)
initial_state = { ... }  # unchanged dict, same fields as today

if payload.content_type == "seo_blog":
    background_tasks.add_task(
        generation_service.run_generation_job, session_maker, job.id, initial_state
    )
    return JobResponse(job_id=job.id, status=job.status)

# Quick path — everyone else
result, error = await generation_service.run_quick_generation(
    session_maker, job.id, initial_state
)
if error:
    return JobResponse(job_id=job.id, status="error", error=error)
return JobResponse(job_id=job.id, status="done", result=result)
```

`JobResponse` (`backend/app/schemas/generation.py`) gains two optional fields: `result: dict | None = None`, `error: str | None = None`. `job_id` stays present in both branches (useful for history/debugging even though the frontend won't poll it for quick types) — this keeps the schema a strict superset of today's, no breaking change for `seo_blog`.

### 2. `run_quick_generation()` (new function in `backend/app/services/generation_service.py`)

```python
async def run_quick_generation(
    session_maker: async_sessionmaker[AsyncSession],
    job_id: int,
    initial_state: dict[str, Any],
) -> tuple[dict | None, str | None]:
    """Synchronous 1-2 LLM-call generation for non-SEO-blog content types.
    Returns (result, error) — exactly one is non-None."""
    state = dict(initial_state)
    user_plan = state.get("user_plan", "free")
    content_type = state.get("content_type")

    try:
        async with asyncio.timeout(45):
            if content_type == "landing_page":
                from app.agents.landing_page_coder import landing_page_coder
                delta = await landing_page_coder(state)
            elif content_type == "marketing_plan":
                from app.agents.marketing_planner_rag import marketing_planner_rag
                delta = await marketing_planner_rag(state)
            else:
                state = await _inject_brand_rag(state)  # see below
                delta = await copywriter(state)
                state.update(delta)
                if user_plan in PREMIUM_PLANS:  # same set build.py's reviewer gate uses
                    review_delta = await reviewer(state)
                    state.update(review_delta)
                    delta = state
    except (Exception, asyncio.TimeoutError) as exc:
        logger.error("Quick generation failed job_id=%s error=%s", job_id, exc)
        message = "Quá trình tạo nội dung mất quá nhiều thời gian. Vui lòng thử lại." \
            if isinstance(exc, asyncio.TimeoutError) else \
            "Có lỗi xảy ra trong quá trình tạo nội dung. Vui lòng thử lại sau ít phút."
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

This mirrors `run_generation_job`'s job-row-update and history-save pattern exactly (same `_RESULT_KEYS`, same `history_service.save_to_history` call) — just without the LangGraph `astream` loop, the per-node `_set_step` calls, and the background-task indirection.

### 3. Brand RAG injection for facebook_post/email/tiktok_script

`copywriter()` already reads `state.get("fused_output", {}).get("unified_brief")` when present (`copywriter.py:342-346`) but quick mode skips the `fusion` node that normally produces it. To keep brand-document RAG context (per the decision to retain it), `_inject_brand_rag()` calls the existing `brand()` node function directly (`backend/app/agents/brand.py:8`, zero LLM calls, already has its own try/except around Qdrant) and synthesizes a minimal `fused_output` dict so `copywriter()`'s existing code path picks it up with no modification:

```python
async def _inject_brand_rag(state: dict[str, Any]) -> dict[str, Any]:
    from app.agents.brand import brand
    brand_delta = await brand(state)
    brand_output = brand_delta.get("brand_output") or {}
    chunks = brand_output.get("relevant_context") or []
    if chunks:
        state["fused_output"] = {"unified_brief": "\n".join(chunks)}
    return state
```

`landing_page` and `marketing_plan` are excluded from this injection — `landing_page_coder` and `marketing_planner_rag` already do their own RAG retrieval internally (confirmed: `marketing_planner_rag.py:78-80` retrieves before its single LLM call).

**Open verification item for the implementation plan:** this spec has *not* read `landing_page_coder` in full (only confirmed it exists as the graph's `landing_page` entry node) or verified its return dict uses the same `_RESULT_KEYS` (`draft`/`final`/`formatted_final`) shape that `marketing_planner_rag` and `copywriter` use. The implementation plan must read both files fully before writing the `run_quick_generation` task and adjust the result-extraction step if either function's return keys differ.

### 4. Premium gate for the reviewer step

`build.py` already has a conditional edge gating `reviewer` on plan. `run_quick_generation` must use the **same** plan check (read the exact constant/set from `build.py` at implementation time — do not redefine a second source of truth for "which plans get review").

---

## Frontend Changes (`frontend/store/chat.ts`)

`startGeneration()` (line 427) currently always does: POST `/generate` → read `job_id` → poll `/generate/{job_id}` every 800ms until `status !== "running"/"queued"`.

New branch right after the initial POST response is parsed:

```typescript
const data = await res.json();
if (data.status === "done" || data.status === "error") {
  // Quick path — result already present, skip polling entirely
  handleResult(data);  // factor the existing "done" / "error" handling
                        // (lines 471-541 today) into a shared function
  return;
}
// data.status === "queued" — seo_blog, existing polling loop unchanged
const jobId = data.job_id;
let isPolling = true;
while (isPolling) { ... }  // unchanged
```

The existing per-`statusData` handling for `status === "error"` (line 471) and `status === "done"` (line 483) is extracted into a shared `handleResult(data)` function so both the synchronous response and each polling tick call the same rendering code — no duplicated logic, and the result-shape contract (`{status, result, error}`) is identical in both paths by construction (Section 1's `JobResponse` change).

---

## Error Handling

- LLM/timeout failures inside `run_quick_generation` never leak raw exception text — same friendly-Vietnamese-message pattern already applied to `run_generation_job` in the prior fix (this session, commit `a0d8ab5`).
- `copywriter()` and `reviewer()` keep their own internal fallbacks (raw-text fallback, mock-mode fallback) — `run_quick_generation`'s try/except is the outer safety net for anything those don't already catch (e.g., Qdrant/embedding errors from `_inject_brand_rag`, the 45s timeout).
- No new failure mode for `seo_blog` — untouched code path.

## Testing

- New tests for `run_quick_generation` in `backend/tests/test_generation_service.py`: success path (mocked `copywriter`/`reviewer`), premium vs free plan (reviewer called/not called), timeout path, exception path — assert `job.error` is the friendly Vietnamese string, never `str(exc)`.
- New/updated tests in `backend/tests/test_generate.py` for `POST /generate` with `content_type=facebook_post` (and one of `landing_page`/`marketing_plan`): assert response has `status="done"` and `result` populated, no `job_id` polling needed, and that a `GenerationJob` row was created (for quota-counting).
- Existing `seo_blog` tests must keep passing unmodified — this is the regression guard that the graph/job/polling path wasn't touched.
- Frontend: no test framework changes assumed beyond whatever currently covers `chat.ts` (if any) — manual verification in the design's test plan (see PR description) covers the chat UI path.
