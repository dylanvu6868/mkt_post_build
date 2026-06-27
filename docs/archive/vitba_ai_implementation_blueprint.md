# Vitba.ai — Blueprint Kiến trúc & Kế hoạch Xây dựng Hệ thống

> Phiên bản: 1.0  
> Mục tiêu: chuyển “bản đồ kiến trúc” hiện có thành tài liệu triển khai đủ rõ để team backend, frontend, AI, DevOps và product cùng xây dựng hệ thống Vitba.ai một cách nhất quán, an toàn, dễ mở rộng và dễ vận hành.

---

## 0. Tóm tắt điều hành

Vitba.ai là nền tảng AI marketing có 4 nhóm năng lực chính:

1. **Generate content pipeline** bằng LangGraph: nhận yêu cầu từ chat hoặc form, route theo loại nội dung, tạo kế hoạch, nghiên cứu, SEO, brand context, fusion, copywriting, review và format.
2. **Lab Agents**: 22+ công cụ độc lập cho phân tích thương hiệu, thuyết phục, chiến lược, sản xuất nội dung, cạnh tranh, SEO và kênh Việt Nam.
3. **MCP Hub Tools**: các công cụ REST không phải AI để gửi email, đăng Meta, tạo landing page, phân tích SEO HTML, GA4, UTM, ROI, calendar, scheduler và deploy.
4. **Orchestration & memory**: lịch xuất bản, email scheduler, cross-post orchestrator, job state machine, audit log, Langfuse tracing, Qdrant RAG và PostgreSQL làm nguồn dữ liệu chính.

Tài liệu này chuẩn hóa các quyết định quan trọng:

- Routing deterministic, không để agent tự spawn agent khác ngoài Report agent 2-stage ReAct.
- Stateless REST + JWT; graph state chỉ tồn tại trong lúc generate.
- PostgreSQL là source of truth cho job, history, calendar, email, audit, feedback.
- Qdrant dùng cho RAG theo `project_id` và `conversation_id`.
- Plan/limits được enforce cả backend lẫn frontend.
- Explicit user feedback cần được bổ sung vì hiện là điểm yếu kiến trúc lớn nhất.

---

## 1. Nguyên tắc thiết kế

### 1.1. Nguyên tắc kỹ thuật

- **Deterministic trước, agentic sau**: các bước chính nên được điều phối bằng graph/node rõ ràng. Chỉ dùng ReAct khi cần search/tool reasoning thật sự.
- **Source of truth rõ ràng**: PostgreSQL quản lý trạng thái nghiệp vụ; Qdrant chỉ phục vụ retrieval; Zustand chỉ lưu UI/local state.
- **Plan-aware by default**: mọi endpoint AI, mutation quan trọng và scheduler action đều phải kiểm tra quota/gói.
- **Observable by default**: mọi AI endpoint có Langfuse trace; mọi mutation có AuditLog.
- **Failure-safe**: job có state machine, retry có giới hạn, error phải surfacing được ra UI.
- **No hidden retraining**: dữ liệu user feedback chỉ lưu và phân tích; không tự động fine-tune nếu chưa có pipeline kiểm duyệt riêng.
- **Privacy by design**: mọi retrieval phải filter theo user/project/conversation; không truy xuất chéo tenant.

### 1.2. Nguyên tắc sản phẩm

- User luôn biết hệ thống đang làm gì: job progress, current step, lỗi rõ ràng.
- Output phải có format có thể dùng ngay: Markdown, HTML, JSON, landing deploy URL, calendar item, email draft/post.
- Gói Free có thể tạo được nhưng bị giới hạn chất lượng/retention; Pro/Max có reviewer, lịch sử lâu hơn và quota cao hơn.
- Admin nhìn được chất lượng, lỗi, usage, nhưng không thay thế feedback thật từ user.

---

## 2. Kiến trúc tổng thể

```mermaid
flowchart TD
  U[User] --> FE[Frontend]
  FE --> API[Backend REST API]

  API --> Auth[JWT Auth + Plan Limits]
  API --> Chat[Chat Service]
  API --> Generate[Generate Service]
  API --> Lab[Lab Tools Service]
  API --> MCP[MCP Hub REST Tools]

  Chat --> Guard[Safety Guard]
  Guard --> LLM[LLM Stream]
  LLM --> GenerateTrigger[generate block detector]
  GenerateTrigger --> Generate

  Generate --> Jobs[(GenerationJob/PostgreSQL)]
  Generate --> Graph[LangGraph Pipeline]
  Graph --> Qdrant[(Qdrant RAG)]
  Graph --> PG[(PostgreSQL)]
  Graph --> Provider[LLM Provider]

  Lab --> Provider
  Lab --> Tavily[Tavily Tools]
  Lab --> LabHistory[(LabHistory)]

  MCP --> Resend[Resend API]
  MCP --> Meta[Facebook Graph API]
  MCP --> Vercel[Vercel]
  MCP --> GA4[GA4]
  MCP --> Calendar[(ContentItem)]

  Scheduler[Scheduler Loop 60s] --> EmailScheduler[ScheduledEmail Processor]
  Scheduler --> CalendarPublisher[Content Calendar Publisher]
  CalendarPublisher --> Orchestrator[Cross-post Orchestrator]
  Orchestrator --> Meta
  Orchestrator --> Resend

  API --> Audit[(AuditLog)]
  API --> Langfuse[Langfuse Tracing]
  API --> Feedback[(Feedback)]
```

---

## 3. Module backend đề xuất

