---
title: "Landing Deploy Module"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - mcp
---

# Landing Deploy Module

## Purpose

Landing module quản lý template engine, AI generate landing, versioning và deploy qua Vercel/GitHub/Cloudflare.

## Functions

- Generate landing HTML.
- Validate/sanitize HTML.
- Save landing version.
- Deploy to Vercel/GitHub/Cloudflare.
- Rollback deployment.

## Endpoints / operations

```http
POST /mcp/landing/generate
POST /mcp/landing/{id}/deploy
GET  /mcp/landing/{id}/versions
POST /mcp/landing/{id}/rollback
```

## Guardrails

- Sanitize HTML.
- Không inject JS nguy hiểm.
- Validate project ownership.
- Secret/token không vào prompt.
- Deploy phải có idempotency/deployment id.
- Rollback phải audit.

## Audit actions

```text
landing.generate
landing.version.create
landing.deploy
landing.deploy.success
landing.deploy.failed
landing.rollback
```

## Data models

`LandingProject`, `LandingVersion`, `LandingDeployment`.

Mỗi deploy lưu URL, provider, commit/build id, status.

## Failure handling

- Dùng normalized error format.
- Retry lỗi transient theo [[Error_Handling_Retry]].
- Không retry lỗi auth/permission/policy.
- Lưu status và error message an toàn.



## Backlinks

- [[MCP_Hub_MOC]]
- [[MCP_Mutation_Safety]]
- [[AuditLog_Action_Taxonomy]]
