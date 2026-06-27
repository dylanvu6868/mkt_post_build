---
title: "Vitba Ecosystem Map"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - architecture
  - moc
---

# Vitba Ecosystem Map

Vitba.ai là hệ sinh thái AI marketing gồm 6 lớp lớn:

```mermaid
flowchart TD
  User[User / Marketer] --> UI[Frontend]
  UI --> Chat[Chat]
  UI --> Generate[Generate]
  UI --> Lab[Lab Agents]
  UI --> MCP[MCP Hub]
  UI --> Calendar[Content Calendar]

  Chat --> Guard[Guardrail]
  Chat --> LLM[Chat LLM]
  LLM --> GenerateBlock[Generate Block Detector]
  GenerateBlock --> Generate

  Generate --> Graph[LangGraph Pipeline]
  Graph --> AgentHarness[Vitba Agent Harness]
  AgentHarness --> FastModel[Fast Model]
  AgentHarness --> SmartModel[Smart Model]
  AgentHarness --> Qdrant[Qdrant RAG]
  AgentHarness --> Postgres[PostgreSQL]

  Lab --> LabHarness[Lab Harness]
  LabHarness --> SmartModel
  LabHarness --> Tavily[Tavily]

  MCP --> Email[Resend]
  MCP --> Meta[Facebook Graph API]
  MCP --> Deploy[Vercel/GitHub/Cloudflare]
  MCP --> GA4[GA4]

  Calendar --> Scheduler[Scheduler 60s]
  Scheduler --> Orchestrator[Cross-post Orchestrator]
  Orchestrator --> Email
  Orchestrator --> Meta

  AgentHarness --> Audit[AuditLog]
  AgentHarness --> Trace[Langfuse]
  AgentHarness --> Feedback[Feedback]
```

## Lớp 1 — Product surface

- Chat AI.
- Generate content.
- Lab tools.
- Landing page.
- Email campaign.
- Meta posting.
- Content calendar.
- Admin analytics.

## Lớp 2 — AI orchestration

- [[LangGraph_Pipeline]] cho generate chính.
- [[Lab_Agents_MOC]] cho tools độc lập.
- [[Report_ReAct_Agent]] cho multi-stage research/report.
- [[Vitba Agent Harness]] để chuẩn hóa mọi lần gọi AI/tool.

## Lớp 3 — Tooling không phải AI

- [[Email_Resend_Module]]
- [[Meta_Graph_Module]]
- [[Landing_Deploy_Module]]
- [[SEO_HTML_Analyzer_Module]]
- [[Analytics_GA4_UTM_ROI_Module]]
- [[Calendar_Scheduler_Module]]

## Lớp 4 — Data & memory

- [[PostgreSQL_Models]] là source of truth.
- [[Qdrant_RAG]] cho retrieval.
- [[Redis_Session_Memory]] cho cache/lock/session TTL nếu bổ sung.
- [[Context_Loading_Policy]] quyết định context nào được nạp vào prompt.

## Lớp 5 — Safety/quality/observability

- [[Safety_Guardrails]]
- [[MCP_Mutation_Safety]]
- [[AuditLog_Action_Taxonomy]]
- [[Langfuse_Tracing]]
- [[Evaluation_and_Feedback_Loop]]

## Lớp 6 — Governance & roadmap

- [[Roadmap_Phases]]
- [[Definition_of_Done]]
- [[Security_Checklist]]
- [[Testing_Strategy]]
