---
title: "PostgreSQL Models"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - database
  - memory
---

# PostgreSQL Models

PostgreSQL là source of truth của Vitba.ai.

## Core models

| Model | Vai trò |
|---|---|
| `User` | tài khoản |
| `Project` | workspace/project scope |
| `Conversation` | phiên chat |
| `Message` | toàn bộ chat history |
| `GenerationJob` | state machine generate |
| `ContentHistory` | output content + score + retention |
| `LabHistory` | lịch sử chạy lab tools |
| `BrandProfile` | giọng thương hiệu |
| `UserTemplate` | custom template theo content_type |
| `RagDocument` / `RagChunk` | metadata source cho Qdrant |
| `ScheduledEmail` | email scheduler state |
| `ContentItem` | calendar item lifecycle |
| `AuditLog` | mutation log |
| `Feedback` | explicit user feedback |
| `IntegrationAccount` | OAuth/API integration encrypted |

## GenerationJob

```text
queued → running → success/error/cancelled
```

Fields quan trọng:

- `status`
- `current_step`
- `progress`
- `result_json`
- `error_message`
- `plan_snapshot`
- `trace_id`

Xem [[GenerationJob_State_Machine]].

## ContentHistory retention

```text
free: 7 ngày
pro: 90 ngày
max: vô hạn
```

## LabHistory

Mỗi lab run lưu:

- `tool_name`
- `input_data`
- `output_data`
- `trace_id`
- `created_at`

## AuditLog

Xem [[AuditLog_Action_Taxonomy]].

## Feedback

Feedback phải có `target_type + target_id` để phân tích chất lượng theo agent/tool/job.

## Indexes nên có

```sql
CREATE INDEX idx_generation_jobs_user_status ON generation_jobs(user_id, status);
CREATE INDEX idx_content_history_user_created ON content_history(user_id, created_at DESC);
CREATE INDEX idx_lab_history_user_tool_created ON lab_history(user_id, tool_name, created_at DESC);
CREATE INDEX idx_audit_user_action_created ON audit_logs(user_id, action, created_at DESC);
CREATE INDEX idx_feedback_target ON feedback(target_type, target_id);
CREATE INDEX idx_content_items_status_due ON content_items(status, scheduled_date);
CREATE INDEX idx_scheduled_emails_status_due ON scheduled_emails(status, scheduled_at);
```

## Backlinks

- [[Qdrant_RAG]]
- [[Context_Loading_Policy]]
- [[Retention_and_Plan_Limits]]
