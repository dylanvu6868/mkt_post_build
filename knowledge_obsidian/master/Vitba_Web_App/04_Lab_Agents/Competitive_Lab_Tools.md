---
title: "Competitive Lab Tools"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - lab-agents
---

# Competitive Lab Tools

## Purpose

Nhóm cạnh tranh hỗ trợ hiểu thị trường, đối thủ, KOL và hashtag.

## Tools

| Tool | Vai trò | Skills | Audit |
|---|---|---|---|
| CompetitorSpy | Phân tích competitor positioning/content. | competitive analysis | lab.competitorspy.* |
| Influencer | Gợi ý influencer/KOL fit theo campaign. | influencer mapping | lab.influencer.* |
| Hashtag | Gợi ý hashtag theo kênh/ngách. | hashtag strategy | lab.hashtag.* |

## Runtime

- Mode mặc định: `structured`.
- Model: `smart`.
- Wrapper: `generate_structured("smart")`.
- Persistence: `LabHistory`.
- Trace: [[Langfuse_Tracing]].

## Common skills

- Competitor mapping
- Differentiation analysis
- Influencer fit scoring
- Hashtag clustering
- Channel strategy

## Guardrails

- Nếu cần dữ liệu mới, dùng workflow có Tavily chứ không bịa.
- Không claim metrics follower/engagement nếu không có nguồn.
- Tránh smear competitor.

## Output notes

Output nên có competitor angles, gaps, opportunities và confidence.

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
