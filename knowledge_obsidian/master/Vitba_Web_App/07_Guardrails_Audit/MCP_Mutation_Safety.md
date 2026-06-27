---
title: "MCP Mutation Safety"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - mcp
  - guardrails
---

# MCP Mutation Safety

MCP tools có side effect thật nên cần policy mạnh hơn AI nodes.

## Mutation safety checklist

- [ ] Authenticated user.
- [ ] Project access check.
- [ ] Entity ownership check.
- [ ] Plan/quota check.
- [ ] Input schema validation.
- [ ] External publish guard.
- [ ] Idempotency key.
- [ ] Retry policy chỉ cho transient errors.
- [ ] AuditLog mutation.
- [ ] Persist external result id.

## Ownership examples

| Action | Ownership phải check |
|---|---|
| Send email | contact/list/template thuộc user/project |
| Meta post | page thuộc integration account của user |
| Landing deploy | landing project thuộc user/project |
| Calendar publish | ContentItem thuộc project |
| GA4 read | GA4 property thuộc integration account |

## Idempotency key examples

```text
email:{scheduled_email_id}
meta:{content_item_id}:{page_id}
landing:{landing_version_id}:{provider}
calendar_publish:{content_item_id}:{target_hash}
```

## Partial failure policy

| Policy | Khi dùng |
|---|---|
| `all_success` | campaign cần đồng bộ tất cả kênh |
| `partial_success` | có ít nhất 1 kênh thành công vẫn tính published_with_warnings |
| `manual_review` | target quan trọng fail thì chuyển review |

## Backlinks

- [[MCP_Hub_MOC]]
- [[Cross_Post_Orchestrator]]
- [[Security_Checklist]]
