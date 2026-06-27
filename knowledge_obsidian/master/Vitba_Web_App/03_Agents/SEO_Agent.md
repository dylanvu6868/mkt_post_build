---
title: "SEO Agent"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - agent
  - structured
---

# SEO Agent

## Purpose

SEO Agent tạo SEO brief cho content: keyword chính, keyword phụ, search intent, title suggestions, meta description và outline.

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
  "topic": "string",
  "audience": "string",
  "plan_output": {},
  "content_type": "string"
}
```

## Outputs

```json
{
  "primary_keyword": "string",
  "secondary_keywords": ["string"],
  "search_intent": "informational|commercial|transactional|navigational",
  "title_suggestions": ["string"],
  "meta_description": "string",
  "content_brief": ["string"]
}
```

## Tools

- `generate_structured("fast")`
- Input từ planner + topic + optional RAG

## Skills

- Keyword clustering
- Search intent mapping
- Metadata writing
- Content brief design
- On-page SEO awareness

## Guardrails

- Không claim search volume nếu không có tool/data.
- Không nhồi keyword.
- Meta description không quá dài.
- Nếu content không cần SEO, output brief nhẹ.

## Audit actions

```text
generate.seo.start
generate.seo.success
generate.seo.error
```

## Trace metadata

```yaml
agent: SEO Agent
mode: structured
model_tier: fast
prompt_version: seo_agent.v1
job_id: <GenerationJob.id>
project_id: <project_id>
content_type: <content_type>
```

## Failure modes

- Keyword quá chung.
- Intent sai.
- Title/meta không khớp brand.
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
