---
title: "Guardrails Audit MOC"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - guardrails
  - moc
---

# Guardrails Audit MOC

## Notes

- [[Safety_Guardrails]]
- [[MCP_Mutation_Safety]]
- [[AuditLog_Action_Taxonomy]]
- [[Langfuse_Tracing]]
- [[Error_Handling_Retry]]
- [[Security_Checklist]]

## Golden rule

```text
No AI/tool execution without guard + quota + trace.
No external side effect without policy + idempotency + audit.
```

## Layers

```mermaid
flowchart TD
  A[Input Guard] --> B[Tool Permission]
  B --> C[Tenant Isolation]
  C --> D[Schema Validation]
  D --> E[Output Guard]
  E --> F[Mutation Safety]
  F --> G[AuditLog]
  G --> H[Langfuse/Sentry]
```
