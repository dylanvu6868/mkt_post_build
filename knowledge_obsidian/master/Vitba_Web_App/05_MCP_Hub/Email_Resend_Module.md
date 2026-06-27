---
title: "Email Resend Module"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - mcp
---

# Email Resend Module

## Purpose

Email module gửi email bằng Resend, lên lịch email và quản lý CRM contacts/lists/templates.

## Functions

- Send email.
- Schedule email.
- Manage contacts.
- Manage lists.
- Manage templates.
- Process due ScheduledEmail.

## Endpoints / operations

```http
POST /mcp/email/send
POST /mcp/email/schedule
GET  /mcp/email/scheduled
POST /mcp/email/templates
POST /mcp/email/contacts
POST /mcp/email/lists
```

## Guardrails

- Validate recipient/list ownership.
- Validate unsubscribe/compliance fields nếu campaign.
- Không gửi trùng: idempotency key.
- Không log email body nếu chứa dữ liệu nhạy cảm.
- Scheduler dùng lock để tránh double-send.

## Audit actions

```text
email.send
email.schedule
email.cancel
email.template.create
email.contact.create
email.list.create
email.send.success
email.send.failed
```

## Data models

`ScheduledEmail`: pending → sent/failed/cancelled.

`EmailTemplate`, `CRMContact`, `CRMList` nên scope theo `user_id/project_id`.

## Failure handling

- Dùng normalized error format.
- Retry lỗi transient theo [[Error_Handling_Retry]].
- Không retry lỗi auth/permission/policy.
- Lưu status và error message an toàn.



## Backlinks

- [[MCP_Hub_MOC]]
- [[MCP_Mutation_Safety]]
- [[AuditLog_Action_Taxonomy]]
