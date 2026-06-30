# Vitba Tool: Grid Redesign + 26 New Marketing Tools

## Goal

Standardize the Vitba Lab hub (`/hub/lab`, "Vitba Tool" in the sidebar) into a uniform tile grid (5 columns) and expand from 24 to 50 tools by adding 26 new marketing tools (analysis, copywriting, ads/conversion, retention, branding) — all powered by one shared generic AI engine instead of 26 bespoke backend/frontend files.

## Current state

- `frontend/app/hub/lab/page.tsx` — `CATEGORIES` array (8 categories, 24 tools), rendered as full-width stacked rows grouped under category headers.
- Each of the 24 tools has its own dedicated page (`frontend/app/hub/lab/<id>/page.tsx`) and its own backend Pydantic request/response models + agent function (`backend/app/agents/lab.py`) + endpoint (`backend/app/api/lab.py`).
- All agents already share one underlying call: `generate_structured(tier, system, user, schema)` (`backend/app/agents/base.py`).
- Daily usage limiting, audit logging, AI call logging, and history saving are centralized in `_run_tool()` (`backend/app/api/lab.py`), tool-agnostic.

## New tools (26)

**Phân tích thị trường**
1. `market-sizing` — Market Sizing Analyzer
2. `persona-builder` — Customer Persona Builder
3. `campaign-analyzer` — Campaign Performance Analyzer
4. `sentiment-analysis` — Sentiment Analysis Engine
5. `swot-analyzer` — SWOT Strategy Analyzer
6. `pricing-advisor` — Pricing Strategy Advisor

**Viết nội dung chuyên sâu**
7. `landing-copy` — Landing Page Copywriter
8. `product-description` — Product Description Generator
9. `email-sequence` — Email Sequence Writer
10. `video-script` — Video Script Writer
11. `press-release` — Press Release Generator
12. `blog-writer` — Blog/SEO Article Writer

**Quảng cáo & Chuyển đổi**
13. `ads-copy` — Ads Copy Generator
14. `cta-optimizer` — CTA Optimizer
15. `funnel-copy` — Funnel Copy Builder
16. `cro-auditor` — Conversion Rate Auditor
17. `promo-designer` — Offer & Promotion Designer

**Email & Chăm sóc khách hàng**
18. `retention-planner` — Customer Retention Planner
19. `loyalty-designer` — Loyalty Program Designer
20. `faq-handler` — FAQ & Objection Handler
21. `testimonial-enhancer` — Testimonial Enhancer

**Thương hiệu & Chiến lược**
22. `brand-naming` — Brand Naming Generator
23. `tagline-generator` — Tagline & Slogan Generator
24. `positioning-builder` — Brand Positioning Statement Builder
25. `content-calendar` — Content Calendar Planner
26. `brand-voice-guideline` — Brand Voice Guideline Builder

Each entry needs: `id`, `name`, `tagline` (VN), `category`, `icon` (lucide-react), `fields` (1–3 input fields: key, label, placeholder, type `text`|`textarea`, required), and a server-side system-prompt template.

## Architecture

### Backend (shared generic engine)

- New file `backend/app/agents/lab_generic.py`:
  - `GENERIC_TOOLS: dict[str, GenericToolSpec]` — registry of the 26 tools, each with `system_prompt` (Vietnamese, includes `STRICT_RULES` from `lab.py`) and ordered list of expected input keys.
  - `class GenericToolResponse(BaseModel)`: `title: str`, `summary: str`, `content: str` (markdown body), `key_points: list[str] = []`. One shared schema for all 26 tools — flexible enough for both analysis and writing outputs.
  - `async def run_generic_tool_agent(tool_id: str, inputs: dict[str, str]) -> GenericToolResponse`: looks up the spec, formats system+user prompt from `inputs`, calls `generate_structured("smart", system, user, GenericToolResponse)`. Raises `ValueError` for unknown `tool_id` (→ 404 at the route).
- New endpoint in `backend/app/api/lab.py`:
  - `class GenericToolRequest(BaseModel)`: `inputs: dict[str, str]` (each value capped at `MAX_CONTENT`).
  - `POST /api/lab/generic/{tool_id}` — validates `tool_id` exists in `GENERIC_TOOLS`, reuses existing `_run_tool()` for plan-limit/audit/logging/history (tool_name = `tool_id`), calls `run_generic_tool_agent`.
  - Rate limit: `5/minute`, same tier as most existing tools.

### Frontend

- New shared config file `frontend/lib/lab-tools.ts`: exports `CATEGORIES` (moved out of `page.tsx`) extended with the 5 new categories/26 tools, each new tool with `href: "/hub/lab/<id>"`, `tag: "new"`, and a `fields` array mirroring the backend's expected input keys (kept in sync manually — small, low-churn).
- `frontend/app/hub/lab/page.tsx`:
  - Imports `CATEGORIES` from the shared lib instead of defining inline.
  - Replaces the category-stacked full-row list with: a horizontal category filter chip bar (`Tất cả` + 13 categories) + a search input, and a `grid grid-cols-5 gap-3` tile grid below. Each tile: icon, name, tag badge, 2-line tagline, click → `router.push(href)`. With "Tất cả" + no search, 50 tools render as 10 rows × 5 tiles.
  - Header stat boxes (`totalTools`, `CATEGORIES.length`) keep working unchanged since they derive from the same array.
- New dynamic route `frontend/app/hub/lab/[toolId]/page.tsx`:
  - Looks up the tool in `CATEGORIES` (shared lib) by `params.toolId`; 404s (via `notFound()`) if not found among the 26 generic tools (existing 24 keep their own static folders, which Next.js resolves first, so this route is only ever hit for the new tools).
  - Renders a form generated from the tool's `fields` config, a submit button, and a result panel (title, summary, markdown content via existing markdown renderer if one exists in the codebase, key points as a bullet list).
  - Calls `POST /api/lab/generic/{toolId}` with `{ inputs: { ...formValues } }`, reusing existing auth/fetch helpers used by the other 24 tool pages.

## Out of scope

- No per-tool bespoke backend logic or schemas for the 26 new tools (explicitly deferred — generic engine only, per user decision).
- No changes to the existing 24 tools' pages, schemas, or endpoints.
- No DataForSEO-style external API integration for any of the 26 (pure LLM generation).
- No new "fetch tool config from backend" endpoint — field definitions live in the frontend lib file only.

## Testing

- Backend: unit test for `run_generic_tool_agent` (unknown tool_id raises), and an API test hitting `POST /api/lab/generic/{tool_id}` for at least one tool, mocking `generate_structured`.
- Frontend: manual verification (dev server) that the grid renders 50 tiles, filter chips work, search filters, and at least 2 of the new generic tool pages submit and render a result end-to-end against the backend.
