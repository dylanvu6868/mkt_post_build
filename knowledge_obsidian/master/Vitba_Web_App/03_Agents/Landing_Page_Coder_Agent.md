---
title: "Landing Page Coder Agent"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - agent
  - raw
---

# Landing Page Coder Agent

## Purpose

Landing Page Coder là fast path cho `content_type=landing_page`: tạo raw HTML nhanh bằng LLM, không qua structured pipeline default.

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
  "brand_profile": {},
  "onboarding_answers": {},
  "landing_goal": "string",
  "offer": "string"
}
```

## Outputs

```html
<section>...</section>
```

Kèm metadata ngoài raw HTML nếu có: title, sections, CTA, risk_flags.

## Tools

- raw `ainvoke`
- Landing template context
- HTML sanitizer/validator
- Optional deploy module sau đó

## Skills

- Landing page sectioning
- Conversion layout
- HTML/CSS generation
- CTA placement
- Responsive thinking

## Guardrails

- Không inject script nguy hiểm.
- Sanitize HTML.
- Không tự deploy nếu user chưa chọn deploy.
- Không hardcode secrets/API keys.

## Audit actions

```text
generate.landing.start
generate.landing.success
generate.landing.error
landing.deploy nếu deploy
```

## Trace metadata

```yaml
agent: Landing Page Coder Agent
mode: raw
model_tier: fast
prompt_version: landing_page_coder_agent.v1
job_id: <GenerationJob.id>
project_id: <project_id>
content_type: <content_type>
```

## Failure modes

- HTML broken.
- Responsive kém.
- CTA thiếu.
- Unsafe script/style.

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
