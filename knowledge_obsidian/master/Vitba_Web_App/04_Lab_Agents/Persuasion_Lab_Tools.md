---
title: "Persuasion Lab Tools"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - lab-agents
---

# Persuasion Lab Tools

## Purpose

Nhóm thuyết phục giúp tìm angle, persona và hook để content có lực chuyển đổi cao hơn.

## Tools

| Tool | Vai trò | Skills | Audit |
|---|---|---|---|
| Psycho | Phân tích động lực/tâm lý khách hàng. | psychographic analysis | lab.psycho.* |
| Persona | Tạo hoặc tinh chỉnh persona khách hàng. | persona modeling | lab.persona.* |
| Reverse | Reverse-engineer thông điệp/campaign thành insight. | message deconstruction | lab.reverse.* |
| Hook | Tạo hook cho content/ads/video/email. | hook writing, curiosity gap | lab.hook.* |

## Runtime

- Mode mặc định: `structured`.
- Model: `smart`.
- Wrapper: `generate_structured("smart")`.
- Persistence: `LabHistory`.
- Trace: [[Langfuse_Tracing]].

## Common skills

- Audience psychology
- Persona segmentation
- Objection handling
- Hook generation
- Message reverse engineering

## Guardrails

- Không thao túng người dùng theo hướng gây hại.
- Tránh claim y tế/tài chính/pháp lý nếu không có nguồn.
- Không target nhóm nhạy cảm bằng exploitative tactics.

## Output notes

Output nên có persona/insight/hook variants và giải thích vì sao phù hợp.

## Checklist khi build

- [ ] Có input schema riêng cho từng tool.
- [ ] Có output schema riêng cho từng tool.
- [ ] Có prompt version.
- [ ] Có quota key `lab.<tool>`.
- [ ] Có audit action.
- [ ] Có sample input/output để eval.

## Backlinks

- [[Lab_Agents_MOC]]
- [[Tool_Skill_Matrix]]
- [[Vitba Agent Harness]]
