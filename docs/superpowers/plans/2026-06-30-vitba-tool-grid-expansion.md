# Vitba Tool Grid Redesign + 26 New Marketing Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Vitba Lab hub (`/hub/lab`, "Vitba Tool") from 24 to 50 tools by adding 26 new marketing tools (analysis, copywriting, ads, retention, branding) on one shared generic AI engine, and redesign the hub page into a uniform 5-column tile grid.

**Architecture:** One backend registry (`GENERIC_TOOLS`) maps tool IDs to a system prompt + input field spec; one agent function (`run_generic_tool_agent`) and one endpoint (`POST /api/lab/generic/{tool_id}`) serve all 26 tools. One Next.js dynamic route (`[toolId]/page.tsx`) renders a form + result view for all 26 tools, reusing the existing `useLabTool` hook and `lab-ui` components used by the original 24 tools. The existing 24 tools' dedicated pages/endpoints are untouched.

**Tech Stack:** FastAPI + Pydantic + LangChain (`generate_structured`) on the backend; Next.js 14 (App Router, client components) + Tailwind on the frontend.

## Global Constraints

- All user-facing text (labels, taglines, AI output) must be 100% Vietnamese, matching every other Vitba Lab tool — copied verbatim from spec.
- No per-tool bespoke backend logic/schemas for the 26 new tools — generic engine only, per user decision in spec.
- No changes to the existing 24 tools' pages, schemas, or endpoints.
- No new "fetch tool config from backend" endpoint — field definitions live in the frontend lib file only.
- Reuse existing shared components (`useLabTool`, `lab-ui.tsx`, `_run_tool`, `generate_structured`) rather than duplicating their logic.

---

## Task 1: Backend generic tool registry + agent

**Files:**
- Create: `backend/app/agents/lab_generic.py`
- Test: `backend/tests/test_lab_generic.py`

**Interfaces:**
- Consumes: `generate_structured(tier: str, system: str, user: str, schema: type[T]) -> T` from `app.agents.base`; `STRICT_RULES: str` from `app.agents.lab`.
- Produces: `GENERIC_TOOLS: dict[str, GenericToolSpec]` (26 entries), `class GenericToolResponse(BaseModel)` with fields `title: str`, `summary: str`, `content: str`, `key_points: list[str]`, `async def run_generic_tool_agent(tool_id: str, inputs: dict[str, str]) -> GenericToolResponse` — used by Task 2.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_lab_generic.py`:

```python
"""Tests for the generic Vitba Lab tool engine (26 new marketing tools)."""

from unittest.mock import patch, AsyncMock

import pytest

from app.agents.lab_generic import GENERIC_TOOLS, GenericToolResponse, run_generic_tool_agent

EXPECTED_IDS = {
    "market-sizing", "persona-builder", "campaign-analyzer", "sentiment-analysis",
    "swot-analyzer", "pricing-advisor", "landing-copy", "product-description",
    "email-sequence", "video-script", "press-release", "blog-writer",
    "ads-copy", "cta-optimizer", "funnel-copy", "cro-auditor", "promo-designer",
    "retention-planner", "loyalty-designer", "faq-handler", "testimonial-enhancer",
    "brand-naming", "tagline-generator", "positioning-builder", "content-calendar",
    "brand-voice-guideline",
}


def test_generic_tools_registry_has_26_entries():
    assert len(GENERIC_TOOLS) == 26


def test_generic_tools_registry_ids_match_expected():
    assert set(GENERIC_TOOLS.keys()) == EXPECTED_IDS


def test_generic_tools_each_have_name_prompt_and_fields():
    for tool_id, spec in GENERIC_TOOLS.items():
        assert spec.name, f"{tool_id} missing name"
        assert spec.system_prompt, f"{tool_id} missing system_prompt"
        assert 1 <= len(spec.fields) <= 3, f"{tool_id} field count out of range"
        for field in spec.fields:
            assert field.key
            assert field.label


async def test_run_generic_tool_agent_unknown_tool_raises():
    with pytest.raises(ValueError, match="Unknown generic tool"):
        await run_generic_tool_agent("does-not-exist", {})


@patch("app.agents.lab_generic.generate_structured", new_callable=AsyncMock)
async def test_run_generic_tool_agent_builds_user_message_from_fields(mock_gen):
    mock_gen.return_value = GenericToolResponse(
        title="t", summary="s", content="c", key_points=["a"]
    )
    await run_generic_tool_agent(
        "market-sizing", {"product": "App giao đồ ăn", "market": "Hà Nội"}
    )

    args = mock_gen.call_args[0]
    assert args[0] == "smart"
    user_msg = args[2]
    assert "Sản phẩm/Ngành: App giao đồ ăn" in user_msg
    assert "Thị trường mục tiêu: Hà Nội" in user_msg
    assert args[3] is GenericToolResponse


@patch("app.agents.lab_generic.generate_structured", new_callable=AsyncMock)
async def test_run_generic_tool_agent_skips_empty_fields(mock_gen):
    mock_gen.return_value = GenericToolResponse(title="t", summary="s", content="c")
    await run_generic_tool_agent("market-sizing", {"product": "   ", "market": "Hà Nội"})

    user_msg = mock_gen.call_args[0][2]
    assert "Sản phẩm/Ngành" not in user_msg
    assert "Thị trường mục tiêu: Hà Nội" in user_msg
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_lab_generic.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.agents.lab_generic'`

- [ ] **Step 3: Write `backend/app/agents/lab_generic.py`**

