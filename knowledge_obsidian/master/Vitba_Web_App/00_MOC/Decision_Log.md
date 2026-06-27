---
title: "Decision Log"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - decision-log
---

# Decision Log

## Quyết định đã rõ

| Quyết định | Trạng thái | Ghi chú |
|---|---|---|
| Generate chính dùng LangGraph | Chốt | Routing deterministic, node rõ ràng. |
| Reviewer chỉ chạy Pro/Max | Chốt theo product | Free không có AI quality score. |
| Brand node không gọi LLM | Chốt | Chỉ nạp RAG/BrandProfile. |
| Lab tools đa số dùng smart model | Chốt | `generate_structured("smart")`, riêng SEO Analysis raw markdown. |
| Report agent là 2-stage ReAct | Chốt | Researcher dùng Tavily, Writer không tool. |
| MCP Hub là REST, không phải AI | Chốt | Email/Meta/Landing/SEO/Analytics/Calendar/Deploy. |
| PostgreSQL là source of truth | Chốt | Qdrant chỉ retrieval, Zustand chỉ UI/local. |
| Explicit user feedback chưa có | Cần bổ sung | Thêm Feedback model/API/UI. |

## Quyết định cần chốt thêm

| Vấn đề | Khuyến nghị |
|---|---|
| Redis có dùng không? | Có: distributed lock, session TTL, cache nhẹ. Không dùng làm source of truth. |
| Multi-agent có tự spawn không? | Không. Chỉ cho workflow templates có kiểm soát. |
| Publish targets lưu thế nào? | JSONB structured field, không parse tag comma. |
| Free có reviewer nhẹ không? | Có thể dùng heuristic score, nhưng không dùng smart reviewer để tiết kiệm. |
| RAG retention theo plan? | Có, đồng bộ với storage quota và data retention. |
| Feedback có dùng fine-tune tự động không? | Không ở giai đoạn đầu. Dùng để cải thiện prompt/eval thủ công. |

## Nguyên tắc ghi decision mới

Mỗi decision nên có:

```text
Ngày
Ngữ cảnh
Options đã cân nhắc
Quyết định
Lý do
Rủi ro
Cách rollback
```
