---
title: "Brand Safety Lab Tools"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - lab-agents
---

# Brand Safety Lab Tools

## Purpose

Nhóm này giúp giảm rủi ro trước khi content được xuất bản hoặc đưa vào campaign.

## Tools

| Tool | Vai trò | Skills | Audit |
|---|---|---|---|
| Shield | Kiểm tra nội dung có rủi ro thương hiệu/policy không. | risk detection, policy classification | lab.shield.* |
| HexBreaker | Phân tích chiến thuật lách/camouflage có thể gây rủi ro. | adversarial analysis, brand safety | lab.hexbreaker.* |
| BlindSpot | Tìm điểm mù trong thông điệp/campaign. | risk brainstorming, omission detection | lab.blindspot.* |

## Runtime

- Mode mặc định: `structured`.
- Model: `smart`.
- Wrapper: `generate_structured("smart")`.
- Persistence: `LabHistory`.
- Trace: [[Langfuse_Tracing]].

## Common skills

- Brand safety analysis
- Policy category detection
- Hidden risk discovery
- Safe alternative generation
- Severity scoring

## Guardrails

- Không hướng dẫn lách policy.
- Khi phát hiện rủi ro, đưa safe alternative.
- Không dùng để tối ưu nội dung gây hại.
- Audit `guard.reject` nếu input unsafe.

## Output notes

Output nên có `risk_level`, `flags`, `reason`, `safe_alternative`, `go_no_go`.

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
