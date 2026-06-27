---
title: "README — Vitba.ai Obsidian Second Brain"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - moc
  - obsidian
---

# README — Vitba.ai Obsidian Second Brain

Vault này được thiết kế như **bộ não thứ hai** cho hệ sinh thái [[Vitba.ai]]. Mục tiêu là biến toàn bộ kiến trúc, agents, tools, skills, guardrails, audit log, memory, multi-agent và hướng phát triển [[Vitba Agent Harness]] thành các note nhỏ, dễ mở rộng trong Obsidian.

## Cách dùng trong Obsidian

1. Mở folder này bằng **Open folder as vault**.
2. Bắt đầu từ [[00_Vitba_AI_MOC]].
3. Mỗi module chính có một MOC riêng: [[Agents_MOC]], [[Lab_Agents_MOC]], [[MCP_Hub_MOC]], [[Multi_Agent_MOC]], [[Guardrails_Audit_MOC]].
4. Khi triển khai, dùng các checklist ở thư mục `10_Checklists`.
5. Khi thêm agent/tool mới, copy template trong `99_Templates`.

## Quy ước note

- `MOC` = Map of Content, dùng làm trang điều hướng.
- `Agent Card` = một note mô tả agent: mục tiêu, input, output, tools, skills, guardrails, audit.
- `Tool Card` = một note mô tả tool/module REST hoặc tool ReAct.
- `Harness` = lớp runtime chuẩn hóa cách agent/tool được gọi, kiểm soát quota, guardrail, trace, audit, schema, feedback.

## Luồng đọc khuyến nghị

```text
[[00_Vitba_AI_MOC]]
  → [[Vitba_Ecosystem_Map]]
  → [[Vitba Agent Harness]]
  → [[LangGraph_Pipeline]]
  → [[Agents_MOC]]
  → [[Lab_Agents_MOC]]
  → [[MCP_Hub_MOC]]
  → [[Safety_Guardrails]] + [[AuditLog_Action_Taxonomy]]
  → [[Roadmap_Phases]] + [[Build_Checklist]]
```

## Tư tưởng kiến trúc cốt lõi

Vitba.ai nên đi theo hướng: **deterministic orchestration trước, agentic behavior sau**. Nghĩa là các workflow quan trọng như generate, publish, scheduler, quota, guardrail và audit phải có state machine rõ ràng. Multi-agent chỉ nên dùng khi có lợi ích thật: research đa bước, chain lab tools, report ReAct, hoặc workflow template có kiểm soát.