```python
from pydantic import BaseModel, Field

from app.agents.base import generate_structured
from app.agents.lab import STRICT_RULES

COMMON_OUTPUT_INSTRUCTION = """

ĐỊNH DẠNG KẾT QUẢ:
- title: tiêu đề ngắn gọn, súc tích cho kết quả
- summary: tóm tắt 2-3 câu về nội dung chính
- content: nội dung chi tiết đầy đủ, định dạng markdown (có thể dùng ## heading, gạch đầu dòng, bảng)
- key_points: 3-6 điểm chính dạng danh sách ngắn gọn
"""


class GenericToolResponse(BaseModel):
    title: str = Field(..., description="Tiêu đề ngắn gọn cho kết quả")
    summary: str = Field(..., description="Tóm tắt 2-3 câu")
    content: str = Field(..., description="Nội dung chi tiết, định dạng markdown")
    key_points: list[str] = Field(default_factory=list, description="3-6 điểm chính")


class GenericFieldSpec(BaseModel):
    key: str
    label: str


class GenericToolSpec(BaseModel):
    name: str
    system_prompt: str
    fields: list[GenericFieldSpec]


GENERIC_TOOLS: dict[str, GenericToolSpec] = {
    "market-sizing": GenericToolSpec(
        name="Market Sizing Analyzer",
        system_prompt="Bạn là chuyên gia phân tích thị trường marketing tại Việt Nam. Ước tính quy mô thị trường (TAM/SAM/SOM), tốc độ tăng trưởng, và phân khúc khách hàng tiềm năng cho sản phẩm/ngành được mô tả.",
        fields=[
            GenericFieldSpec(key="product", label="Sản phẩm/Ngành"),
            GenericFieldSpec(key="market", label="Thị trường mục tiêu"),
        ],
    ),
    "persona-builder": GenericToolSpec(
        name="Customer Persona Builder",
        system_prompt="Bạn là chuyên gia nghiên cứu khách hàng. Dựng 3-5 chân dung khách hàng (persona) chi tiết: nhân khẩu học, nỗi đau, động lực mua hàng, kênh tiếp cận ưa thích, cho sản phẩm/dịch vụ được mô tả.",
        fields=[
            GenericFieldSpec(key="product", label="Sản phẩm/Dịch vụ"),
            GenericFieldSpec(key="audience", label="Đối tượng khách hàng hiện tại"),
        ],
    ),
    "campaign-analyzer": GenericToolSpec(
        name="Campaign Performance Analyzer",
        system_prompt="Bạn là chuyên gia phân tích hiệu suất chiến dịch marketing. Dựa trên số liệu được cung cấp, tính toán/ước tính CTR, CPC, ROAS, đánh giá hiệu quả và đề xuất hành động tối ưu cụ thể.",
        fields=[
            GenericFieldSpec(key="metrics", label="Số liệu chiến dịch (impressions, clicks, chi phí, doanh thu...)"),
            GenericFieldSpec(key="goal", label="Mục tiêu chiến dịch"),
        ],
    ),
    "sentiment-analysis": GenericToolSpec(
        name="Sentiment Analysis Engine",
        system_prompt="Bạn là chuyên gia phân tích cảm xúc khách hàng (social listening). Đọc các bình luận/đánh giá được cung cấp, phân loại tỷ lệ % tích cực/tiêu cực/trung lập, xác định chủ đề chính, và đề xuất hành động.",
        fields=[
            GenericFieldSpec(key="reviews", label="Bình luận/đánh giá khách hàng"),
        ],
    ),
    "swot-analyzer": GenericToolSpec(
        name="SWOT Strategy Analyzer",
        system_prompt="Bạn là chuyên gia chiến lược kinh doanh. Phân tích SWOT đầy đủ (Strengths, Weaknesses, Opportunities, Threats) và đề xuất chiến lược ứng dụng theo ma trận SO/WO/ST/WT cho doanh nghiệp được mô tả.",
        fields=[
            GenericFieldSpec(key="business", label="Mô tả doanh nghiệp/sản phẩm"),
            GenericFieldSpec(key="context", label="Bối cảnh thị trường/đối thủ"),
        ],
    ),
    "pricing-advisor": GenericToolSpec(
        name="Pricing Strategy Advisor",
        system_prompt="Bạn là chuyên gia định giá sản phẩm. Tư vấn mô hình định giá phù hợp, mức giá đề xuất, và chiến thuật tâm lý giá (price anchoring, charm pricing...) dựa trên thông tin sản phẩm, chi phí, và đối thủ.",
        fields=[
            GenericFieldSpec(key="product", label="Sản phẩm/Dịch vụ và chi phí"),
            GenericFieldSpec(key="competitors", label="Giá đối thủ cạnh tranh"),
        ],
    ),
    "landing-copy": GenericToolSpec(
        name="Landing Page Copywriter",
        system_prompt="Bạn là copywriter chuyên viết trang đích (landing page) chuyển đổi cao. Viết headline, subheadline, các benefit bullet, và CTA mạnh mẽ cho sản phẩm được mô tả.",
        fields=[
            GenericFieldSpec(key="product", label="Sản phẩm/Dịch vụ"),
            GenericFieldSpec(key="audience", label="Đối tượng mục tiêu"),
        ],
    ),
    "product-description": GenericToolSpec(
        name="Product Description Generator",
        system_prompt="Bạn là copywriter thương mại điện tử. Viết mô tả sản phẩm hấp dẫn, chuẩn SEO, nêu bật lợi ích và tính năng, phù hợp với nền tảng bán hàng được chỉ định.",
        fields=[
            GenericFieldSpec(key="product", label="Tên và đặc điểm sản phẩm"),
            GenericFieldSpec(key="platform", label="Nền tảng bán (Shopee, Lazada, website...)"),
        ],
    ),
    "email-sequence": GenericToolSpec(
        name="Email Sequence Writer",
        system_prompt="Bạn là chuyên gia email marketing. Viết một chuỗi 3-5 email (welcome/nurture/sales) hoàn chỉnh, có tiêu đề email và nội dung, phù hợp với mục tiêu chiến dịch.",
        fields=[
            GenericFieldSpec(key="goal", label="Mục tiêu chuỗi email"),
            GenericFieldSpec(key="product", label="Sản phẩm/Dịch vụ"),
        ],
    ),
    "video-script": GenericToolSpec(
        name="Video Script Writer",
        system_prompt="Bạn là biên kịch video ngắn mạng xã hội (TikTok/Reels/Shorts). Viết kịch bản theo cấu trúc Hook - Conflict/Value - Payoff/CTA, kèm gợi ý hình ảnh/cảnh quay.",
        fields=[
            GenericFieldSpec(key="topic", label="Chủ đề/Sản phẩm video"),
            GenericFieldSpec(key="duration", label="Thời lượng mong muốn (giây)"),
        ],
    ),
    "press-release": GenericToolSpec(
        name="Press Release Generator",
        system_prompt="Bạn là chuyên gia quan hệ công chúng (PR). Viết thông cáo báo chí chuẩn theo cấu trúc AP style (tiêu đề, lead, thân bài, boilerplate, thông tin liên hệ) cho sự kiện/tin tức được mô tả.",
        fields=[
            GenericFieldSpec(key="news", label="Tin tức/Sự kiện cần công bố"),
            GenericFieldSpec(key="company", label="Tên công ty/thương hiệu"),
        ],
    ),
    "blog-writer": GenericToolSpec(
        name="Blog/SEO Article Writer",
        system_prompt="Bạn là content writer SEO chuyên nghiệp. Viết bài blog đầy đủ với outline, heading H2/H3, tối ưu cho từ khóa được cung cấp, độ dài đủ chuyên sâu.",
        fields=[
            GenericFieldSpec(key="topic", label="Chủ đề bài viết"),
            GenericFieldSpec(key="keyword", label="Từ khóa SEO chính"),
        ],
    ),
    "ads-copy": GenericToolSpec(
        name="Ads Copy Generator",
        system_prompt="Bạn là chuyên gia viết quảng cáo (ads copywriter). Viết 5 biến thể copy quảng cáo cho nền tảng được chỉ định, tuân thủ giới hạn ký tự tiêu chuẩn của nền tảng đó.",
        fields=[
            GenericFieldSpec(key="product", label="Sản phẩm/Dịch vụ"),
            GenericFieldSpec(key="platform", label="Nền tảng (Facebook Ads, Google Ads, TikTok Ads...)"),
        ],
    ),
    "cta-optimizer": GenericToolSpec(
        name="CTA Optimizer",
        system_prompt="Bạn là chuyên gia tối ưu tỷ lệ chuyển đổi. Sinh 10 câu CTA (kêu gọi hành động) đa dạng về tâm lý kích hoạt cho nội dung/sản phẩm được mô tả, kèm giải thích ngắn gọn.",
        fields=[
            GenericFieldSpec(key="content", label="Nội dung/Sản phẩm cần CTA"),
        ],
    ),
    "funnel-copy": GenericToolSpec(
        name="Funnel Copy Builder",
        system_prompt="Bạn là chuyên gia copywriting phễu bán hàng. Viết thông điệp riêng biệt cho từng giai đoạn TOFU (nhận biết), MOFU (cân nhắc), BOFU (quyết định) cho sản phẩm được mô tả.",
        fields=[
            GenericFieldSpec(key="product", label="Sản phẩm/Dịch vụ"),
            GenericFieldSpec(key="audience", label="Đối tượng mục tiêu"),
        ],
    ),
    "cro-auditor": GenericToolSpec(
        name="Conversion Rate Auditor",
        system_prompt="Bạn là chuyên gia tối ưu tỷ lệ chuyển đổi (CRO). Đọc mô tả trang/landing page được cung cấp, chỉ ra các điểm yếu về chuyển đổi và đề xuất cải thiện cụ thể, có ưu tiên.",
        fields=[
            GenericFieldSpec(key="page_description", label="Mô tả trang/landing page hiện tại"),
        ],
    ),
    "promo-designer": GenericToolSpec(
        name="Offer & Promotion Designer",
        system_prompt="Bạn là chuyên gia thiết kế chương trình khuyến mãi. Đề xuất 3-5 ý tưởng khuyến mãi sáng tạo phù hợp với mục tiêu và ngân sách, kèm cách truyền thông cho từng ý tưởng.",
        fields=[
            GenericFieldSpec(key="goal", label="Mục tiêu chương trình"),
            GenericFieldSpec(key="budget", label="Ngân sách"),
        ],
    ),
    "retention-planner": GenericToolSpec(
        name="Customer Retention Planner",
        system_prompt="Bạn là chuyên gia giữ chân khách hàng (customer retention). Đề xuất chiến thuật giảm churn và tăng giá trị vòng đời khách hàng (LTV) dựa trên thông tin được cung cấp.",
        fields=[
            GenericFieldSpec(key="business", label="Loại hình kinh doanh/sản phẩm"),
            GenericFieldSpec(key="churn_reason", label="Lý do khách hàng rời bỏ"),
        ],
    ),
    "loyalty-designer": GenericToolSpec(
        name="Loyalty Program Designer",
        system_prompt="Bạn là chuyên gia thiết kế chương trình khách hàng thân thiết. Đề xuất cơ chế tích điểm, cấp bậc (tier), và phần thưởng phù hợp với mô hình kinh doanh.",
        fields=[
            GenericFieldSpec(key="business", label="Mô hình kinh doanh"),
            GenericFieldSpec(key="budget", label="Ngân sách phần thưởng"),
        ],
    ),
    "faq-handler": GenericToolSpec(
        name="FAQ & Objection Handler",
        system_prompt="Bạn là chuyên gia chăm sóc khách hàng & bán hàng. Soạn danh sách FAQ thường gặp và cách xử lý các phản đối (objection) phổ biến khi bán sản phẩm/dịch vụ được mô tả.",
        fields=[
            GenericFieldSpec(key="product", label="Sản phẩm/Dịch vụ"),
        ],
    ),
    "testimonial-enhancer": GenericToolSpec(
        name="Testimonial Enhancer",
        system_prompt="Bạn là copywriter chuyên nâng cấp đánh giá khách hàng (testimonial). Biên tập lại review thô thành testimonial chuyên nghiệp, súc tích, có thể trích dẫn, giữ nguyên ý chính của khách hàng.",
        fields=[
            GenericFieldSpec(key="raw_review", label="Đánh giá/Review thô của khách hàng"),
        ],
    ),
    "brand-naming": GenericToolSpec(
        name="Brand Naming Generator",
        system_prompt="Bạn là chuyên gia đặt tên thương hiệu (brand naming). Sáng tạo 10 tên thương hiệu phù hợp với ngành và giá trị cốt lõi được mô tả, kèm lý giải ngắn cho mỗi tên.",
        fields=[
            GenericFieldSpec(key="industry", label="Ngành nghề"),
            GenericFieldSpec(key="values", label="Giá trị cốt lõi/Tính cách thương hiệu"),
        ],
    ),
    "tagline-generator": GenericToolSpec(
        name="Tagline & Slogan Generator",
        system_prompt="Bạn là copywriter chuyên sáng tạo tagline/slogan. Sinh 10 tagline đa dạng phong cách (hài hước, sang trọng, cảm xúc, mạnh mẽ) cho thương hiệu được mô tả.",
        fields=[
            GenericFieldSpec(key="brand", label="Tên thương hiệu/Sản phẩm"),
            GenericFieldSpec(key="values", label="Giá trị/Thông điệp muốn truyền tải"),
        ],
    ),
    "positioning-builder": GenericToolSpec(
        name="Brand Positioning Statement Builder",
        system_prompt="Bạn là chuyên gia định vị thương hiệu (brand positioning). Xây dựng tuyên ngôn định vị chuẩn (positioning statement) theo cấu trúc: đối tượng mục tiêu, ngành hàng, lợi ích khác biệt, lý do tin tưởng.",
        fields=[
            GenericFieldSpec(key="brand", label="Thương hiệu/Sản phẩm"),
            GenericFieldSpec(key="competitors", label="Đối thủ cạnh tranh chính"),
        ],
    ),
    "content-calendar": GenericToolSpec(
        name="Content Calendar Planner",
        system_prompt="Bạn là chuyên gia lập kế hoạch nội dung. Xây dựng lịch nội dung 30 ngày với chủ đề, định dạng, và mục tiêu cho từng ngày/tuần, phù hợp với ngành và tần suất đăng được chỉ định.",
        fields=[
            GenericFieldSpec(key="industry", label="Ngành/Sản phẩm"),
            GenericFieldSpec(key="frequency", label="Tần suất đăng (vd: 3 bài/tuần)"),
        ],
    ),
    "brand-voice-guideline": GenericToolSpec(
        name="Brand Voice Guideline Builder",
        system_prompt="Bạn là chuyên gia xây dựng bộ quy chuẩn giọng thương hiệu (brand voice guideline). Đề xuất bộ quy tắc về giọng điệu, từ vựng nên dùng/tránh, và ví dụ minh họa dựa trên mô tả thương hiệu.",
        fields=[
            GenericFieldSpec(key="brand", label="Mô tả thương hiệu/Tính cách mong muốn"),
        ],
    ),
}


async def run_generic_tool_agent(tool_id: str, inputs: dict[str, str]) -> GenericToolResponse:
    spec = GENERIC_TOOLS.get(tool_id)
    if spec is None:
        raise ValueError(f"Unknown generic tool: {tool_id}")

    lines = []
    for field in spec.fields:
        value = (inputs.get(field.key) or "").strip()
        if value:
            lines.append(f"{field.label}: {value}")
    user = "\n".join(lines) if lines else "(không có thông tin bổ sung)"

    system = spec.system_prompt + COMMON_OUTPUT_INSTRUCTION + STRICT_RULES
    return await generate_structured("smart", system, user, GenericToolResponse)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_lab_generic.py -v`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/app/agents/lab_generic.py backend/tests/test_lab_generic.py