```text
backend/
  app/
    main.py
    core/
      config.py
      security.py
      logging.py
      errors.py
      rate_limit.py
      plan_limits.py
      tracing.py
    db/
      session.py
      base.py
      migrations/
    models/
      user.py
      project.py
      conversation.py
      message.py
      generation_job.py
      content_history.py
      lab_history.py
      brand_profile.py
      user_template.py
      rag_document.py
      scheduled_email.py
      content_item.py
      audit_log.py
      feedback.py
      integration_account.py
    schemas/
      chat.py
      generate.py
      lab.py
      mcp.py
      feedback.py
      admin.py
    services/
      auth_service.py
      chat_service.py
      generate_service.py
      lab_service.py
      rag_service.py
      brand_service.py
      quota_service.py
      audit_service.py
      feedback_service.py
      scheduler_service.py
      orchestrator_service.py
    ai/
      providers/
        base.py
        openai_provider.py
        anthropic_provider.py
      prompts/
        chat_system.md
        planner.md
        research.md
        seo.md
        fusion.md
        copywriter.md
        reviewer.md
        formatter.md
      structured.py
      json_extract.py
      guard.py
    graph/
      state.py
      router.py
      nodes/
        landing_page_coder.py
        marketing_planner_rag.py
        planner.py
        research.py
        seo.py
        brand.py
        fusion.py
        copywriter.py
        reviewer.py
        formatter.py
      pipeline.py
    lab_agents/
      registry.py
      base.py
      brand_safety.py
      persuasion.py
      strategy.py
      production.py
      competitive.py
      vietnam.py
      seo_analysis.py
      report_agent.py
    mcp/
      email.py
      meta.py
      landing.py
      seo.py
      analytics.py
      calendar.py
      deploy.py
      orchestrator.py
    api/
      routes/
        auth.py
        chat.py
        generate.py
        lab.py
        mcp_email.py
        mcp_meta.py
        mcp_landing.py
        mcp_calendar.py
        analytics.py
        feedback.py
        admin.py
    workers/
      scheduler.py
      job_runner.py
      cleanup.py
```

---

## 4. Biến môi trường bắt buộc

```env
# App
APP_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:8000
SECRET_KEY=change_me
JWT_EXPIRE_MINUTES=10080

# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/vitba
REDIS_URL=redis://localhost:6379/0

# Vector DB
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=vitba_rag

# AI Providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DEFAULT_FAST_MODEL=
DEFAULT_SMART_MODEL=
EMBEDDING_MODEL=bge-m3

# Search / tools
TAVILY_API_KEY=

# Email
RESEND_API_KEY=
EMAIL_FROM=noreply@vitba.ai

# Meta
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=

# Analytics
GA4_CLIENT_EMAIL=
GA4_PRIVATE_KEY=

# Deploy
VERCEL_TOKEN=
GITHUB_TOKEN=
CLOUDFLARE_API_TOKEN=

# Observability
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=
SENTRY_DSN=
```

---

## 5. Data model nền tảng

### 5.1. `GenerationJob`

```python
class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    id = Column(UUID, primary_key=True)
    user_id = Column(UUID, ForeignKey("users.id"), index=True, nullable=False)
    project_id = Column(UUID, ForeignKey("projects.id"), index=True, nullable=True)
    conversation_id = Column(UUID, ForeignKey("conversations.id"), index=True, nullable=True)

    content_type = Column(String, index=True, nullable=False)
    input_data = Column(JSONB, nullable=False)
    result_json = Column(JSONB, nullable=True)

    status = Column(String, index=True, nullable=False, default="queued")
    current_step = Column(String, nullable=True)
    progress = Column(Integer, nullable=False, default=0)
    error_message = Column(Text, nullable=True)

    plan_snapshot = Column(JSONB, nullable=False, default=dict)
    trace_id = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
```

State machine:

```text
queued → running → success
queued → running → error
queued → cancelled
running → cancelled
```

Không cho update ngược trạng thái, ví dụ `success → running`.

### 5.2. `ContentHistory`

```python
class ContentHistory(Base):
    __tablename__ = "content_history"

    id = Column(UUID, primary_key=True)
    user_id = Column(UUID, ForeignKey("users.id"), index=True, nullable=False)
    project_id = Column(UUID, ForeignKey("projects.id"), index=True, nullable=True)
    generation_job_id = Column(UUID, ForeignKey("generation_jobs.id"), nullable=True)

    content_type = Column(String, index=True, nullable=False)
    input_data = Column(JSONB, nullable=False)
    output = Column(JSONB, nullable=False)
    score = Column(Integer, nullable=True)
    model_info = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
```

Retention theo plan:

```text
free: 7 ngày
pro: 90 ngày
max: không hết hạn
```

### 5.3. `LabHistory`

```python
class LabHistory(Base):
    __tablename__ = "lab_history"

    id = Column(UUID, primary_key=True)
    user_id = Column(UUID, ForeignKey("users.id"), index=True, nullable=False)
    project_id = Column(UUID, ForeignKey("projects.id"), index=True, nullable=True)
    tool_name = Column(String, index=True, nullable=False)
    input_data = Column(JSONB, nullable=False)
    output_data = Column(JSONB, nullable=False)
    trace_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### 5.4. `Feedback` — cần bổ sung

```python
class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(UUID, primary_key=True)
    user_id = Column(UUID, ForeignKey("users.id"), index=True, nullable=False)
    project_id = Column(UUID, ForeignKey("projects.id"), index=True, nullable=True)

    target_type = Column(String, index=True, nullable=False)
    target_id = Column(UUID, index=True, nullable=False)

    rating = Column(String, nullable=False)  # up, down, neutral
    reason = Column(Text, nullable=True)
    correction = Column(Text, nullable=True)
    tags = Column(ARRAY(String), nullable=False, default=list)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

