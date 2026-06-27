---
title: "Production Lab Tools"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - lab-agents
---

# Production Lab Tools

## Purpose

Nhóm sản xuất biến chiến lược/copy thành asset thực dụng cho video, audio, social, report.

## Tools

| Tool | Vai trò | Skills | Audit |
|---|---|---|---|
| Cinematic | Viết concept/script visual/video. | visual storytelling | lab.cinematic.* |
| AudioHook | Tạo audio hook/intro voiceover. | audio copywriting | lab.audiohook.* |
| Repurposer | Chuyển 1 nội dung thành nhiều format/kênh. | content repurposing | lab.repurposer.* |
| Report | Tạo báo cáo 2-stage ReAct. | research + report writing | lab.report.* |

## Runtime

- Mode mặc định: `structured`.
- Model: `smart`.
- Wrapper: `generate_structured("smart")`.
- Persistence: `LabHistory`.
- Trace: [[Langfuse_Tracing]].

## Common skills

- Script writing
- Audio hook writing
- Repurposing
- Format adaptation
- Report synthesis

## Guardrails

- Không dùng nhạc/lyrics bản quyền dài.
- Report phải phân biệt nguồn và suy luận.
- Repurposer không làm mất thông điệp cốt lõi.

## Output notes

Report dùng note riêng [[Report_ReAct_Agent]] và [[Report_2_Stage_ReAct]].

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
