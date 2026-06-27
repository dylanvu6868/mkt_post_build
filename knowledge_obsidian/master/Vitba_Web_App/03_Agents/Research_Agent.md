---
title: "Research Agent"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - agent
  - structured
---

# Research Agent

## Purpose

Research Agent tổng hợp insight từ user input, chat history và RAG chunks. Đây không phải web researcher mặc định; web research nên nằm ở Report ReAct hoặc Tavily workflow.

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
  "rag_chunks": [],
  "input_data": {}
}
```

## Outputs

```json
{
  "insights": [{"title": "...", "detail": "...", "confidence": 0.8, "source": "rag|user_input"}],
  "risks": ["..."],
  "open_questions": ["..."]
}
```

## Tools

- `generate_structured("fast")`
- RAG chunks đã được context loader nạp
- Optional: plan_output

## Skills

- Insight extraction
- Risk discovery
- Open question generation
- Evidence tagging
- Confidence estimation

## Guardrails

- Không bịa nguồn.
- Nếu thiếu dữ liệu, ghi `open_questions` thay vì hallucinate.
- Không truy xuất RAG ngoài tenant filter.
- Không dùng web nếu node không được cấp tool.

## Audit actions

```text
generate.research.start
generate.research.success
generate.research.error
```

## Trace metadata

```yaml
agent: Research Agent
mode: structured
model_tier: fast
prompt_version: research_agent.v1
job_id: <GenerationJob.id>
project_id: <project_id>
content_type: <content_type>
```

## Failure modes

- Insight generic.
- Confidence không hợp lý.
- Lẫn thông tin từ project khác nếu filter sai.
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
