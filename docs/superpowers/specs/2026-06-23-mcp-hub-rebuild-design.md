# MCP Hub Rebuild — Full Design Spec

**Date:** 2026-06-23
**Approach:** A — Full MCP Hub Rebuild
**Scope:** Remove Facebook MCP, upgrade Email MCP, add 4 new modules

---

## 1. Cleanup — Remove Facebook MCP & Login

### Delete entirely:
- `backend/app/mcp/meta/` (tools.py, graph_api.py, __init__.py)
- `backend/app/api/oauth_callbacks.py`
- `backend/app/models/oauth_account.py`
- `backend/app/models/meta_page.py`
- `frontend/app/hub/facebook/`
- `frontend/app/hub/insights/`
- Facebook Login button + FB SDK in `frontend/app/login/page.tsx`
- Env vars: `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`

### Keep & reuse:
- `backend/app/mcp/server.py` — extend with new module routes
- `backend/app/mcp/email/` — upgrade base
- `backend/app/models/campaign.py`, `audit_log.py`, `email_campaign.py`
- `backend/app/services/audit.py`
- `frontend/store/mcp.ts` — extend
- `frontend/app/hub/layout.tsx` — update sidebar nav

### New sidebar navigation:
- Tong quan (Overview)
- Email Marketing
- Content Calendar
- SEO Tools
- Analytics
- Landing Pages
- Vitba Lab (keep as-is)

---

## 2. Email Marketing MCP (Upgrade)

### Existing (keep):
- `POST /mcp/email/send` — single/multi email via Resend
- `POST /mcp/email/batch` — batch with {{variable}} templating
- `GET /mcp/email/stats` — campaign statistics

### New models:

**EmailTemplate**
- id, name, subject, html_body, variables (JSON), category, user_id, created_at, updated_at

**EmailContact**
- id, email, name, tags (JSON), metadata (JSON), status (active/unsubscribed/bounced), user_id, created_at

**EmailList**
- id, name, description, user_id, created_at
- M2M: `email_list_contacts` join table

**ScheduledEmail**
- id, template_id (FK), list_id (FK), scheduled_at, status (pending/sent/failed/cancelled), sent_at, user_id, campaign_id (FK)

### New endpoints:

| Method | Path | Description |
|--------|------|-------------|
| CRUD | `/mcp/email/templates` | Create/read/update/delete email templates |
| CRUD | `/mcp/email/contacts` | Create/import CSV/delete/list + filter by tag/status |
| CRUD | `/mcp/email/lists` | Create lists, add/remove contacts |
| POST | `/mcp/email/schedule` | Schedule email (template + list + datetime) |
| POST | `/mcp/email/cancel-schedule` | Cancel a scheduled email |
| GET | `/mcp/email/scheduled` | List scheduled emails |
| POST | `/mcp/email/unsubscribe/{token}` | Public endpoint, handle unsubscribe |

### Scheduling mechanism:
- Background task (asyncio / APScheduler) checks every minute
- Sends emails due via Resend API
- Updates ScheduledEmail status and creates Campaign record

### Frontend — Email page tabs:
- **Compose**: send now or pick template
- **Templates**: CRUD templates with preview
- **Contacts**: table + CSV import + tag filter
- **Scheduled**: list scheduled emails, cancel button
- **Stats**: existing + per-campaign breakdown

---

## 3. Content Calendar MCP

### New model:

**ContentItem**
- id, title, content_type (blog/social/email/landing), body (text), status (draft/review/approved/published/archived), scheduled_date, published_date, tags (JSON), user_id, campaign_id (FK, optional), created_at, updated_at

### Status flow:
```
draft -> review -> approved -> published
  ^        |
  +-- (reject back to draft)
              -> archived (from any state)
```

### Endpoints:

| Method | Path | Description |
|--------|------|-------------|
| CRUD | `/mcp/calendar/items` | Create/read/update/delete content items |
| GET | `/mcp/calendar/items?status=&month=&type=` | Filter by status, date range, type |
| PATCH | `/mcp/calendar/items/{id}/status` | Transition status |
| GET | `/mcp/calendar/overview` | Stats: count by status, type, week |

### Frontend — Calendar page views:
- **Kanban view**: 4 columns (Draft/Review/Approved/Published), drag-drop status change
- **Calendar view**: monthly calendar, items on scheduled_date
- **Quick create**: modal with type + date picker
- **Filter bar**: filter by content_type, tags, date range

Self-contained, no external API.

---

## 4. SEO Tools MCP

### New model:

**SeoAudit**
- id, url, title, score (0-100), issues (JSON array), suggestions (JSON array), meta_data (JSON), user_id, created_at

