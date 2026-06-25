# Feedback Loop (P1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit user feedback (👍/👎 + tags + correction) for generation jobs and lab tool runs, with ownership-checked upsert API and full admin analytics (ratio, submission rate, hallucination guardrail, reviewer↔user divergence).

**Architecture:** New `Feedback` SQLAlchemy model (string `target_id` holds both int job ids and UUID lab ids), `/api/feedback` router with ownership check + upsert, non-breaking `_feedback_id` surfacing on lab responses, a shared `<FeedbackBar>` React component, and admin aggregation endpoints over `Feedback` joined to existing tables.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 (async), Alembic, Pytest (async, in-memory SQLite), Next.js (React, TypeScript), the existing `api` fetch client.

## Global Constraints

- Models use SQLAlchemy 2.0 `Mapped`/`mapped_column`, `Base` from `app.core.db`. Portable columns use `JSON().with_variant(JSONB, "postgresql")`; arrays use `JSON().with_variant(ARRAY(String), "postgresql")` (tests run on SQLite).
- Every new model is imported in `app/models/__init__.py` (so `import app.models` registers it on `Base.metadata`).
- All endpoints require auth via `Depends(get_current_user)`; admin endpoints via `Depends(require_admin)` (from `app.api.deps`).
- Mutations write an `AuditLog` row via `app.services.audit.log_action(session, user_id, action, resource_type=..., resource_id=..., ip_address=...)`.
- Target types in MVP: `generation_job`, `lab_history` only. Ratings: `up`, `down` only.
- Lab response shape MUST NOT change except adding the extra key `_feedback_id`.
- Tests follow `backend/tests/` conventions: `client` + `session_maker` fixtures from `conftest.py`; register a user with `POST /auth/register` → `{access_token}`; admin by flipping `User.is_admin` in the session.
- Frontend reuses the `api` client from `frontend/services/api.ts` (`api.get`, `api.post`).
- Reviewer score for divergence comes from `GenerationJob.result_json` via a defensive extractor (no `generation_job_id` column exists on `ContentHistory`). Divergence applies to `generation_job` only.

---

### Task 1: `Feedback` model + migration

**Files:**
- Create: `backend/app/models/feedback.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/alembic/versions/p1b2c3d4e5f6_add_feedback.py`
- Test: `backend/tests/test_feedback_model.py`

**Interfaces:**
- Produces: `Feedback` model with columns `id:int`, `user_id:int`, `project_id:int|None`, `target_type:str`, `target_id:str`, `rating:str`, `reason:str|None`, `correction:str|None`, `tags:list[str]`, `created_at`, `updated_at`; unique constraint `uq_feedback_user_target` on `(user_id, target_type, target_id)`.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_feedback_model.py
import pytest
from app.models.feedback import Feedback


@pytest.mark.asyncio
async def test_feedback_persists_with_defaults(session_maker):
    async with session_maker() as s:
        fb = Feedback(
            user_id=1, target_type="generation_job", target_id="123", rating="up"
        )
        s.add(fb)
        await s.commit()
        await s.refresh(fb)
        assert fb.id is not None
        assert fb.tags == []
        assert fb.created_at is not None


@pytest.mark.asyncio
async def test_feedback_unique_constraint(session_maker):
    from sqlalchemy.exc import IntegrityError
    async with session_maker() as s:
        s.add(Feedback(user_id=1, target_type="lab_history", target_id="abc", rating="up"))
        await s.commit()
    async with session_maker() as s:
        s.add(Feedback(user_id=1, target_type="lab_history", target_id="abc", rating="down"))
        with pytest.raises(IntegrityError):
            await s.commit()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_feedback_model.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.models.feedback'`

- [ ] **Step 3: Write the model**

