---
title: "SEO Analysis Lab Tool"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - lab-agents
  - seo
---

# SEO Analysis Lab Tool

## Purpose

SEO Analysis tạo markdown report dài, dùng smart model raw `ainvoke`, tối đa khoảng 8192 tokens output.

## Runtime profile

| Field | Value |
|---|---|
| Mode | `raw` |
| Model | `smart` |
| Output | Markdown report |
| Persistence | LabHistory |
| Audit | `lab.seo_analysis.*` |

## Skills

- On-page SEO review.
- Keyword/content gap analysis.
- Technical SEO explanation.
- Prioritized recommendations.
- Markdown report writing.

## Tools

- raw `ainvoke`.
- Optional HTML analyzer nếu input là URL/HTML: [[SEO_HTML_Analyzer_Module]].
- Optional Tavily trong workflow future nếu cần dữ liệu web.

## Guardrails

- Không claim search volume/ranking nếu không có data.
- Nếu phân tích URL, phải phân biệt HTML facts vs AI recommendations.
- Không tự crawl quá sâu nếu không được cấp tool.
- Output nên có confidence và assumptions.

## Report structure đề xuất

```md
# SEO Audit Report
## Executive Summary
## Technical Issues
## On-page Content
## Keyword Intent
## Competitor/Market Notes
## Priority Fixes
## 30-day Action Plan
```

## Failure modes

- Report quá dài nhưng thiếu priority.
- Recommendation chung chung.
- Lẫn technical analyzer với AI guess.
- Token vượt giới hạn.

## Backlinks

- [[Lab_Agents_MOC]]
- [[SEO_HTML_Analyzer_Module]]
