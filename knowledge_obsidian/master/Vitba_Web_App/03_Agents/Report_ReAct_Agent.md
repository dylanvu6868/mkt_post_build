---
title: "Report ReAct Agent"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - agent
  - react
---

# Report ReAct Agent

## Purpose

Report ReAct Agent là multi-stage agent duy nhất hiện tại: Researcher dùng Tavily tools để thu thập dữ liệu, sau đó Writer không tool viết báo cáo cuối.

## Runtime profile

| Field | Value |
|---|---|
| Mode | `react` |
| Model tier | `smart` |
| Harness | [[Vitba Agent Harness]] |
| Pipeline | [[LangGraph_Pipeline]] |

## Inputs

```json
{
  "topic": "string",
  "scope": "string",
  "audience": "string",
  "depth": "brief|standard|deep"
}
```

## Outputs

```md
# Report
...
```

Kèm metadata: sources, tool_calls, confidence, limitations.

## Tools

- Tavily search/extract/crawl/map/research
- Research note compressor
- Writer LLM without tools
- Citation/source collector

## Skills

- Tool-based research
- Source synthesis
- Evidence filtering
- Report writing
- Citation discipline
- Tool budget management

## Guardrails

- Researcher không viết final report.
- Writer không được gọi tool.
- Tool whitelist chỉ Tavily.
- Tối đa 6-8 tool calls mặc định.
- Phải ghi limitations nếu nguồn yếu/thiếu.

## Audit actions

```text
lab.report.start
lab.report.research_tool_call
lab.report.writer.start
lab.report.success
lab.report.error
```

## Trace metadata

```yaml
agent: Report ReAct Agent
mode: react
model_tier: smart
prompt_version: report_react_agent.v1
job_id: <GenerationJob.id>
project_id: <project_id>
content_type: <content_type>
```

## Failure modes

- Tavily timeout.
- Nguồn không đủ.
- Writer bịa ngoài research notes.
- Tool loop quá dài.

## Implementation checklist

- [ ] Input schema rõ.
- [ ] Output schema hoặc raw format rõ.
- [ ] Prompt versioned.
- [ ] Quota key khai báo trong registry.
- [ ] Guard profile khai báo.
- [ ] Unit test schema.
- [ ] Integration test trong pipeline.
- [ ] Trace + audit đầy đủ.

Xem thêm [[Report_2_Stage_ReAct]].

## Backlinks

- [[Agents_MOC]]
- [[Tool_Skill_Matrix]]
- [[Agent_Runtime_Contract]]
