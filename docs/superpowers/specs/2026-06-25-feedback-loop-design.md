# Vitba.ai — Feedback Loop (P1) Design

> Date: 2026-06-25
> Source: `vitba_ai_implementation_blueprint.md` §0, §5.4, §9.4, §16.2, §17.4, §28 (priority #1)
> Scope: explicit user feedback for AI outputs — model, API, surfacing, UI, admin analytics.

## 1. Context & Goal

The platform is ~80% of the blueprint already (LangGraph pipeline, MCP Hub, lab tools,
quota, tracing, scheduler all exist). The single biggest architectural gap the blueprint
calls out is **explicit user feedback** — there is no `Feedback` model, no `/feedback`
route, and no feedback UI today.

Goal: close that loop end-to-end for the two core AI surfaces — **generation jobs** and
**lab tool runs** — so users can rate output (👍/👎), optionally explain/correct, and so
admins can see quality signals (up/down ratio, top tags, recent negatives) alongside the
existing reviewer score.

Out of scope (deferred to later specs): feedback on chat messages, landing pages, email
campaigns, meta posts; auto fine-tuning from feedback (blueprint §28 — explicitly "Không").

## 2. Decisions (confirmed)

- Target types in MVP: `generation_job`, `lab_history` only.
- **One feedback per `(user, target_type, target_id)`** — repeat submit is an upsert
  (toggle 👍↔👎, edit reason/tags). Keeps analytics clean and avoids spam.
- Rating values: `up` | `down` (no `neutral` — YAGNI; column stays a string for future
  extension).
- Both lab UI **and** generate UI get the feedback bar in this MVP.
- Admin analytics: full (ratio, top tags, recent negatives, combined with reviewer score).

### 2a. AI-Product framing (the loop, not the button)

Feedback is a **quality-measurement system**, not a UI feature. Collection without a
consumption loop is dead data. The loop this MVP enables (manual, monthly — **no auto
fine-tune**, blueprint §28): export 👎 + corrections grouped by `content_type`/`tool_name`
→ cluster failure modes → revise that prompt → version it → measure 👎-rate change. Four
design consequences, all confirmed:

1. **Tag-first, not thumbs-first.** Binary 👍/👎 has poor signal (low response rate, anger
   bias, no nuance). The actionable gold is `tags` + `correction`. UI leads with tags;
   thumbs is just the entry gate. Do not over-invest in the buttons.
2. **Hallucination is a separate guardrail.** `sai thông tin` (wrong facts) is a
   hallucination report = the highest-severity LLM risk, not a style nit. It is surfaced
   **separately** in admin (its own count + recency), never folded into the generic ratio.
3. **Divergence is the killer signal.** Triangulate reviewer score (offline, every output)
   against user feedback (online, sparse). The high-value admin view is **reviewer-high but
   user-👎**, grouped by `content_type`/`tool_name` → prompt/rubric drift = exactly what to
   fix. This is the concrete meaning of blueprint §28 "kết hợp reviewer score + feedback".
4. **Measure the feature itself.** Track **feedback submission rate** as a guardrail. If
   <2% after two weeks, the UI or the premise is wrong — stop investing, don't add more
   analytics.

## 3. Data Model — `Feedback`

New file `backend/app/models/feedback.py`, following existing conventions (SQLAlchemy 2.0
`Mapped`/`mapped_column`, `Base` from `app.core.db`, `JSON().with_variant(JSONB, "postgresql")`
for SQLite-test portability).

| Column | Type | Notes |
|---|---|---|
| `id` | int PK | matches `AuditLog` |
| `user_id` | FK `users.id` ON DELETE CASCADE, index | author |
| `project_id` | FK `projects.id` ON DELETE SET NULL, nullable, index | optional scope |
| `target_type` | `String(50)`, index | `generation_job` \| `lab_history` |
| `target_id` | `String(255)`, index | **String** — `generation_jobs.id` is `int`, `lab_history.id` is `UUID`; a string holds both |
| `rating` | `String(10)` | `up` \| `down` |
| `reason` | `Text`, nullable | free text "what's wrong?" |
| `correction` | `Text`, nullable | suggested fix |
| `tags` | `JSON` list[str], default `[]` | `ARRAY(String)` variant on PG |
| `created_at` | `DateTime(tz)` server_default now | |
| `updated_at` | `DateTime(tz)` server_default now, onupdate now | upsert touches this |

Constraint: `UniqueConstraint(user_id, target_type, target_id)`.

Migration: new Alembic revision with `down_revision = 'o1a2b3c4d5e6'` (current head).
Register the model in `app/models/__init__.py` so metadata/migrations see it.

## 4. Backend API — `backend/app/api/feedback.py`

Router `prefix="/api/feedback"`, `Depends(get_current_user)`.

### `POST /api/feedback`
Request:
```json
{ "target_type": "generation_job", "target_id": "123",
  "rating": "up", "reason": null, "correction": null, "tags": ["brand_voice"] }
```
Behaviour:
1. Validate `target_type` ∈ {`generation_job`, `lab_history`} and `rating` ∈ {`up`,`down`}.
2. **Ownership check** (prevents attaching feedback to another user's output):
   - `generation_job`: `GenerationJob` → `Project.user_id == user.id`.
   - `lab_history`: `LabHistory.user_id == user.id`. (404 if not owned/not found.)
3. Upsert on `(user_id, target_type, target_id)`: insert or update rating/reason/correction/tags.
4. Write `AuditLog` action `feedback.create`.
5. Return `{ "feedback_id": <id>, "status": "created" | "updated" }`.

### `GET /api/feedback?target_type=&target_id=`
Returns the current user's feedback for that target (or `null`) so the UI can show the
already-voted state after reload.

Errors use the existing HTTPException style; map to friendly Vietnamese messages on the FE.

## 5. Surfacing the target id (non-breaking)

The hard constraint: lab pages read output fields directly off the hook `result`
(e.g. `result.remixed_content`), so the response **shape must not change**.

- **Lab** (`backend/app/api/lab.py`, `_run_tool`): after saving `LabHistory`, merge
  `output_data["_feedback_id"] = str(history.id)` before returning. Old pages ignore the
  extra key. For the SEO-analysis endpoint (separate code path), do the same on its
  `{"report": ...}` payload. Endpoints that don't persist history (e.g. `zalo-publish`,
  `lunar-festivals`) get no feedback id and no feedback bar.
- **Generate**: the polling flow already exposes `job_id`; no backend change. FE uses
  `target_type="generation_job"`, `target_id=String(job_id)`.

## 6. Frontend

### `<FeedbackBar targetType targetId />` (new, in `frontend/components/lab-ui.tsx`)
- 👍 / 👎 buttons (toggle, reflect server state) — the entry gate.
- **Tag-first:** on 👎 (and optionally 👍), reveal the tag chips prominently plus the
  "Bạn muốn sửa gì?" textarea (`reason`/`correction`). Tags carry the signal, so they are
  the primary affordance, not an afterthought.
- Quick tag chips: `sai giọng thương hiệu`, `quá dài`, `thiếu CTA`, `sai thông tin`,
  `lỗi format` (maps to `tags`). Note `sai thông tin` is the hallucination tag — it is
  treated as a guardrail server-side (see §7), not a style nit.
- On mount, `GET /api/feedback` to hydrate state; on action, `POST /api/feedback`.
- Renders nothing if `targetId` is falsy.

### `frontend/hooks/use-lab-tool.ts`
- Expose `feedbackId: string | null` derived from `result?._feedback_id`. `result` is
  passed through unchanged.

### Wiring
- Each lab tool page: add `<FeedbackBar targetType="lab_history" targetId={feedbackId} />`
  once, below its `<ResultBox>`(es). One line per page (~20 pages).
- Generate output (`frontend/app/(app)/generate/page.tsx`): add
  `<FeedbackBar targetType="generation_job" targetId={String(jobId)} />` on success.

## 7. Admin analytics (full — blueprint §16.2)

- Extend `GET /admin/analytics` with a `feedback` block:
  - `{ total, up, down, ratio, by_target_type, submission_rate }`.
  - `submission_rate` = feedback count ÷ eligible outputs (jobs + lab runs) over the
    window — the **guardrail** on the feature itself (§2a.4). Flag low (<2%).
  - `hallucination`: separate count + recent list of feedback carrying the `sai thông tin`
    tag (§2a.2) — a safety signal, NOT folded into `ratio`.
- New `GET /admin/feedback` (admin-only): recent feedback (user, target_type, rating,
  reason, tags, created_at), top tags (counts), filters `rating` / `target_type` / `tag`.
- New `GET /admin/feedback/divergence` (admin-only, §2a.3): outputs where reviewer score
  is high (≥ threshold, e.g. 75) **but** user rating is 👎, grouped by `content_type` /
  `tool_name`. Joins `Feedback` → `GenerationJob`/`ContentHistory` (reviewer score lives
  in `ContentHistory.score`) / `LabHistory`. This is the prompt-iteration worklist.
- Frontend admin dashboard cards: "Feedback up/down ratio + submission rate",
  "Top feedback tags", "⚠ Hallucination reports (sai thông tin)",
  "Reviewer-cao nhưng user-👎 (divergence)".

## 8. Testing

Unit:
- Feedback upsert creates then updates (no duplicate row).
- Ownership rejection (user A cannot feedback user B's job/lab).
- `tags` defaults to `[]`; invalid `target_type`/`rating` → 422/400.

Integration:
- `POST /feedback` → row + `AuditLog(feedback.create)`.
- Re-`POST` same target → status `updated`, single row.
- `GET /admin/analytics` reflects up/down ratio + `submission_rate` after submissions.
- Hallucination block counts only feedback tagged `sai thông tin`, excluded from `ratio`.
- `GET /admin/feedback/divergence` returns a high-reviewer-score + 👎 row, omits
  high-score + 👍 rows.
- Lab `_run_tool` response includes `_feedback_id`; generate flow exposes `job_id`.

## 9. Definition of Done (blueprint §22)

API contract, authorization + ownership check, AuditLog on mutation, unit + integration
tests, FE loading/error/voted states, friendly error messages, no cross-user leakage,
this doc updated. (No AI node added, so no prompt/schema versioning needed.)

## 10. Components & boundaries

- `models/feedback.py` — persistence only.
- `api/feedback.py` — validation, ownership, upsert, audit. Depends on models + auth.
- `_run_tool` patch — single-line id surfacing; no behavioural change.
- `<FeedbackBar>` — self-contained UI unit; depends only on the two `/api/feedback` calls.
- Admin endpoints — read-only aggregation over `Feedback` (+ existing tables).
