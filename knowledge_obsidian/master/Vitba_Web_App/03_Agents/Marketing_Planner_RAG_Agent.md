---
title: "Marketing Planner RAG Agent"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - agent
  - raw
---

# Marketing Planner RAG Agent

## Purpose

Marketing Planner RAG là fast path cho `content_type=marketing_plan`: dùng RAG context để tạo raw JSON marketing plan nhanh.

## Runtime profile

| Field | Value |
|---|---|
| Mode | `raw` |
| Model tier | `fast` |
| Harness | [[Vitba Agent Harness]] |
| Pipeline | [[LangGraph_Pipeline]] |

## Inputs

```json
{
  "goal": "string",
  "audience": "string",
  "budget": "string|null",
  "rag_chunks": []
}
```

## Outputs

Raw JSON plan, nên normalize về schema:

```json
{
  "strategy": "...",
  "channels": [],
  "timeline": [],
  "kpis": [],
  "risks": []
}
```

## Tools

- raw `ainvoke`
- Qdrant RAG chunks
- JSON extractor/validator nhẹ

## Skills

- Marketing planning
- RAG synthesis
- Campaign structure
- Channel planning
- Timeline/budget framing

## Guardrails

- Không bịa số liệu thị trường nếu không có nguồn.
- RAG filter tenant-safe.
- Nếu raw JSON lỗi, extract + validate.
- Không tự tạo calendar items nếu chưa được yêu cầu.

## Audit actions

```text
generate.marketing_plan.start
generate.marketing_plan.success
generate.marketing_plan.error
```

## Trace metadata

```yaml
agent: Marketing Planner RAG Agent
mode: raw
model_tier: fast
prompt_version: marketing_planner_rag_agent.v1
job_id: <GenerationJob.id>
project_id: <project_id>
content_type: <content_type>
```

## Failure modes

- Raw JSON parse fail.
- Kế hoạch quá chung.
- Không khớp budget/timeline.
- RAG context thiếu.

## Implementation checklist

- [ ] Input schema rõ.
- [ ] Output schema hoặc raw format rõ.
- [ ] Prompt versioned.
- [ ] Quota key khai báo trong registry.
- [ ] Guard profile khai báo.
- [ ] Unit test schema.
- [ ] Integration test trong pipeline.
- [ ] Trace + audit đầy đủ.



## Backlinks

- [[Agents_MOC]]
- [[Tool_Skill_Matrix]]
- [[Agent_Runtime_Contract]]
