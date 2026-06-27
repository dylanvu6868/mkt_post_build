---
title: "Meta Graph Module"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - mcp
---

# Meta Graph Module

## Purpose

Meta module kết nối Facebook Graph API để OAuth, đăng post, đọc comments và insights.

## Functions

- OAuth connect.
- Store encrypted tokens.
- Create page post.
- Read comments.
- Read insights.
- Token refresh/reconnect flow.

## Endpoints / operations

```http
GET  /mcp/meta/oauth/start
GET  /mcp/meta/oauth/callback
POST /mcp/meta/pages/{page_id}/post
GET  /mcp/meta/pages/{page_id}/insights
GET  /mcp/meta/posts/{post_id}/comments
```

## Guardrails

- Validate page ownership.
- Encrypt access tokens.
- Không log token.
- Check token expiry trước publish.
- Idempotency key cho create_post.
- External publish guard trước khi đăng.

## Audit actions

```text
meta.oauth.start
meta.oauth.success
meta.post.create
meta.post.success
meta.post.failed
meta.insights.read
meta.comments.read
```

## Data models

`IntegrationAccount` lưu token encrypted, scopes, expires_at, provider_user_id, page_id/page_name.

## Failure handling

- Dùng normalized error format.
- Retry lỗi transient theo [[Error_Handling_Retry]].
- Không retry lỗi auth/permission/policy.
- Lưu status và error message an toàn.



## Backlinks

- [[MCP_Hub_MOC]]
- [[MCP_Mutation_Safety]]
- [[AuditLog_Action_Taxonomy]]
