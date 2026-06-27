---
title: "Multi Agent MOC"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - multi-agent
  - moc
---

# Multi Agent MOC

Vitba hiện không có agent tự spawn agent khác. Multi-agent nên được phát triển theo hướng **controlled workflow templates**.

## Notes

- [[Multi_Agent_Principles]]
- [[Workflow_Templates]]
- [[Report_2_Stage_ReAct]]
- [[Controlled_Agent_Chaining]]
- [[Future_Agent_Harness]]

## Current state

| Pattern | Hiện trạng |
|---|---|
| LangGraph pipeline | Có, deterministic nhiều node |
| Report 2-stage ReAct | Có |
| Lab tools flat | Có |
| Agent tự spawn agent | Không |
| Workflow templates chain lab tools | Chưa, nên thêm phase sau |

## Target state

```text
Deterministic Graph
+ Controlled ReAct where needed
+ Workflow templates
+ Tool/skill registry
+ Guardrail + quota + audit per step
```
