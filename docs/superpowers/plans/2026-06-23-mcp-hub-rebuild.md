# MCP Hub Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Facebook MCP/Login, upgrade Email MCP with templates/scheduling/contacts, and add Content Calendar, SEO Tools, Analytics Dashboard, and Landing Page Builder modules.

**Architecture:** Extend the existing FastAPI `/mcp` router with new sub-routers per module. Each module follows the existing pattern: SQLAlchemy model -> tools.py business logic -> router endpoints -> Zustand store -> Next.js hub page. All modules share the existing audit, campaign, and encryption infrastructure.

**Tech Stack:** FastAPI, SQLAlchemy async (PostgreSQL), Pydantic, Next.js 14, Zustand, Tailwind CSS, Resend API, beautifulsoup4, httpx, recharts, APScheduler

## Global Constraints

- Python 3.11+, `mapped_column` style (no `Column()`), `Mapped[]` type hints
- All models inherit from `app.core.db.Base`
- All endpoints use `Depends(get_current_user)` and `Depends(get_session)` from `app.api.deps`
- All mutations call `log_action()` from `app.services.audit`
- Tests use in-memory SQLite via `aiosqlite` with `StaticPool` (see `backend/tests/test_models.py` pattern)
- Frontend uses `api.get/post/patch/delete` from `@/services/api` with Bearer token
- UI components from `@/components/ui/` (Card, Button, Input, Tabs, Dialog, Badge, Skeleton, Select, Textarea)
- Vietnamese UI text throughout

---

### Task 1: Remove Facebook MCP, OAuth, and Login

**Files:**
- Delete: `backend/app/mcp/meta/tools.py`, `backend/app/mcp/meta/graph_api.py`, `backend/app/mcp/meta/__init__.py`
- Delete: `backend/app/api/oauth_callbacks.py`
- Delete: `backend/app/models/oauth_account.py`, `backend/app/models/meta_page.py`
- Delete: `frontend/app/hub/facebook/page.tsx`, `frontend/app/hub/insights/page.tsx`
- Modify: `backend/app/main.py:9,105`
- Modify: `backend/app/mcp/server.py:10,54-84`
- Modify: `backend/app/models/__init__.py:11-12,20`
- Modify: `backend/app/core/config.py:50-52`
- Modify: `backend/app/api/auth.py:26,31-82,151-169`
- Modify: `backend/app/services/oauth_service.py:13,35-50`
- Modify: `backend/tests/test_oauth.py:40-60`
- Modify: `frontend/app/login/page.tsx:13-18,49-70,100-126,210-216,421-431`
- Modify: `frontend/store/mcp.ts:3-9,38-57,62,74-153`
- Modify: `frontend/app/hub/layout.tsx:9-14,20-24`
- Modify: `frontend/app/hub/page.tsx:16-19,20-64,94-101`

**Interfaces:**
- Consumes: nothing
- Produces: clean codebase without Facebook/Meta references; `mcp/server.py` with only email endpoints; `mcp.ts` store with only email state; hub layout with placeholder nav

- [ ] **Step 1: Delete backend Facebook files**

```bash
rm -rf backend/app/mcp/meta/
rm backend/app/api/oauth_callbacks.py
rm backend/app/models/oauth_account.py
rm backend/app/models/meta_page.py
```

- [ ] **Step 2: Update `backend/app/main.py` -- remove oauth_callbacks import and router**

Remove `oauth_callbacks` from the import on line 9 and the `app.include_router(oauth_callbacks.router)` on line 105.

Line 9 becomes:
```python
from app.api import admin, auth, brand, chat, conversations, documents, generate, history, images, payments, projects, templates, lab
```

Delete line 105:
```python
app.include_router(oauth_callbacks.router)
```

- [ ] **Step 3: Update `backend/app/mcp/server.py` -- remove all Meta imports, schemas, endpoints**

Replace entire file with:

```python
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.api.deps import get_current_user
from app.models.user import User
from app.mcp.email import tools as email_tools

router = APIRouter(prefix="/mcp", tags=["mcp"])


# -- Request schemas --

class EmailReq(BaseModel):
    to: list[str]
    subject: str
    html: str
    from_email: str | None = None

class BatchEmailReq(BaseModel):
    recipients: list[dict]
    subject: str
    html_template: str
    from_email: str | None = None


# -- Email endpoints --

@router.post("/email/send")
async def send_email(body: EmailReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await email_tools.send_email(session, user.id, body.to, body.subject, body.html, body.from_email)


@router.post("/email/batch")
async def send_batch(body: BatchEmailReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await email_tools.send_batch(session, user.id, body.recipients, body.subject, body.html_template, body.from_email)


@router.get("/email/stats")
async def email_stats(campaign_id: int | None = None, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await email_tools.get_email_stats(session, user.id, campaign_id)
```

- [ ] **Step 4: Update `backend/app/models/__init__.py` -- remove MetaPage, OAuthAccount**

```python
from app.models.audit_log import AuditLog
from app.models.brand_profile import BrandProfile
from app.models.brand_profile_history import BrandProfileHistory
from app.models.campaign import Campaign
from app.models.content_history import ContentHistory
from app.models.conversation import Conversation, Message
from app.models.deployment import Deployment
from app.models.document import Document
from app.models.email_campaign import EmailCampaign
from app.models.generation_job import GenerationJob
from app.models.payment import PaymentOrder
from app.models.project import Project
from app.models.user import User
from app.models.user_template import UserTemplate

__all__ = [
    "AuditLog", "BrandProfile", "BrandProfileHistory", "Campaign", "ContentHistory",
    "Conversation", "Deployment", "Document", "EmailCampaign", "GenerationJob",
    "Message", "PaymentOrder", "Project", "User", "UserTemplate",
]
```

- [ ] **Step 5: Update `backend/app/core/config.py` -- remove meta env vars**

Remove these three lines (50-52):
```python
    meta_app_id: str = ""
    meta_app_secret: str = ""
    meta_redirect_uri: str = "http://localhost:3000/oauth/callback/meta"
```

- [ ] **Step 6: Update `frontend/app/login/page.tsx` -- remove Facebook login entirely**

Remove: the `FB` type declaration on Window (line 16), `facebookAppId` constant (line 50), the `checkFbLoginStatus` callback (lines 52-58), the FB init useEffect (lines 60-70), the `handleFacebookLogin` function (lines 100-126), the Facebook SDK Script tag (lines 211-215), and the Facebook login button (lines 421-431).

