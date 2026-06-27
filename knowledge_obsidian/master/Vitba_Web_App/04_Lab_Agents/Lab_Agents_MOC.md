---
title: "Lab Agents MOC"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - lab-agents
  - moc
---

# Lab Agents MOC

Lab Agents là 22+ công cụ độc lập, đa số dùng `generate_structured("smart")`. Mỗi lần chạy lưu vào [[PostgreSQL_Models#LabHistory]] và trace qua [[Langfuse_Tracing]].

## Nhóm tools

| Nhóm | Note | Tools |
|---|---|---|
| An toàn thương hiệu | [[Brand_Safety_Lab_Tools]] | Shield, HexBreaker, BlindSpot |
| Thuyết phục | [[Persuasion_Lab_Tools]] | Psycho, Persona, Reverse, Hook |
| Chiến lược | [[Strategy_Lab_Tools]] | DNA, Simulator, TrendJack, Evergreen, ABTest |
| Sản xuất | [[Production_Lab_Tools]] | Cinematic, AudioHook, Repurposer, Report |
| Cạnh tranh | [[Competitive_Lab_Tools]] | CompetitorSpy, Influencer, Hashtag |
| Việt Nam | [[Vietnam_Channel_Lab_Tools]] | Dialect Adapter, Zalo OA Publish |
| SEO | [[SEO_Analysis_Lab_Tool]] | SEO Analysis |

## Runtime chung

```mermaid
flowchart TD
  A[POST /lab/{tool}/run] --> B[Auth + Plan/Quota]
  B --> C[Input Guard]
  C --> D[Resolve Lab Tool Registry]
  D --> E{Mode}
  E -->|structured| F[generate_structured smart]
  E -->|raw| G[raw ainvoke]
  E -->|react| H[ReAct Runner]
  F --> I[Validate Output]
  G --> I
  H --> I
  I --> J[Save LabHistory]
  J --> K[AuditLog + Langfuse]
  K --> L[Return output]
```

## Audit actions

```text
lab.{tool}.run
lab.{tool}.success
lab.{tool}.error
```

## Guardrails

- Không chạy tool ngoài registry.
- Input size limit.
- Output schema validation.
- Không cho ReAct gọi tool không whitelist.
- Lưu trace nhưng mask dữ liệu nhạy cảm.
