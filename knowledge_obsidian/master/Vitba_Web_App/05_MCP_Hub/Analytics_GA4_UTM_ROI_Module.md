---
title: "Analytics GA4 UTM ROI Module"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - mcp
---

# Analytics GA4 UTM ROI Module

## Purpose

Analytics module kết nối GA4, tạo UTM và tính ROI/ROAS/CAC/LTV. AI commentary chỉ giải thích số liệu, không thay thế data gốc.

## Functions

- GA4 connector.
- UTM builder.
- ROI/ROAS/CAC/LTV calculator.
- Dashboard metrics.
- Optional AI commentary.

## Endpoints / operations

```http
GET  /mcp/analytics/ga4/summary
POST /mcp/analytics/utm/build
POST /mcp/analytics/roi/calculate
```

## Guardrails

- Validate property ownership.
- Không bịa số liệu.
- Calculator dùng số user nhập hoặc GA4 data.
- AI commentary phải trích số liệu gốc.
- Không log credentials.

## Audit actions

```text
analytics.ga4.read
analytics.utm.create
analytics.metric.calculate
analytics.commentary.generate
```

## Data models

Calculator tool: `calculate_marketing_metric` cho ROI/ROAS/CAC/LTV.

## Failure handling

- Dùng normalized error format.
- Retry lỗi transient theo [[Error_Handling_Retry]].
- Không retry lỗi auth/permission/policy.
- Lưu status và error message an toàn.



## Backlinks

- [[MCP_Hub_MOC]]
- [[MCP_Mutation_Safety]]
- [[AuditLog_Action_Taxonomy]]
