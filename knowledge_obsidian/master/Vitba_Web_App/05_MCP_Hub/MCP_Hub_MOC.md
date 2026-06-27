---
title: "MCP Hub MOC"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - mcp
  - moc
---

# MCP Hub MOC

MCP Hub trong Vitba là nhóm **REST tools không phải AI**. Các module này thực hiện side effects thật: gửi email, đăng bài, deploy landing, đọc analytics, xử lý lịch.

## Modules

- [[Email_Resend_Module]]
- [[Meta_Graph_Module]]
- [[Landing_Deploy_Module]]
- [[SEO_HTML_Analyzer_Module]]
- [[Analytics_GA4_UTM_ROI_Module]]
- [[Calendar_Scheduler_Module]]
- [[Cross_Post_Orchestrator]]

## Runtime policy

```mermaid
flowchart TD
  A[MCP Request] --> B[Auth]
  B --> C[Ownership Check]
  C --> D[Plan/Quota]
  D --> E[Mutation Policy]
  E --> F[Idempotency Key]
  F --> G[External API]
  G --> H[Persist Result]
  H --> I[AuditLog]
  I --> J[Return]
```

## Guardrails bắt buộc

- Validate ownership của recipient/list/page/project/deployment.
- Encrypt OAuth/API tokens.
- Không log secrets.
- Có idempotency key cho side effect.
- Có retry/backoff cho lỗi transient.
- Partial failure phải lưu rõ.

## Audit action prefix

| Module | Prefix |
|---|---|
| Email | `email.*` |
| Meta | `meta.*` |
| Landing | `landing.*` |
| SEO | `seo.*` |
| Analytics | `analytics.*` |
| Calendar | `calendar.*` |
| Orchestrator | `orchestrator.*` |
