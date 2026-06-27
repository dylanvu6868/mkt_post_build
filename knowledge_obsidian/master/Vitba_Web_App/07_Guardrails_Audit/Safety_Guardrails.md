---
title: "Safety Guardrails"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - guardrails
  - safety
---

# Safety Guardrails

## Guard placement

```text
Chat input → Guard → stream LLM
Generate input → Guard → LangGraph
Lab input → Guard → Lab tool
MCP mutation → Policy validation → External API
Output → Output guard nếu content/publish nhạy cảm
```

## Guard output

```json
{
  "allowed": false,
  "category": "unsafe_content",
  "reason": "Yêu cầu không phù hợp với chính sách an toàn.",
  "safe_alternative": "Tôi có thể giúp viết phiên bản trung lập, không kích động."
}
```

## Guard profiles

| Profile | Dùng cho | Checks |
|---|---|---|
| `creative_content` | content generation | unsafe claims, hate/harassment, regulated content |
| `brand_safety` | Shield/BlindSpot | brand risk, controversy, hidden harm |
| `external_publish` | email/meta/zalo | consent, ownership, policy, duplicate |
| `research_web` | Tavily/ReAct | source quality, unsafe browsing intent |
| `html_generation` | landing | script injection, phishing-like content |
| `analytics_commentary` | metrics | no fabricated numbers |

## Output guard

Output guard nên chạy khi:

- Sắp publish external.
- Nội dung có claim y tế/tài chính/pháp lý.
- Nội dung nhắm tới nhóm nhạy cảm.
- Landing HTML có script/form.
- Email campaign gửi hàng loạt.

## Logging

- Ghi `guard.reject` vào [[AuditLog_Action_Taxonomy]].
- Không lưu nội dung nhạy cảm quá mức.
- UI stream reason rõ cho user.

## Backlinks

- [[MCP_Mutation_Safety]]
- [[Brand_Safety_Lab_Tools]]
- [[Vitba Agent Harness]]
