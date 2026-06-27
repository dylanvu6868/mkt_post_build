---
title: "Chat to Generate Flow"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - chat
  - generate
---

# Chat to Generate Flow

## Luồng chuẩn

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant API as Backend
  participant Guard as Guard
  participant LLM as Chat LLM
  participant Gen as Generate API
  participant Graph as LangGraph
  participant DB as PostgreSQL

  U->>FE: nhập chat
  FE->>API: POST /chat/send
  API->>Guard: safety check
  Guard-->>API: pass/reject
  API->>LLM: stream response
  LLM-->>FE: text stream
  LLM-->>FE: generate block
  FE->>Gen: POST /generate
  Gen->>DB: create GenerationJob queued
  Gen->>Graph: background task
  FE->>Gen: GET /generate/{job_id}
  Graph->>DB: update step/progress
  Graph->>DB: result_json success/error
  Gen-->>FE: final result
```

## Generate block format

````md
```generate
{
  "content_type": "facebook_post",
  "input_data": {
    "topic": "...",
    "audience": "...",
    "tone": "..."
  }
}
```
````

## Backend validation

- `content_type` nằm trong registry.
- `input_data` đúng schema và size limit.
- User còn quota.
- Project/conversation thuộc user.
- Guard input pass.

## Frontend responsibilities

- Detect generate block.
- Hiển thị preview hoặc auto-submit tùy UX.
- POST `/generate`.
- Poll job.
- Render output.
- Gửi feedback.

## Rủi ro

| Rủi ro | Fix |
|---|---|
| LLM emit generate block sai JSON | frontend parse fail + backend validate schema |
| User hết quota sau chat | backend trả 429 + upgrade hint |
| Generate block malicious | guard + schema allowlist |
| Job polling quá dày | sleepUntilVisible/backoff/SSE phase sau |
