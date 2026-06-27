---
title: "Deployment Checklist"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - deployment
  - checklist
---

# Deployment Checklist

## Environment variables

```env
DATABASE_URL=
REDIS_URL=
QDRANT_URL=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
TAVILY_API_KEY=
RESEND_API_KEY=
META_APP_ID=
META_APP_SECRET=
VERCEL_TOKEN=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
SENTRY_DSN=
```

## Pre-deploy

- [ ] DB migrations applied.
- [ ] Qdrant collection exists.
- [ ] Secrets loaded from secret manager.
- [ ] Scheduler lock configured.
- [ ] External API credentials verified.
- [ ] Admin user/role created.
- [ ] Health checks configured.
- [ ] Error monitoring configured.

## Post-deploy smoke tests

- [ ] Login works.
- [ ] Chat stream works.
- [ ] Generate job success.
- [ ] Lab tool success.
- [ ] Feedback submit.
- [ ] Email test send in sandbox.
- [ ] Meta integration token check.
- [ ] Landing deploy test.
- [ ] Admin analytics loads.

## Rollback plan

- Keep previous image.
- DB migration reversible where possible.
- Disable scheduler if side effects risky.
- Feature flag new agents/workflows.

## Backlinks

- [[Security_Checklist]]
- [[Build_Checklist]]
