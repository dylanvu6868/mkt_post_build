---
title: "Report 2 Stage ReAct"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - react
  - multi-agent
---

# Report 2 Stage ReAct

Report là multi-agent pattern duy nhất hiện có.

## Architecture

```mermaid
sequenceDiagram
  participant U as User
  participant R as Researcher
  participant T as Tavily Tools
  participant W as Writer
  participant DB as LabHistory

  U->>R: report request
  R->>T: search/extract/crawl/map/research
  T-->>R: tool results
  R->>R: compress notes + sources
  R->>W: research notes only
  W->>W: write final markdown report
  W->>DB: save LabHistory
```

## Researcher responsibilities

- Query planning.
- Tavily search/extract/crawl/map/research.
- Source collection.
- Notes compression.
- Confidence/limitations.

## Writer responsibilities

- No tool access.
- Use research notes only.
- Write final markdown.
- Separate facts from interpretation.
- Include limitations.

## Guardrails

- Max tool calls: 6-8 mặc định.
- Researcher không viết final.
- Writer không gọi tool.
- Sources phải được giữ trong metadata.
- Không bịa nguồn.

## Audit actions

```text
lab.report.start
lab.report.tool_call
lab.report.research.done
lab.report.writer.start
lab.report.success
lab.report.error
```

## Backlinks

- [[Report_ReAct_Agent]]
- [[Production_Lab_Tools]]
- [[Multi_Agent_Principles]]
