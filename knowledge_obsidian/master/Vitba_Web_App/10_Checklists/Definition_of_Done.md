---
title: "Definition of Done"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - dod
  - checklist
---

# Definition of Done

Một tính năng được coi là xong khi có đủ:

```text
Backend API contract rõ
Authorization check
Plan/quota check
AuditLog mutation
Langfuse trace nếu có AI
Unit test
Integration test nếu có DB/external API
UI loading/error/success state
Error message thân thiện
Không leak dữ liệu cross-user/project
Documentation cập nhật
```

## Riêng AI node cần thêm

```text
Prompt versioned
Input schema
Output schema
Fallback parse
Token/latency logging
Evaluator hoặc reviewer nếu thuộc Pro/Max path
```

## Riêng MCP mutation cần thêm

```text
Ownership check
Idempotency key
External API error handling
Persist provider result id
AuditLog action
Manual retry/inspection path
```

## Riêng scheduler cần thêm

```text
Distributed lock
FOR UPDATE SKIP LOCKED
Batch size limit
Partial failure handling
No double send/post test
```

## Backlinks

- [[Build_Checklist]]
- [[Testing_Strategy]]
- [[Security_Checklist]]
