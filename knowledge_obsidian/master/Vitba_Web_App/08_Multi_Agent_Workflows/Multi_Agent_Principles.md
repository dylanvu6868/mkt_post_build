---
title: "Multi Agent Principles"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - multi-agent
  - principles
---

# Multi Agent Principles

## Nguyên tắc số 1

**Không để agent tự spawn agent tùy ý.**

Thay vào đó:

- Workflow template được định nghĩa trước.
- Mỗi step có input/output schema.
- Mỗi step có quota/audit/trace.
- Tool permission theo registry.
- Timeout và max iteration rõ.

## Khi nào nên multi-agent?

| Nên dùng | Không nên dùng |
|---|---|
| Research cần tool nhiều bước | Viết copy đơn giản |
| Campaign cần nhiều góc nhìn | Task có output schema đơn giản |
| Chain lab tools có giá trị | Chỉ để “trông agentic” |
| Review/critique độc lập | Khi latency/cost quan trọng hơn |

## Patterns nên có

1. **Pipeline**: Planner → Research → SEO → Brand → Fusion → Copywriter → Reviewer → Formatter.
2. **ReAct 2-stage**: Researcher dùng tools → Writer không tools.
3. **Critic loop có giới hạn**: Draft → Review → Revise tối đa 1 vòng.
4. **Lab chain template**: CompetitorSpy → Persona → Hook → ABTest.
5. **Publish workflow**: Formatter → Output guard → Orchestrator.

## Anti-patterns

- Agent gọi agent không trace.
- Agent có quyền publish trực tiếp.
- Tool call không audit.
- Infinite reflection loop.
- Writer tự bịa nguồn web.
- Reviewer tự sửa output không được contract cho phép.

## Backlinks

- [[Vitba Agent Harness]]
- [[Controlled_Agent_Chaining]]
- [[Workflow_Templates]]