The Window declaration keeps only google:
```typescript
declare global {
  interface Window {
    google?: any;
  }
}
```

Delete the Facebook button block (lines 421-431). Keep the Google button.

- [ ] **Step 7: Update `frontend/store/mcp.ts` -- remove all Meta/Facebook state**

Replace entire file with:

```typescript
import { create } from "zustand";
import { api } from "@/services/api";

export interface EmailStats {
  campaigns: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  open_rate: number;
  click_rate: number;
}

interface McpState {
  emailStats: EmailStats | null;
  emailStatsLoading: boolean;
  sending: boolean;

  sendEmail: (to: string[], subject: string, html: string) => Promise<void>;
  sendBatchEmail: (recipients: Record<string, string>[], subject: string, htmlTemplate: string) => Promise<void>;
  loadEmailStats: (campaignId?: number) => Promise<void>;
}

export const useMcpStore = create<McpState>()((set) => ({
  emailStats: null,
  emailStatsLoading: false,
  sending: false,

  sendEmail: async (to, subject, html) => {
    set({ sending: true });
    try {
      await api.post("/mcp/email/send", { to, subject, html });
    } finally {
      set({ sending: false });
    }
  },

  sendBatchEmail: async (recipients, subject, htmlTemplate) => {
    set({ sending: true });
    try {
      await api.post("/mcp/email/batch", {
        recipients,
        subject,
        html_template: htmlTemplate,
      });
    } finally {
      set({ sending: false });
    }
  },

  loadEmailStats: async (campaignId) => {
    set({ emailStatsLoading: true });
    try {
      const url = campaignId ? `/mcp/email/stats?campaign_id=${campaignId}` : "/mcp/email/stats";
      const stats = await api.get<EmailStats>(url);
      set({ emailStats: stats });
    } catch {
      set({ emailStats: null });
    } finally {
      set({ emailStatsLoading: false });
    }
  },
}));
```

- [ ] **Step 8: Update `frontend/app/hub/layout.tsx` -- new sidebar nav**

Replace the `NAV` and `ICONS` constants:

```typescript
const NAV = [
  { label: "Tong quan", href: "/hub", icon: "overview" },
  { label: "Email Marketing", href: "/hub/email", icon: "email" },
  { label: "Content Calendar", href: "/hub/calendar", icon: "calendar" },
  { label: "SEO Tools", href: "/hub/seo", icon: "seo" },
  { label: "Analytics", href: "/hub/analytics", icon: "analytics" },
  { label: "Landing Pages", href: "/hub/landing", icon: "landing" },
];
```

Add new icons to the `ICONS` record:
```typescript
const ICONS: Record<string, React.ReactNode> = {
  overview: /* keep existing */,
  email: /* keep existing */,
  calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>,
  seo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  analytics: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
  landing: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>,
  lab: /* keep existing */,
};
```

- [ ] **Step 9: Update `frontend/app/hub/page.tsx` -- remove Facebook references from overview**

Replace the entire file to remove the Facebook card, Meta OAuth, and pages references. Keep only Email stats cards:

```tsx
"use client";

import { useEffect } from "react";
import { useMcpStore } from "@/store/mcp";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function HubOverviewPage() {
  const { emailStats, emailStatsLoading, loadEmailStats } = useMcpStore();

  useEffect(() => { loadEmailStats(); }, [loadEmailStats]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trung tam Marketing</h1>
        <p className="text-sm text-muted-foreground mt-1">Email, SEO, Content, Landing Pages - tat ca trong mot.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Email da gui</CardDescription>
            <CardTitle className="text-3xl">
              {emailStatsLoading ? <Skeleton className="h-9 w-16" /> : emailStats?.total_sent ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Ty le mo</CardDescription>
            <CardTitle className="text-3xl">
              {emailStatsLoading ? <Skeleton className="h-9 w-16" /> : `${emailStats?.open_rate ?? 0}%`}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Ty le click</CardDescription>
            <CardTitle className="text-3xl">
              {emailStatsLoading ? <Skeleton className="h-9 w-16" /> : `${emailStats?.click_rate ?? 0}%`}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Chien dich</CardDescription>
            <CardTitle className="text-3xl">
              {emailStatsLoading ? <Skeleton className="h-9 w-16" /> : emailStats?.campaigns ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Delete frontend Facebook/Insights pages**

```bash
rm -rf frontend/app/hub/facebook/
rm -rf frontend/app/hub/insights/
```

- [ ] **Step 10a: Remove backend Facebook login from `backend/app/api/auth.py`**

This file still references the deleted Meta models and graph_api via the dead `_link_facebook_pages()` helper, and exposes a `/auth/facebook` endpoint. Remove all of it (Google login stays untouched).

1. Change the import on line 26 from:
```python
from app.services.oauth_service import find_or_create_oauth_user, verify_facebook_token, verify_google_token
```
to:
```python
from app.services.oauth_service import find_or_create_oauth_user, verify_google_token
```

2. Delete the entire `_link_facebook_pages` function (the `async def _link_facebook_pages(...)` block spanning roughly lines 31-82, including its lazy imports of `app.models.oauth_account`, `app.models.meta_page`, `app.mcp.meta.graph_api`).

3. Delete the entire `/auth/facebook` route — the `@router.post("/facebook", ...)` decorator, its `@limiter.limit("10/minute")` line, and the `async def facebook_login(...)` function body (roughly lines 151-169).

- [ ] **Step 10b: Remove `verify_facebook_token` from `backend/app/services/oauth_service.py`**

Delete the `FACEBOOK_GRAPH_URL` constant (line 13) and the entire `async def verify_facebook_token(...)` function (roughly lines 35-50). Keep `verify_google_token` and `find_or_create_oauth_user`.

- [ ] **Step 10c: Remove the Facebook tests from `backend/tests/test_oauth.py`**

Delete `test_facebook_login_invalid_token` and `test_facebook_login_creates_user` (the two `async def test_facebook_login_*` functions, roughly lines 40-60). Keep all Google login tests.

- [ ] **Step 11: Run tests to verify nothing is broken**

Run: `cd backend && python -m pytest tests/ -x -q`
Expected: All tests pass

- [ ] **Step 12: Commit cleanup**

```bash
git add -A
git commit -m "refactor: remove Facebook MCP, OAuth, and login -- keep Email MCP only"
```

---

### Task 2: Email Marketing -- Backend Models (Templates, Contacts, Lists, Scheduled)

**Files:**
- Create: `backend/app/models/email_template.py`
- Create: `backend/app/models/email_contact.py`
- Create: `backend/app/models/email_list.py`
- Create: `backend/app/models/scheduled_email.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/tests/test_email_models.py`

**Interfaces:**
- Consumes: `app.core.db.Base`, `app.models.user.User` (for FK)
- Produces: `EmailTemplate`, `EmailContact`, `EmailList`, `ScheduledEmail`, `email_list_contacts` association table -- used by Task 3 endpoints

- [ ] **Step 1: Write test for email models**

Create `backend/tests/test_email_models.py`:

```python
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.db import Base
import app.models  # noqa: F401
from app.models.user import User
from app.models.email_template import EmailTemplate
from app.models.email_contact import EmailContact
from app.models.email_list import EmailList, email_list_contacts
from app.models.scheduled_email import ScheduledEmail