`target_type` nên hỗ trợ:

```text
generation_job
content_history
lab_history
chat_message
landing_page
email_campaign
meta_post
```

### 5.5. `AuditLog`

```python
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID, primary_key=True)
    user_id = Column(UUID, ForeignKey("users.id"), index=True, nullable=True)
    project_id = Column(UUID, ForeignKey("projects.id"), index=True, nullable=True)
    action = Column(String, index=True, nullable=False)
    entity_type = Column(String, index=True, nullable=True)
    entity_id = Column(String, index=True, nullable=True)
    metadata = Column(JSONB, nullable=False, default=dict)
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

Ví dụ action:

```text
chat.send
generate.start
generate.success
generate.error
lab.shield.run
lab.report.run
email.send
email.schedule
meta.post
landing.deploy
calendar.publish
feedback.create
```

---

## 6. LangGraph pipeline

### 6.1. Graph state

```python
from typing import TypedDict, Optional, Any, Annotated
import operator

class GraphState(TypedDict, total=False):
    user_id: str
    project_id: Optional[str]
    conversation_id: Optional[str]
    job_id: str
    plan: dict

    content_type: str
    input_data: dict
    chat_history: list[dict]
    rag_chunks: list[dict]
    brand_profile: Optional[dict]
    custom_template: Optional[dict]

    route: str
    plan_output: Optional[dict]
    research_output: Optional[dict]
    seo_output: Optional[dict]
    brand_output: Optional[dict]
    fusion_output: Optional[dict]
    copy_output: Optional[dict]
    review_output: Optional[dict]
    formatted_output: Optional[dict]

    current_step: str
    usage: dict
    errors: Annotated[list[dict], operator.add]
```

### 6.2. Routing

```text
START → route_by_content_type
  ├─ landing_page → landing_page_coder → END
  ├─ marketing_plan → marketing_planner_rag → END
  └─ default → planner → research + seo + brand → fusion → copywriter → reviewer? → formatter → END
```

Quy tắc:

- `landing_page`: ưu tiên tốc độ, raw HTML, không structured output.
- `marketing_plan`: ưu tiên raw JSON từ RAG planner.
- `default`: dùng pipeline nhiều node.
- `reviewer`: chỉ chạy khi plan thuộc `pro` hoặc `max`.
- `brand`: không gọi LLM; chỉ lấy dữ liệu brand/RAG.

### 6.3. Node contract

Mỗi node cần tuân thủ contract:

```python
async def node_name(state: GraphState) -> dict:
    """
    Input: GraphState hiện tại.
    Output: partial state update.
    Không mutate state trực tiếp.
    Không ghi DB trừ khi node được thiết kế làm persistence boundary.
    Mọi lỗi phải raise AppError hoặc trả về errors có cấu trúc.
    """
```

Chuẩn error:

```json
{
  "node": "copywriter",
  "code": "LLM_TIMEOUT",
  "message": "LLM provider timeout",
  "recoverable": true
}
```

### 6.4. Structured generation wrapper

```python
async def generate_structured(
    model_tier: Literal["fast", "smart"],
    system_prompt: str,
    user_payload: dict,
    schema: type[BaseModel],
    trace_metadata: dict,
) -> BaseModel:
    """
    1. Gọi model với structured output.
    2. Nếu parse fail: retry 1 lần bằng raw ainvoke.
    3. Extract JSON từ raw text.
    4. Validate bằng Pydantic schema.
    5. Nếu vẫn fail: raise StructuredOutputError.
    """
```

Pseudo-code:

```python
try:
    return await provider.generate_structured(...)
except Exception as first_error:
    raw = await provider.ainvoke(...)
    json_obj = extract_json(raw.text)
    return schema.model_validate(json_obj)
```

---

## 7. Prompt & output schemas

### 7.1. Planner output

```json
{
  "objective": "string",
  "audience": "string",
  "content_angle": "string",
  "channels": ["facebook", "email", "landing"],
  "required_research": ["competitors", "keywords", "pain_points"],
  "success_criteria": ["clear CTA", "brand voice", "SEO alignment"]
}
```

### 7.2. Research output

```json
{
  "insights": [
    {
      "title": "string",
      "detail": "string",
      "confidence": 0.8,
      "source": "rag|tavily|user_input"
    }
  ],
  "risks": ["string"],
  "open_questions": ["string"]
}
```

### 7.3. SEO output

```json
{
  "primary_keyword": "string",
  "secondary_keywords": ["string"],
  "search_intent": "informational|commercial|transactional|navigational",
  "title_suggestions": ["string"],
  "meta_description": "string",
  "content_brief": ["string"]
}
```

### 7.4. Fusion output

```json
{
  "creative_brief": "string",
  "message_hierarchy": ["hook", "problem", "solution", "proof", "cta"],
  "must_include": ["string"],
  "avoid": ["string"],
  "channel_adaptations": {
    "facebook": "string",
    "email": "string",
    "landing": "string"
  }
}
```

### 7.5. Copywriter output

```json
{
  "headline": "string",
  "subheadline": "string",
  "body": "string",
  "cta": "string",
  "variants": [
    {
      "name": "A",
      "headline": "string",
      "body": "string"
    }
  ]
}
```

### 7.6. Reviewer output

```json
{
  "score": 86,
  "strengths": ["string"],
  "weaknesses": ["string"],
  "improvements": ["string"],
  "policy_flags": [],
  "final_recommendation": "approve|revise|reject"
}
```

### 7.7. Formatter output

```json
{
  "format": "markdown|html|json|email|social_post",
  "content": "string",
  "blocks": [
    {
      "type": "headline|paragraph|cta|image_prompt",
      "content": "string"
    }
  ],
  "metadata": {
    "score": 86,
    "model_tier": "fast|smart",
    "template_id": "uuid|null"
  }
}
```

---

## 8. Chat → generate pipeline

### 8.1. Luồng chuẩn

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant API as Backend
  participant Guard as Guard
  participant LLM as Chat LLM
  participant Gen as Generate API
  participant Graph as LangGraph
  participant DB as PostgreSQL

  U->>FE: nhập chat
  FE->>API: POST /chat/send
  API->>Guard: safety check
  Guard-->>API: pass/reject
  API->>LLM: stream response
  LLM-->>FE: text stream
  LLM-->>FE: ```generate {...}```
  FE->>Gen: POST /generate
  Gen->>DB: create GenerationJob queued
  Gen->>Graph: background task
  FE->>Gen: GET /generate/{job_id} polling
  Graph->>DB: update current_step/progress
  Graph->>DB: result_json + success/error
  Gen-->>FE: final result
```

