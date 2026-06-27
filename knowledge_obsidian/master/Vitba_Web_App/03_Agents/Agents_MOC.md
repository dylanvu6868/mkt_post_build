---
title: "Agents MOC"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - agents
  - moc
---

# Agents MOC

## LangGraph agents

- [[Planner_Agent]] — biến yêu cầu thành plan.
- [[Research_Agent]] — tổng hợp insight/risk từ context.
- [[SEO_Agent]] — tạo keyword/intent/meta/content brief.
- [[Brand_Context_Agent]] — nạp brand profile/RAG, không gọi LLM.
- [[Fusion_Agent]] — hợp nhất plan + research + SEO + brand.
- [[Copywriter_Agent]] — viết nội dung chính.
- [[Reviewer_Agent]] — chấm điểm/cải thiện cho Pro/Max.
- [[Formatter_Agent]] — format theo template/kênh.
- [[Landing_Page_Coder_Agent]] — raw HTML fast path.
- [[Marketing_Planner_RAG_Agent]] — marketing plan RAG fast path.

## Multi-stage agent

- [[Report_ReAct_Agent]] — Researcher dùng Tavily → Writer không tool.

## Card format

Mỗi agent card có:

```text
Purpose
Input
Output
Tools
Skills
Model tier
Guardrails
Audit actions
Trace metadata
Failure modes
Implementation checklist
```

## Nguyên tắc

- Agent không tự mutate state ngoài contract.
- Tool access phải qua registry.
- Output phải validate schema hoặc có raw format rõ.
- Mọi AI call trace qua [[Langfuse_Tracing]].
- Mọi mutation audit qua [[AuditLog_Action_Taxonomy]].
