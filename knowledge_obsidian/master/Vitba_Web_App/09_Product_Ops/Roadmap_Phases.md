---
title: "Roadmap Phases"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - roadmap
---

# Roadmap Phases

## Phase 1 — Stabilize core

- Chuẩn hóa `GenerationJob` state machine.
- Bọc mọi AI endpoint bằng Langfuse trace.
- Chuẩn hóa `generate_structured` retry.
- Thêm AuditLog cho mọi mutation còn thiếu.
- Kiểm tra RAG filter bắt buộc `user_id`.

## Phase 2 — Feedback & quality loop

- Thêm `Feedback` model.
- Thêm feedback UI trên output cards.
- Admin analytics có feedback ratio/tag.
- Kết hợp reviewer score + user feedback để phân tích prompt.
- Không fine-tune tự động.

## Phase 3 — Scheduler hardening

- Thêm distributed lock.
- Dùng `FOR UPDATE SKIP LOCKED`.
- Thêm idempotency key cho email/meta/calendar publish.
- Đổi tag parser thô sang `publish_targets` structured field.

## Phase 4 — Context upgrade

- Tăng chat history theo plan.
- Thêm conversation summary memory.
- Thêm Redis session memory TTL 24h.
- Tối ưu RAG hybrid retrieval.

## Phase 5 — Agent chaining có kiểm soát

- Giữ deterministic pipeline mặc định.
- Cho phép workflow templates.
- Không để agent tự spawn tự do.
- Mọi chain có quota, trace, audit, timeout.

## Backlinks

- [[Build_Checklist]]
- [[Future_Agent_Harness]]
- [[Definition_of_Done]]