```python
# backend/app/models/feedback.py
from datetime import datetime

from sqlalchemy import (
    DateTime, ForeignKey, String, Text, UniqueConstraint, func,
)
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Feedback(Base):
    __tablename__ = "feedback"
    __table_args__ = (
        UniqueConstraint("user_id", "target_type", "target_id", name="uq_feedback_user_target"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    target_type: Mapped[str] = mapped_column(String(50), index=True)
    target_id: Mapped[str] = mapped_column(String(255), index=True)
    rating: Mapped[str] = mapped_column(String(10))
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    correction: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list[str]] = mapped_column(
        JSON().with_variant(ARRAY(String), "postgresql"), default=list
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

- [ ] **Step 4: Register the model**

In `backend/app/models/__init__.py`, add the import alongside the others (match the existing style in that file):

```python
from app.models.feedback import Feedback  # noqa: F401
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_feedback_model.py -v`
Expected: PASS (both tests)

- [ ] **Step 6: Write the Alembic migration**

```python
# backend/alembic/versions/p1b2c3d4e5f6_add_feedback.py
"""add feedback table

Revision ID: p1b2c3d4e5f6
Revises: o1a2b3c4d5e6
"""
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "p1b2c3d4e5f6"
down_revision: Union[str, None] = "o1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "feedback",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("target_type", sa.String(length=50), nullable=False),
        sa.Column("target_id", sa.String(length=255), nullable=False),
        sa.Column("rating", sa.String(length=10), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("correction", sa.Text(), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "target_type", "target_id", name="uq_feedback_user_target"),
    )
    op.create_index("ix_feedback_user_id", "feedback", ["user_id"])
    op.create_index("ix_feedback_project_id", "feedback", ["project_id"])
    op.create_index("ix_feedback_target_type", "feedback", ["target_type"])
    op.create_index("ix_feedback_target_id", "feedback", ["target_id"])


def downgrade() -> None:
    op.drop_index("ix_feedback_target_id", table_name="feedback")
    op.drop_index("ix_feedback_target_type", table_name="feedback")
    op.drop_index("ix_feedback_project_id", table_name="feedback")
    op.drop_index("ix_feedback_user_id", table_name="feedback")
    op.drop_table("feedback")
```

- [ ] **Step 7: Verify migration chain has a single head**

Run: `cd backend && alembic heads`
Expected: exactly one head — `p1b2c3d4e5f6 (head)`

- [ ] **Step 8: Commit**

```bash
git add backend/app/models/feedback.py backend/app/models/__init__.py backend/alembic/versions/p1b2c3d4e5f6_add_feedback.py backend/tests/test_feedback_model.py
git commit -m "feat(feedback): add Feedback model + migration"
```

---

### Task 2: `/api/feedback` router (POST upsert + GET current)

**Files:**
- Create: `backend/app/api/feedback.py`
- Modify: `backend/app/main.py:9` (import) and `backend/app/main.py:140` area (include_router)
- Test: `backend/tests/test_feedback_api.py`

**Interfaces:**
- Consumes: `Feedback` (Task 1), `get_current_user`, `log_action`, `GenerationJob`, `Project`, `LabHistory`.
- Produces: `POST /api/feedback` → `{feedback_id:int, status:"created"|"updated"}`; `GET /api/feedback?target_type=&target_id=` → feedback dict or `null`. Router object `router` (prefix `/api/feedback`).

- [ ] **Step 1: Confirm the audit helper signature**

Run: `cd backend && grep -n "def log_action" app/services/audit.py`
Confirm it accepts `(session, user_id, action, resource_type=..., resource_id=..., ip_address=...)`. The router below calls `log_action(session, user.id, "feedback.create", resource_type=..., resource_id=...)`; adjust kwargs if the real signature differs.

- [ ] **Step 2: Write the failing tests**

```python
# backend/tests/test_feedback_api.py
import pytest
from sqlalchemy import select


async def _register(client, email="u1@example.com"):
    resp = await client.post(
        "/auth/register",
        json={"name": "U", "email": email, "password": "secret123"},
    )
    return resp.json()["access_token"]


async def _make_job(session_maker, email):
    """Create a project (owned by the registered user) + a generation job, return job id."""
    from app.models.project import Project
    from app.models.generation_job import GenerationJob
    from app.models.user import User
    async with session_maker() as s:
        user = (await s.execute(select(User).where(User.email == email))).scalar_one()
        proj = Project(user_id=user.id, name="P")
        s.add(proj)
        await s.commit()
        await s.refresh(proj)
        job = GenerationJob(project_id=proj.id, content_type="facebook_post", status="done")
        s.add(job)
        await s.commit()
        await s.refresh(job)
        return job.id


@pytest.mark.asyncio
async def test_create_then_update_feedback(client, session_maker):
    token = await _register(client)
    headers = {"Authorization": f"Bearer {token}"}
    job_id = await _make_job(session_maker, "u1@example.com")

    r1 = await client.post("/api/feedback", headers=headers, json={
        "target_type": "generation_job", "target_id": str(job_id),
        "rating": "down", "tags": ["thiếu CTA"],
    })
    assert r1.status_code == 200
    assert r1.json()["status"] == "created"

    r2 = await client.post("/api/feedback", headers=headers, json={
        "target_type": "generation_job", "target_id": str(job_id), "rating": "up",
    })
    assert r2.json()["status"] == "updated"
    assert r2.json()["feedback_id"] == r1.json()["feedback_id"]

    from app.models.audit_log import AuditLog
    async with session_maker() as s:
        rows = (await s.execute(select(AuditLog).where(AuditLog.action == "feedback.create"))).scalars().all()
        assert len(rows) >= 1


