---
title: "Glossary"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - glossary
---

# Glossary

| Thuật ngữ | Nghĩa trong Vitba.ai |
|---|---|
| Agent | Thành phần AI có prompt, input/output schema, tools/skills và contract rõ ràng. |
| Tool | Chức năng gọi được bởi agent hoặc backend. Có thể là LLM wrapper, Tavily, Resend, Meta API, BeautifulSoup, calculator. |
| Skill | Năng lực hành vi của agent: lập kế hoạch, SEO brief, brand voice, research, review, format, safety check. |
| Harness | Lớp runtime chuẩn hóa cách gọi agent/tool: auth, quota, guard, context, model, schema, audit, trace, feedback. |
| LangGraph | Pipeline deterministic theo node/state cho generate chính. |
| ReAct | Vòng reasoning + action, dùng khi agent cần gọi tool nhiều bước, ví dụ Report Researcher với Tavily. |
| MCP Hub | Nhóm REST tools không phải AI: Email, Meta, Landing, SEO HTML, Analytics, Calendar, Deploy. |
| RAG | Retrieval-Augmented Generation, lấy context từ Qdrant + Postgres trước khi gọi LLM. |
| GraphState | State TypedDict truyền giữa node LangGraph. |
| GenerationJob | State machine lưu trạng thái một lần generate. |
| LabHistory | Lịch sử output của lab tools. |
| AuditLog | Nhật ký mutation để đếm quota, điều tra lỗi, admin analytics. |
| Langfuse trace | Trace chi tiết của AI request: prompt, model, token, latency, node, error. |
| Guardrail | Cơ chế chặn/giảm rủi ro: safety, policy, tenant isolation, tool permission, output validation. |
| Reviewer | Node AI chấm chất lượng 0-100 cho gói Pro/Max. |
| Feedback | Đánh giá thật từ user: thumbs up/down, correction, tags. |
| Orchestrator | Module điều phối publish đa kênh: Meta + Email + Calendar sync. |
| Idempotency key | Khóa chống lặp side effect như gửi email/đăng post 2 lần. |
| Publish target | Đích xuất bản structured: Meta page, email list, Zalo OA, landing deploy. |
