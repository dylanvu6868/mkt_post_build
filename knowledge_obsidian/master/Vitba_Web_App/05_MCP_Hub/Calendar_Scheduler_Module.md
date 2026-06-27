---
title: "Calendar Scheduler Module"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - mcp
---

# Calendar Scheduler Module

## Purpose

Calendar module quản lý ContentItem lifecycle và auto-publish scheduler.

## Functions

- Content calendar CRUD.
- Approve/review/draft workflow.
- Schedule publish.
- Process due calendar items.
- Trigger Cross-post Orchestrator.

## Endpoints / operations

```http
POST /mcp/calendar/items
PATCH /mcp/calendar/items/{id}
POST /mcp/calendar/items/{id}/approve
POST /mcp/calendar/items/{id}/schedule
POST /mcp/calendar/items/{id}/cancel
```

## Guardrails

- Only approved items can publish.
- Scheduler dùng distributed lock.
- Publish target structured field, không parse comma tag.
- Idempotency per item-target.
- Partial failure rõ.

## Audit actions

```text
calendar.item.create
calendar.item.update
calendar.item.approve
calendar.item.schedule
calendar.item.publish.start
calendar.item.publish.success
calendar.item.publish.failed
```

## Data models

`ContentItem`: draft → review → approved → published/archived.

Khuyến nghị thêm `published_with_warnings`.

## Failure handling

- Dùng normalized error format.
- Retry lỗi transient theo [[Error_Handling_Retry]].
- Không retry lỗi auth/permission/policy.
- Lưu status và error message an toàn.



## Backlinks

- [[MCP_Hub_MOC]]
- [[MCP_Mutation_Safety]]
- [[AuditLog_Action_Taxonomy]]
