---
title: "Fusion Agent"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - agent
  - structured
---

# Fusion Agent

## Purpose

Fusion Agent hợp nhất planner, research, SEO và brand context thành creative brief duy nhất cho Copywriter.

## Runtime profile

| Field | Value |
|---|---|
| Mode | `structured` |
| Model tier | `fast` |
| Harness | [[Vitba Agent Harness]] |
| Pipeline | [[LangGraph_Pipeline]] |

## Inputs

```json
{
  "plan_output": {},
  "research_output": {},
  "seo_output": {},
  "brand_output": {}
}
```

## Outputs

```json
{
  "creative_brief": "string",
  "message_hierarchy": ["hook", "problem", "solution", "proof", "cta"],
  "must_include": ["string"],
  "avoid": ["string"],
  "channel_adaptations": {"facebook": "string"}
}
```

## Tools

- `generate_structured("fast")`
- Inputs từ planner/research/seo/brand

## Skills

- Synthesis
- Conflict resolution
- Creative brief generation
- Message hierarchy design
- Channel adaptation

## Guardrails

- Không bỏ qua brand avoid list.
- Nếu research và SEO mâu thuẫn, ghi ưu tiên rõ.
- Không viết final copy dài.
- Không thêm claim không có trong context.

## Audit actions

```text
generate.fusion.start
generate.fusion.success
generate.fusion.error
```

## Trace metadata

```yaml
agent: Fusion Agent
mode: structured
model_tier: fast
prompt_version: fusion_agent.v1
job_id: <GenerationJob.id>
project_id: <project_id>
content_type: <content_type>
```

## Failure modes

- Creative brief mơ hồ.
- Must_include/avoid bị trống.
- Channel adaptations thiếu.
- Schema fail.

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
