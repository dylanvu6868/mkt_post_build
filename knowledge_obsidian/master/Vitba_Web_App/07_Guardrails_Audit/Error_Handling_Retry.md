---
title: "Error Handling Retry"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - errors
  - retry
---

# Error Handling Retry

## Error format chuẩn

```json
{
  "error": {
    "code": "AI_PROVIDER_OVERLOADED",
    "message": "AI đang quá tải. Vui lòng thử lại sau.",
    "details": {},
    "request_id": "uuid"
  }
}
```

## Mapping UI

| Backend code | UI message |
|---|---|
| `PLAN_LIMIT_EXCEEDED` | Hết quota, hiển thị upgrade CTA |
| `GUARD_REJECTED` | Stream lý do từ guard |
| `AI_PROVIDER_OVERLOADED` | “AI quá tải” |
| `STRUCTURED_OUTPUT_FAILED` | “Không tạo được định dạng hợp lệ” |
| `INTEGRATION_TOKEN_EXPIRED` | Yêu cầu kết nối lại tài khoản |
| `SCHEDULER_SEND_FAILED` | Hiển thị trong calendar/email status |
| `JOB_NOT_FOUND` | Job không tồn tại hoặc không thuộc tài khoản |

## Retry policy

| Case | Retry |
|---|---:|
| Structured output fail | 1 raw retry + JSON extract |
| LLM provider timeout | 1 retry nếu idempotent |
| Resend send email | 2 exponential backoff |
| Meta post | 2 nếu transient |
| Deploy | 1 retry |
| Scheduler item fail | không crash loop, lưu failed |

## Không retry

- Auth/permission error.
- Guard rejection.
- Quota exceeded.
- Schema input invalid.
- External policy violation.

## Backlinks

- [[GenerationJob_State_Machine]]
- [[MCP_Mutation_Safety]]
- [[Langfuse_Tracing]]
