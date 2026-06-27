---
title: "Controlled Agent Chaining"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - multi-agent
  - chaining
---

# Controlled Agent Chaining

Controlled chaining là cách cho nhiều agent phối hợp mà không biến hệ thống thành black box.

## Chaining contract

Mỗi step phải có:

```yaml
step_id: hook_generation
agent: Hook
input_schema: HookInput
output_schema: HookOutput
requires:
  - persona.output
quota_key: lab.hook
max_runtime_seconds: 60
on_error: stop
```

## State passing

Không truyền toàn bộ output raw nếu không cần. Dùng mapping:

```yaml
input_map:
  product: request.product
  audience: persona.output.primary_persona
  competitor_gaps: competitor.output.gaps
```

## Policies

| Policy | Ý nghĩa |
|---|---|
| `stop_on_error` | lỗi step dừng workflow |
| `continue_on_warning` | warning vẫn chạy tiếp |
| `manual_review` | cần user approve trước step publish |
| `max_cost` | giới hạn budget model/tool |
| `max_steps` | chống chain quá dài |

## Observability

Trace parent:

```text
workflow.competitor_to_campaign
  ├─ lab.competitorspy
  ├─ lab.persona
  ├─ lab.hook
  └─ lab.abtest
```

Audit từng step và audit workflow tổng.

## Backlinks

- [[Workflow_Templates]]
- [[Vitba Agent Harness]]
- [[AuditLog_Action_Taxonomy]]
