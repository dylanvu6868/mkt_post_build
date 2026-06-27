---
title: "Strategy Lab Tools"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - lab-agents
---

# Strategy Lab Tools

## Purpose

Nhóm chiến lược giúp chuyển ý tưởng rời rạc thành campaign có positioning, giả thuyết và kế hoạch thử nghiệm.

## Tools

| Tool | Vai trò | Skills | Audit |
|---|---|---|---|
| DNA | Phân tích DNA thương hiệu/sản phẩm. | positioning, brand essence | lab.dna.* |
| Simulator | Mô phỏng phản ứng thị trường/campaign. | scenario planning | lab.simulator.* |
| TrendJack | Bắt trend và gắn với brand. | trend mapping | lab.trendjack.* |
| Evergreen | Biến ý tưởng thành content evergreen. | evergreen strategy | lab.evergreen.* |
| ABTest | Tạo giả thuyết và biến thể A/B. | experiment design | lab.abtest.* |

## Runtime

- Mode mặc định: `structured`.
- Model: `smart`.
- Wrapper: `generate_structured("smart")`.
- Persistence: `LabHistory`.
- Trace: [[Langfuse_Tracing]].

## Common skills

- Positioning
- Scenario simulation
- Trend-to-brand fit
- Evergreen content design
- Experiment hypothesis

## Guardrails

- TrendJack không ép trend nếu brand fit thấp.
- Simulator phải ghi rõ giả định.
- ABTest không claim kết quả trước khi chạy test thật.

## Output notes

Output nên có assumptions, hypotheses, test variants, KPIs và risks.

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