git commit -m "feat: generic AI engine + registry for 26 new Vitba Lab marketing tools"
```

---

## Task 2: Backend generic endpoint

**Files:**
- Modify: `backend/app/api/lab.py`
- Test: `backend/tests/test_lab_generic.py` (append)

**Interfaces:**
- Consumes: `GENERIC_TOOLS`, `run_generic_tool_agent` from Task 1 (`app.agents.lab_generic`); `_run_tool(tool_name, agent_fn, user, request, input_data)` already defined in `lab.py` (`backend/app/api/lab.py:196`); `MAX_CONTENT` constant (`backend/app/api/lab.py:33`).
- Produces: `POST /api/lab/generic/{tool_id}` endpoint — consumed by Task 5 (frontend generic page) via `useLabTool` hook.

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/test_lab_generic.py`:

```python
from app.agents.lab_generic import GenericToolResponse


@patch("app.agents.lab_generic.generate_structured", new_callable=AsyncMock)
async def test_generic_tool_endpoint_success(mock_gen, client):
    mock_gen.return_value = GenericToolResponse(
        title="Phân tích thị trường App giao đồ ăn",
        summary="Thị trường tiềm năng lớn.",
        content="## Quy mô thị trường\nNội dung chi tiết.",
        key_points=["TAM lớn", "Cạnh tranh cao"],
    )
    reg = await client.post(
        "/auth/register",
        json={"name": "User", "email": "generic_ok@example.com", "password": "secret123"},
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]

    resp = await client.post(
        "/api/lab/generic/market-sizing",
        json={"inputs": {"product": "App giao đồ ăn", "market": "Hà Nội"}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Phân tích thị trường App giao đồ ăn"
    assert "TAM lớn" in data["key_points"]


async def test_generic_tool_endpoint_unknown_tool_404(client):
    reg = await client.post(
        "/auth/register",
        json={"name": "User", "email": "generic_404@example.com", "password": "secret123"},
    )
    token = reg.json()["access_token"]

    resp = await client.post(
        "/api/lab/generic/does-not-exist",
        json={"inputs": {}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404


async def test_generic_tool_endpoint_requires_auth(client):
    resp = await client.post(
        "/api/lab/generic/market-sizing",
        json={"inputs": {"product": "x"}},
    )
    assert resp.status_code == 401
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_lab_generic.py -v -k generic_tool_endpoint`
Expected: FAIL with 404 "Not Found" (route doesn't exist yet) on the success/auth tests

- [ ] **Step 3: Add the endpoint to `backend/app/api/lab.py`**

Add the import near the other `app.agents.lab` import (after line 27):

```python
from app.agents.lab_generic import GENERIC_TOOLS, run_generic_tool_agent
```

Add this request schema near the other request schemas (after the `DialectRequest`/`ZaloPublishRequest` block, e.g. after line 140):

```python
class GenericToolRequest(BaseModel):
    inputs: dict[str, str] = Field(default_factory=dict)

    @field_validator("inputs")
    @classmethod
    def clean_inputs(cls, v: dict[str, str]) -> dict[str, str]:
        return {str(k)[:100]: str(val)[:MAX_CONTENT] for k, val in v.items()}
```

Add this endpoint at the end of the file (after the `serp_spy_endpoint`, end of file):

```python
@router.post("/generic/{tool_id}")
@limiter.limit("5/minute")
async def generic_tool_endpoint(
    tool_id: str,
    request: Request,
    req: GenericToolRequest,
    current_user: User = Depends(get_current_user),
):
    if tool_id not in GENERIC_TOOLS:
        raise HTTPException(status_code=404, detail="Công cụ không tồn tại.")
    tool_name = tool_id.replace("-", "_")
    return await _run_tool(
        tool_name,
        lambda: run_generic_tool_agent(tool_id, req.inputs),
        current_user,
        request,
        input_data=req.model_dump(),
    )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_lab_generic.py -v`
Expected: PASS (9 tests total)

- [ ] **Step 5: Run the full backend test suite to check for regressions**

Run: `cd backend && python -m pytest -q`
Expected: All tests pass (no regressions in existing lab/auth tests)

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/lab.py backend/tests/test_lab_generic.py
git commit -m "feat: add POST /api/lab/generic/{tool_id} endpoint for 26 new Vitba tools"
```

---

## Task 3: Frontend shared tool config — extract + extend CATEGORIES

**Files:**
- Create: `frontend/lib/lab-tools.ts`
- Modify: `frontend/app/hub/lab/page.tsx:1-291` (replace inline `CATEGORIES`/`TAG_STYLES`/`TAG_LABELS` with imports; rendering JSX in this task stays as-is, just rewired to the import)

**Interfaces:**
- Produces: `export interface LabToolField { key: string; label: string; placeholder?: string; type?: "text" | "textarea"; required?: boolean }`, `export interface LabTool { id: string; href: string; name: string; tagline: string; tag: "available" | "beta" | "new" | "soon"; icon: LucideIcon; fields?: LabToolField[] }`, `export interface LabCategory { id: string; label: string; tools: LabTool[] }`, `export const CATEGORIES: LabCategory[]` (13 categories, 50 tools total), `export const TAG_STYLES`, `export const TAG_LABELS` — consumed by Task 5 (`[toolId]/page.tsx`) and Task 6 (hub page redesign).
- The new 26 tools' `fields[].key` values exactly match the backend `GENERIC_TOOLS[id].fields[].key` values from Task 1 (this is how the generic page assembles the `inputs` dict it POSTs).

- [ ] **Step 1: Create `frontend/lib/lab-tools.ts`**

```typescript
import {
  ShieldCheck, Globe, MessageSquare, Brain, Repeat, ChartColumnIncreasing,
  TrendingUp, Users, Dna, RefreshCw, Clapperboard, AudioLines, Zap, Swords,
  Crosshair, Share2, UserSearch, Hash, Languages, Search,
  Radar, Target, BarChart3, Activity, Microscope, DollarSign,
  PenLine, FileText, Mail, Video, Newspaper, BookOpen,
  Megaphone, MousePointerClick, Layers, Gauge, Gift,
  HeartHandshake, Award, Inbox, MessageCircleHeart,
  Sparkles, Lightbulb, Compass, CalendarDays, Mic2,
  type LucideIcon,
} from "lucide-react";

export interface LabToolField {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "textarea";
  required?: boolean;
}

export interface LabTool {
  id: string;
  href: string;
  name: string;
  tagline: string;
  tag: "available" | "beta" | "new" | "soon";
  icon: LucideIcon;
  fields?: LabToolField[];
}

export interface LabCategory {
  id: string;
  label: string;
  tools: LabTool[];
}

export const CATEGORIES: LabCategory[] = [
  {
    id: "brand-safety",
    label: "Bảo vệ thương hiệu",
    tools: [
      { id: "shield", href: "/hub/lab/shield", name: "Content Safety Scanner", tagline: "Quét và vô hiệu hoá rủi ro ngôn ngữ trước khi đăng tải", tag: "available", icon: ShieldCheck },
      { id: "blindspot", href: "/hub/lab/blindspot", name: "Cultural Risk Detector", tagline: "Phát hiện điểm mù văn hoá, tín ngưỡng vùng miền trước khi phát hành", tag: "available", icon: Globe },
      { id: "simulator", href: "/hub/lab/simulator", name: "Audience Response Simulator", tagline: "Mô phỏng phản ứng và kịch bản bình luận của 20 nhóm người dùng", tag: "available", icon: MessageSquare },
    ],
  },
  {
    id: "persuasion",
    label: "Tối ưu thuyết phục",
    tools: [
      { id: "psycho", href: "/hub/lab/psycho", name: "Emotion Trigger Optimizer", tagline: "Tái cấu trúc nội dung theo khung PAS để kích hoạt cảm xúc mục tiêu", tag: "available", icon: Brain },
      { id: "reverse", href: "/hub/lab/reverse", name: "Reverse Psychology Engine", tagline: "Chuyển đổi thông điệp trực diện thành chiến thuật kích thích phản kháng", tag: "available", icon: Repeat },
      { id: "abtest", href: "/hub/lab/abtest", name: "A/B Test Lab", tagline: "Đánh giá 2 variant, chấm điểm, chọn winner + gợi ý cải thiện", tag: "available", icon: Swords },
    ],
  },
  {
    id: "distribution",
    label: "Phân phối & Tiếp cận",
    tools: [
      { id: "hexbreaker", href: "/hub/lab/hexbreaker", name: "Organic Reach Optimizer", tagline: "Phân tích và tái cấu trúc nội dung để tối đa phạm vi tiếp cận tự nhiên", tag: "available", icon: ChartColumnIncreasing },
      { id: "trendjack", href: "/hub/lab/trendjack", name: "Trend Integration Engine", tagline: "Lồng ghép từ khoá xu hướng vào nội dung hiện có mà không làm gãy thông điệp", tag: "available", icon: TrendingUp },
      { id: "hashtag", href: "/hub/lab/hashtag", name: "Hashtag Universe", tagline: "Vũ trụ hashtag theo framework 3-6-3 + trend VN + danh sách nên tránh", tag: "available", icon: Hash },
      { id: "influencer", href: "/hub/lab/influencer", name: "Influencer Match", tagline: "Đề xuất profile influencer phù hợp + template brief + kịch bản tiếp cận", tag: "available", icon: UserSearch },
    ],
  },
  {
    id: "content-production",
    label: "Sản xuất nội dung",
    tools: [
      { id: "persona", href: "/hub/lab/persona", name: "Voice & Tone Adapter", tagline: "Chuyển đổi giọng viết sang 6 phân khúc đối tượng khác nhau trong một thao tác", tag: "available", icon: Users },
      { id: "dna", href: "/hub/lab/dna", name: "Viral Structure Analyzer", tagline: "Trích xuất cấu trúc Hook–Body–CTA từ nội dung viral và tái ứng dụng", tag: "available", icon: Dna },
      { id: "evergreen", href: "/hub/lab/evergreen", name: "Content Revitalizer", tagline: "Cập nhật ngữ nghĩa và văn phong của nội dung cũ theo bối cảnh hiện tại", tag: "available", icon: RefreshCw },
      { id: "hook", href: "/hub/lab/hook", name: "Hook Generator", tagline: "Sinh 10 hook theo 7 công thức (AIDA, PAS, Curiosity Gap...) cho A/B test", tag: "available", icon: Zap },
      { id: "repurposer", href: "/hub/lab/repurposer", name: "Content Repurposer", tagline: "1 nội dung → nhiều định dạng (FB, TikTok, Email, Instagram) trong 1 thao tác", tag: "available", icon: Share2 },
    ],
  },
  {
    id: "competitive-intel",
    label: "Nghiên cứu đối thủ",
    tools: [
      { id: "competitor-spy", href: "/hub/lab/competitor-spy", name: "Competitor Spy", tagline: "Bóc tách chiến lược content, tần suất, giọng văn, framework của đối thủ", tag: "available", icon: Crosshair },
    ],
  },
  {
    id: "multimedia",
    label: "Đa phương tiện",
    tools: [
      { id: "cinematic", href: "/hub/lab/cinematic", name: "Visual Prompt Director", tagline: "Chuyển đổi nội dung văn bản thành storyboard và prompt hình ảnh AI chuyên nghiệp", tag: "available", icon: Clapperboard },
      { id: "audiohook", href: "/hub/lab/audiohook", name: "Voiceover Script Optimizer", tagline: "Đồng bộ kịch bản đọc với nhịp BPM nhạc nền và xuất SSML cho AI voice", tag: "available", icon: AudioLines },
    ],
  },
  {
    id: "vietnam-pack",
    label: "Việt Nam Pack",
    tools: [
      { id: "dialect", href: "/hub/lab/dialect", name: "Dialect Adapter", tagline: "Chuyển nội dung sang 3 phương ngữ Bắc/Trung/Nam + phiên bản trung lập", tag: "available", icon: Languages },
    ],
  },
  {
    id: "seo",
    label: "Vitba SEO",
    tools: [
      { id: "keyword-research", href: "/hub/lab/keyword-research", name: "Keyword Research", tagline: "Nghiên cứu từ khóa thực tế: search volume, độ khó, CPC, xu hướng — dữ liệu từ DataForSEO", tag: "new", icon: Search },
      { id: "rank-tracker", href: "/hub/lab/rank-tracker", name: "Rank Tracker", tagline: "Theo dõi thứ hạng domain: authority, ETV, từ khóa đang xếp hạng", tag: "new", icon: TrendingUp },
      { id: "backlinks", href: "/hub/lab/backlinks", name: "Backlinks Analyzer", tagline: "Phân tích backlinks: tổng quan, referring domains, liên kết mới nhất", tag: "new", icon: Share2 },
      { id: "serp-spy", href: "/hub/lab/serp-spy", name: "SERP Spy", tagline: "Do thám SERP: kết quả tìm kiếm, đối thủ cạnh tranh, cơ hội lọt top", tag: "new", icon: Crosshair },
      { id: "seo-analysis", href: "/hub/lab/seo-analysis", name: "Vitba SEO Analysis", tagline: "Phân tích SEO chuyên sâu: đối thủ, keyword gap, content plan, backlink, technical + roadmap 30-60-90 ngày", tag: "available", icon: Globe },
    ],
  },
  {
    id: "market-analysis",
    label: "Phân tích thị trường",
    tools: [
      { id: "market-sizing", href: "/hub/lab/market-sizing", name: "Market Sizing Analyzer", tagline: "Ước tính quy mô thị trường TAM/SAM/SOM và tốc độ tăng trưởng", tag: "new", icon: Radar, fields: [
        { key: "product", label: "Sản phẩm/Ngành", placeholder: "VD: App giao đồ ăn tại Việt Nam", type: "textarea", required: true },
        { key: "market", label: "Thị trường mục tiêu", placeholder: "VD: Hà Nội, TP.HCM", type: "text" },
      ] },
      { id: "persona-builder", href: "/hub/lab/persona-builder", name: "Customer Persona Builder", tagline: "Dựng 3-5 chân dung khách hàng chi tiết", tag: "new", icon: Target, fields: [
        { key: "product", label: "Sản phẩm/Dịch vụ", placeholder: "Mô tả sản phẩm/dịch vụ", type: "textarea", required: true },
        { key: "audience", label: "Đối tượng khách hàng hiện tại", placeholder: "VD: Nữ 25-35 tuổi, nhân viên văn phòng", type: "text" },
      ] },
      { id: "campaign-analyzer", href: "/hub/lab/campaign-analyzer", name: "Campaign Performance Analyzer", tagline: "Phân tích CTR/CPC/ROAS từ số liệu chiến dịch", tag: "new", icon: BarChart3, fields: [
        { key: "metrics", label: "Số liệu chiến dịch", placeholder: "VD: 50,000 impressions, 1,200 clicks, 10tr chi phí, 30tr doanh thu", type: "textarea", required: true },
        { key: "goal", label: "Mục tiêu chiến dịch", placeholder: "VD: Tăng doanh số", type: "text" },
      ] },
      { id: "sentiment-analysis", href: "/hub/lab/sentiment-analysis", name: "Sentiment Analysis Engine", tagline: "Phân tích cảm xúc từ review/comment khách hàng", tag: "new", icon: Activity, fields: [
        { key: "reviews", label: "Bình luận/đánh giá khách hàng", placeholder: "Dán các bình luận/đánh giá vào đây...", type: "textarea", required: true },
      ] },
      { id: "swot-analyzer", href: "/hub/lab/swot-analyzer", name: "SWOT Strategy Analyzer", tagline: "SWOT đầy đủ + chiến lược SO/WO/ST/WT", tag: "new", icon: Microscope, fields: [
        { key: "business", label: "Mô tả doanh nghiệp/sản phẩm", placeholder: "Mô tả doanh nghiệp, sản phẩm, thị trường", type: "textarea", required: true },
        { key: "context", label: "Bối cảnh thị trường/đối thủ", placeholder: "Thông tin đối thủ, xu hướng thị trường", type: "textarea" },
      ] },
      { id: "pricing-advisor", href: "/hub/lab/pricing-advisor", name: "Pricing Strategy Advisor", tagline: "Tư vấn mô hình định giá, tâm lý giá", tag: "new", icon: DollarSign, fields: [
        { key: "product", label: "Sản phẩm/Dịch vụ và chi phí", placeholder: "Mô tả sản phẩm và chi phí (nếu biết)", type: "textarea", required: true },
        { key: "competitors", label: "Giá đối thủ cạnh tranh", placeholder: "VD: Đối thủ A giá 199k, đối thủ B giá 249k", type: "text" },
      ] },
    ],
  },
  {
    id: "specialized-writing",
    label: "Viết nội dung chuyên sâu",
    tools: [
      { id: "landing-copy", href: "/hub/lab/landing-copy", name: "Landing Page Copywriter", tagline: "Headline, benefit bullets, CTA cho trang đích", tag: "new", icon: PenLine, fields: [
        { key: "product", label: "Sản phẩm/Dịch vụ", placeholder: "Mô tả sản phẩm/dịch vụ", type: "textarea", required: true },
        { key: "audience", label: "Đối tượng mục tiêu", placeholder: "VD: Chủ shop online mới bắt đầu", type: "text" },
      ] },
      { id: "product-description", href: "/hub/lab/product-description", name: "Product Description Generator", tagline: "Mô tả sản phẩm chuẩn SEO cho TMĐT", tag: "new", icon: FileText, fields: [
        { key: "product", label: "Tên và đặc điểm sản phẩm", placeholder: "VD: Áo thun cotton 100%, form rộng, 5 màu", type: "textarea", required: true },
        { key: "platform", label: "Nền tảng bán", placeholder: "VD: Shopee, Lazada, website", type: "text" },
      ] },
      { id: "email-sequence", href: "/hub/lab/email-sequence", name: "Email Sequence Writer", tagline: "Chuỗi email welcome/nurture/sales", tag: "new", icon: Mail, fields: [
        { key: "goal", label: "Mục tiêu chuỗi email", placeholder: "VD: Chào mừng khách hàng mới", type: "text", required: true },
        { key: "product", label: "Sản phẩm/Dịch vụ", placeholder: "Mô tả sản phẩm/dịch vụ", type: "textarea" },
      ] },
      { id: "video-script", href: "/hub/lab/video-script", name: "Video Script Writer", tagline: "Kịch bản video ngắn TikTok/Reels/Shorts", tag: "new", icon: Video, fields: [
        { key: "topic", label: "Chủ đề/Sản phẩm video", placeholder: "Mô tả chủ đề hoặc sản phẩm cần làm video", type: "textarea", required: true },
        { key: "duration", label: "Thời lượng mong muốn (giây)", placeholder: "VD: 30", type: "text" },
      ] },
      { id: "press-release", href: "/hub/lab/press-release", name: "Press Release Generator", tagline: "Thông cáo báo chí chuẩn AP style", tag: "new", icon: Newspaper, fields: [
        { key: "news", label: "Tin tức/Sự kiện cần công bố", placeholder: "Mô tả tin tức/sự kiện", type: "textarea", required: true },
        { key: "company", label: "Tên công ty/thương hiệu", placeholder: "VD: Vitba", type: "text" },
      ] },
      { id: "blog-writer", href: "/hub/lab/blog-writer", name: "Blog/SEO Article Writer", tagline: "Bài blog đầy đủ heading theo từ khóa", tag: "new", icon: BookOpen, fields: [
        { key: "topic", label: "Chủ đề bài viết", placeholder: "VD: Cách chọn giày chạy bộ cho người mới", type: "textarea", required: true },
        { key: "keyword", label: "Từ khóa SEO chính", placeholder: "VD: giày chạy bộ cho người mới", type: "text" },
      ] },
    ],
  },
  {
    id: "ads-conversion",
    label: "Quảng cáo & Chuyển đổi",
    tools: [
      { id: "ads-copy", href: "/hub/lab/ads-copy", name: "Ads Copy Generator", tagline: "Copy quảng cáo Facebook/Google nhiều variant", tag: "new", icon: Megaphone, fields: [
        { key: "product", label: "Sản phẩm/Dịch vụ", placeholder: "Mô tả sản phẩm/dịch vụ", type: "textarea", required: true },
        { key: "platform", label: "Nền tảng", placeholder: "VD: Facebook Ads, Google Ads, TikTok Ads", type: "text" },
      ] },
      { id: "cta-optimizer", href: "/hub/lab/cta-optimizer", name: "CTA Optimizer", tagline: "10 CTA + giải thích tâm lý", tag: "new", icon: MousePointerClick, fields: [
        { key: "content", label: "Nội dung/Sản phẩm cần CTA", placeholder: "Dán nội dung hoặc mô tả sản phẩm", type: "textarea", required: true },
      ] },
      { id: "funnel-copy", href: "/hub/lab/funnel-copy", name: "Funnel Copy Builder", tagline: "Messaging cho TOFU/MOFU/BOFU", tag: "new", icon: Layers, fields: [
        { key: "product", label: "Sản phẩm/Dịch vụ", placeholder: "Mô tả sản phẩm/dịch vụ", type: "textarea", required: true },
        { key: "audience", label: "Đối tượng mục tiêu", placeholder: "VD: Doanh nghiệp nhỏ chưa có website", type: "text" },
      ] },
      { id: "cro-auditor", href: "/hub/lab/cro-auditor", name: "Conversion Rate Auditor", tagline: "Chấm điểm & đề xuất cải thiện CRO", tag: "new", icon: Gauge, fields: [
        { key: "page_description", label: "Mô tả trang/landing page hiện tại", placeholder: "Mô tả cấu trúc, nội dung trang hiện tại", type: "textarea", required: true },
      ] },
      { id: "promo-designer", href: "/hub/lab/promo-designer", name: "Offer & Promotion Designer", tagline: "Ý tưởng khuyến mãi + cách truyền thông", tag: "new", icon: Gift, fields: [
        { key: "goal", label: "Mục tiêu chương trình", placeholder: "VD: Xả kho cuối mùa", type: "text", required: true },
        { key: "budget", label: "Ngân sách", placeholder: "VD: 10 triệu VND", type: "text" },
      ] },
    ],
  },
  {
    id: "retention-crm",
    label: "Email & Chăm sóc khách hàng",
    tools: [
      { id: "retention-planner", href: "/hub/lab/retention-planner", name: "Customer Retention Planner", tagline: "Chiến thuật chống churn", tag: "new", icon: HeartHandshake, fields: [
        { key: "business", label: "Loại hình kinh doanh/sản phẩm", placeholder: "Mô tả mô hình kinh doanh", type: "textarea", required: true },
        { key: "churn_reason", label: "Lý do khách hàng rời bỏ", placeholder: "VD: Giá cao hơn đối thủ, dịch vụ chậm", type: "textarea" },
      ] },
      { id: "loyalty-designer", href: "/hub/lab/loyalty-designer", name: "Loyalty Program Designer", tagline: "Cơ chế điểm thưởng, tier", tag: "new", icon: Award, fields: [
        { key: "business", label: "Mô hình kinh doanh", placeholder: "Mô tả mô hình kinh doanh", type: "textarea", required: true },
        { key: "budget", label: "Ngân sách phần thưởng", placeholder: "VD: 5% doanh thu/tháng", type: "text" },
      ] },
      { id: "faq-handler", href: "/hub/lab/faq-handler", name: "FAQ & Objection Handler", tagline: "FAQ + xử lý phản đối bán hàng", tag: "new", icon: Inbox, fields: [
        { key: "product", label: "Sản phẩm/Dịch vụ", placeholder: "Mô tả sản phẩm/dịch vụ", type: "textarea", required: true },
      ] },
      { id: "testimonial-enhancer", href: "/hub/lab/testimonial-enhancer", name: "Testimonial Enhancer", tagline: "Nâng cấp review thô thành testimonial", tag: "new", icon: MessageCircleHeart, fields: [
        { key: "raw_review", label: "Đánh giá/Review thô của khách hàng", placeholder: "Dán review gốc của khách hàng", type: "textarea", required: true },
      ] },
    ],
  },
  {
    id: "branding-strategy",
    label: "Thương hiệu & Chiến lược",
    tools: [
      { id: "brand-naming", href: "/hub/lab/brand-naming", name: "Brand Naming Generator", tagline: "10 tên thương hiệu + lý giải", tag: "new", icon: Sparkles, fields: [
        { key: "industry", label: "Ngành nghề", placeholder: "VD: Mỹ phẩm thiên nhiên", type: "text", required: true },
        { key: "values", label: "Giá trị cốt lõi/Tính cách thương hiệu", placeholder: "VD: Tự nhiên, an toàn, gần gũi", type: "textarea" },
      ] },
      { id: "tagline-generator", href: "/hub/lab/tagline-generator", name: "Tagline & Slogan Generator", tagline: "Slogan nhiều phong cách", tag: "new", icon: Lightbulb, fields: [
        { key: "brand", label: "Tên thương hiệu/Sản phẩm", placeholder: "VD: Vitba", type: "text", required: true },
        { key: "values", label: "Giá trị/Thông điệp muốn truyền tải", placeholder: "VD: AI giúp marketing dễ dàng hơn", type: "textarea" },
      ] },
      { id: "positioning-builder", href: "/hub/lab/positioning-builder", name: "Brand Positioning Statement Builder", tagline: "Tuyên ngôn định vị chuẩn", tag: "new", icon: Compass, fields: [
        { key: "brand", label: "Thương hiệu/Sản phẩm", placeholder: "Mô tả thương hiệu/sản phẩm", type: "textarea", required: true },
        { key: "competitors", label: "Đối thủ cạnh tranh chính", placeholder: "VD: Canva, Jasper", type: "text" },
      ] },
      { id: "content-calendar", href: "/hub/lab/content-calendar", name: "Content Calendar Planner", tagline: "Lịch nội dung 30 ngày", tag: "new", icon: CalendarDays, fields: [
        { key: "industry", label: "Ngành/Sản phẩm", placeholder: "VD: Quán cà phê", type: "text", required: true },
        { key: "frequency", label: "Tần suất đăng", placeholder: "VD: 3 bài/tuần", type: "text" },
      ] },
      { id: "brand-voice-guideline", href: "/hub/lab/brand-voice-guideline", name: "Brand Voice Guideline Builder", tagline: "Bộ quy chuẩn giọng thương hiệu", tag: "new", icon: Mic2, fields: [
        { key: "brand", label: "Mô tả thương hiệu/Tính cách mong muốn", placeholder: "Mô tả thương hiệu và tính cách mong muốn", type: "textarea", required: true },
      ] },
    ],
  },
];

export const TAG_STYLES = {
  available: "bg-primary/10 text-primary border border-primary/20",
  beta: "bg-primary/10 text-primary border border-primary/20",
  new: "bg-primary/10 text-primary border border-primary/20",
  soon: "bg-muted text-muted-foreground border border-border/50",
};

export const TAG_LABELS = {
  available: "Khả dụng",
  beta: "Beta",
  new: "Mới",
  soon: "Sắp ra mắt",
};

export function findLabTool(toolId: string): LabTool | undefined {
  for (const cat of CATEGORIES) {
    const tool = cat.tools.find((t) => t.id === toolId);
    if (tool) return tool;
  }
  return undefined;
}
```

- [ ] **Step 2: Rewire `frontend/app/hub/lab/page.tsx` to import from the shared lib**

Replace lines 1–287 of `frontend/app/hub/lab/page.tsx` (everything from the imports through the `TAG_LABELS` constant) with:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight, History, FlaskConical, type LucideIcon } from "lucide-react";
import { CATEGORIES, TAG_STYLES, TAG_LABELS } from "@/lib/lab-tools";
```

Leave the rest of the file (the `VitbaLabPage` component, starting at the old line 289 `export default function VitbaLabPage()`) unchanged for this task — the rendering rewrite happens in Task 6.

- [ ] **Step 3: Verify the frontend builds**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new type errors (pre-existing unrelated errors, if any, are out of scope)

- [ ] **Step 4: Manually verify the hub page still renders 24 tools under their original 8 categories, unchanged visually**

Run: `cd frontend && npm run dev`, open `http://localhost:3000/hub/lab`. Confirm the header now shows "50 Công cụ" / "13 Danh mục" (since `CATEGORIES` now has 50 tools / 13 categories, computed the same way as before), and the new 5 categories appear as additional stacked sections (still in the old full-row layout — that's expected until Task 6).

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/lab-tools.ts frontend/app/hub/lab/page.tsx
git commit -m "feat: extract Vitba Lab tool config to shared lib, add 26 new tools to CATEGORIES"
```

---

## Task 4: Extract shared markdown renderer

**Files:**
- Create: `frontend/lib/markdown.ts`
- Modify: `frontend/app/hub/lab/seo-analysis/page.tsx:1-219`

**Interfaces:**
- Produces: `export function MarkdownRenderer({ content }: { content: string }): JSX.Element` — consumed by Task 5 (`[toolId]/page.tsx`) and by `seo-analysis/page.tsx`.

- [ ] **Step 1: Create `frontend/lib/markdown.ts`**

Move the `MarkdownRenderer` and `convertMarkdown` functions verbatim out of `frontend/app/hub/lab/seo-analysis/page.tsx` (lines 170–218):

```typescript
import React from "react";

/* Simple markdown renderer — converts basic markdown to HTML */
export function MarkdownRenderer({ content }: { content: string }) {
  const html = convertMarkdown(content);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

function convertMarkdown(md: string): string {
  let html = md;

  // Headers
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');

  // Bold + italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');

  // Tables
  html = html.replace(/^\|(.+)\|$/gm, (match) => {
    const cells = match.split("|").filter((c) => c.trim());
    const isSeparator = cells.every((c) => /^[\s-:]+$/.test(c));
    if (isSeparator) return "";
    return `<tr>${cells.map((c) => `<td>${c.trim()}</td>`).join("")}</tr>`;
  });
  html = html.replace(/(<tr>[\s\S]*?<\/tr>)/g, "<table>$1</table>");
  html = html.replace(/<\/table>\s*<table>/g, "");

  // Lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
  html = html.replace(/<\/ul>\s*<ul>/g, "");

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p><h/g, '<h').replace(/<\/h(\d)><\/p>/g, '</h$1>');
  html = html.replace(/<p><table/g, '<table').replace(/<\/table><\/p>/g, '</table>');
  html = html.replace(/<p><ul/g, '<ul').replace(/<\/ul><\/p>/g, '</ul>');
  html = html.replace(/<p><pre/g, '<pre').replace(/<\/pre><\/p>/g, '</pre>');
  html = html.replace(/<p>\s*<\/p>/g, "");

  return html;
}
```

- [ ] **Step 2: Update `frontend/app/hub/lab/seo-analysis/page.tsx`**

Delete lines 170–219 (the local `MarkdownRenderer`/`convertMarkdown` functions) and add this import at the top of the file (after the existing `lucide-react` import on line 7):

```tsx
import { MarkdownRenderer } from "@/lib/markdown";
```

- [ ] **Step 3: Verify the frontend builds**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new type errors

- [ ] **Step 4: Manually verify SEO Analysis still renders markdown correctly**

Run: `cd frontend && npm run dev`, open `http://localhost:3000/hub/lab/seo-analysis`, run an analysis for any domain, confirm the report still renders with headings/tables/lists formatted (unchanged from before this task).

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/markdown.ts frontend/app/hub/lab/seo-analysis/page.tsx
git commit -m "refactor: extract shared MarkdownRenderer for reuse by generic Vitba tools"
```

---

## Task 5: Generic dynamic tool page

**Files:**
- Create: `frontend/app/hub/lab/[toolId]/page.tsx`

**Interfaces:**
- Consumes: `findLabTool(toolId: string): LabTool | undefined`, `LabTool`, `LabToolField` from `@/lib/lab-tools` (Task 3); `MarkdownRenderer` from `@/lib/markdown` (Task 4); `useLabTool<T>(endpoint: string)` from `@/hooks/use-lab-tool`; `LabBreadcrumb`, `ToolHeader`, `RunButton`, `ErrorBox`, `LabInput`, `LabTextarea`, `ResultBox` from `@/components/lab-ui`; backend route `POST /api/lab/generic/{tool_id}` from Task 2 (request body `{ inputs: Record<string,string> }`, response `{ title, summary, content, key_points }`).
- Next.js resolves static folders (e.g. `frontend/app/hub/lab/hook/page.tsx`) before this dynamic catch-all, so this page only ever receives `toolId` values for the 26 new tools.

- [ ] **Step 1: Create `frontend/app/hub/lab/[toolId]/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { useLabTool } from "@/hooks/use-lab-tool";
import { findLabTool } from "@/lib/lab-tools";
import { MarkdownRenderer } from "@/lib/markdown";
import {
  LabBreadcrumb,
  ToolHeader,
  RunButton,
  ErrorBox,
  LabInput,
  LabTextarea,
  ResultBox,
  EmptyState,
} from "@/components/lab-ui";
import { FlaskConical } from "lucide-react";

interface GenericToolResult {
  title: string;
  summary: string;
  content: string;
  key_points: string[];
}

export default function GenericLabToolPage({ params }: { params: { toolId: string } }) {
  const tool = findLabTool(params.toolId);
  if (!tool || !tool.fields) {
    notFound();
  }

  const fields = tool.fields!;
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, ""]))
  );
  const [copied, setCopied] = useState(false);
  const { run, result, loading, error } = useLabTool<GenericToolResult>(`/generic/${tool.id}`);

  const requiredFilled = fields
    .filter((f) => f.required)
    .every((f) => values[f.key]?.trim());

  function setValue(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function handleCopy() {
    if (result?.content) {
      navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool={tool.name} />
      <ToolHeader name={tool.name} description={tool.tagline} tag={tool.tag} />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {fields.map((field) =>
            field.type === "textarea" ? (
              <LabTextarea
                key={field.key}
                label={field.label}
                value={values[field.key]}
                onChange={(v) => setValue(field.key, v)}
                placeholder={field.placeholder ?? ""}
              />
            ) : (
              <LabInput
                key={field.key}
                label={field.label}
                value={values[field.key]}
                onChange={(v) => setValue(field.key, v)}
                placeholder={field.placeholder}
              />
            )
          )}
          <RunButton
            loading={loading}
            disabled={!requiredFilled}
            onClick={() => run({ inputs: values })}
            loadingText="Đang xử lý..."
            idleText="Chạy công cụ"
          />
          {error && <ErrorBox message={error} />}
        </div>
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              <ResultBox title={result.title} onCopy={handleCopy} copied={copied}>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{result.summary}</p>
                  <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-headings:font-bold prose-h2:text-lg prose-h2:mt-4 prose-p:text-foreground/80 prose-li:text-foreground/80 prose-strong:text-foreground">
                    <MarkdownRenderer content={result.content} />
                  </div>
                </div>
              </ResultBox>
              {result.key_points.length > 0 && (
                <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-2">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Điểm chính</p>
                  <ul className="list-disc list-inside space-y-1">
                    {result.key_points.map((point, i) => (
                      <li key={i} className="text-xs text-foreground/80">{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={<FlaskConical size={20} />}
              text="Điền thông tin bên trái và nhấn &quot;Chạy công cụ&quot;"
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the frontend builds**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new type errors

- [ ] **Step 3: Manually verify two generic tools end-to-end**

Run: `cd frontend && npm run dev` (and the backend dev server). Open `http://localhost:3000/hub/lab/market-sizing`, fill in "Sản phẩm/Ngành", click "Chạy công cụ", confirm a result renders (title, summary, markdown content, key points). Repeat for `http://localhost:3000/hub/lab/brand-naming` (single-field tool). Confirm `http://localhost:3000/hub/lab/does-not-exist` 404s.

- [ ] **Step 4: Commit**

```bash
git add "frontend/app/hub/lab/[toolId]/page.tsx"
git commit -m "feat: generic tool page for the 26 new Vitba marketing tools"
```

---

## Task 6: Redesign hub page into a 5-column tile grid

**Files:**
- Modify: `frontend/app/hub/lab/page.tsx` (full rewrite of the `VitbaLabPage` component body, from Task 3's import-only state)

**Interfaces:**
- Consumes: `CATEGORIES`, `TAG_STYLES`, `TAG_LABELS`, `LabCategory` from `@/lib/lab-tools` (Task 3).
- No new exports — this is the top-level page component.

- [ ] **Step 1: Replace the full file content**

```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight, History, FlaskConical, Search, type LucideIcon } from "lucide-react";
import { CATEGORIES, TAG_STYLES, TAG_LABELS } from "@/lib/lab-tools";

export default function VitbaLabPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [query, setQuery] = useState("");

  const totalTools = CATEGORIES.reduce((acc, cat) => acc + cat.tools.length, 0);

  const visibleTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATEGORIES.flatMap((cat) =>
      cat.tools
        .filter((tool) => activeCategory === "all" || cat.id === activeCategory)
        .filter(
          (tool) =>
            !q ||
            tool.name.toLowerCase().includes(q) ||
            tool.tagline.toLowerCase().includes(q)
        )
        .map((tool) => ({ ...tool, categoryLabel: cat.label }))
    );
  }, [activeCategory, query]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-border/50 pb-6">
        <div className="flex items-end justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-foreground/5 border border-border/50 flex items-center justify-center">
                <FlaskConical size={13} />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">Vitba Tool</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-foreground/5 border border-border/50 text-muted-foreground">
                Độc quyền
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              Bộ công cụ AI chuyên biệt giúp chuẩn hoá và tối ưu nội dung marketing theo tiêu chuẩn chuyên nghiệp.
            </p>
            <div className="pt-2">
              <button
                onClick={() => router.push("/hub/lab/history")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors"
              >
                <History size={16} />
                Lịch sử của tôi
              </button>
            </div>
          </div>
          <div className="flex items-center gap-5 text-right">
            <div>
              <p className="text-2xl font-bold tabular-nums">{totalTools}</p>
              <p className="text-[11px] text-muted-foreground">Công cụ</p>
            </div>
            <div className="w-px h-8 bg-border/50" />
            <div>
              <p className="text-2xl font-bold tabular-nums">{CATEGORIES.length}</p>
              <p className="text-[11px] text-muted-foreground">Danh mục</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm công cụ theo tên hoặc mô tả..."
          className="w-full rounded-xl border border-border/50 bg-card/30 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory("all")}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
            activeCategory === "all"
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-card/30 text-muted-foreground border-border/40 hover:border-border/70"
          )}
        >
          Tất cả ({totalTools})
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              activeCategory === cat.id
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-card/30 text-muted-foreground border-border/40 hover:border-border/70"
            )}
          >
            {cat.label} ({cat.tools.length})
          </button>
        ))}
      </div>

      {/* Tile grid — 5 columns */}
      {visibleTools.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          Không tìm thấy công cụ phù hợp.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {visibleTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => router.push(tool.href)}
              className={cn(
                "group flex flex-col items-start gap-2.5 rounded-2xl border border-border/40 bg-card/30 p-4 text-left",
                "hover:bg-card hover:border-border/70 hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)] transition-all duration-200"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-9 h-9 rounded-xl border border-border/40 bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 group-hover:border-primary/30 transition-all duration-200">
                  {(() => { const ToolIcon = tool.icon as LucideIcon; return <ToolIcon size={16} />; })()}
                </div>
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider", TAG_STYLES[tool.tag as keyof typeof TAG_STYLES])}>
                  {TAG_LABELS[tool.tag as keyof typeof TAG_LABELS]}
                </span>
              </div>
              <div className="min-w-0 w-full">
                <p className="text-[13px] font-semibold text-foreground leading-tight mb-1">{tool.name}</p>
                <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{tool.tagline}</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                {tool.categoryLabel}
                <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the frontend builds**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new type errors

- [ ] **Step 3: Manually verify the grid**

Run: `cd frontend && npm run dev`, open `http://localhost:3000/hub/lab`:
- Confirm "Tất cả" shows 50 tiles, 5 per row on a wide viewport (10 rows).
- Click a category chip (e.g. "Thương hiệu & Chiến lược") and confirm only its 5 tools show.
- Type a search query (e.g. "email") and confirm matching tools from any category appear.
- Click one of the original 24 tools (e.g. "Hook Generator") and confirm it still routes to its existing dedicated page, unchanged.
- Click one of the 26 new tools and confirm it routes to the Task 5 generic page.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/hub/lab/page.tsx
git commit -m "feat: redesign Vitba Tool hub into a 5-column tile grid with filters and search"
```

---

## Task 7: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full backend test suite**

Run: `cd backend && python -m pytest -q`
Expected: all tests pass, including the 9 new tests from Tasks 1–2

- [ ] **Step 2: Run frontend typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Manual smoke test of 3 more new tools beyond the 2 already checked in Task 5**

With both dev servers running, open and run: `http://localhost:3000/hub/lab/swot-analyzer`, `http://localhost:3000/hub/lab/ads-copy`, `http://localhost:3000/hub/lab/content-calendar`. Confirm each produces a result with no console errors.

- [ ] **Step 4: Spot-check 2 of the original 24 tools still work unchanged**

Open and run `http://localhost:3000/hub/lab/seo-analysis` and `http://localhost:3000/hub/lab/shield`. Confirm both behave exactly as before this plan.