### 8.2. Generate block format

```md
```generate
{
  "content_type": "facebook_post",
  "input_data": {
    "topic": "...",
    "audience": "...",
    "tone": "..."
  }
}
```
```

Validation bắt buộc:

- `content_type` thuộc registry hợp lệ.
- `input_data` không vượt size limit.
- User còn quota cho feature tương ứng.
- Project/conversation thuộc về user.

---

## 9. API contract

### 9.1. Chat

```http
POST /chat/send
Authorization: Bearer <jwt>
Content-Type: application/json
```

Request:

```json
{
  "conversation_id": "uuid|null",
  "project_id": "uuid|null",
  "message": "Viết kế hoạch marketing cho sản phẩm X",
  "stream": true
}
```

Response:

```text
text/event-stream
```

Event types:

```text
message.delta
message.done
guard.reject
generate.detected
error
```

### 9.2. Generate

```http
POST /generate
```

Request:

```json
{
  "project_id": "uuid|null",
  "conversation_id": "uuid|null",
  "content_type": "facebook_post",
  "input_data": {}
}
```

Response:

```json
{
  "job_id": "uuid",
  "status": "queued"
}
```

```http
GET /generate/{job_id}
```

Response:

```json
{
  "job_id": "uuid",
  "status": "running|success|error|cancelled",
  "current_step": "copywriter",
  "progress": 70,
  "result_json": null,
  "error_message": null
}
```

### 9.3. Lab tools

```http
POST /lab/{tool_name}/run
```

Request:

```json
{
  "project_id": "uuid|null",
  "input_data": {}
}
```

Response:

```json
{
  "history_id": "uuid",
  "tool_name": "shield",
  "output_data": {},
  "trace_id": "string"
}
```

### 9.4. Feedback

```http
POST /feedback
```

Request:

```json
{
  "target_type": "generation_job",
  "target_id": "uuid",
  "rating": "up|down|neutral",
  "reason": "Nội dung chưa đúng giọng thương hiệu",
  "correction": "Hãy viết gần gũi hơn và ngắn hơn",
  "tags": ["brand_voice", "too_long"]
}
```

Response:

```json
{
  "feedback_id": "uuid",
  "status": "created"
}
```

---

## 10. Lab Agents

### 10.1. Registry

```python
LAB_TOOLS = {
    "shield": {
        "group": "brand_safety",
        "model_tier": "smart",
        "schema": ShieldOutput,
        "quota_key": "lab.shield",
    },
    "seo_analysis": {
        "group": "seo",
        "model_tier": "smart",
        "mode": "raw_markdown",
        "max_tokens": 8192,
        "quota_key": "lab.seo_analysis",
    },
    "report": {
        "group": "production",
        "mode": "react_2_stage",
        "quota_key": "lab.report",
    },
}
```

### 10.2. Tool groups

| Nhóm | Tools | Cách chạy |
|---|---|---|
| An toàn thương hiệu | Shield, HexBreaker, BlindSpot | `generate_structured("smart")` |
| Thuyết phục | Psycho, Persona, Reverse, Hook | `generate_structured("smart")` |
| Chiến lược | DNA, Simulator, TrendJack, Evergreen, ABTest | `generate_structured("smart")` |
| Sản xuất | Cinematic, AudioHook, Repurposer | `generate_structured("smart")` |
| Sản xuất | Report | 2-stage ReAct |
| Cạnh tranh | CompetitorSpy, Influencer, Hashtag | `generate_structured("smart")` |
| Việt Nam | Dialect Adapter, Zalo OA Publish | `generate_structured("smart")` |
| SEO | SEO Analysis | raw `ainvoke`, markdown report, 8192 tokens |

### 10.3. Report agent 2-stage ReAct

```text
User input
  → Researcher agent dùng Tavily search/extract/crawl/map/research
  → research notes có citation/source
  → Writer agent không tool
  → final report markdown
```

Guardrails:

- Researcher không viết report cuối.
- Writer không gọi tool, chỉ dùng research notes.
- Tối đa số vòng tool call, ví dụ 6-8 calls.
- Lưu full input/output vào `LabHistory`.

