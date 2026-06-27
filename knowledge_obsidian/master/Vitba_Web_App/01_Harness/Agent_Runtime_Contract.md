---
title: "Agent Runtime Contract"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - harness
  - contract
---

# Agent Runtime Contract

Mọi agent trong Vitba.ai nên có contract rõ để harness chạy được nhất quán.

## Agent Card bắt buộc

Mỗi agent phải khai báo:

```yaml
name: copywriter
group: generation_pipeline
mode: structured
model_tier: fast
input_schema: CopywriterInput
output_schema: CopywriterOutput
skills:
  - brand_voice_adaptation
  - conversion_copywriting
  - channel_adaptation
tools:
  - generate_structured
  - brand_profile_context
quota_key: generate.copywriter
guard_profile: creative_content
prompt_version: copywriter.v1
audit:
  start: generate.copywriter.start
  success: generate.copywriter.success
  error: generate.copywriter.error
```

## Runtime stages

1. Validate request.
2. Check auth/tenant.
3. Check plan/quota.
4. Run input guard.
5. Load context theo policy.
6. Execute agent/tool.
7. Validate output schema.
8. Run output guard nếu cần.
9. Persist result nếu agent là persistence boundary.
10. Write audit.
11. Write trace.
12. Return normalized response.

## Input rules

- Input phải có Pydantic schema hoặc JSON schema.
- Không truyền raw DB model vào prompt.
- Không truyền secret/API key vào prompt hoặc trace.
- Context phải có provenance: `source_type`, `document_id`, `chunk_id`, `confidence`.

## Output rules

- Structured agent phải trả schema validate được.
- Raw agent phải trả kèm metadata: `format`, `risk_flags`, `usage`.
- Output external publish phải qua policy trước khi gửi.
- Error phải normalized.

## Error shape

```json
{
  "agent": "copywriter",
  "stage": "output_validation",
  "code": "STRUCTURED_OUTPUT_FAILED",
  "message": "Output không khớp schema CopywriterOutput",
  "recoverable": true,
  "request_id": "uuid"
}
```

## Persistence boundary

Không phải agent nào cũng được ghi DB. Quy tắc:

| Agent/tool | Được ghi DB? | Ghi gì |
|---|---:|---|
| LangGraph node | Không trực tiếp, trừ job progress nếu node runner quản lý | Partial state |
| Generate service | Có | GenerationJob, ContentHistory |
| Lab tool runner | Có | LabHistory |
| MCP module | Có | Entity status, AuditLog |
| Scheduler | Có | ScheduledEmail, ContentItem state |
| Feedback service | Có | Feedback |

## Timeout & retry

| Loại | Timeout gợi ý | Retry |
|---|---:|---:|
| fast structured node | 20-30s | 1 fallback raw JSON extract |
| smart structured lab | 45-60s | 1 retry nếu parse fail |
| ReAct report | 90-180s | tool call retry giới hạn |
| external API post/send | 10-20s | 2 exponential backoff nếu transient |

## Backlinks

- [[Vitba Agent Harness]]
- [[Error_Handling_Retry]]
- [[AuditLog_Action_Taxonomy]]
