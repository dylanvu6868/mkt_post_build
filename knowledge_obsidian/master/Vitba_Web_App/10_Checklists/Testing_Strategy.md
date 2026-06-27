---
title: "Testing Strategy"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - testing
  - checklist
---

# Testing Strategy

## Unit tests

```text
quota_service
plan_limits
json_extract
generate_structured fallback
route_by_content_type
formatter template selection
rag filter builder
feedback creation
audit logging
```

## Integration tests

```text
POST /generate → job queued → graph success → history saved
POST /lab/shield/run → LabHistory saved
ScheduledEmail due → Resend mocked → status sent
ContentItem approved due → cross_post mocked → published
Feedback submit → admin analytics updated
RAG search không trả chunk user khác
```

## E2E tests

```text
User chat emits generate block → frontend creates job → polling result displayed
Free user generate hết quota → 429 + upgrade message
Pro user có reviewer score
Meta token expired → UI reconnect prompt
Calendar scheduled post publishes đúng kênh
```

## Load tests

```text
100 concurrent chat streams
50 concurrent generation jobs
scheduler xử lý 1000 due items trong batch
p95 generate default < 45s
p95 landing_page < 20s
p95 lab simple < 30s
```

## AI eval tests

- Golden input/output theo content type.
- Schema validation.
- Brand voice consistency.
- Safety regression.
- Reviewer/user feedback correlation.

## Backlinks

- [[Evaluation_and_Feedback_Loop]]
- [[Security_Checklist]]
