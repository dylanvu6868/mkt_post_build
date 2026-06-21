from langchain_core.messages import SystemMessage, HumanMessage

from app.graph.state import GraphState
from app.llm.factory import get_chat_model

LANDING_PAGE_PROMPT = """Bạn là hệ thống AI Marketing chuyên nghiệp của Vitba AI, chuyên lập trình Landing Page.
Bạn là Frontend Developer có 10 năm kinh nghiệm về UI/UX và Conversion Rate Optimization.

## FRAMEWORK CÓ SẴN

### Framework LP-01: AIDA
**Khi dùng:** Landing page tổng quát, đa mục đích
**Cấu trúc:**
1. Hero Section — Attention (headline gây chú ý, subheadline, hero image/video, CTA chính)
2. Interest Section (nêu vấn đề khách hàng, thống kê gây ấn tượng, "Bạn có gặp vấn đề này?")
3. Desire Section (features & benefits, icons, hình ảnh minh họa, so sánh before/after)
4. Action Section (CTA lớn, form đăng ký, guarantee/risk reversal, urgency)

### Framework LP-02: SaaS Conversion
**Khi dùng:** Sản phẩm SaaS, phần mềm, dịch vụ subscription
**Cấu trúc:**
1. Hero (headline value prop, subheadline, CTA + free trial, product screenshot/demo)
2. Problem Section (3 pain points với icon, mô tả ngắn gọn)
3. Features Section (3-6 features chính với icon + mô tả, layout grid)
4. Benefits Section (giá trị mang lại, con số cụ thể, infographic)
5. Social Proof (testimonials carousel, logos khách hàng, case study snippets)
6. Pricing Section (2-3 plan cards, highlight plan phổ biến nhất)
7. FAQ Section (accordion 5-7 câu hỏi)
8. Final CTA (CTA section lớn, repeat value prop, guarantee)

### Framework LP-03: Webinar/Event
**Khi dùng:** Đăng ký webinar, sự kiện, khóa học
**Cấu trúc:**
1. Hero (tên sự kiện, ngày giờ, countdown timer, CTA đăng ký)
2. Speaker Section (ảnh, bio, credentials của diễn giả)
3. Agenda Section (timeline sự kiện, nội dung từng phần)
4. Benefits Section (3-5 điều bạn sẽ học được, có icon)
5. Testimonials (review từ sự kiện trước hoặc học viên cũ)
6. Registration CTA (form đăng ký đơn giản, chỉ 2-3 field, CTA nổi bật)

## YÊU CẦU KỸ THUẬT BẮT BUỘC
1. Sử dụng Tailwind CSS qua CDN (`<script src="https://cdn.tailwindcss.com"></script>`).
2. Giao diện đẹp, hiện đại, chuẩn UI/UX, hỗ trợ Responsive.
3. Sử dụng ảnh placeholder từ `https://placehold.co` cho hình ảnh minh họa.
4. Trả về DUY NHẤT mã nguồn HTML hoàn chỉnh bắt đầu bằng `<!DOCTYPE html>`.
5. KHÔNG thêm lời giải thích hay markdown wrapper.
6. Thêm smooth scroll, hover effects, subtle animations bằng CSS.
7. Color scheme chuyên nghiệp phù hợp với ngành nghề.
8. Typography hierarchy rõ ràng (font-size, weight, line-height).

## QUY TẮC
1. Tự chọn framework phù hợp nhất dựa trên brief.
2. Nếu có Custom Structure → dùng cấu trúc đó.
3. Landing page phải ĐẦY ĐỦ các section, KHÔNG sơ sài.
4. Tối ưu cho conversion: CTA nổi bật, value proposition rõ ràng.
5. LUÔN VIẾT NỘI DUNG BẰNG TIẾNG VIỆT.

Thông tin dự án:
{brief}
Mục tiêu: {marketing_goal}
{extra_context}"""

async def landing_page_coder(state: GraphState):
    """Generates a complete HTML Landing Page using framework selection."""
    model = get_chat_model("fast")

    brief = state.get("brief", "Không có thông tin chi tiết")
    goal = state.get("marketing_goal", "Tạo chuyển đổi")
    custom_structure = state.get("custom_structure") or ""

    extra_parts = []
    if state.get("industry"):
        extra_parts.append(f"Ngành nghề: {state['industry']}")
    if state.get("target_audience"):
        extra_parts.append(f"Khách hàng mục tiêu: {state['target_audience']}")
    if state.get("tone"):
        extra_parts.append(f"Giọng văn: {state['tone']}")
    if state.get("cta_text"):
        extra_parts.append(f"CTA mong muốn: {state['cta_text']}")
    if custom_structure:
        extra_parts.append(f"\nCUSTOM STRUCTURE (ưu tiên cao nhất, bỏ qua framework mặc định):\n{custom_structure}")
    extra_context = "\n".join(extra_parts) if extra_parts else ""

    prompt = LANDING_PAGE_PROMPT.format(brief=brief, marketing_goal=goal, extra_context=extra_context)
    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content="Hãy chọn framework phù hợp nhất và viết toàn bộ mã nguồn HTML ngay bây giờ. Landing page phải đầy đủ, chuyên nghiệp, tối ưu chuyển đổi."),
    ]

    response = await model.ainvoke(messages)

    content = response.content.strip()
    if content.startswith("```html"):
        content = content[7:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    return {
        "final": {"body": content},
        "formatted_final": {"body": content}
    }
