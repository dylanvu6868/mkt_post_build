---
title: "Tool Skill Matrix"
created: 2026-06-25
status: draft
type: note
tags:
  - vitba
  - matrix
  - agents
  - tools
---

# Tool Skill Matrix

File này là bảng mapping nhanh: agent/tool dùng model nào, tools gì, skills gì, guardrail nào và audit action nào.

## LangGraph pipeline agents

| Agent/Node | Mode | Model | Tools | Skills | Guardrail | Audit chính |
|---|---|---|---|---|---|---|
| [[Planner_Agent]] | structured | fast | `generate_structured` | intent planning, channel planning, success criteria | creative_content | `generate.planner.*` |
| [[Research_Agent]] | structured | fast | `generate_structured`, RAG context | insight extraction, risk discovery | creative_content | `generate.research.*` |
| [[SEO_Agent]] | structured | fast | `generate_structured` | keyword intent, metadata, brief | creative_content | `generate.seo.*` |
| [[Brand_Context_Agent]] | tool_only | none | PostgreSQL, Qdrant | brand voice retrieval, context formatting | tenant_isolation | `generate.brand.*` |
| [[Fusion_Agent]] | structured | fast | `generate_structured` | synthesis, creative brief | creative_content | `generate.fusion.*` |
| [[Copywriter_Agent]] | structured | fast | `generate_structured`, brand profile | copywriting, CTA, channel adaptation | creative_content | `generate.copywriter.*` |
| [[Reviewer_Agent]] | structured | smart | `generate_structured` | scoring, critique, policy flags | quality_review | `generate.reviewer.*` |
| [[Formatter_Agent]] | tool/structured | custom | template engine, optional LLM | formatting, template application | output_validation | `generate.formatter.*` |
| [[Landing_Page_Coder_Agent]] | raw | fast | raw `ainvoke`, HTML sanitizer | landing HTML, sections, CTA | html_generation | `generate.landing.*` |
| [[Marketing_Planner_RAG_Agent]] | raw | fast | raw `ainvoke`, Qdrant | marketing plan JSON, RAG synthesis | creative_content | `generate.marketing_plan.*` |

## Lab agents

| Group | Tools | Mode | Model | Skills |
|---|---|---|---|---|
| [[Brand_Safety_Lab_Tools]] | Shield, HexBreaker, BlindSpot | structured | smart | brand risk, hidden risk, adversarial messaging |
| [[Persuasion_Lab_Tools]] | Psycho, Persona, Reverse, Hook | structured | smart | audience psychology, persona, hook design |
| [[Strategy_Lab_Tools]] | DNA, Simulator, TrendJack, Evergreen, ABTest | structured | smart | positioning, scenario simulation, trend leverage |
| [[Production_Lab_Tools]] | Cinematic, AudioHook, Repurposer | structured | smart | script, audio hook, repurpose content |
| [[Report_ReAct_Agent]] | Report | react | smart + Tavily | research, source synthesis, report writing |
| [[Competitive_Lab_Tools]] | CompetitorSpy, Influencer, Hashtag | structured | smart | competitor analysis, KOL map, hashtag strategy |
| [[Vietnam_Channel_Lab_Tools]] | Dialect Adapter, Zalo OA Publish | structured/tool | smart + Zalo API future | local language, channel adaptation |
| [[SEO_Analysis_Lab_Tool]] | SEO Analysis | raw | smart | SEO audit markdown, technical recommendations |

## MCP Hub tools

| Module | AI? | Tools/API | Skills | Guardrail | Audit |
|---|---:|---|---|---|---|
| [[Email_Resend_Module]] | No | Resend API, scheduler, CRM | send/schedule/email templates | external_publish | `email.*` |
| [[Meta_Graph_Module]] | No | Facebook Graph API | post/comment/insights | external_publish + token policy | `meta.*` |
| [[Landing_Deploy_Module]] | Mixed | template engine, Vercel/GitHub/Cloudflare | generate/deploy/version | html_generation + deploy policy | `landing.*` |
| [[SEO_HTML_Analyzer_Module]] | No | BeautifulSoup | HTML SEO audit | safe_fetch/html_parse | `seo.*` |
| [[Analytics_GA4_UTM_ROI_Module]] | Mixed | GA4, UTM builder, calculators | analytics + commentary | data_integrity | `analytics.*` |
| [[Calendar_Scheduler_Module]] | No | PostgreSQL scheduler | CRUD, schedule, publish | idempotency | `calendar.*` |
| [[Cross_Post_Orchestrator]] | No | Meta + Email | multi-channel publish | external_publish | `orchestrator.*` |

## Skill registry gợi ý

```yaml
skills:
  planning:
    description: Chuyển yêu cầu mơ hồ thành kế hoạch rõ.
  research_synthesis:
    description: Tổng hợp insight từ RAG/web/user input.
  brand_voice:
    description: Áp dụng giọng thương hiệu và điều cấm.
  seo_briefing:
    description: Keyword, intent, title, meta, brief.
  conversion_copywriting:
    description: Hook, body, CTA, proof.
  quality_review:
    description: Chấm điểm và đề xuất cải thiện.
  format_rendering:
    description: Chuyển output sang template/kênh.
  external_publish:
    description: Gửi/đăng/deploy qua API bên ngoài.
  observability:
    description: Trace, audit, usage, error.
```
