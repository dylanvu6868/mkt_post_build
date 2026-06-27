# VITBA.AI — PHASE 2: MARKETING MCP HUB

## Tổng quan

Mở rộng Vitba.ai từ "tạo nội dung" thành "điều khiển toàn bộ marketing".
AI Agents viết xong bài → đăng Facebook, gửi email, deploy landing page — tất cả qua MCP tools.

**Thêm vào stack:** FastMCP + Redis + Meta Graph API + Resend + Vercel API

---

## Kiến trúc Phase 2

```
┌──────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 14)                    │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐    │
│  │ Chat +     │  │ MCP Hub    │  │ OAuth Connect       │    │
│  │ Content    │  │ Dashboard  │  │ Meta/Google/GitHub   │    │
│  │ (Phase 1)  │  │ (NEW)      │  │ Vercel (NEW)        │    │
│  └────────────┘  └────────────┘  └─────────────────────┘    │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                  BACKEND (FastAPI + FastMCP)                  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │              MCP Server (FastMCP)                    │     │
│  │                                                     │     │
│  │  ┌───────────┐  ┌───────────┐  ┌──────────────┐    │     │
│  │  │ Meta MCP  │  │ Email MCP │  │ Landing Page │    │     │
│  │  │ •connect  │  │ •send     │  │ •generate    │    │     │
│  │  │ •pages    │  │ •bulk     │  │ •publish     │    │     │
│  │  │ •post     │  │ •campaign │  │ (→Vercel)    │    │     │
│  │  │ •schedule │  │ •stats    │  │              │    │     │
│  │  │ •comments │  │           │  │              │    │     │
│  │  │ •insights │  │           │  │              │    │     │
│  │  └───────────┘  └───────────┘  └──────────────┘    │     │
│  │                                                     │     │
│  │  ┌───────────┐  ┌───────────┐  ┌──────────────┐    │     │
│  │  │ GitHub    │  │ Vercel    │  │ Railway      │    │     │
│  │  │ MCP      │  │ MCP       │  │ MCP          │    │     │
│  │  └───────────┘  └───────────┘  └──────────────┘    │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────┐  ┌──────────────┐    │
│  │ Supabase │  │ Qdrant   │  │ Redis │  │ DeepSeek LLM │    │
│  │ Postgres │  │ Vector   │  │ Cache │  │              │    │
│  └──────────┘  └──────────┘  └───────┘  └──────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

---

## Triển khai theo giai đoạn

### Giai đoạn A — Core MCP + Meta + Email (ƯU TIÊN CAO)

1. **MCP Core Infrastructure**
   - FastMCP server tích hợp vào FastAPI backend
   - OAuth token storage (AES-256 encrypted)
   - Redis cho rate limiting + caching
   - Audit logging

2. **Meta MCP Module**
   - connect_meta() — OAuth flow
   - get_pages() — list fanpages
   - create_post(page_id, content, image_url?)
   - bulk_post(page_ids[], content)
   - schedule_post(page_id, content, publish_time)
   - get_comments(post_id)
   - reply_comment(comment_id, message)
   - get_insights(page_id, range)

3. **Email MCP Module** (Resend)
   - send_email(to, subject, html)
   - bulk_send(segment, subject, html)
   - create_campaign(name, content)
   - get_campaign_stats()

### Giai đoạn B — Landing Page + Vercel

4. **Landing Page MCP** — generate + publish
5. **Vercel MCP** — deploy, status, rollback

### Giai đoạn C — DevOps

6. **GitHub MCP** — repo, commit, push, release
7. **Railway MCP** — project, db, deploy, logs

---

## Database Schema (thêm mới)

```sql
CREATE TABLE oauth_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_account_id VARCHAR(255),
    access_token_enc TEXT NOT NULL,
    refresh_token_enc TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

CREATE TABLE meta_pages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    page_id VARCHAR(100) NOT NULL,
    page_name VARCHAR(255),
    page_access_token_enc TEXT NOT NULL,
    category VARCHAR(100),
    followers_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, page_id)
);

CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(500),
    content TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    meta_post_id VARCHAR(255),
    metadata_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_campaigns (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    campaign_id INTEGER REFERENCES campaigns(id),
    provider VARCHAR(50) DEFAULT 'resend',
    segment VARCHAR(255),
    sent_count INTEGER DEFAULT 0,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft',
    resend_batch_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE deployments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    campaign_id INTEGER REFERENCES campaigns(id),
    platform VARCHAR(50) NOT NULL,
    project_name VARCHAR(255),
    deployment_url TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    platform_deployment_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Folder Structure (thêm vào backend)

```
backend/app/
├── mcp/
│   ├── __init__.py
│   ├── server.py                 # FastMCP server + mount to FastAPI
│   ├── meta/
│   │   ├── __init__.py
│   │   ├── tools.py
│   │   ├── oauth.py
│   │   └── graph_api.py
│   ├── email/
│   │   ├── __init__.py
│   │   ├── tools.py
│   │   └── providers.py
│   ├── landing_page/
│   │   ├── __init__.py
│   │   └── tools.py
│   ├── vercel/
│   │   ├── __init__.py
│   │   └── tools.py
│   ├── github/
│   │   ├── __init__.py
│   │   └── tools.py
│   └── railway/
│       ├── __init__.py
│       └── tools.py
├── models/
│   ├── oauth_account.py          # NEW
│   ├── meta_page.py              # NEW
│   ├── campaign.py               # NEW
│   ├── email_campaign.py         # NEW
│   ├── deployment.py             # NEW
│   └── audit_log.py              # NEW
├── api/
│   ├── mcp.py                    # NEW — MCP tool endpoints
│   └── oauth_callbacks.py        # NEW — OAuth redirects
├── core/
│   └── encryption.py             # NEW — AES-256 token encrypt/decrypt
└── services/
    └── audit.py                  # NEW — audit logging
```

---

## Security

- AES-256-GCM token encryption (env: MCP_ENCRYPTION_KEY)
- JWT extended with MCP scopes
- Redis-backed rate limiting per-user per-tool
- Audit logs: every MCP tool call logged
- RBAC: Free=no MCP, Starter=Meta only, Pro=all

---

## Implementation Priority

| # | Module | Effort | Value |
|---|--------|--------|-------|
| 1 | MCP Core + Models + Encryption | 1d | Foundation |
| 2 | Meta OAuth + connect | 1d | High |
| 3 | Meta pages + create_post | 0.5d | Very High |
| 4 | Meta bulk + schedule | 0.5d | High |
| 5 | Meta comments + insights | 0.5d | Medium |
| 6 | Email send + bulk | 0.5d | High |
| 7 | Email campaigns + stats | 0.5d | Medium |
| 8 | Frontend MCP Hub | 1d | High |
| 9 | Landing Page generate | 1d | Medium |
| 10 | Vercel deploy | 0.5d | Medium |
| 11 | GitHub MCP | 0.5d | Low |
| 12 | Railway MCP | 0.5d | Low |