@pytest.fixture
async def db():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as session:
        user = User(name="Test", email="test@example.com", password_hash="x")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        yield session, user
    await engine.dispose()


async def test_email_template_crud(db):
    session, user = db
    tpl = EmailTemplate(
        name="Welcome", subject="Hello {{name}}", html_body="<h1>Hi {{name}}</h1>",
        variables=["name"], category="onboarding", user_id=user.id,
    )
    session.add(tpl)
    await session.commit()
    rows = (await session.execute(select(EmailTemplate).where(EmailTemplate.user_id == user.id))).scalars().all()
    assert len(rows) == 1
    assert rows[0].name == "Welcome"
    assert rows[0].variables == ["name"]


async def test_email_contact_crud(db):
    session, user = db
    contact = EmailContact(
        email="customer@example.com", name="Customer",
        tags=["vip", "newsletter"], user_id=user.id,
    )
    session.add(contact)
    await session.commit()
    rows = (await session.execute(select(EmailContact).where(EmailContact.user_id == user.id))).scalars().all()
    assert len(rows) == 1
    assert rows[0].status == "active"
    assert "vip" in rows[0].tags


async def test_email_list_with_contacts(db):
    session, user = db
    contact = EmailContact(email="a@b.com", name="A", user_id=user.id)
    session.add(contact)
    await session.flush()

    lst = EmailList(name="VIP List", user_id=user.id)
    session.add(lst)
    await session.flush()

    await session.execute(email_list_contacts.insert().values(list_id=lst.id, contact_id=contact.id))
    await session.commit()

    rows = (await session.execute(
        select(EmailContact.email)
        .join(email_list_contacts, EmailContact.id == email_list_contacts.c.contact_id)
        .where(email_list_contacts.c.list_id == lst.id)
    )).scalars().all()
    assert rows == ["a@b.com"]


async def test_scheduled_email(db):
    session, user = db
    tpl = EmailTemplate(name="T", subject="S", html_body="<p>B</p>", user_id=user.id)
    lst = EmailList(name="L", user_id=user.id)
    session.add_all([tpl, lst])
    await session.flush()

    sched = ScheduledEmail(
        template_id=tpl.id, list_id=lst.id,
        scheduled_at="2026-07-01T10:00:00+07:00",
        user_id=user.id,
    )
    session.add(sched)
    await session.commit()
    assert sched.status == "pending"
    assert sched.id is not None
