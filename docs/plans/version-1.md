# VITBA.AI — PHASE 1: AI MARKETING CONTENT PLATFORM

## Tổng quan

Nền tảng SaaS tạo nội dung marketing tự động bằng AI Agents.
User nhập yêu cầu → 7-agent pipeline xử lý → trả nội dung chuyên nghiệp.

**Stack:** Next.js 14 + FastAPI + PostgreSQL (Supabase) + Qdrant + DeepSeek LLM
**Deploy:** Railway (backend + qdrant + frontend) | Domain: vitbaai.xyz

---

## Kiến trúc

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js 14)             │
│  App Router · Zustand · Tailwind · Framer Motion    │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐    │
│  │ Sidebar  │  │ Chat     │  │ Content Panel  │    │
│  │ Convs    │  │ SSE      │  │ InlineResult   │    │
│  │ Projects │  │ Stream   │  │ Copy/Download  │    │
│  └──────────┘  └──────────┘  └────────────────┘    │
└─────────────────────┬───────────────────────────────┘
                      │ REST + SSE
┌─────────────────────▼───────────────────────────────┐
│                   BACKEND (FastAPI)                  │
│                                                     │
│  Auth · Chat SSE · Generate · Conversations         │
│  Projects · Brand · Documents · Templates           │
│  Payments · Admin · Images                          │
│                                                     │
│  ┌────────────────────────────────────────────┐     │
│  │         LangGraph Agent Pipeline           │     │
│  │  Planner → Research ∥ SEO ∥ Brand          │     │
│  │         → Fusion → Copywriter → Reviewer   │     │
│  └────────────────────────────────────────────┘     │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐      │
│  │ Supabase │  │ Qdrant   │  │ DeepSeek LLM │      │
│  │ Postgres │  │ Vector   │  │ Chat + Fast   │      │
│  └──────────┘  └──────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────┘
```

---

## Tính năng đã hoàn thành

### Content Generation
- 6 loại nội dung: Facebook Post, SEO Blog, Email, Landing Page, TikTok Script, Marketing Plan
- Mỗi loại có 2-3 framework chuyên biệt (Viral Hook, Storytelling, PAS, Topic Cluster, How-To...)
- Custom Structure: user tự định nghĩa cấu trúc
- LangGraph pipeline 7 bước tự động
- Structured output với fallback JSON parsing (DeepSeek compatible)
- Background generation: chạy nền khi user chuyển tab/conversation

### Chat System
- SSE streaming real-time
- Multi-conversation song song (4-6 cùng lúc)
- Auto-detect content type từ ngữ cảnh
- Background tasks với toast notifications
- Tab-switch aware (visibilitychange API)

### Brand Voice & Projects
- Dự án hóa: mỗi dự án có brand voice, knowledge base, templates riêng
- Brand profile: name, tone, style, preferred/forbidden words
- Soft-delete: lưu lịch sử thay đổi brand profile

### RAG (Retrieval-Augmented Generation)
- Upload PDF, DOCX, TXT
- Hybrid search: BM25 + Vector + Reranker
- Qdrant vector database

### Image Analysis
- Upload ảnh → GPT-4o-mini phân tích

### Authentication & Security
- JWT + Google OAuth
- Password reset via Gmail SMTP
- CSP, CORS, rate limiting, XSS protection
- Admin panel: users, payments, analytics, content moderation

### Payments (SePay)
- 4-tier pricing: Free, Starter, Pro, Enterprise
- QR code checkout + webhook auto-upgrade

### UI/UX
- Dark theme gold accent (#FFD54A)
- Responsive, Framer Motion animations
- Interactive spotlight tutorial (9 steps)
- Optimistic UI updates

---

## Database Schema

```
users, projects, brand_profiles, brand_profile_history,
conversations, messages, documents, generation_jobs,
user_templates, payment_orders, content_history
```

---

## API Endpoints

| Group | Endpoints |
|-------|-----------|
| Auth | register, login, me, forgot/reset-password, google |
| Chat | SSE send, upload |
| Conversations | CRUD + messages |
| Generate | POST + polling |
| Projects | CRUD |
| Brand | GET/POST per project |
| Documents | CRUD per project |
| Templates | CRUD |
| Payments | create-order, order-status, sepay-webhook |
| Admin | stats, users, payments |
| Images | analyze |

---

## Known Limitations (→ Phase 2 solves)

1. Nội dung tạo xong chỉ hiển thị trong app — không đăng được ra platform nào
2. Không có scheduling/calendar
3. Không có analytics từ social platforms
4. Email chỉ dùng cho password reset, không có campaign
5. Landing page generate nhưng không auto-deploy
6. Không có multi-tenant (team/org)
