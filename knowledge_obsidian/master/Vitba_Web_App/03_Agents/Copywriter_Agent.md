---
title: "Copywriter Agent"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - agent
  - structured
---

# Copywriter Agent

## Purpose

Copywriter Agent viết nội dung chính theo creative brief, brand voice, channel và SEO constraints.

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
  "creative_brief": {},
  "brand_output": {},
  "seo_output": {},
  "content_type": "string"
}
```

## Outputs

```json
{
  "headline": "string",
  "subheadline": "string",
  "body": "string",
  "cta": "string",
  "variants": [{"name": "A", "headline": "string", "body": "string"}]
}
```

## Tools

- `generate_structured("fast")`
- Brand voice formatted context
- Creative brief from Fusion

## Skills

- Conversion copywriting
- Brand voice adaptation
- Hook and CTA writing
- Channel-specific adaptation
- Variant generation

## Guardrails

- Không tạo claim sai sự thật.
- Không vi phạm safety policy.
- Không bỏ qua brand avoid list.
- Nếu yêu cầu ngành nhạy cảm, output phải thận trọng và có disclaimer khi phù hợp.

## Audit actions

```text
generate.copywriter.start
generate.copywriter.success
generate.copywriter.error
```

## Trace metadata

```yaml
agent: Copywriter Agent
mode: structured
model_tier: fast
prompt_version: copywriter_agent.v1
job_id: <GenerationJob.id>
project_id: <project_id>
content_type: <content_type>
```

## Failure modes

- Copy quá chung.
- CTA yếu.
- Sai giọng brand.
- Output quá dài/ngắn so với channel.
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
