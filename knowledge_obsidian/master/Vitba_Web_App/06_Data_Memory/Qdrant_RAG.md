---
title: "Qdrant RAG"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - rag
  - qdrant
---

# Qdrant RAG

Qdrant lưu vectors phục vụ retrieval. Không dùng Qdrant làm source of truth duy nhất.

## Vector fields

```text
dense: bge-m3, 1024 dim
sparse: BM25-compatible sparse vector
```

## Payload bắt buộc

```json
{
  "user_id": "uuid",
  "project_id": "uuid|null",
  "conversation_id": "uuid|null",
  "document_id": "uuid",
  "chunk_id": "uuid",
  "source_type": "upload|chat|brand|url|manual",
  "title": "string",
  "text": "string",
  "created_at": "datetime"
}
```

## Retrieval policy

| Use case | Filter | TopK |
|---|---|---:|
| Chat | `user_id + project_id? + conversation_id?` | dense 8 + sparse 8 → final 6 |
| Brand node | `user_id + project_id + source_type in brand/upload/manual` | 8 |
| Marketing planner RAG | `user_id + project_id?` | 10 |
| Lab context future | `user_id + project_id?` | tùy tool |

## Hybrid merge

Khuyến nghị reciprocal rank fusion:

```python
score = 1 / (k + dense_rank) + 1 / (k + sparse_rank)
```

## Guardrails

- Bắt buộc filter `user_id`.
- Không query toàn collection nếu thiếu filter.
- Test cross-tenant leakage.
- RAG chunk nên có provenance trong prompt.
- Không đưa chunks quá dài vào context.

## Chunking policy

```text
chunk_size: 500-900 tokens
overlap: 80-120 tokens
metadata: source title, URL/file id, created_at, project_id
```

## Backlinks

- [[Context_Loading_Policy]]
- [[Brand_Context_Agent]]
- [[Security_Checklist]]
