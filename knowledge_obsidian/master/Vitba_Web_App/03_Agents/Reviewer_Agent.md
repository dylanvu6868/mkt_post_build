---
title: "Reviewer Agent"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - agent
  - structured
---

# Reviewer Agent

## Purpose

Reviewer Agent chấm điểm output, chỉ ra điểm mạnh/yếu, policy flags và đề xuất cải thiện. Chỉ chạy cho gói Pro/Max.

## Runtime profile

| Field | Value |
|---|---|
| Mode | `structured` |
| Model tier | `smart` |
| Harness | [[Vitba Agent Harness]] |
| Pipeline | [[LangGraph_Pipeline]] |

## Inputs

```json
{
  "copy_output": {},
  "success_criteria": [],
  "brand_output": {},
  "plan": {"name": "pro|max"}
}
```

## Outputs

```json
{
  "score": 86,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "improvements": ["..."],
  "policy_flags": [],
  "final_recommendation": "approve|revise|reject"
}
```

## Tools

- `generate_structured("smart")`
- Copy output
- Brand/SEO criteria
- Plan snapshot

## Skills

- Quality scoring
- Brand alignment review
- Policy risk detection
- Conversion critique
- Improvement suggestion

## Guardrails

- Không sửa trực tiếp output nếu contract chỉ review.
- Policy flags phải cụ thể.
- Score phải có rationale.
- Không chạy cho Free nếu product design không cho phép.

## Audit actions

```text
generate.reviewer.start
generate.reviewer.success
generate.reviewer.skipped
generate.reviewer.error
```

## Trace metadata

```yaml
agent: Reviewer Agent
mode: structured
model_tier: smart
prompt_version: reviewer_agent.v1
job_id: <GenerationJob.id>
project_id: <project_id>
content_type: <content_type>
```

## Failure modes

- Score quá dễ dãi.
- Không phát hiện brand mismatch.
- Không phát hiện policy risk.
- Smart model timeout.

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
