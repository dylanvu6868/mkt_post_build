---
title: "Brand Context Agent"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - agent
  - tool_only
---

# Brand Context Agent

## Purpose

Brand Context Agent không gọi LLM. Nó nạp BrandProfile, RAG chunks liên quan đến thương hiệu và format thành context cho Copywriter/Fusion.

## Runtime profile

| Field | Value |
|---|---|
| Mode | `tool_only` |
| Model tier | `none` |
| Harness | [[Vitba Agent Harness]] |
| Pipeline | [[LangGraph_Pipeline]] |

## Inputs

```json
{
  "user_id": "uuid",
  "project_id": "uuid|null",
  "content_type": "string",
  "input_data": {}
}
```

## Outputs

```json
{
  "brand_voice": "string",
  "tone": ["..."],
  "must_use": ["..."],
  "avoid": ["..."],
  "rag_context": []
}
```

## Tools

- PostgreSQL `BrandProfile`
- Qdrant hybrid search
- `_format_brand_voice()`
- Context filtering by user/project

## Skills

- Brand voice retrieval
- Tenant-safe RAG filtering
- Context summarization without LLM
- Do/don't extraction
- Style constraint assembly

## Guardrails

- Bắt buộc filter `user_id`.
- Không gọi LLM.
- Không đưa PII/secrets vào prompt.
- Không dùng brand profile của project khác.

## Audit actions

```text
generate.brand.load
generate.brand.success
generate.brand.error
```

## Trace metadata

```yaml
agent: Brand Context Agent
mode: tool_only
model_tier: none
prompt_version: brand_context_agent.v1
job_id: <GenerationJob.id>
project_id: <project_id>
content_type: <content_type>
```

## Failure modes

- Brand profile thiếu.
- Qdrant trả chunk không liên quan.
- Filter sai tenant.
- Context quá dài.

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
