---
title: "Context Loading Policy"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - context
  - memory
---

# Context Loading Policy

Context loading quyết định dữ liệu nào được đưa vào prompt/harness.

## Sources

| Source | Loader | Scope | Risk |
|---|---|---|---|
| Chat history | PostgreSQL | conversation/user | context overflow |
| RAG chunks | Qdrant | user/project/conversation | data leakage nếu filter sai |
| Brand profile | PostgreSQL | project/user | stale brand voice |
| Custom template | PostgreSQL | user/content_type | template injection |
| Plan limits | quota service | user | sai quyền nếu cache stale |
| Onboarding answers | DB/form | project/user | privacy |

## Loading order

```text
Auth user
→ project access check
→ plan snapshot
→ chat history
→ brand profile
→ custom template
→ RAG chunks
→ assemble prompt context
```

## Chat history policy

Hiện tại: 12 tin nhắn gần nhất.

Khuyến nghị:

```text
Free: 12 messages
Pro: 20 messages
Max: dynamic token budget, tối đa 30 messages + summary memory
```

## Context compression

Khi context dài:

1. Ưu tiên system prompt + latest user request.
2. Ưu tiên brand do/don't.
3. RAG chunks theo relevance.
4. Chat history gần nhất.
5. Summarize old context nếu có summary memory.

## Guardrails

- Không load data project khác.
- Không đưa secrets/tokens vào prompt.
- Không đưa quá nhiều raw PII vào trace.
- Custom template phải sanitize.

## Backlinks

- [[Graph_State_Context_Memory]]
- [[Qdrant_RAG]]
- [[Redis_Session_Memory]]
