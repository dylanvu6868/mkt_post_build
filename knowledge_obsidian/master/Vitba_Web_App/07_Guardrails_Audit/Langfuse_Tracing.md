---
title: "Langfuse Tracing"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - observability
  - langfuse
---

# Langfuse Tracing

Langfuse tracing bọc mọi AI endpoint: chat, lab, generate, landing, email AI, SEO Analysis.

## Trace wrapper

```python
async with trace_request(
    name="generate.pipeline",
    user_id=str(user.id),
    session_id=str(conversation_id),
    metadata={
        "content_type": content_type,
        "project_id": project_id,
        "plan": plan.name,
        "job_id": job_id,
    },
):
    result = await graph.ainvoke(state)
```

## Trace metadata nên có

| Field | Ý nghĩa |
|---|---|
| `user_id` | owner |
| `session_id` | conversation/session |
| `project_id` | project scope |
| `job_id` | GenerationJob |
| `agent/tool` | node hoặc lab tool |
| `model` | provider/model name |
| `model_tier` | fast/smart |
| `prompt_version` | version prompt |
| `latency_ms` | latency |
| `token_usage` | input/output tokens |
| `schema` | output schema |
| `error_code` | nếu fail |

## Masking

Không đưa vào trace:

- API keys.
- OAuth tokens.
- Password.
- Payment details.
- Raw PII không cần thiết.

## Trace hierarchy

```text
generate.pipeline trace
  ├─ planner span
  ├─ research span
  ├─ seo span
  ├─ brand span
  ├─ fusion span
  ├─ copywriter span
  ├─ reviewer span
  └─ formatter span
```

## Backlinks

- [[AuditLog_Action_Taxonomy]]
- [[Evaluation_and_Feedback_Loop]]
- [[Error_Handling_Retry]]
