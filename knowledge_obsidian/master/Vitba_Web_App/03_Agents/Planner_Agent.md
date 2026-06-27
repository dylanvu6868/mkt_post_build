---
title: "Planner Agent"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - agent
  - structured
---

# Planner Agent

## Purpose

Planner Agent biến yêu cầu ban đầu thành kế hoạch nội dung rõ: objective, audience, angle, channels, required research và success criteria.

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
  "content_type": "facebook_post|email|landing|...",
  "input_data": {},
  "chat_history": [],
  "plan": {}
}
```

## Outputs

```json
{
  "objective": "string",
  "audience": "string",
  "content_angle": "string",
  "channels": ["facebook", "email"],
  "required_research": ["competitors", "keywords"],
  "success_criteria": ["clear CTA", "brand voice"]
}
```

## Tools

- `generate_structured("fast")`
- Prompt `planner.v1`
- Input từ `input_data`, `chat_history`, `plan_snapshot`

## Skills

- Intent decomposition
- Campaign planning
- Audience clarification
- Channel selection
- Success criteria design

## Guardrails

- Không được hứa publish/deploy.
- Không được tự gọi tool ngoài registry.
- Không tạo plan vượt gói user.
- Phải giữ output ở mức plan, không viết full copy.

## Audit actions

```text
generate.planner.start
generate.planner.success
generate.planner.error
```

## Trace metadata

```yaml
agent: Planner Agent
mode: structured
model_tier: fast
prompt_version: planner_agent.v1
job_id: <GenerationJob.id>
project_id: <project_id>
content_type: <content_type>
```

## Failure modes

- Output thiếu channel.
- Objective quá chung.
- Không xác định audience.
- Schema parse fail.

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
