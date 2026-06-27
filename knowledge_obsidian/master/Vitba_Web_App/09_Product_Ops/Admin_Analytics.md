---
title: "Admin Analytics"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - admin
  - analytics
---

# Admin Analytics

Admin dashboard `/admin/analytics` cần cho team nhìn được usage, quality, errors và business health.

## Existing signals

- User growth.
- Content daily.
- Job success rate.
- Top users.
- Tool usage top 20 audit actions 7 ngày.
- Activities feed.
- Reviewer avg_score.

## Nên bổ sung

- Feedback up/down ratio.
- Negative feedback tags.
- Error rate theo agent/tool.
- Latency p50/p95 theo content type.
- Scheduler success/failure.
- Email send success rate.
- Meta post success rate.
- RAG retrieval hit/miss.
- Quota rejection count.

## Data sources

| Metric | Source |
|---|---|
| tool usage | AuditLog |
| AI latency/token | Langfuse |
| job success | GenerationJob |
| content quality | Reviewer score + Feedback |
| scheduler health | ScheduledEmail/ContentItem |
| external publish | publish result tables |

## Backlinks

- [[AuditLog_Action_Taxonomy]]
- [[Langfuse_Tracing]]
- [[User_Feedback_System]]