---

## 11. MCP Hub Tools

### 11.1. Email module

Chức năng:

- Gửi email bằng Resend.
- Lên lịch email.
- Quản lý CRM contacts/lists/templates.
- Ghi AuditLog cho mọi mutation.

Core endpoints:

```http
POST /mcp/email/send
POST /mcp/email/schedule
GET  /mcp/email/scheduled
POST /mcp/email/templates
POST /mcp/email/contacts
POST /mcp/email/lists
```

`ScheduledEmail` state:

```text
pending → sent
pending → failed
pending → cancelled
```

### 11.2. Meta module

Chức năng:

- OAuth Facebook/Meta.
- Lưu integration token an toàn.
- Đăng bài lên page.
- Đọc comments, insights.

Cần mã hóa token:

```text
access_token_encrypted
refresh_token_encrypted / long_lived_token_encrypted
expires_at
scopes
page_id
```

### 11.3. Landing module

Chức năng:

- Template engine.
- AI generate landing HTML.
- Deploy Vercel/GitHub/Cloudflare.
- Lưu deploy URL và version.

Nên tách:

```text
LandingProject
LandingVersion
LandingDeployment
```

### 11.4. SEO module

Chức năng:

- HTML analyzer bằng BeautifulSoup.
- Không dùng LLM.
- Trả điểm kỹ thuật: title, meta description, h1/h2, alt, canonical, schema, internal links, performance hints.

### 11.5. Analytics module

Chức năng:

- GA4 connector.
- UTM builder.
- ROI/ROAS/CAC/LTV calculator.
- AI commentary chỉ là lớp giải thích, không thay thế số liệu gốc.

### 11.6. Calendar module

Chức năng:

- CRUD content calendar.
- Auto-publish scheduler.
- Tags điều phối kênh publish.

Cần fix điểm yếu hiện tại:

Thay vì parse tag thô kiểu `"meta:123,email"`, nên có structured field:

```json
{
  "publish_targets": [
    {
      "type": "meta",
      "page_id": "123"
    },
    {
      "type": "email",
      "list_id": "uuid"
    }
  ]
}
```

---

## 12. Scheduler & orchestration

### 12.1. Scheduler loop

```python
async def scheduler_loop():
    while True:
        await process_due_scheduled_emails()
        await process_due_calendar_items()
        await asyncio.sleep(60)
```

Production note:

- Nếu chạy nhiều instance, phải có distributed lock.
- Nên dùng Redis lock hoặc PostgreSQL advisory lock.
- Query job due bằng `FOR UPDATE SKIP LOCKED` để tránh double-send.

### 12.2. Scheduled email processor

```sql
SELECT * FROM scheduled_emails
WHERE status = 'pending'
  AND scheduled_at <= now()
ORDER BY scheduled_at ASC
LIMIT 100
FOR UPDATE SKIP LOCKED;
```

### 12.3. Calendar publisher

```sql
SELECT * FROM content_items
WHERE status = 'approved'
  AND scheduled_date <= now()
ORDER BY scheduled_date ASC
LIMIT 100
FOR UPDATE SKIP LOCKED;
```

### 12.4. Cross-post orchestrator

```python
async def cross_post(content, targets):
    results = []

    for target in targets:
        if target.type == "meta":
            result = await meta.create_post(
                page_id=target.page_id,
                content=content,
            )
        elif target.type == "email":
            result = await email.send_email(
                list_id=target.list_id,
                subject=content.subject,
                html=content.html,
            )
        else:
            result = {"status": "skipped", "reason": "unknown target"}

        results.append({"target": target, "result": result})

    return results
```

Cần đảm bảo:

- Idempotency key cho mỗi target.
- Partial failure được lưu rõ.
- Một kênh fail không làm mất kết quả kênh khác.
- ContentItem chỉ `published` khi policy publish đạt điều kiện.

Gợi ý policy:

```text
all_success: tất cả target thành công mới published
partial_success: có ít nhất 1 target thành công thì published_with_warnings
manual_review: nếu target quan trọng fail thì chuyển review
```

---

## 13. RAG & memory

### 13.1. Qdrant collection

Vector fields:

```text
dense: bge-m3, 1024 dim
sparse: BM25-compatible sparse vector
```

Payload bắt buộc:

```json
{
  "user_id": "uuid",
  "project_id": "uuid|null",
  "conversation_id": "uuid|null",
  "document_id": "uuid",
  "chunk_id": "uuid",
  "source_type": "upload|chat|brand|url|manual",
  "title": "string",
  "text": "string",
  "created_at": "datetime"
}
```

### 13.2. Retrieval policy

Chat system prompt:

```text
Filter: user_id + optional project_id + optional conversation_id
TopK dense: 8
TopK sparse: 8
Merge: reciprocal rank fusion
Final topK: 6
```

Brand node:

```text
Filter: user_id + project_id + source_type in ['brand', 'upload', 'manual']
TopK: 8
Không gọi LLM trong brand node.
```

### 13.3. Chat history

Hiện tại: 12 tin nhắn gần nhất.

Khuyến nghị:

```text
Free: 12 messages
Pro: 20 messages
Max: dynamic token budget, tối đa 30 messages + summary memory
```

Dynamic token budget:

```python
MAX_CONTEXT_TOKENS = 24000
SYSTEM_BUDGET = 4000
RAG_BUDGET = 6000
CHAT_BUDGET = MAX_CONTEXT_TOKENS - SYSTEM_BUDGET - RAG_BUDGET
```

