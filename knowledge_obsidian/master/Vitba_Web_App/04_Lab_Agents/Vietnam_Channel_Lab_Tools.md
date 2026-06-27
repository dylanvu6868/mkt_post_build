---
title: "Vietnam Channel Lab Tools"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - lab-agents
---

# Vietnam Channel Lab Tools

## Purpose

Nhóm Việt Nam tối ưu content cho ngữ cảnh, giọng nói và kênh nội địa.

## Tools

| Tool | Vai trò | Skills | Audit |
|---|---|---|---|
| Dialect Adapter | Chuyển giọng điệu theo vùng miền/địa phương. | Vietnamese localization | lab.dialect_adapter.* |
| Zalo OA Publish | Chuẩn bị/publish nội dung cho Zalo OA. | Zalo channel adaptation | lab.zalo_oa_publish.* |

## Runtime

- Mode mặc định: `structured`.
- Model: `smart`.
- Wrapper: `generate_structured("smart")`.
- Persistence: `LabHistory`.
- Trace: [[Langfuse_Tracing]].

## Common skills

- Vietnamese localization
- Regional tone adaptation
- Zalo OA content packaging
- Local idiom sensitivity

## Guardrails

- Không dùng stereotype vùng miền tiêu cực.
- Tone địa phương phải tự nhiên, không lố.
- Publish Zalo cần external publish guard và audit.

## Output notes

Dialect Adapter trả variants. Zalo OA Publish nên tách prepare vs publish để tránh side effect ngoài ý muốn.

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
