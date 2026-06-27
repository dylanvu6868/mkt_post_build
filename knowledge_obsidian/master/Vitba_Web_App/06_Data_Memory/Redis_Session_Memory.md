---
title: "Redis Session Memory"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - redis
  - memory
---

# Redis Session Memory

Hiện tại Vitba.ai chưa có session memory. REST + JWT stateless, GraphState chỉ in-memory trong lúc chạy.

## Redis dùng để làm gì?

Redis nên dùng cho:

- Distributed lock scheduler.
- Temporary session memory TTL.
- Job progress cache nếu cần.
- Rate limit counters.
- Idempotency key cache.

Không dùng Redis làm source of truth.

## Session memory schema gợi ý

```text
key: session:{user_id}:{conversation_id}
ttl: 24h
```

```json
{
  "last_intent": "generate_facebook_post",
  "active_generation_job_id": "uuid|null",
  "draft_context": {},
  "temporary_preferences": {
    "tone": "friendly",
    "output_format": "short"
  }
}
```

## Use cases

- Người dùng vừa tạo content, hỏi “sửa ngắn hơn”.
- Resume active job trong chat.
- Lưu preference tạm trong phiên.
- Chống duplicate publish request trong vài phút.

## Guardrails

- TTL ngắn.
- Không lưu secrets.
- Dữ liệu quan trọng phải ghi PostgreSQL.
- Nếu Redis mất, hệ thống vẫn chạy được.

## Backlinks

- [[Context_Loading_Policy]]
- [[Calendar_Scheduler_Module]]
- [[Error_Handling_Retry]]