### 13.4. Session memory

Hiện tại không có session memory. Có thể bổ sung Redis session store:

```text
key: session:{user_id}:{conversation_id}
ttl: 24h
value:
  last_intent
  active_generation_job_id
  draft_context
  temporary_preferences
```

Không dùng Redis làm source of truth. Dữ liệu quan trọng vẫn phải ghi PostgreSQL.

---

## 14. Plan limits & quota

### 14.1. Plan matrix gợi ý

| Feature | Free | Pro | Max |
|---|---:|---:|---:|
| Chat messages/day | 30 | 300 | 2000 |
| Generate/day | 5 | 100 | 1000 |
| Lab runs/day | 3 | 50 | 500 |
| Reviewer node | Không | Có | Có |
| Content history retention | 7 ngày | 90 ngày | Vĩnh viễn |
| RAG storage | 50MB | 2GB | 20GB |
| Scheduled posts | 3 | 100 | 2000 |
| Team members | 1 | 5 | 50 |

### 14.2. Enforce quota

Mọi endpoint cần gọi:

```python
await quota_service.check_and_consume(
    user_id=user.id,
    feature="generate.facebook_post",
    amount=1,
    idempotency_key=request_id,
)
```

Nếu hết quota:

```json
{
  "error": {
    "code": "PLAN_LIMIT_EXCEEDED",
    "message": "Bạn đã dùng hết quota generate hôm nay.",
    "upgrade_hint": "Nâng cấp Pro để có 100 lượt/ngày."
  }
}
```

---

## 15. Safety guard

### 15.1. Guard placement

```text
Chat input → Guard → stream LLM
Generate input → Guard → LangGraph
Lab input → Guard → Lab tool
MCP mutation → Policy validation → API call
```

### 15.2. Guard output

```json
{
  "allowed": false,
  "category": "unsafe_content",
  "reason": "Yêu cầu không phù hợp với chính sách an toàn.",
  "safe_alternative": "Tôi có thể giúp viết phiên bản trung lập, không kích động."
}
```

### 15.3. Logging

- Ghi `AuditLog` action `guard.reject`.
- Không lưu nội dung nhạy cảm quá mức nếu không cần.
- UI stream reason rõ cho user.

---

## 16. Observability

### 16.1. Langfuse tracing

Mọi AI endpoint cần wrapper:

```python
async with trace_request(
    name="generate.pipeline",
    user_id=str(user.id),
    session_id=str(conversation_id),
    metadata={
        "content_type": content_type,
        "project_id": project_id,
        "plan": plan.name,
        "job_id": job_id,
    },
):
    result = await graph.ainvoke(state)
```

Trace cần có:

```text
input metadata
model name
model tier
latency
token usage
node name
error stack sanitized
result summary
```

### 16.2. Admin analytics

Dashboard `/admin/analytics` nên có:

- User growth theo ngày.
- Content generated theo ngày.
- Job success/error rate.
- Avg generation latency theo content type.
- Avg reviewer score.
- Top 20 audit actions trong 7 ngày.
- Top users theo usage.
- Lab tool usage.
- Feedback up/down ratio.
- Common feedback tags.
- Error feed gần nhất.

### 16.3. Metrics nên theo dõi

```text
ai_request_count
ai_error_rate
ai_latency_p50/p95/p99
generation_success_rate
generation_step_failure_rate
scheduler_processed_count
scheduler_failure_count
email_send_success_rate
meta_post_success_rate
quota_rejection_count
feedback_negative_rate
```

---

## 17. Frontend architecture

### 17.1. Module đề xuất

```text
frontend/
  app/
    chat/
    generate/
    lab/
    calendar/
    landing/
    email/
    meta/
    analytics/
    admin/
  components/
    chat/
    generate/
    lab/
    calendar/
    feedback/
    common/
  lib/
    api.ts
    auth.ts
    sse.ts
    polling.ts
    validators.ts
  stores/
    authStore.ts
    projectStore.ts
    layoutStore.ts
  hooks/
    useGenerateJob.ts
    useChatStream.ts
    useQuota.ts
```

### 17.2. Zustand localStorage

Chỉ lưu:

```text
auth token
active project
UI layout
sidebar width/collapsed
```

Không lưu source of truth:

```text
messages
jobs
content history
lab history
```

Những dữ liệu này phải refetch từ DB qua API.

### 17.3. Polling generate job

```ts
async function pollJob(jobId: string) {
  while (true) {
    await sleepUntilVisible(800)
    const job = await api.getGenerateJob(jobId)

    updateUI(job)

    if (["success", "error", "cancelled"].includes(job.status)) {
      return job
    }
  }
}
```

### 17.4. Feedback UI cần bổ sung

Mỗi output card nên có:

```text
👍 Hữu ích
👎 Chưa tốt
Text box: “Bạn muốn sửa gì?”
Tag nhanh: sai giọng thương hiệu, quá dài, thiếu CTA, sai thông tin, format lỗi
```

Gửi về:

```http
POST /feedback
```

---

## 18. Error handling

### 18.1. Error format chuẩn

```json
{
  "error": {
    "code": "AI_PROVIDER_OVERLOADED",
    "message": "AI đang quá tải. Vui lòng thử lại sau.",
    "details": {},
    "request_id": "uuid"
  }
}
```

### 18.2. Mapping lỗi UI