```

- [ ] **Step 2: Run test -- expect FAIL (models don't exist yet)**

Run: `cd backend && python -m pytest tests/test_email_models.py -v`
Expected: ImportError

- [ ] **Step 3: Create `backend/app/models/email_template.py`**

```python
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    subject: Mapped[str] = mapped_column(String(500))
    html_body: Mapped[str] = mapped_column(Text)
    variables: Mapped[list[Any] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

- [ ] **Step 4: Create `backend/app/models/email_contact.py`**

```python
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class EmailContact(Base):
    __tablename__ = "email_contacts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tags: Mapped[list[Any] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(50), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 5: Create `backend/app/models/email_list.py`**

```python
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

email_list_contacts = Table(
    "email_list_contacts",
    Base.metadata,
    Column("list_id", Integer, ForeignKey("email_lists.id", ondelete="CASCADE"), primary_key=True),
    Column("contact_id", Integer, ForeignKey("email_contacts.id", ondelete="CASCADE"), primary_key=True),
)


class EmailList(Base):
    __tablename__ = "email_lists"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 6: Create `backend/app/models/scheduled_email.py`**

```python
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class ScheduledEmail(Base):
    __tablename__ = "scheduled_emails"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    template_id: Mapped[int] = mapped_column(ForeignKey("email_templates.id", ondelete="CASCADE"))
    list_id: Mapped[int] = mapped_column(ForeignKey("email_lists.id", ondelete="CASCADE"))
    campaign_id: Mapped[int | None] = mapped_column(ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True)
    scheduled_at: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(50), default="pending")
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 7: Update `backend/app/models/__init__.py` -- register new models**

Add imports:
```python
from app.models.email_template import EmailTemplate
from app.models.email_contact import EmailContact
from app.models.email_list import EmailList
from app.models.scheduled_email import ScheduledEmail
```

Add to `__all__`: `"EmailTemplate", "EmailContact", "EmailList", "ScheduledEmail"`

- [ ] **Step 8: Run tests -- expect PASS**

Run: `cd backend && python -m pytest tests/test_email_models.py -v`
Expected: 4 passed

- [ ] **Step 9: Commit**

```bash
git add backend/app/models/email_template.py backend/app/models/email_contact.py backend/app/models/email_list.py backend/app/models/scheduled_email.py backend/app/models/__init__.py backend/tests/test_email_models.py
git commit -m "feat: add email template, contact, list, and scheduled email models"
```

---

### Task 3: Email Marketing -- Backend Endpoints (Templates, Contacts, Lists, Scheduling)

**Files:**
- Create: `backend/app/mcp/email/templates.py`
- Create: `backend/app/mcp/email/contacts.py`
- Create: `backend/app/mcp/email/lists.py`
- Create: `backend/app/mcp/email/scheduling.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_email_endpoints.py`

**Interfaces:**
- Consumes: `EmailTemplate`, `EmailContact`, `EmailList`, `ScheduledEmail`, `email_list_contacts` from Task 2; `email_tools.send_email` for scheduling execution
- Produces: CRUD endpoints at `/mcp/email/templates`, `/mcp/email/contacts`, `/mcp/email/lists`, `/mcp/email/schedule`, `/mcp/email/scheduled`, `/mcp/email/cancel-schedule`, `/mcp/email/unsubscribe/{token}` -- used by Task 8 frontend

- [ ] **Step 1: Create `backend/app/mcp/email/templates.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.email_template import EmailTemplate
from app.models.user import User
from app.services.audit import log_action

router = APIRouter(prefix="/mcp/email/templates", tags=["email-templates"])


class TemplateCreate(BaseModel):
    name: str
    subject: str
    html_body: str
    variables: list[str] | None = None
    category: str | None = None

class TemplateUpdate(BaseModel):
    name: str | None = None
    subject: str | None = None
    html_body: str | None = None
    variables: list[str] | None = None
    category: str | None = None


@router.get("")
async def list_templates(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(
        select(EmailTemplate).where(EmailTemplate.user_id == user.id).order_by(EmailTemplate.created_at.desc())
    )).scalars().all()
    return [{"id": t.id, "name": t.name, "subject": t.subject, "category": t.category, "created_at": str(t.created_at)} for t in rows]


@router.get("/{template_id}")
async def get_template(template_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    tpl = await session.get(EmailTemplate, template_id)
    if not tpl or tpl.user_id != user.id:
        raise HTTPException(404, "Template not found")
    return {"id": tpl.id, "name": tpl.name, "subject": tpl.subject, "html_body": tpl.html_body, "variables": tpl.variables, "category": tpl.category}


@router.post("", status_code=201)
async def create_template(body: TemplateCreate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    tpl = EmailTemplate(user_id=user.id, name=body.name, subject=body.subject, html_body=body.html_body, variables=body.variables, category=body.category)
    session.add(tpl)
    await session.commit()
    await log_action(session, user.id, "email.template_create", "email_template", str(tpl.id))
    return {"id": tpl.id, "name": tpl.name}


@router.patch("/{template_id}")
async def update_template(template_id: int, body: TemplateUpdate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    tpl = await session.get(EmailTemplate, template_id)
    if not tpl or tpl.user_id != user.id:
        raise HTTPException(404, "Template not found")
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(tpl, field, val)
    await session.commit()
    await log_action(session, user.id, "email.template_update", "email_template", str(tpl.id))
    return {"id": tpl.id, "name": tpl.name}


@router.delete("/{template_id}", status_code=204)
async def delete_template(template_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    tpl = await session.get(EmailTemplate, template_id)
    if not tpl or tpl.user_id != user.id:
        raise HTTPException(404, "Template not found")
    await session.delete(tpl)
    await session.commit()
    await log_action(session, user.id, "email.template_delete", "email_template", str(template_id))
```

- [ ] **Step 2: Create `backend/app/mcp/email/contacts.py`**

```python
import csv
import io

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.email_contact import EmailContact
from app.models.user import User
from app.services.audit import log_action

router = APIRouter(prefix="/mcp/email/contacts", tags=["email-contacts"])


class ContactCreate(BaseModel):
    email: str
    name: str | None = None
    tags: list[str] | None = None

class ContactUpdate(BaseModel):
    name: str | None = None
    tags: list[str] | None = None
    status: str | None = None


@router.get("")
async def list_contacts(
    tag: str | None = None, status: str | None = None,
    user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session),
):
    q = select(EmailContact).where(EmailContact.user_id == user.id)
    if status:
        q = q.where(EmailContact.status == status)
    rows = (await session.execute(q.order_by(EmailContact.created_at.desc()))).scalars().all()
    results = []
    for c in rows:
        if tag and (not c.tags or tag not in c.tags):
            continue
        results.append({"id": c.id, "email": c.email, "name": c.name, "tags": c.tags, "status": c.status})
    return results


@router.post("", status_code=201)
async def create_contact(body: ContactCreate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    contact = EmailContact(user_id=user.id, email=body.email, name=body.name, tags=body.tags)
    session.add(contact)
    await session.commit()
    await log_action(session, user.id, "email.contact_create", "email_contact", str(contact.id))
    return {"id": contact.id, "email": contact.email}


@router.post("/import", status_code=201)
async def import_contacts(file: UploadFile = File(...), user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    content = (await file.read()).decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    count = 0
    for row in reader:
        email_val = row.get("email", "").strip()
        if not email_val:
            continue
        contact = EmailContact(
            user_id=user.id, email=email_val,
            name=row.get("name", "").strip() or None,
            tags=[t.strip() for t in row.get("tags", "").split(",") if t.strip()] or None,
        )
        session.add(contact)
        count += 1
    await session.commit()
    await log_action(session, user.id, "email.contacts_import", "email_contact", None, {"count": count})
    return {"imported": count}


@router.patch("/{contact_id}")
async def update_contact(contact_id: int, body: ContactUpdate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    contact = await session.get(EmailContact, contact_id)
    if not contact or contact.user_id != user.id:
        raise HTTPException(404, "Contact not found")
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(contact, field, val)
    await session.commit()
    return {"id": contact.id, "email": contact.email}


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(contact_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    contact = await session.get(EmailContact, contact_id)
    if not contact or contact.user_id != user.id:
        raise HTTPException(404, "Contact not found")
    await session.delete(contact)
    await session.commit()
```

- [ ] **Step 3: Create `backend/app/mcp/email/lists.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.email_contact import EmailContact
from app.models.email_list import EmailList, email_list_contacts
from app.models.user import User
from app.services.audit import log_action

router = APIRouter(prefix="/mcp/email/lists", tags=["email-lists"])


class ListCreate(BaseModel):
    name: str
    description: str | None = None

class ListContactsReq(BaseModel):
    contact_ids: list[int]


@router.get("")
async def list_lists(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(
        select(EmailList).where(EmailList.user_id == user.id).order_by(EmailList.created_at.desc())
    )).scalars().all()
    results = []
    for lst in rows:
        count = (await session.execute(
            select(email_list_contacts.c.contact_id).where(email_list_contacts.c.list_id == lst.id)
        )).scalars().all()
        results.append({"id": lst.id, "name": lst.name, "description": lst.description, "contact_count": len(count)})
    return results


@router.post("", status_code=201)
async def create_list(body: ListCreate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    lst = EmailList(user_id=user.id, name=body.name, description=body.description)
    session.add(lst)
    await session.commit()
    await log_action(session, user.id, "email.list_create", "email_list", str(lst.id))
    return {"id": lst.id, "name": lst.name}


@router.post("/{list_id}/contacts")
async def add_contacts_to_list(list_id: int, body: ListContactsReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    lst = await session.get(EmailList, list_id)
    if not lst or lst.user_id != user.id:
        raise HTTPException(404, "List not found")
    for cid in body.contact_ids:
        contact = await session.get(EmailContact, cid)
        if contact and contact.user_id == user.id:
            await session.execute(email_list_contacts.insert().values(list_id=list_id, contact_id=cid))
    await session.commit()
    return {"added": len(body.contact_ids)}


@router.delete("/{list_id}/contacts")
async def remove_contacts_from_list(list_id: int, body: ListContactsReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    lst = await session.get(EmailList, list_id)
    if not lst or lst.user_id != user.id:
        raise HTTPException(404, "List not found")
    for cid in body.contact_ids:
        await session.execute(email_list_contacts.delete().where(
            email_list_contacts.c.list_id == list_id, email_list_contacts.c.contact_id == cid
        ))
    await session.commit()
    return {"removed": len(body.contact_ids)}


@router.delete("/{list_id}", status_code=204)
async def delete_list(list_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    lst = await session.get(EmailList, list_id)
    if not lst or lst.user_id != user.id:
        raise HTTPException(404, "List not found")
    await session.delete(lst)
    await session.commit()
```

- [ ] **Step 4: Create `backend/app/mcp/email/scheduling.py`**

```python
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.email_contact import EmailContact
from app.models.email_list import EmailList, email_list_contacts
from app.models.email_template import EmailTemplate
from app.models.scheduled_email import ScheduledEmail
from app.models.user import User
from app.services.audit import log_action

router = APIRouter(prefix="/mcp/email", tags=["email-scheduling"])


class ScheduleReq(BaseModel):
    template_id: int
    list_id: int
    scheduled_at: str


@router.post("/schedule", status_code=201)
async def schedule_email(body: ScheduleReq, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    tpl = await session.get(EmailTemplate, body.template_id)
    if not tpl or tpl.user_id != user.id:
        raise HTTPException(404, "Template not found")
    lst = await session.get(EmailList, body.list_id)
    if not lst or lst.user_id != user.id:
        raise HTTPException(404, "List not found")
    sched = ScheduledEmail(
        user_id=user.id, template_id=body.template_id,
        list_id=body.list_id, scheduled_at=body.scheduled_at,
    )
    session.add(sched)
    await session.commit()
    await log_action(session, user.id, "email.schedule", "scheduled_email", str(sched.id))
    return {"id": sched.id, "scheduled_at": sched.scheduled_at, "status": sched.status}


@router.get("/scheduled")
async def list_scheduled(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(
        select(ScheduledEmail).where(ScheduledEmail.user_id == user.id).order_by(ScheduledEmail.created_at.desc())
    )).scalars().all()
    return [{"id": s.id, "template_id": s.template_id, "list_id": s.list_id, "scheduled_at": s.scheduled_at, "status": s.status, "sent_at": str(s.sent_at) if s.sent_at else None} for s in rows]


@router.post("/cancel-schedule")
async def cancel_schedule(schedule_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    sched = await session.get(ScheduledEmail, schedule_id)
    if not sched or sched.user_id != user.id:
        raise HTTPException(404, "Scheduled email not found")
    if sched.status != "pending":
        raise HTTPException(400, "Can only cancel pending schedules")
    sched.status = "cancelled"
    await session.commit()
    await log_action(session, user.id, "email.cancel_schedule", "scheduled_email", str(sched.id))
    return {"id": sched.id, "status": "cancelled"}


@router.post("/unsubscribe/{token}")
async def unsubscribe(token: str, session: AsyncSession = Depends(get_session)):
    contact = (await session.execute(
        select(EmailContact).where(EmailContact.email == token)
    )).scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contact not found")
    contact.status = "unsubscribed"
    await session.commit()
    return {"status": "unsubscribed"}
```

- [ ] **Step 5: Register new sub-routers in `backend/app/main.py`**

Add after `app.include_router(mcp_router)`:

```python
from app.mcp.email.templates import router as email_templates_router
from app.mcp.email.contacts import router as email_contacts_router
from app.mcp.email.lists import router as email_lists_router
from app.mcp.email.scheduling import router as email_scheduling_router

app.include_router(email_templates_router)
app.include_router(email_contacts_router)
app.include_router(email_lists_router)
app.include_router(email_scheduling_router)
```

- [ ] **Step 6: Run full test suite**

Run: `cd backend && python -m pytest tests/ -x -q`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add backend/app/mcp/email/ backend/app/main.py
git commit -m "feat: add email templates, contacts, lists, and scheduling endpoints"
```

---

### Task 4: Content Calendar -- Backend Model + Endpoints

**Files:**
- Create: `backend/app/models/content_item.py`
- Create: `backend/app/mcp/calendar/__init__.py`
- Create: `backend/app/mcp/calendar/tools.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_calendar.py`

**Interfaces:**
- Consumes: `app.core.db.Base`, `app.models.user.User`
- Produces: `ContentItem` model; endpoints at `/mcp/calendar/items`, `/mcp/calendar/items/{id}/status`, `/mcp/calendar/overview` -- used by Task 9 frontend

- [ ] **Step 1: Write test**

Create `backend/tests/test_calendar.py`:

```python
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.db import Base
import app.models  # noqa: F401
from app.models.user import User
from app.models.content_item import ContentItem


@pytest.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as session:
        user = User(name="Test", email="test@example.com", password_hash="x")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        yield session, user
    await engine.dispose()


async def test_content_item_crud(db):
    session, user = db
    item = ContentItem(
        title="Blog post #1", content_type="blog", body="Content here",
        status="draft", tags=["seo", "marketing"], user_id=user.id,
    )
    session.add(item)
    await session.commit()
    rows = (await session.execute(select(ContentItem).where(ContentItem.user_id == user.id))).scalars().all()
    assert len(rows) == 1
    assert rows[0].status == "draft"
    assert "seo" in rows[0].tags


async def test_status_transition(db):
    session, user = db
    item = ContentItem(title="T", content_type="social", body="B", user_id=user.id)
    session.add(item)
    await session.commit()
    assert item.status == "draft"
    item.status = "review"
    await session.commit()
    assert item.status == "review"
```

- [ ] **Step 2: Run test -- expect FAIL**

Run: `cd backend && python -m pytest tests/test_calendar.py -v`
Expected: ImportError

- [ ] **Step 3: Create `backend/app/models/content_item.py`**

```python
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class ContentItem(Base):
    __tablename__ = "content_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    campaign_id: Mapped[int | None] = mapped_column(ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(500))
    content_type: Mapped[str] = mapped_column(String(50))
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="draft")
    scheduled_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    published_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tags: Mapped[list[Any] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

- [ ] **Step 4: Register model and create router**

Register in `__init__.py`: add `from app.models.content_item import ContentItem` and `"ContentItem"` to `__all__`.

Create `backend/app/mcp/calendar/__init__.py` (empty file).

Create `backend/app/mcp/calendar/tools.py`:

```python
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.content_item import ContentItem
from app.models.user import User
from app.services.audit import log_action

router = APIRouter(prefix="/mcp/calendar", tags=["calendar"])

VALID_STATUSES = {"draft", "review", "approved", "published", "archived"}
VALID_TRANSITIONS = {
    "draft": {"review", "archived"},
    "review": {"draft", "approved", "archived"},
    "approved": {"published", "archived"},
    "published": {"archived"},
    "archived": set(),
}


class ItemCreate(BaseModel):
    title: str
    content_type: str
    body: str | None = None
    scheduled_date: str | None = None
    tags: list[str] | None = None

class ItemUpdate(BaseModel):
    title: str | None = None
    content_type: str | None = None
    body: str | None = None
    scheduled_date: str | None = None
    tags: list[str] | None = None

class StatusUpdate(BaseModel):
    status: str


@router.get("/items")
async def list_items(
    status: str | None = None, month: str | None = None, content_type: str | None = None,
    user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session),
):
    q = select(ContentItem).where(ContentItem.user_id == user.id)
    if status:
        q = q.where(ContentItem.status == status)
    if content_type:
        q = q.where(ContentItem.content_type == content_type)
    if month:
        q = q.where(ContentItem.scheduled_date.like(f"{month}%"))
    rows = (await session.execute(q.order_by(ContentItem.created_at.desc()))).scalars().all()
    return [{"id": i.id, "title": i.title, "content_type": i.content_type, "status": i.status, "scheduled_date": i.scheduled_date, "tags": i.tags, "created_at": str(i.created_at)} for i in rows]


@router.post("/items", status_code=201)
async def create_item(body: ItemCreate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    item = ContentItem(user_id=user.id, title=body.title, content_type=body.content_type, body=body.body, scheduled_date=body.scheduled_date, tags=body.tags)
    session.add(item)
    await session.commit()
    await log_action(session, user.id, "calendar.item_create", "content_item", str(item.id))
    return {"id": item.id, "title": item.title, "status": item.status}


@router.get("/overview")
async def overview(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(select(ContentItem).where(ContentItem.user_id == user.id))).scalars().all()
    by_status: dict[str, int] = {}
    by_type: dict[str, int] = {}
    for item in rows:
        by_status[item.status] = by_status.get(item.status, 0) + 1
        by_type[item.content_type] = by_type.get(item.content_type, 0) + 1
    return {"total": len(rows), "by_status": by_status, "by_type": by_type}


@router.get("/items/{item_id}")
async def get_item(item_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    item = await session.get(ContentItem, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Item not found")
    return {"id": item.id, "title": item.title, "content_type": item.content_type, "body": item.body, "status": item.status, "scheduled_date": item.scheduled_date, "tags": item.tags}


@router.patch("/items/{item_id}")
async def update_item(item_id: int, body: ItemUpdate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    item = await session.get(ContentItem, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Item not found")
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(item, field, val)
    await session.commit()
    return {"id": item.id, "title": item.title}


@router.patch("/items/{item_id}/status")
async def update_status(item_id: int, body: StatusUpdate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    item = await session.get(ContentItem, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Item not found")
    if body.status not in VALID_STATUSES:
        raise HTTPException(400, f"Invalid status: {body.status}")
    allowed = VALID_TRANSITIONS.get(item.status, set())
    if body.status != item.status and body.status not in allowed:
        raise HTTPException(400, f"Cannot transition from {item.status} to {body.status}")
    item.status = body.status
    if body.status == "published":
        item.published_date = datetime.now(timezone.utc).isoformat()
    await session.commit()
    await log_action(session, user.id, "calendar.status_change", "content_item", str(item.id), {"new_status": body.status})
    return {"id": item.id, "status": item.status}


@router.delete("/items/{item_id}", status_code=204)
async def delete_item(item_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    item = await session.get(ContentItem, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Item not found")
    await session.delete(item)
    await session.commit()
```

Note: define the `/items/{item_id}` routes AFTER the static `/items` and `/overview` routes (as above) so `/overview` is not shadowed by `/{item_id}`.

Register in `main.py`:
```python
from app.mcp.calendar.tools import router as calendar_router
app.include_router(calendar_router)
```

- [ ] **Step 5: Run tests -- expect PASS**

Run: `cd backend && python -m pytest tests/test_calendar.py tests/ -x -q`

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/content_item.py backend/app/mcp/calendar/ backend/app/models/__init__.py backend/app/main.py backend/tests/test_calendar.py
git commit -m "feat: add content calendar model and endpoints"
```

---

### Task 5: SEO Tools -- Backend Model + Analyzer + Endpoints

**Files:**
- Create: `backend/app/models/seo_audit.py`
- Create: `backend/app/mcp/seo/__init__.py`
- Create: `backend/app/mcp/seo/analyzer.py`
- Create: `backend/app/mcp/seo/tools.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/app/main.py`
- Modify: `backend/requirements.txt`
- Create: `backend/tests/test_seo.py`

**Interfaces:**
- Consumes: `app.core.db.Base`, `httpx`, `beautifulsoup4`
- Produces: `SeoAudit` model; `analyze_html(html: str, url: str | None) -> dict` pure function; endpoints at `/mcp/seo/analyze`, `/mcp/seo/keywords`, `/mcp/seo/audits` -- used by Task 10 frontend

- [ ] **Step 1: Add beautifulsoup4 to requirements.txt**

Add line: `beautifulsoup4==4.12.3`

- [ ] **Step 2: Write test for SEO analyzer**

Create `backend/tests/test_seo.py`:

```python
from app.mcp.seo.analyzer import analyze_html, extract_keywords


def test_analyze_html_good_page():
    html = """
    <html><head>
        <title>Best Marketing Tips for 2026</title>
        <meta name="description" content="Discover the best marketing tips and strategies for growing your business in 2026 with AI.">
    </head><body>
        <h1>Best Marketing Tips</h1>
        <p>Marketing is essential for business growth. Here are some tips for marketing success.</p>
        <h2>Tip 1: Use AI</h2>
        <p>AI can help you write better content and optimize your marketing campaigns effectively.</p>
        <img src="img.jpg" alt="Marketing tips illustration">
        <a href="/about">About us</a>
        <a href="https://example.com">External</a>
    </body></html>
    """
    result = analyze_html(html)
    assert result["score"] > 50
    assert result["title"]["exists"] is True
    assert result["meta_description"]["exists"] is True
    assert result["headings"]["h1_count"] == 1


def test_analyze_html_missing_title():
    html = "<html><head></head><body><p>No title</p></body></html>"
    result = analyze_html(html)
    assert result["title"]["exists"] is False
    assert result["score"] < 50
    assert any("title" in i["message"].lower() for i in result["issues"])


def test_extract_keywords():
    text = "marketing marketing marketing SEO SEO content"
    result = extract_keywords(text)
    assert result[0]["keyword"] == "marketing"
    assert result[0]["count"] == 3
```

- [ ] **Step 3: Run test -- expect FAIL**

Run: `cd backend && python -m pytest tests/test_seo.py -v`
Expected: ImportError

- [ ] **Step 4: Create analyzer and model**

Create `backend/app/mcp/seo/__init__.py` (empty).

Create `backend/app/mcp/seo/analyzer.py` with `analyze_html()` and `extract_keywords()` pure functions using BeautifulSoup4. Checks: title tag, meta description, headings structure, image alt tags, keyword density, links, word count, readability.

Create `backend/app/models/seo_audit.py` with SeoAudit model (id, user_id, url, title, score, issues JSON, suggestions JSON, meta_data JSON, created_at).

Register model in `__init__.py`.

- [ ] **Step 5: Create router and register**

Create `backend/app/mcp/seo/tools.py` with endpoints: POST `/mcp/seo/analyze` (fetch URL via httpx or accept raw HTML), POST `/mcp/seo/keywords`, GET `/mcp/seo/audits`, GET `/mcp/seo/audits/{id}`.

Register in `main.py`:
```python
from app.mcp.seo.tools import router as seo_router
app.include_router(seo_router)
```

- [ ] **Step 6: Run tests**

Run: `cd backend && python -m pytest tests/test_seo.py tests/ -x -q`

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/seo_audit.py backend/app/mcp/seo/ backend/app/models/__init__.py backend/app/main.py backend/requirements.txt backend/tests/test_seo.py
git commit -m "feat: add SEO analyzer and audit endpoints"
```

---

### Task 6: Analytics Dashboard -- Backend Aggregation Endpoints

**Files:**
- Create: `backend/app/mcp/analytics/__init__.py`
- Create: `backend/app/mcp/analytics/tools.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Consumes: `Campaign`, `EmailCampaign`, `ContentItem` (Task 4), `SeoAudit` (Task 5), `AuditLog`
- Produces: endpoints at `/mcp/analytics/overview`, `/mcp/analytics/email`, `/mcp/analytics/content`, `/mcp/analytics/seo`, `/mcp/analytics/activity` -- used by Task 11 frontend

- [ ] **Step 1: Create `backend/app/mcp/analytics/__init__.py`** (empty)

- [ ] **Step 2: Create `backend/app/mcp/analytics/tools.py`**

Aggregation endpoints that query existing models. GET `/mcp/analytics/overview` returns KPI totals. GET `/mcp/analytics/email?period=30d` returns email metrics with period filter. GET `/mcp/analytics/content?period=30d` returns content stats. GET `/mcp/analytics/seo?period=30d` returns SEO trends. GET `/mcp/analytics/activity?limit=50` returns recent audit_log entries.

- [ ] **Step 3: Register router in `backend/app/main.py`**

```python
from app.mcp.analytics.tools import router as analytics_router
app.include_router(analytics_router)
```

- [ ] **Step 4: Run full test suite**

Run: `cd backend && python -m pytest tests/ -x -q`

- [ ] **Step 5: Commit**

```bash
git add backend/app/mcp/analytics/ backend/app/main.py
git commit -m "feat: add analytics dashboard aggregation endpoints"
```

---

### Task 7: Landing Page Builder -- Backend Model + AI Generation + Endpoints

**Files:**
- Create: `backend/app/models/landing_page.py`
- Create: `backend/app/mcp/landing/__init__.py`
- Create: `backend/app/mcp/landing/tools.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_landing.py`

**Interfaces:**
- Consumes: `app.core.db.Base`, `app.llm.factory.get_chat_model` for AI generation
- Produces: `LandingPage` model; endpoints at `/mcp/landing/pages`, `/mcp/landing/generate`, `/mcp/landing/preview`, `/mcp/landing/pages/{id}/publish`, `/mcp/landing/pages/{id}/export`, `/p/{slug}` -- used by Task 12 frontend

- [ ] **Step 1: Write test**

Create `backend/tests/test_landing.py`:

```python
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.db import Base
import app.models  # noqa: F401
from app.models.user import User
from app.models.landing_page import LandingPage


@pytest.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as session:
        user = User(name="Test", email="test@example.com", password_hash="x")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        yield session, user
    await engine.dispose()


async def test_landing_page_crud(db):
    session, user = db
    page = LandingPage(
        title="Product Launch", slug="product-launch",
        html_content="<h1>Launch</h1>", css_content="h1{color:red}",
        user_id=user.id,
    )
    session.add(page)
    await session.commit()
    rows = (await session.execute(select(LandingPage).where(LandingPage.user_id == user.id))).scalars().all()
    assert len(rows) == 1
    assert rows[0].slug == "product-launch"
    assert rows[0].status == "draft"
```

- [ ] **Step 2: Run test -- expect FAIL**

Run: `cd backend && python -m pytest tests/test_landing.py -v`

- [ ] **Step 3: Create model, router, and register**

Create `backend/app/models/landing_page.py` with LandingPage model (id, user_id, campaign_id, title, slug unique, html_content, css_content, status, template_name, variables JSON, published_at, created_at, updated_at).

Register in `__init__.py`.

Create `backend/app/mcp/landing/__init__.py` (empty).

Create `backend/app/mcp/landing/tools.py` with two routers: `router` (authenticated endpoints) and `public_router` (GET `/p/{slug}`). Endpoints: CRUD pages, POST generate (calls DeepSeek via `get_chat_model`), POST preview (returns HTMLResponse), PATCH publish, GET export, GET `/p/{slug}` public serve.

Register both routers in `main.py`:
```python
from app.mcp.landing.tools import router as landing_router, public_router as landing_public_router
app.include_router(landing_router)
app.include_router(landing_public_router)
```

- [ ] **Step 4: Run tests**

Run: `cd backend && python -m pytest tests/test_landing.py tests/ -x -q`

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/landing_page.py backend/app/mcp/landing/ backend/app/models/__init__.py backend/app/main.py backend/tests/test_landing.py
git commit -m "feat: add landing page builder with AI generation and public serving"
```

---

### Task 8: Frontend -- Email Marketing Page (Tabs: Compose, Templates, Contacts, Scheduled, Stats)

**Files:**
- Modify: `frontend/store/mcp.ts`
- Modify: `frontend/app/hub/email/page.tsx`

**Interfaces:**
- Consumes: API endpoints from Task 3
- Produces: Complete email marketing UI with 5 tabs

- [ ] **Step 1: Extend `frontend/store/mcp.ts` with template/contact/list/schedule actions**

Add interfaces: `EmailTemplate`, `EmailContact`, `EmailListItem`, `ScheduledEmailItem`.
Add state fields: `templates`, `templatesLoading`, `contacts`, `contactsLoading`, `lists`, `listsLoading`, `scheduled`, `scheduledLoading`.
Add actions: `loadTemplates`, `createTemplate`, `deleteTemplate`, `loadContacts`, `createContact`, `importContacts`, `deleteContact`, `loadLists`, `createList`, `scheduleEmail`, `loadScheduled`, `cancelSchedule`.

- [ ] **Step 2: Rewrite `frontend/app/hub/email/page.tsx` with Tabs**

Use `@/components/ui/tabs`. 5 tabs: Compose (existing send form + template selector), Templates (CRUD table + Dialog), Contacts (table + CSV import + tag filter), Scheduled (list + cancel), Stats (existing).

- [ ] **Step 3: Test in browser**

- [ ] **Step 4: Commit**

```bash
git add frontend/store/mcp.ts frontend/app/hub/email/page.tsx
git commit -m "feat: email marketing page with templates, contacts, lists, scheduling tabs"
```

---

### Task 9: Frontend -- Content Calendar Page

**Files:**
- Create: `frontend/app/hub/calendar/page.tsx`
- Modify: `frontend/store/mcp.ts`

**Interfaces:**
- Consumes: API endpoints from Task 4
- Produces: Calendar page with Kanban and Calendar views

- [ ] **Step 1: Add calendar actions to store**

- [ ] **Step 2: Create page with Kanban + Calendar views**

- [ ] **Step 3: Test in browser**

- [ ] **Step 4: Commit**

```bash
git add frontend/app/hub/calendar/page.tsx frontend/store/mcp.ts
git commit -m "feat: content calendar page with kanban and calendar views"
```

---

### Task 10: Frontend -- SEO Tools Page

**Files:**
- Create: `frontend/app/hub/seo/page.tsx`
- Modify: `frontend/store/mcp.ts`

**Interfaces:**
- Consumes: API endpoints from Task 5
- Produces: SEO page with Analyze, Keywords, History tabs

- [ ] **Step 1: Add SEO actions to store**

- [ ] **Step 2: Create page with 3 tabs**

- [ ] **Step 3: Test in browser**

- [ ] **Step 4: Commit**

```bash
git add frontend/app/hub/seo/page.tsx frontend/store/mcp.ts
git commit -m "feat: SEO tools page with analyzer, keywords, and audit history"
```

---

### Task 11: Frontend -- Analytics Dashboard Page

**Files:**
- Create: `frontend/app/hub/analytics/page.tsx`
- Modify: `frontend/store/mcp.ts`
- Modify: `frontend/package.json` (add recharts)

**Interfaces:**
- Consumes: API endpoints from Task 6
- Produces: Analytics page with KPI cards, charts, activity feed

- [ ] **Step 1: Install recharts**

```bash
cd frontend && npm install recharts
```

- [ ] **Step 2: Add analytics actions to store**

- [ ] **Step 3: Create page with KPIs, charts, activity feed**

- [ ] **Step 4: Test in browser**

- [ ] **Step 5: Commit**

```bash
git add frontend/app/hub/analytics/page.tsx frontend/store/mcp.ts frontend/package.json frontend/package-lock.json
git commit -m "feat: analytics dashboard page with charts and activity feed"
```

---

### Task 12: Frontend -- Landing Page Builder

**Files:**
- Create: `frontend/app/hub/landing/page.tsx`
- Modify: `frontend/store/mcp.ts`

**Interfaces:**
- Consumes: API endpoints from Task 7
- Produces: Landing page builder with list, create, editor, publish views

- [ ] **Step 1: Add landing page actions to store**

- [ ] **Step 2: Create page with Pages, Create, Editor tabs**

- [ ] **Step 3: Test in browser**

- [ ] **Step 4: Commit**

```bash
git add frontend/app/hub/landing/page.tsx frontend/store/mcp.ts
git commit -m "feat: landing page builder with AI generation and live editor"
```

---

### Task 13: Update Hub Overview Page + Final Integration

**Files:**
- Modify: `frontend/app/hub/page.tsx`
- Modify: `frontend/store/mcp.ts`

**Interfaces:**
- Consumes: `/mcp/analytics/overview` from Task 6
- Produces: Complete hub overview showing KPIs from all modules

- [ ] **Step 1: Update overview page with all-module KPIs**

- [ ] **Step 2: Run full backend test suite**

```bash
cd backend && python -m pytest tests/ -x -q
```

- [ ] **Step 3: Verify frontend builds**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete MCP Hub rebuild -- email, calendar, SEO, analytics, landing pages"
```