@pytest.mark.asyncio
async def test_get_current_feedback(client, session_maker):
    token = await _register(client, "u2@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    job_id = await _make_job(session_maker, "u2@example.com")
    await client.post("/api/feedback", headers=headers, json={
        "target_type": "generation_job", "target_id": str(job_id), "rating": "up"})
    r = await client.get(f"/api/feedback?target_type=generation_job&target_id={job_id}", headers=headers)
    assert r.status_code == 200
    assert r.json()["rating"] == "up"


@pytest.mark.asyncio
async def test_cannot_feedback_others_job(client, session_maker):
    await _register(client, "owner@example.com")
    attacker = await _register(client, "attacker@example.com")
    job_id = await _make_job(session_maker, "owner@example.com")
    r = await client.post("/api/feedback", headers={"Authorization": f"Bearer {attacker}"}, json={
        "target_type": "generation_job", "target_id": str(job_id), "rating": "down"})
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_invalid_target_type_rejected(client, session_maker):
    token = await _register(client, "u3@example.com")
    r = await client.post("/api/feedback", headers={"Authorization": f"Bearer {token}"}, json={
        "target_type": "chat_message", "target_id": "1", "rating": "up"})
    assert r.status_code == 422
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_feedback_api.py -v`
Expected: FAIL (404 routes — `/api/feedback` not registered)

- [ ] **Step 4: Write the router**

```python
# backend/app/api/feedback.py
import logging
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.user import User
from app.models.feedback import Feedback
from app.models.generation_job import GenerationJob
from app.models.lab_history import LabHistory
from app.models.project import Project
from app.services.audit import log_action

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

TargetType = Literal["generation_job", "lab_history"]
Rating = Literal["up", "down"]


class FeedbackIn(BaseModel):
    target_type: TargetType
    target_id: str = Field(..., max_length=255)
    rating: Rating
    reason: str | None = Field(None, max_length=4000)
    correction: str | None = Field(None, max_length=4000)
    tags: list[str] = Field(default_factory=list)


async def _verify_ownership(session: AsyncSession, user: User, target_type: str, target_id: str) -> int | None:
    """Return project_id (or None) if target belongs to user; raise 404 otherwise."""
    if target_type == "generation_job":
        try:
            job_pk = int(target_id)
        except ValueError:
            raise HTTPException(status_code=404, detail="Target not found")
        row = (
            await session.execute(
                select(GenerationJob.project_id)
                .join(Project, GenerationJob.project_id == Project.id)
                .where(GenerationJob.id == job_pk, Project.user_id == user.id)
            )
        ).first()
        if row is None:
            raise HTTPException(status_code=404, detail="Target not found")
        return row[0]
    # lab_history
    try:
        lab_pk = uuid.UUID(target_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Target not found")
    row = (
        await session.execute(
            select(LabHistory.id).where(LabHistory.id == lab_pk, LabHistory.user_id == user.id)
        )
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Target not found")
    return None


@router.post("")
async def create_feedback(
    body: FeedbackIn,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    project_id = await _verify_ownership(session, user, body.target_type, body.target_id)

    existing = (
        await session.execute(
            select(Feedback).where(
                Feedback.user_id == user.id,
                Feedback.target_type == body.target_type,
                Feedback.target_id == body.target_id,
            )
        )
    ).scalar_one_or_none()

    if existing is None:
        fb = Feedback(
            user_id=user.id,
            project_id=project_id,
            target_type=body.target_type,
            target_id=body.target_id,
            rating=body.rating,
            reason=body.reason,
            correction=body.correction,
            tags=body.tags,
        )
        session.add(fb)
        status_str = "created"
    else:
        existing.rating = body.rating
        existing.reason = body.reason
        existing.correction = body.correction
        existing.tags = body.tags
        fb = existing
        status_str = "updated"

    await log_action(session, user.id, "feedback.create", resource_type=body.target_type, resource_id=body.target_id)
    await session.commit()
    await session.refresh(fb)
    return {"feedback_id": fb.id, "status": status_str}


@router.get("")
async def get_feedback(
    target_type: TargetType,
    target_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    fb = (
        await session.execute(
            select(Feedback).where(
                Feedback.user_id == user.id,
                Feedback.target_type == target_type,
                Feedback.target_id == target_id,
            )
        )
    ).scalar_one_or_none()
    if fb is None:
        return None
    return {
        "feedback_id": fb.id,
        "rating": fb.rating,
        "reason": fb.reason,
        "correction": fb.correction,
        "tags": fb.tags,
    }
```

- [ ] **Step 5: Register the router in main.py**

In `backend/app/main.py` line 9, append `feedback` to the `from app.api import ...` list:

```python
from app.api import admin, auth, brand, chat, conversations, documents, generate, history, images, payments, projects, templates, lab, study, study_questions, frame, feedback
```

After `app.include_router(frame.router)`, add:

```python
app.include_router(feedback.router)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_feedback_api.py -v`
Expected: PASS (4 tests). If `Project(...)` / `GenerationJob(...)` kwargs mismatch the real models, read those model files and fix the test helper accordingly.

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/feedback.py backend/app/main.py backend/tests/test_feedback_api.py
git commit -m "feat(feedback): add /api/feedback upsert + get endpoints"
```

---

### Task 3: Surface `_feedback_id` on lab responses (non-breaking)

**Files:**
- Modify: `backend/app/api/lab.py` (`_run_tool` ~line 169-181; `seo_analysis_endpoint` ~line 380-389)
- Test: `backend/tests/test_feedback_lab_surface.py`

**Interfaces:**
- Produces: lab tool JSON responses include `_feedback_id: str` (the `LabHistory.id`) when history is persisted. No other shape change.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_feedback_lab_surface.py
import pytest
from unittest.mock import patch
from sqlalchemy import select


async def _register(client, email="lab1@example.com"):
    resp = await client.post("/auth/register", json={"name": "L", "email": email, "password": "secret123"})
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_lab_response_includes_feedback_id(client, session_maker, promote):
    token = await _register(client)
    from app.models.user import User
    async with session_maker() as s:
        uid = (await s.execute(select(User.id).where(User.email == "lab1@example.com"))).scalar_one()
    await promote(uid, "max")

    class _Fake:
        def model_dump(self):
            return {"score": 80, "verdict": "ok"}

    async def _fake_agent(*a, **k):
        return _Fake()

    with patch("app.api.lab.run_shield_agent", _fake_agent):
        r = await client.post("/api/lab/shield", headers={"Authorization": f"Bearer {token}"},
                              json={"content": "hello world"})
    assert r.status_code == 200
    body = r.json()
    assert "_feedback_id" in body and body["_feedback_id"]
    assert body["score"] == 80  # original fields preserved
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_feedback_lab_surface.py -v`
Expected: FAIL — `_feedback_id` not in body

- [ ] **Step 3: Patch `_run_tool` to surface the id**

In `backend/app/api/lab.py`, inside `_run_tool`, replace the history-save block so it captures the id and merges it into the returned dict:

```python
        # Save to lab_history
        if input_data is not None:
            async with async_session_maker() as session:
                history_entry = LabHistory(
                    user_id=user.id,
                    tool_name=tool_name,
                    input_data=input_data,
                    output_data=output_data
                )
                session.add(history_entry)
                await session.commit()
                await session.refresh(history_entry)
                output_data["_feedback_id"] = str(history_entry.id)

        return output_data
```

- [ ] **Step 4: Patch the SEO-analysis endpoint the same way**

In `seo_analysis_endpoint`, change the save block to refresh and return the id:

```python
            session.add(entry)
            await session.commit()
            await session.refresh(entry)
        return {"report": report, "_feedback_id": str(entry.id)}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_feedback_lab_surface.py -v`
Expected: PASS

- [ ] **Step 6: Run existing lab/seo tests for no regression**

Run: `cd backend && python -m pytest tests/test_agents.py tests/test_seo_analysis.py -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/lab.py backend/tests/test_feedback_lab_surface.py
git commit -m "feat(feedback): surface _feedback_id on lab responses"
```

---

### Task 4: Admin analytics — feedback block, list, divergence

**Files:**
- Modify: `backend/app/api/admin.py` (extend `get_analytics`; add two endpoints; add imports)
- Test: `backend/tests/test_feedback_admin.py`

**Interfaces:**
- Consumes: `Feedback`, `GenerationJob`, `LabHistory`, `require_admin`.
- Produces:
  - `get_analytics` response gains a `feedback` key: `{total, up, down, ratio, submission_rate, by_target_type, hallucination: {count, recent}}`.
  - `GET /admin/feedback?rating=&target_type=&tag=` → `{recent: [...], top_tags: [{tag, count}]}`.
  - `GET /admin/feedback/divergence?min_score=75` → `[{target_id, content_type, score, reason, tags, created_at}]`.

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/test_feedback_admin.py
import pytest
from sqlalchemy import select


async def _register(client, email):
    r = await client.post("/auth/register", json={"name": "A", "email": email, "password": "secret123"})
    return r.json()["access_token"]


async def _make_admin(client, session_maker, email="admin@example.com"):
    token = await _register(client, email)
    from app.models.user import User
    async with session_maker() as s:
        u = (await s.execute(select(User).where(User.email == email))).scalar_one()
        u.is_admin = True
        await s.commit()
    return token


async def _seed_feedback(session_maker, **kw):
    from app.models.feedback import Feedback
    async with session_maker() as s:
        s.add(Feedback(**kw))
        await s.commit()


@pytest.mark.asyncio
async def test_analytics_has_feedback_block(client, session_maker):
    token = await _make_admin(client, session_maker)
    await _seed_feedback(session_maker, user_id=1, target_type="generation_job", target_id="1", rating="up")
    await _seed_feedback(session_maker, user_id=1, target_type="lab_history", target_id="x", rating="down",
                         tags=["sai thông tin"])
    r = await client.get("/admin/analytics", headers={"Authorization": f"Bearer {token}"})
    fb = r.json()["feedback"]
    assert fb["up"] == 1 and fb["down"] == 1
    assert fb["hallucination"]["count"] == 1
    assert "submission_rate" in fb


@pytest.mark.asyncio
async def test_admin_feedback_list_top_tags(client, session_maker):
    token = await _make_admin(client, session_maker, "admin2@example.com")
    await _seed_feedback(session_maker, user_id=1, target_type="generation_job", target_id="1", rating="down",
                         tags=["thiếu CTA"])
    await _seed_feedback(session_maker, user_id=2, target_type="generation_job", target_id="2", rating="down",
                         tags=["thiếu CTA"])
    r = await client.get("/admin/feedback", headers={"Authorization": f"Bearer {token}"})
    body = r.json()
    assert body["top_tags"][0]["tag"] == "thiếu CTA"
    assert body["top_tags"][0]["count"] == 2


@pytest.mark.asyncio
async def test_divergence_returns_high_score_downvotes(client, session_maker):
    token = await _make_admin(client, session_maker, "admin3@example.com")
    from app.models.project import Project
    from app.models.generation_job import GenerationJob
    from app.models.user import User
    async with session_maker() as s:
        u = (await s.execute(select(User).where(User.email == "admin3@example.com"))).scalar_one()
        proj = Project(user_id=u.id, name="P")
        s.add(proj); await s.commit(); await s.refresh(proj)
        job = GenerationJob(project_id=proj.id, content_type="facebook_post", status="done",
                            result_json={"metadata": {"score": 90}})
        s.add(job); await s.commit(); await s.refresh(job)
        job_id = job.id
        uid = u.id
    await _seed_feedback(session_maker, user_id=uid, target_type="generation_job",
                         target_id=str(job_id), rating="down")
    r = await client.get("/admin/feedback/divergence?min_score=75",
                         headers={"Authorization": f"Bearer {token}"})
    rows = r.json()
    assert any(str(row["target_id"]) == str(job_id) and row["score"] == 90 for row in rows)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_feedback_admin.py -v`
Expected: FAIL — `KeyError: 'feedback'` / 404 on new routes

- [ ] **Step 3: Add imports + helper to admin.py**

At the top of `backend/app/api/admin.py`:
- change `from sqlalchemy import func, select` → `from sqlalchemy import String, func, select`
- add `from app.models.feedback import Feedback`
- add `from app.models.lab_history import LabHistory`

Add this constant + helper after `router = APIRouter(...)`:

```python
HALLUCINATION_TAG = "sai thông tin"


def _extract_reviewer_score(result_json) -> float | None:
    """Defensively pull a reviewer score from a GenerationJob.result_json."""
    if not isinstance(result_json, dict):
        return None
    for path in (("metadata", "score"), ("review", "score"), ("score",)):
        node = result_json
        ok = True
        for key in path:
            if isinstance(node, dict) and key in node:
                node = node[key]
            else:
                ok = False
                break
        if ok and isinstance(node, (int, float)):
            return float(node)
    return None
```

- [ ] **Step 4: Extend `get_analytics` with the feedback block**

Inside `get_analytics`, before the final `return {...}`, add:

```python
    fb_rows = (await session.execute(select(Feedback.rating, Feedback.target_type, Feedback.tags))).all()
    fb_total = len(fb_rows)
    fb_up = sum(1 for r in fb_rows if r.rating == "up")
    fb_down = sum(1 for r in fb_rows if r.rating == "down")
    by_target: dict[str, dict[str, int]] = {}
    halluc_count = 0
    for r in fb_rows:
        bucket = by_target.setdefault(r.target_type, {"up": 0, "down": 0})
        bucket[r.rating] = bucket.get(r.rating, 0) + 1
        if r.tags and HALLUCINATION_TAG in r.tags:
            halluc_count += 1

    halluc_src = (
        await session.execute(
            select(Feedback.target_type, Feedback.target_id, Feedback.reason, Feedback.tags, Feedback.created_at)
            .order_by(Feedback.created_at.desc())
            .limit(200)
        )
    ).all()
    halluc_recent = [
        {"target_type": r.target_type, "target_id": r.target_id, "reason": r.reason,
         "created_at": r.created_at.isoformat() if r.created_at else None}
        for r in halluc_src if r.tags and HALLUCINATION_TAG in r.tags
    ][:10]

    eligible = (total_jobs or 0) + (
        (await session.execute(select(func.count(LabHistory.id)))).scalar() or 0
    )
    submission_rate = round((fb_total / eligible) * 100, 1) if eligible > 0 else None
```

Then add this key to the returned dict (alongside `"tool_usage"`, `"activities"`):

```python
        "feedback": {
            "total": fb_total,
            "up": fb_up,
            "down": fb_down,
            "ratio": round(fb_up / fb_total, 2) if fb_total else None,
            "submission_rate": submission_rate,
            "by_target_type": by_target,
            "hallucination": {"count": halluc_count, "recent": halluc_recent},
        },
```

(`total_jobs` is already computed earlier in `get_analytics`.)

- [ ] **Step 5: Add the two new endpoints**

Append to `backend/app/api/admin.py`:

```python
@router.get("/feedback")
async def list_feedback(
    rating: str | None = None,
    target_type: str | None = None,
    tag: str | None = None,
    limit: int = Query(default=50, le=200),
    session: AsyncSession = Depends(get_session),
):
    q = (
        select(
            Feedback.id, Feedback.user_id, Feedback.target_type, Feedback.target_id,
            Feedback.rating, Feedback.reason, Feedback.tags, Feedback.created_at,
            User.name.label("user_name"),
        )
        .outerjoin(User, Feedback.user_id == User.id)
        .order_by(Feedback.created_at.desc())
    )
    if rating:
        q = q.where(Feedback.rating == rating)
    if target_type:
        q = q.where(Feedback.target_type == target_type)
    rows = (await session.execute(q.limit(limit))).all()
    recent = []
    tag_counts: dict[str, int] = {}
    for r in rows:
        if tag and (not r.tags or tag not in r.tags):
            continue
        recent.append({
            "id": r.id, "user_name": r.user_name, "target_type": r.target_type,
            "target_id": r.target_id, "rating": r.rating, "reason": r.reason,
            "tags": r.tags or [], "created_at": r.created_at.isoformat() if r.created_at else None,
        })
        for t in (r.tags or []):
            tag_counts[t] = tag_counts.get(t, 0) + 1
    top_tags = sorted(
        ({"tag": k, "count": v} for k, v in tag_counts.items()),
        key=lambda x: x["count"], reverse=True,
    )
    return {"recent": recent, "top_tags": top_tags}


@router.get("/feedback/divergence")
async def feedback_divergence(
    min_score: float = Query(default=75.0),
    session: AsyncSession = Depends(get_session),
):
    rows = (
        await session.execute(
            select(
                Feedback.target_id, Feedback.reason, Feedback.tags, Feedback.created_at,
                GenerationJob.content_type, GenerationJob.result_json,
            )
            .join(GenerationJob, Feedback.target_id == func.cast(GenerationJob.id, String))
            .where(Feedback.target_type == "generation_job", Feedback.rating == "down")
            .order_by(Feedback.created_at.desc())
            .limit(200)
        )
    ).all()
    out = []
    for r in rows:
        score = _extract_reviewer_score(r.result_json)
        if score is not None and score >= min_score:
            out.append({
                "target_id": r.target_id, "content_type": r.content_type, "score": score,
                "reason": r.reason, "tags": r.tags or [],
                "created_at": r.created_at.isoformat() if r.created_at else None,
            })
    return out
```

Note: the join casts the int PK to string via `func.cast(GenerationJob.id, String)` for portability. If this fails on SQLite during the test, replace the divergence query with: fetch all `generation_job` down-vote feedback rows, then for each `int(target_id)` load the job with `session.get(GenerationJob, ...)` and filter in Python.

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_feedback_admin.py -v`
Expected: PASS (3 tests). If divergence cast fails on SQLite, apply the Python fallback and re-run.

- [ ] **Step 7: Run admin/analytics tests for no regression**

Run: `cd backend && python -m pytest tests/test_admin.py tests/test_analytics.py -v`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add backend/app/api/admin.py backend/tests/test_feedback_admin.py
git commit -m "feat(feedback): admin analytics block, list, divergence endpoints"
```

---

### Task 5: `<FeedbackBar>` component + `use-lab-tool` feedbackId

**Files:**
- Modify: `frontend/hooks/use-lab-tool.ts`
- Modify: `frontend/components/lab-ui.tsx`

**Interfaces:**
- Produces: `export function FeedbackBar({ targetType, targetId }: { targetType: "generation_job" | "lab_history"; targetId: string | null | undefined })`.
- `useLabTool<T>` return type gains `feedbackId: string | null`.

- [ ] **Step 1: Add `feedbackId` to the hook**

In `frontend/hooks/use-lab-tool.ts`, update the return interface:

```typescript
interface UseLabToolReturn<T> {
  run: (body: Record<string, unknown>) => Promise<void>;
  result: T | null;
  feedbackId: string | null;
  loading: boolean;
  error: string | null;
  reset: () => void;
}
```

After `const [result, setResult] = useState<T | null>(null);` add:

```typescript
  const feedbackId =
    result && typeof result === "object" && "_feedback_id" in (result as Record<string, unknown>)
      ? String((result as Record<string, unknown>)._feedback_id)
      : null;
```

Change the return to: `return { run, result, feedbackId, loading, error, reset };`

- [ ] **Step 2: Add the `FeedbackBar` component to lab-ui.tsx**

Add `import { api } from "@/services/api";` to the import block at the top of `frontend/components/lab-ui.tsx`. Append this component:

```tsx
const FEEDBACK_TAGS = ["sai giọng thương hiệu", "quá dài", "thiếu CTA", "sai thông tin", "lỗi format"];

export function FeedbackBar({
  targetType,
  targetId,
}: {
  targetType: "generation_job" | "lab_history";
  targetId: string | null | undefined;
}) {
  const [rating, setRating] = React.useState<"up" | "down" | null>(null);
  const [tags, setTags] = React.useState<string[]>([]);
  const [reason, setReason] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (!targetId) return;
    api
      .get<{ rating: "up" | "down"; tags: string[]; reason: string | null } | null>(
        `/api/feedback?target_type=${targetType}&target_id=${encodeURIComponent(targetId)}`,
      )
      .then((fb) => {
        if (fb) {
          setRating(fb.rating);
          setTags(fb.tags || []);
          setReason(fb.reason || "");
        }
      })
      .catch(() => {});
  }, [targetType, targetId]);

  if (!targetId) return null;

  async function submit(next: "up" | "down", nextTags = tags, nextReason = reason) {
    setRating(next);
    if (next === "down") setOpen(true);
    try {
      await api.post(`/api/feedback`, {
        target_type: targetType,
        target_id: targetId,
        rating: next,
        reason: nextReason || null,
        tags: nextTags,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      /* non-critical */
    }
  }

  function toggleTag(t: string) {
    const next = tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t];
    setTags(next);
    if (rating) submit(rating, next, reason);
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border/40 pt-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Nội dung này thế nào?</span>
        <button
          onClick={() => submit("up")}
          className={cn("rounded px-2 py-1", rating === "up" && "bg-emerald-500/15 text-emerald-600")}
          aria-label="Hữu ích"
        >👍</button>
        <button
          onClick={() => submit("down")}
          className={cn("rounded px-2 py-1", rating === "down" && "bg-red-500/15 text-red-600")}
          aria-label="Chưa tốt"
        >👎</button>
        {saved && <span className="text-xs text-muted-foreground">Đã lưu</span>}
      </div>
      {(open || rating === "down") && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {FEEDBACK_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs",
                  tags.includes(t) ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground",
                )}
              >{t}</button>
            ))}
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => rating && submit(rating, tags, reason)}
            placeholder="Bạn muốn sửa gì?"
            className="lab-textarea min-h-[60px] text-sm"
          />
        </div>
      )}
    </div>
  );
}
```

(`React` and `cn` are already imported in `lab-ui.tsx`. If the `lab-textarea` class doesn't exist, use the same className the `LabTextarea` component uses.)

- [ ] **Step 3: Type-check the frontend**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new type errors from `lab-ui.tsx` / `use-lab-tool.ts`.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/lab-ui.tsx frontend/hooks/use-lab-tool.ts
git commit -m "feat(feedback): FeedbackBar component + useLabTool feedbackId"
```

---

### Task 6: Wire `FeedbackBar` into lab pages + generate page

**Files:**
- Modify: every `frontend/app/hub/lab/<tool>/page.tsx` using `useLabTool` (≈20 files)
- Modify: `frontend/app/(app)/generate/page.tsx`

**Interfaces:**
- Consumes: `FeedbackBar` (Task 5), `feedbackId` from `useLabTool`.

- [ ] **Step 1: List the lab pages to edit**

Run: `cd frontend && grep -rl "useLabTool" app/hub/lab`
Expected: ~20 page paths.

- [ ] **Step 2: Edit each lab page (same three edits per file)**

For each page: (a) add `FeedbackBar` to the `@/components/lab-ui` import, (b) destructure `feedbackId` from the hook, (c) render `<FeedbackBar targetType="lab_history" targetId={feedbackId} />` once after the result block.

Concrete example — `frontend/app/hub/lab/dna/page.tsx`:

```tsx
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, ResultBox, LabTextarea, FeedbackBar } from "@/components/lab-ui";
// ...
const { run, result, feedbackId, loading, error } = useLabTool<DNAResult>("/dna");
// ...after the last <ResultBox> inside the `result && (...)` block:
<FeedbackBar targetType="lab_history" targetId={feedbackId} />
```

`FeedbackBar` returns null when `feedbackId` is null, so it is safe before a run.

- [ ] **Step 3: Wire the generate page**

Run: `cd frontend && grep -n "job" "app/(app)/generate/page.tsx"`
Find the state variable holding the completed job id (e.g. `jobId`, `job.id`, or `job.job_id`). Add the import and render the bar in the success/output branch, substituting the real variable name:

```tsx
import { FeedbackBar } from "@/components/lab-ui";
// where the completed job's result is rendered:
{jobId && <FeedbackBar targetType="generation_job" targetId={String(jobId)} />}
```

- [ ] **Step 4: Type-check + build**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual smoke (recommended)**

Run a lab tool → 👍/👎 appears under the result; click 👎 → tags + textarea appear; reload → state persists.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/hub/lab "frontend/app/(app)/generate/page.tsx"
git commit -m "feat(feedback): wire FeedbackBar into lab pages and generate output"
```

---

### Task 7: Admin dashboard feedback cards

**Files:**
- Modify: the admin analytics page/component (located in Step 1)

**Interfaces:**
- Consumes: `feedback` block from `GET /admin/analytics`; `GET /admin/feedback`; `GET /admin/feedback/divergence`.

- [ ] **Step 1: Locate the admin dashboard component**

Run: `cd frontend && grep -rl "/admin/analytics" app components`
Open the matching file; match its existing card markup.

- [ ] **Step 2: Render four cards using the existing card pattern**

Fetch the two extra endpoints with `api.get` alongside the existing analytics call, then render cards reusing the dashboard's existing card component:

1. "Feedback 👍/👎 + tỷ lệ phản hồi" → `analytics.feedback.up`, `.down`, `.ratio`, `.submission_rate`.
2. "Top feedback tags" → `GET /admin/feedback` → `top_tags`.
3. "⚠ Báo sai thông tin" → `analytics.feedback.hallucination.count` + `.recent`.
4. "Reviewer cao nhưng user 👎" → `GET /admin/feedback/divergence`.

Type the responses to match the backend shapes defined in Task 4.

- [ ] **Step 3: Type-check + build**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/app frontend/components
git commit -m "feat(feedback): admin dashboard feedback cards"
```

---

## Final verification

- [ ] Backend suite: `cd backend && python -m pytest -q`
- [ ] Migration applies on Postgres staging: `alembic upgrade head`
- [ ] Frontend: `cd frontend && npx tsc --noEmit && npm run build`
- [ ] Manual: submit feedback on a lab result and a generated job; confirm it appears in `/admin/analytics` `feedback` block and (for a high-reviewer-score downvote) in `/admin/feedback/divergence`.

---

## Self-Review notes

- **Spec coverage:** model (T1), POST/GET API + ownership + audit (T2), non-breaking id surfacing (T3), admin ratio/submission-rate/hallucination/divergence (T4), tag-first FeedbackBar + hook (T5), lab+generate wiring (T6), admin cards (T7). All spec §3–§8 sections mapped.
- **Type consistency:** `_feedback_id` (str) flows model→lab response→`feedbackId`→`FeedbackBar.targetId`. `target_id` is string end-to-end. `feedback` analytics block keys match between T4 producer and T7 consumer.
- **Known risk:** SQLite cast in divergence — Python fallback documented inline in T4 Step 5.
