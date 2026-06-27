---
title: "Build Checklist"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - checklist
  - build
---

# Build Checklist

## Backend

- [ ] Models: `GenerationJob`, `ContentHistory`, `LabHistory`, `AuditLog`, `Feedback`, `ContentItem`, `ScheduledEmail`.
- [ ] Routes: `/chat/send`, `/generate`, `/generate/{job_id}`, `/lab/{tool}/run`.
- [ ] `quota_service.check_and_consume()`.
- [ ] `trace_request()` wrapper.
- [ ] `generate_structured()` fallback.
- [ ] LangGraph pipeline.
- [ ] Lab registry.
- [ ] MCP email/meta/calendar/deploy modules.
- [ ] Scheduler với lock/idempotency.
- [ ] Feedback endpoint.

## Frontend

- [ ] Chat stream UI.
- [ ] Generate block detector.
- [ ] Job polling với `sleepUntilVisible`.
- [ ] Output renderer markdown/html/json.
- [ ] Lab tools UI theo registry.
- [ ] Calendar CRUD + publish target editor.
- [ ] Email/Meta integration UI.
- [ ] Feedback buttons + correction textbox.
- [ ] Quota usage display.
- [ ] Admin analytics dashboard.

## DevOps

- [ ] PostgreSQL migration pipeline.
- [ ] Qdrant collection init.
- [ ] Redis lock/session config.
- [ ] Secret management.
- [ ] CI tests.
- [ ] Staging environment.
- [ ] Monitoring + Sentry/Langfuse.
- [ ] PostgreSQL backup.
- [ ] Retention cleanup job.

## Backlinks

- [[Definition_of_Done]]
- [[Deployment_Checklist]]
