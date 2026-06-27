---
title: "Security Checklist"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - security
  - checklist
---

# Security Checklist

## Auth & authorization

- [ ] Mọi endpoint cần JWT.
- [ ] Mọi query có `user_id`/tenant scope.
- [ ] Project access check bắt buộc.
- [ ] Admin routes cần role admin.
- [ ] Team access nếu có multi-user workspace.

## Secrets & tokens

- [ ] Không lưu OAuth token plaintext.
- [ ] Dùng KMS hoặc encryption key riêng.
- [ ] Không log token/API key.
- [ ] Không đưa env secret vào Langfuse metadata.
- [ ] Rotate keys theo policy.

## RAG privacy

- [ ] Qdrant payload có `user_id`.
- [ ] Search filter luôn có `user_id`.
- [ ] Không search toàn collection nếu thiếu filter.
- [ ] Test chống leakage cross-user.
- [ ] Document/chunk metadata đồng bộ PostgreSQL.

## MCP mutation safety

- [ ] Email send validate recipient/list ownership.
- [ ] Meta post validate page ownership.
- [ ] Landing deploy validate project ownership.
- [ ] Calendar publish dùng idempotency key.
- [ ] Scheduler có distributed lock.

## Frontend

- [ ] Không lưu secrets trong localStorage.
- [ ] Auth token storage có threat model rõ.
- [ ] Render HTML phải sanitize.
- [ ] XSS guard cho user-generated content.

## AI safety

- [ ] Input guard.
- [ ] Output guard trước external publish.
- [ ] Prompt không chứa secrets.
- [ ] Tool whitelist.
- [ ] ReAct max iterations.

## Backlinks

- [[Safety_Guardrails]]
- [[MCP_Mutation_Safety]]
- [[Qdrant_RAG]]