### Endpoints:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/mcp/seo/analyze` | Receive URL or raw HTML, return SEO score + issues |
| POST | `/mcp/seo/keywords` | Analyze keyword density from text/HTML |
| GET | `/mcp/seo/audits` | List user's audit history |
| GET | `/mcp/seo/audits/{id}` | Detail of one audit |

### SEO Analyzer checks (self-contained):
- **Title tag** — exists, length 50-60 chars optimal
- **Meta description** — exists, length 150-160 chars
- **Headings** — H1-H3 structure, single H1
- **Image alt tags** — missing alt text
- **Keyword density** — frequency in body, title, headings
- **Internal/external links** — count, broken links
- **Word count** — warn if < 300
- **Readability** — sentence length, paragraph length

Dependencies: `beautifulsoup4` + `httpx` for fetch & parse. No external API.

### Frontend — SEO page tabs:
- **Analyze**: input URL -> gauge score (0-100) + issues list (critical/warning/info) + suggestions
- **Keywords**: paste text -> keyword density table (keyword, count, density %)
- **History**: list past audits, click to view detail

---

## 5. Analytics Dashboard MCP

### No new models — aggregates from existing:
Campaign, EmailCampaign, ContentItem, SeoAudit, AuditLog

### Endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/mcp/analytics/overview` | KPI totals: campaigns, emails sent, open rate, content by status, avg SEO score |
| GET | `/mcp/analytics/email?period=7d\|30d\|90d` | Email metrics over time: sent, opened, clicked, bounce, trend data |
| GET | `/mcp/analytics/content?period=30d` | Content metrics: created/published per week, by type, status dist |
| GET | `/mcp/analytics/seo?period=30d` | SEO metrics: avg score trend, top issues, audits per week |
| GET | `/mcp/analytics/activity?limit=50` | Recent activity feed from audit_log |

### Frontend — Analytics page:
- **Overview cards**: 6 KPI cards (emails sent, open rate, click rate, content published, avg SEO score, total campaigns)
- **Charts**: line chart (email trends), bar chart (content by type), trend line (SEO score)
- **Activity feed**: timeline of recent actions
- **Period selector**: 7d / 30d / 90d toggle

Chart library: `recharts`

---

## 6. Landing Page Builder MCP

### New model:

**LandingPage**
- id, title, slug (unique), html_content, css_content, status (draft/published/archived), template_name, variables (JSON), user_id, published_at, campaign_id (FK, optional), created_at, updated_at

### Endpoints:

| Method | Path | Description |
|--------|------|-------------|
| CRUD | `/mcp/landing/pages` | Create/read/update/delete landing pages |
| POST | `/mcp/landing/generate` | AI generate HTML landing page from prompt + brand voice |
| POST | `/mcp/landing/preview` | Return rendered HTML for preview |
| PATCH | `/mcp/landing/pages/{id}/publish` | Set published + slug |
| GET | `/mcp/landing/pages/{id}/export` | Download HTML file |
| GET | `/p/{slug}` | **Public route** — serve published landing page (no auth) |

### AI Generation flow:
1. User inputs: page purpose, product, tone, CTA
2. Backend calls DeepSeek (existing integration) to generate responsive HTML + inline CSS
3. User previews -> edits directly -> publishes

### Serving:
Landing pages served directly from backend via `/p/{slug}`. No external deploy needed.

### Frontend — Landing Pages page tabs:
- **Pages**: list landing pages, status badge, click to edit
- **Create**: form (purpose, product, tone, CTA) -> Generate -> loading -> preview
- **Editor**: split view — code editor left, live preview right
- **Publish modal**: input slug, confirm -> live at `vitbaai.xyz/p/{slug}`

---

## Tech Stack Summary

| Layer | Tech |
|-------|------|
| Backend | FastAPI, SQLAlchemy async, PostgreSQL |
| Email | Resend API (existing) |
| SEO parsing | beautifulsoup4 + httpx |
| AI generation | DeepSeek (existing) |
| Scheduling | APScheduler / asyncio background tasks |
| Frontend | Next.js, Zustand, Tailwind CSS |
| Charts | recharts |
| Auth | JWT (existing), Google OAuth (keep) |
| Encryption | Fernet (existing, for tokens) |
| Audit | audit_log table (existing) |

---

## Database Changes Summary

### New tables (7 + 1 join):
- `email_templates`
- `email_contacts`
- `email_lists` + `email_list_contacts` (join)
- `scheduled_emails`
- `content_items`
- `seo_audits`
- `landing_pages`

### Removed tables (2):
- `oauth_accounts`
- `meta_pages`

### Kept as-is:
- `campaigns`, `email_campaigns`, `audit_logs`, `deployments`, `users`
