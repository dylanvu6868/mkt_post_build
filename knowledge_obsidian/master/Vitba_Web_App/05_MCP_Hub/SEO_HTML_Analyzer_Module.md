---
title: "SEO HTML Analyzer Module"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - mcp
---

# SEO HTML Analyzer Module

## Purpose

SEO HTML Analyzer là tool không LLM dùng BeautifulSoup để phân tích HTML kỹ thuật.

## Functions

- Parse title/meta.
- Count H1/H2/H3.
- Check alt attributes.
- Check canonical/schema/internal links.
- Detect basic technical SEO issues.

## Endpoints / operations

```http
POST /mcp/seo/analyze-html
POST /mcp/seo/analyze-url
```

## Guardrails

- Safe fetch URL.
- Timeout fetch.
- Không crawl ngoài scope.
- Không execute JS.
- Không gọi LLM trong analyzer core.

## Audit actions

```text
seo.html_analyze
seo.url_analyze
seo.analyze.success
seo.analyze.failed
```

## Data models

Analyzer trả facts kỹ thuật. Nếu thêm commentary AI thì tách rõ facts vs recommendations.

## Failure handling

- Dùng normalized error format.
- Retry lỗi transient theo [[Error_Handling_Retry]].
- Không retry lỗi auth/permission/policy.
- Lưu status và error message an toàn.



## Backlinks

- [[MCP_Hub_MOC]]
- [[MCP_Mutation_Safety]]
- [[AuditLog_Action_Taxonomy]]