| Backend code | UI message |
|---|---|
| `PLAN_LIMIT_EXCEEDED` | Hết quota, hiển thị upgrade CTA |
| `GUARD_REJECTED` | Stream lý do từ guard |
| `AI_PROVIDER_OVERLOADED` | “AI quá tải” |
| `STRUCTURED_OUTPUT_FAILED` | “Không tạo được định dạng hợp lệ” |
| `INTEGRATION_TOKEN_EXPIRED` | Yêu cầu kết nối lại tài khoản |
| `SCHEDULER_SEND_FAILED` | Hiển thị trong calendar/email status |
| `JOB_NOT_FOUND` | Job không tồn tại hoặc không thuộc tài khoản |

### 18.3. Retry policy

```text
LLM structured fail: 1 retry raw + JSON extract
LLM provider timeout: 1 retry nếu idempotent
Resend send email: 2 retries exponential backoff
Meta post: 2 retries nếu lỗi transient
Deploy: 1 retry
Scheduler loop: không crash toàn loop vì một item lỗi
```

---

## 19. Security checklist

### 19.1. Auth & authorization

- Mọi endpoint cần JWT.
- Mọi query có `user_id`/tenant scope.
- Project access check bắt buộc.
- Admin routes cần role admin.

### 19.2. Secrets & tokens

- Không lưu OAuth token plaintext.
- Dùng KMS hoặc encryption key riêng.
- Không log token/API key.
- Không đưa env secret vào Langfuse metadata.

### 19.3. RAG privacy

- Qdrant payload bắt buộc có `user_id`.
- Search filter luôn có `user_id`.
- Không search toàn collection nếu thiếu filter.
- Kiểm thử chống leakage cross-user.

### 19.4. MCP mutation safety

- Email send cần validate recipient/list ownership.
- Meta post cần validate page ownership.
- Landing deploy cần validate project ownership.
- Calendar publish cần idempotency key.

---

## 20. Testing strategy

### 20.1. Unit tests

```text
quota_service
plan_limits
json_extract
generate_structured fallback
route_by_content_type
formatter template selection
rag filter builder
feedback creation
audit logging
```

### 20.2. Integration tests

```text
POST /generate → job queued → graph success → history saved
POST /lab/shield/run → LabHistory saved
ScheduledEmail due → Resend mocked → status sent
ContentItem approved due → cross_post mocked → published
Feedback submit → admin analytics updated
RAG search không trả chunk user khác
```

### 20.3. E2E tests

```text
User chat emits generate block → frontend creates job → polling result displayed
Free user generate hết quota → 429 + upgrade message
Pro user có reviewer score
Meta token expired → UI reconnect prompt
Calendar scheduled post publishes đúng kênh
```

### 20.4. Load tests

Mục tiêu ban đầu:

```text
100 concurrent chat streams
50 concurrent generation jobs
scheduler xử lý 1000 due items trong batch
p95 generate default < 45s
p95 landing_page < 20s
p95 lab simple < 30s
```

---

## 21. Migration plan

### Phase 1 — Stabilize core

- Chuẩn hóa `GenerationJob` state machine.
- Bọc tất cả AI endpoint bằng Langfuse trace.
- Chuẩn hóa `generate_structured` retry.
- Thêm `AuditLog` cho mọi mutation còn thiếu.
- Kiểm tra RAG filter bắt buộc `user_id`.

### Phase 2 — Feedback & quality loop

- Thêm `Feedback` model.
- Thêm feedback UI trên output cards.
- Admin analytics có feedback ratio/tag.
- Kết hợp reviewer score + user feedback để phân tích prompt.
- Không fine-tune tự động.

### Phase 3 — Scheduler hardening

- Thêm distributed lock.
- Dùng `FOR UPDATE SKIP LOCKED`.
- Thêm idempotency key cho email/meta/calendar publish.
- Đổi tag parser thô sang `publish_targets` structured field.

### Phase 4 — Context upgrade

- Tăng chat history theo plan.
- Thêm conversation summary memory.
- Thêm Redis session memory TTL 24h.
- Tối ưu RAG hybrid retrieval.

### Phase 5 — Agent chaining có kiểm soát

- Giữ deterministic pipeline mặc định.
- Cho phép workflow templates: ví dụ `CompetitorSpy → Persona → Hook → ABTest`.
- Không để agent tự spawn tự do.
- Mọi chain phải có quota, trace, audit, timeout.

---

## 22. Definition of Done

Một tính năng được coi là xong khi có đủ:

```text
Backend API contract rõ
Authorization check
Plan/quota check
AuditLog mutation
Langfuse trace nếu có AI
Unit test
Integration test nếu có DB/external API
UI loading/error/success state
Error message thân thiện
Không leak dữ liệu cross-user/project
Documentation cập nhật
```

Riêng AI node cần thêm:

```text
Prompt versioned
Input schema
Output schema
Fallback parse
Token/latency logging
Evaluator hoặc reviewer nếu thuộc Pro/Max path
```

---

## 23. Checklist triển khai nhanh

### Backend

- [ ] Tạo/kiểm tra models: `GenerationJob`, `ContentHistory`, `LabHistory`, `AuditLog`, `Feedback`, `ContentItem`, `ScheduledEmail`.
- [ ] Chuẩn hóa route `/chat/send`, `/generate`, `/generate/{job_id}`, `/lab/{tool}/run`.
- [ ] Implement `quota_service.check_and_consume()`.
- [ ] Implement `trace_request()` wrapper.
- [ ] Implement `generate_structured()` fallback.
- [ ] Implement LangGraph pipeline theo routing đã định.
- [ ] Implement Lab registry.
- [ ] Implement MCP email/meta/calendar/deploy modules.
- [ ] Implement scheduler với lock/idempotency.
- [ ] Implement feedback endpoint.

