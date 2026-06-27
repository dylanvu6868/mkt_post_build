---
title: "Formatter Agent"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - agent
  - custom
---

# Formatter Agent

## Purpose

Formatter Agent chuyển output cuối thành format người dùng cần: markdown, HTML, social post, email, JSON hoặc custom template.

## Runtime profile

| Field | Value |
|---|---|
| Mode | `custom` |
| Model tier | `none/fast` |
| Harness | [[Vitba Agent Harness]] |
| Pipeline | [[LangGraph_Pipeline]] |

## Inputs

```json
{
  "copy_output": {},
  "review_output": {},
  "custom_template": {},
  "content_type": "string"
}
```

## Outputs

```json
{
  "format": "markdown|html|json|email|social_post",
  "content": "string",
  "blocks": [{"type": "headline", "content": "..."}],
  "metadata": {"score": 86, "template_id": "uuid|null"}
}
```

## Tools

- UserTemplate loader
- Template engine
- Optional `generate_structured` nếu cần rewrite nhẹ
- Markdown/HTML renderer

## Skills

- Output formatting
- Template application
- Channel packaging
- Metadata assembly
- Safe HTML handling

## Guardrails

- Validate/sanitize HTML.
- Không mất CTA/metadata.
- Không tự publish.
- Custom template phải thuộc user/project.

## Audit actions

```text
generate.formatter.start
generate.formatter.success
generate.formatter.error
```

## Trace metadata

```yaml
agent: Formatter Agent
mode: custom
model_tier: none/fast
prompt_version: formatter_agent.v1
job_id: <GenerationJob.id>
project_id: <project_id>
content_type: <content_type>
```

## Failure modes

- Template lỗi.
- HTML unsafe.
- Metadata missing.
- Format không khớp content type.

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
