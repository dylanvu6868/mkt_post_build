---
title: "Retention and Plan Limits"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - quota
  - billing
---

# Retention and Plan Limits

## Plan matrix gợi ý

| Feature | Free | Pro | Max |
|---|---:|---:|---:|
| Chat messages/day | 30 | 300 | 2000 |
| Generate/day | 5 | 100 | 1000 |
| Lab runs/day | 3 | 50 | 500 |
| Reviewer node | Không | Có | Có |
| Content history retention | 7 ngày | 90 ngày | Vĩnh viễn |
| RAG storage | 50MB | 2GB | 20GB |
| Scheduled posts | 3 | 100 | 2000 |
| Team members | 1 | 5 | 50 |

## Quota enforcement

Mọi endpoint phải gọi backend quota service:

```python
await quota_service.check_and_consume(
    user_id=user.id,
    feature="generate.facebook_post",
    amount=1,
    idempotency_key=request_id,
)
```

## Plan-aware routing

- Reviewer chỉ Pro/Max.
- Retention theo plan.
- RAG storage theo plan.
- Scheduler quota theo plan.
- Lab tools có quota riêng.

## Error response

```json
{
  "error": {
    "code": "PLAN_LIMIT_EXCEEDED",
    "message": "Bạn đã dùng hết quota generate hôm nay.",
    "upgrade_hint": "Nâng cấp Pro để có 100 lượt/ngày."
  }
}
```

## Audit actions

```text
quota.consume
quota.reject
quota.refund
plan.upgrade
plan.downgrade
```

## Backlinks

- [[Vitba Agent Harness]]
- [[GenerationJob_State_Machine]]
- [[Admin_Analytics]]