### Frontend

- [ ] Chat stream UI.
- [ ] Generate block detector.
- [ ] Job polling với `sleepUntilVisible`.
- [ ] Output renderer theo markdown/html/json.
- [ ] Lab tools UI theo registry.
- [ ] Calendar CRUD + publish target editor.
- [ ] Email/Meta integration UI.
- [ ] Feedback buttons + correction textbox.
- [ ] Quota usage display.
- [ ] Admin analytics dashboard.

### DevOps

- [ ] PostgreSQL migration pipeline.
- [ ] Qdrant collection init.
- [ ] Redis lock/session config.
- [ ] Secret management.
- [ ] CI unit/integration tests.
- [ ] Staging environment.
- [ ] Monitoring + Sentry/Langfuse.
- [ ] Backup PostgreSQL.
- [ ] Data retention cleanup job.

---

## 24. Các quyết định cần chốt

| Quyết định | Khuyến nghị |
|---|---|
| Có dùng Redis không? | Có, cho distributed lock + session TTL, không làm source of truth |
| Có tăng chat history không? | Có, theo plan và token budget |
| Feedback lưu ở đâu? | PostgreSQL `Feedback` table |
| Có tự fine-tune từ feedback không? | Không ở giai đoạn đầu |
| Agent có được tự spawn agent khác không? | Không; chỉ workflow template có kiểm soát |
| Calendar publish targets lưu thế nào? | JSONB structured field, không parse tag bằng comma |
| Reviewer cho Free? | Không bắt buộc; có thể dùng lightweight heuristic score nếu cần quality signal |
| Landing raw HTML có reviewer không? | Không mặc định; có thể thêm HTML validator/sanitizer |

---

## 25. Rủi ro và biện pháp giảm thiểu

| Rủi ro | Tác động | Giảm thiểu |
|---|---|---|
| LLM trả JSON lỗi | Job fail, UX kém | structured output + 1 retry raw + JSON extract + schema validate |
| Scheduler double-send | Gửi trùng email/post | distributed lock + `FOR UPDATE SKIP LOCKED` + idempotency key |
| RAG leak dữ liệu | Rủi ro bảo mật cao | bắt buộc filter user_id/project_id + test cross-tenant |
| Token Meta hết hạn | Publish fail | token refresh/reconnect flow + UI cảnh báo |
| Không có user feedback | Không biết chất lượng thật | thêm Feedback model/UI/admin analytics |
| Job polling quá dày | Tải backend | `sleepUntilVisible`, backoff khi hidden, SSE/WebSocket ở phase sau |
| Lab tools flat khó chain | Giới hạn workflow | workflow templates có kiểm soát |
| Prompt drift | Output không ổn định | version prompt + trace + eval set |

---

## 26. Roadmap khuyến nghị

### Sprint 1

- Chuẩn hóa DB model và migration.
- Hoàn thiện GenerationJob state machine.
- Hoàn thiện LangGraph default pipeline.
- Thêm tracing/audit/quota đầy đủ.

### Sprint 2

- Hoàn thiện Lab registry + 22 tools.
- Hoàn thiện Report 2-stage ReAct.
- Thêm feedback model/API/UI.
- Admin analytics thêm feedback và error feed.

### Sprint 3

- Hardening scheduler + cross-post orchestrator.
- Structured publish targets.
- Email/Meta integration ổn định.
- Idempotency và retry policy.

### Sprint 4

- RAG hybrid tuning.
- Conversation summary memory.
- Redis session memory.
- Workflow templates cho lab chains.

---

## 27. Ghi chú triển khai thực tế

- Đừng để frontend tự quyết logic quota; frontend chỉ hiển thị, backend mới enforce.
- Đừng ghi raw prompt chứa dữ liệu nhạy cảm vào log thường. Nếu cần debug, dùng trace có masking.
- Đừng để scheduler chạy tự do trên nhiều instance nếu chưa có lock.
- Đừng dùng Qdrant làm nơi lưu nội dung duy nhất; luôn có document/chunk metadata trong PostgreSQL.
- Đừng để Report Researcher tự viết final answer; phải tách Writer stage để kiểm soát format.
- Đừng nâng chat history cố định quá cao cho mọi user; dùng token budget để tránh context overflow.
- Đừng triển khai explicit feedback mà không có target_id rõ; nếu không sẽ không phân tích được chất lượng theo tool/job.

---

## 28. Kết luận

Kiến trúc hiện tại đã có nền tảng tốt: deterministic LangGraph pipeline, Lab tools rõ nhóm, MCP Hub tách khỏi AI, state machine cho job, PostgreSQL + Qdrant, scheduler và observability. Ba phần nên ưu tiên gia cố để hệ thống “đầy đủ và chắc chắn” là:

1. **Feedback thật từ user**: thêm model, UI, analytics và quy trình cải thiện prompt.
2. **Scheduler/orchestrator an toàn**: lock, idempotency, structured publish targets, partial failure handling.
3. **Context/memory có kiểm soát**: tăng chat history theo plan, thêm summary/session memory, đảm bảo RAG filter tuyệt đối.

Nếu hoàn thành các checklist trong tài liệu này, Vitba.ai sẽ có kiến trúc đủ chắc để vận hành production, mở rộng tính năng AI marketing, kiểm soát quota, quan sát chất lượng và giảm rủi ro khi tích hợp nhiều kênh publish.
