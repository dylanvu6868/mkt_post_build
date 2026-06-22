from typing import Any

from pydantic import BaseModel

from app.agents.base import generate_structured
from app.schemas.agents import (
    DRAFT_SCHEMAS,
    EmailDraft,
    FAQItem,
    FacebookPostDraft,
    LandingPageDraft,
    SeoBlogDraft,
    TikTokScriptDraft,
)

SYSTEM_TEMPLATES: dict[str, str] = {
    "facebook_post": """Bạn là hệ thống AI Marketing chuyên nghiệp của Vitba AI, chuyên viết bài Facebook.

## FRAMEWORK CÓ SẴN

### Framework FB-01: Viral Hook
**Khi dùng:** Tăng reach, viral, tăng comment
**Cấu trúc:**
1. Hook gây tò mò (câu mở đầu kích thích click, dùng số liệu, câu hỏi tu từ, hoặc tuyên bố gây sốc)
2. Nỗi đau khách hàng (2-3 pain point cụ thể, dùng ngôn ngữ đời thường)
3. Giải pháp (giới thiệu sản phẩm/dịch vụ như lời giải tự nhiên)
4. Lợi ích (3-5 lợi ích cụ thể, có con số nếu có thể)
5. CTA (kêu gọi hành động rõ ràng, tạo urgency)
6. Hashtag (5-8 hashtag liên quan)

### Framework FB-02: Storytelling
**Khi dùng:** Xây thương hiệu cá nhân, tăng trust, kết nối cảm xúc
**Cấu trúc:**
1. Bối cảnh (đặt người đọc vào một tình huống cụ thể, dùng ngôi thứ nhất hoặc kể về khách hàng)
2. Vấn đề (khó khăn/thách thức gặp phải, mô tả chi tiết cảm xúc)
3. Hành trình (quá trình tìm kiếm giải pháp, các bước thử và sai)
4. Kết quả (transformation rõ ràng: before vs after, có số liệu cụ thể)
5. Bài học (insight sâu sắc, có giá trị cho người đọc)
6. CTA (mời gọi tương tác: comment chia sẻ, inbox, link)

### Framework FB-03: PAS (Problem - Agitate - Solution)
**Khi dùng:** Chốt sale, chạy ads, tối ưu chuyển đổi
**Cấu trúc:**
1. Problem (nêu vấn đề rõ ràng, cụ thể, dùng câu hỏi "Bạn có đang...?")
2. Agitate (khuấy động nỗi đau, mô tả hậu quả nếu không giải quyết, dùng cảm xúc)
3. Solution (giải pháp = sản phẩm/dịch vụ, giới thiệu tự nhiên)
4. Benefit (lợi ích cụ thể, bằng chứng xã hội, testimonial ngắn nếu có)
5. CTA (hành động cụ thể + urgency: "Chỉ còn X slot", "Ưu đãi đến ngày...")

## QUY TẮC
1. Tự chọn framework phù hợp nhất dựa trên mục tiêu marketing của người dùng.
2. Nếu có Custom Structure → dùng cấu trúc đó thay vì framework mặc định.
3. KHÔNG giải thích lý thuyết. Trả về nội dung hoàn chỉnh sẵn dùng.
4. Viết DÀI, CHI TIẾT, có chiều sâu. Mỗi phần ít nhất 2-3 câu.
5. Dùng emoji phù hợp, ngắt dòng hợp lý cho Facebook.
6. Tối ưu cho engagement: câu hỏi tương tác, kêu gọi comment.
7. LUÔN VIẾT BẰNG TIẾNG VIỆT.
8. Đưa framework đang sử dụng vào đầu phần body (ví dụ: "[Framework: FB-01 Viral Hook]").""",

    "seo_blog": """Bạn là hệ thống AI Marketing chuyên nghiệp của Vitba AI, chuyên viết blog chuẩn SEO.

## FRAMEWORK CÓ SẴN

### Framework SEO-01: Topic Cluster
**Khi dùng:** SEO từ khóa dài, xây topical authority
**Cấu trúc:**
1. Introduction (giới thiệu vấn đề, hook người đọc, nêu promise bài viết)
2. Vấn đề (phân tích sâu vấn đề, dùng số liệu, thống kê)
3. Nguyên nhân (3-5 nguyên nhân gốc rễ, phân tích chi tiết từng nguyên nhân)
4. Giải pháp (3-5 giải pháp cụ thể, mỗi giải pháp có heading riêng, giải thích chi tiết cách thực hiện)
5. Case Study (1-2 ví dụ thực tế, kết quả cụ thể với con số)
6. FAQ (5-7 câu hỏi thường gặp, trả lời chi tiết)
7. Conclusion (tóm tắt key takeaways, CTA)

### Framework SEO-02: How-To Guide
**Khi dùng:** Hướng dẫn chi tiết, SEO traffic, tăng time-on-page
**Cấu trúc:**
1. Mở đầu (giới thiệu chủ đề, tại sao quan trọng, kết quả người đọc sẽ đạt được)
2. Điều kiện cần chuẩn bị (tools, kiến thức, tài nguyên)
3. Step 1 (hướng dẫn chi tiết, có ví dụ minh họa)
4. Step 2 (tiếp tục chi tiết, tips & tricks)
5. Step 3+ (thêm các bước nếu cần, mỗi bước rõ ràng)
6. Checklist tóm tắt (dạng bullet points để người đọc kiểm tra lại)
7. FAQ (3-5 câu hỏi về quy trình)
8. CTA (mời gọi hành động tiếp theo)

### Framework SEO-03: Comparison/Review
**Khi dùng:** Review sản phẩm, affiliate, SaaS comparison
**Cấu trúc:**
1. Giới thiệu (bối cảnh so sánh, tiêu chí đánh giá)
2. Tiêu chí đánh giá (liệt kê 5-7 tiêu chí, giải thích tại sao quan trọng)
3. So sánh chi tiết (phân tích từng sản phẩm/giải pháp theo từng tiêu chí)
4. Bảng tổng hợp (bảng markdown so sánh tổng quan)
5. Kết luận (recommendation rõ ràng cho từng use case)
6. FAQ (câu hỏi về việc lựa chọn)

## QUY TẮC
1. Tự chọn framework phù hợp nhất.
2. Nếu có Custom Structure → dùng cấu trúc đó.
3. Blog phải DÀI, CHI TIẾT, tối thiểu 1500-2000 từ.
4. Tối ưu SEO: keyword density 1-2%, heading hierarchy (H1>H2>H3), internal linking suggestions.
5. Viết tự nhiên, dễ đọc, ngắt đoạn hợp lý.
6. Dùng bullet points, bảng, bold cho scanability.
7. LUÔN VIẾT BẰNG TIẾNG VIỆT.
8. Đưa framework đang sử dụng vào phần đầu (SEO title có thể bao gồm keyword chính).""",

    "email": """Bạn là hệ thống AI Marketing chuyên nghiệp của Vitba AI, chuyên viết Email Marketing.

## FRAMEWORK CÓ SẴN

### Framework EM-01: Sales Email
**Khi dùng:** Bán hàng trực tiếp, giới thiệu sản phẩm, báo giá
**Cấu trúc:**
1. Subject line (ngắn gọn, gây tò mò, có urgency hoặc benefit rõ ràng, tối đa 50 ký tự)
2. Hook mở đầu (1-2 câu kết nối cảm xúc hoặc nêu vấn đề)
3. Problem (vấn đề khách hàng đang gặp, cụ thể và relatable)
4. Solution (giải pháp = sản phẩm/dịch vụ, trình bày tự nhiên)
5. Offer (đề xuất giá trị: giá, ưu đãi, bonus, guarantee)
6. CTA (nút hành động rõ ràng, tạo urgency)

### Framework EM-02: Launch Sequence (Chuỗi 4 email)
**Khi dùng:** Ra mắt sản phẩm mới, chiến dịch launch
**Cấu trúc:**
- Email 1 - Awareness: Teaser, gợi tò mò, giới thiệu vấn đề
- Email 2 - Interest: Reveal giải pháp, chia sẻ giá trị miễn phí
- Email 3 - Desire: Social proof, testimonials, case study
- Email 4 - Action: Ưu đãi giới hạn, countdown, CTA mạnh

### Framework EM-03: Re-engagement
**Khi dùng:** Kích hoạt lại khách hàng cũ, win-back campaign
**Cấu trúc:**
1. "Chúng tôi nhớ bạn" (cá nhân hóa, nhắc lại mối quan hệ)
2. Điều mới (update sản phẩm, tính năng mới, thay đổi)
3. Ưu đãi đặc biệt (exclusive offer cho returning customer)
4. CTA (đơn giản, low-friction: "Quay lại xem ngay")

## QUY TẮC
1. Tự chọn framework phù hợp nhất dựa trên mục tiêu.
2. Nếu có Custom Structure → dùng cấu trúc đó.
3. Subject line tối ưu cho open rate (A/B testing friendly, có emoji nếu phù hợp).
4. Body email: cá nhân hóa, ngắn gọn nhưng đủ thuyết phục, dùng whitespace hợp lý.
5. CTA nổi bật, chỉ 1 CTA chính per email.
6. Preheader text bổ trợ subject line.
7. Nếu framework EM-02 được chọn: viết ĐẦY ĐỦ cả 4 email trong chuỗi.
8. LUÔN VIẾT BẰNG TIẾNG VIỆT.
9. Đưa framework đang sử dụng vào đầu nội dung.""",

    "tiktok_script": """Bạn là hệ thống AI Marketing chuyên nghiệp của Vitba AI, chuyên viết kịch bản TikTok/Reels.

## FRAMEWORK CÓ SẴN

### Framework TT-01: Viral Hook
**Khi dùng:** Tăng view, viral, tạo trend
**Cấu trúc:**
- 0-3s: Hook (câu mở đầu gây sốc, câu hỏi bất ngờ, hoặc tuyên bố controversial — phải giữ chân người xem)
- 3-15s: Problem (nêu vấn đề đau đớn, dùng visual cues, text overlay)
- 15-45s: Solution (giải pháp chi tiết, demo, before/after, bằng chứng)
- 45-60s: CTA (kêu gọi follow, comment, share, link bio)

### Framework TT-02: Storytelling
**Khi dùng:** Xây personal brand, kết nối cảm xúc, tăng follower
**Cấu trúc:**
1. Before (tình huống ban đầu, vấn đề, cảm xúc — tạo đồng cảm)
2. Turning Point (bước ngoặt, phát hiện giải pháp, moment "aha")
3. After (kết quả transformation, hình ảnh thành công, con số)
4. CTA (mời follow để xem thêm hành trình, link bio)

### Framework TT-03: Product Demo
**Khi dùng:** Giới thiệu sản phẩm, review, unboxing
**Cấu trúc:**
1. Hook (tạo tò mò về sản phẩm: "Sản phẩm này đã thay đổi...", unboxing moment)
2. Demo (hướng dẫn sử dụng, hiệu ứng trước/sau, close-up chi tiết)
3. Benefit (3 lợi ích chính, dùng text overlay, so sánh)
4. Proof (bằng chứng: review người dùng, số liệu, trước/sau)
5. CTA (link mua, mã giảm giá, comment để nhận ưu đãi)

## QUY TẮC
1. Tự chọn framework phù hợp nhất.
2. Nếu có Custom Structure → dùng cấu trúc đó.
3. Viết CHI TIẾT: mô tả hình ảnh/cảnh quay, text overlay, âm nhạc gợi ý, chuyển cảnh.
4. Mỗi scene phải có: Thời gian, Hình ảnh, Lời nói/Voiceover, Text overlay.
5. Hook 3 giây đầu là QUAN TRỌNG NHẤT — phải dừng scroll.
6. Bao gồm Caption (100-150 ký tự) và Hashtag (5-8 hashtag trending + niche).
7. Gợi ý nhạc nền phù hợp.
8. LUÔN VIẾT BẰNG TIẾNG VIỆT.
9. Đưa framework đang sử dụng vào đầu kịch bản.""",
}


def _format_brand_voice(brand_profile: dict[str, Any]) -> str:
    if not brand_profile:
        return ""

    parts: list[str] = []
    if brand_profile.get("brand_name"):
        parts.append(f"Brand name: {brand_profile['brand_name']}")
    if brand_profile.get("tone"):
        parts.append(f"Tone: {brand_profile['tone']}")
    if brand_profile.get("writing_style"):
        parts.append(f"Writing style: {brand_profile['writing_style']}")
    if brand_profile.get("preferred_words"):
        parts.append(
            f"Preferred words (use these): {', '.join(brand_profile['preferred_words'])}"
        )
    if brand_profile.get("forbidden_words"):
        parts.append(
            f"Forbidden words (NEVER use these): {', '.join(brand_profile['forbidden_words'])}"
        )

    if not parts:
        return ""
    return "Brand voice:\n" + "\n".join(parts)


def _mock_draft(content_type: str, brief: str, brand_profile: dict[str, Any]) -> BaseModel:
    brand_name = brand_profile.get("brand_name", "")
    tone = brand_profile.get("tone", "")
    tag = (brief.replace(" ", "") or "marketing").lower()

    hook_prefix = f"{brand_name}: " if brand_name else ""
    tone_note = f" Our {tone} approach sets us apart." if tone else ""

    if content_type == "facebook_post":
        return FacebookPostDraft(
            hook=f"{hook_prefix}Struggling with {brief}? You're not alone. \U0001f680",
            body=(
                f"Meet the smarter way to handle {brief}. Built to save you "
                f"time and deliver real results — so you can focus on what "
                f"matters most.{tone_note}"
            ),
            cta="\U0001f449 Learn more today!",
            hashtags=[f"#{tag}", "#marketing", "#growth"],
        )

    if content_type == "seo_blog":
        return SeoBlogDraft(
            seo_title=f"{hook_prefix}{brief.title()} — The Complete Guide",
            meta_description=f"Learn everything about {brief}. Tips, strategies, and expert insights.",
            outline=["Introduction", "Key Benefits", "How It Works", "Conclusion"],
            blog_content=(
                f"# {brief.title()}\n\n"
                f"In today's market, {brief} is more important than ever.{tone_note} "
                f"This comprehensive guide covers everything you need to know."
            ),
            faq=[
                FAQItem(question=f"What is {brief}?", answer=f"{brief} is a key strategy for modern marketing."),
                FAQItem(question=f"Why is {brief} important?", answer=f"It helps businesses grow and reach their audience."),
            ],
        )

    if content_type == "email":
        return EmailDraft(
            subject=f"{hook_prefix}Discover the power of {brief}",
            body=(
                f"Hi there,\n\nWe wanted to share something exciting about {brief}. "
                f"Our latest insights show that this approach can transform your results.{tone_note}"
            ),
            cta="Click here to learn more",
        )

    if content_type == "landing_page":
        return LandingPageDraft(
            headline=f"{hook_prefix}{brief.title()} — Transform Your Results",
            subheadline=f"The smarter way to approach {brief} for modern businesses",
            benefits=[
                f"Save time with automated {brief}",
                "Get real, measurable results",
                "Easy to set up and use",
            ],
            cta="Get Started Free",
        )

    # tiktok_script
    return TikTokScriptDraft(
        hook=f"{hook_prefix}Stop scrolling! This changes everything about {brief} \U0001f525",
        script=(
            f"Here's why {brief} matters more than ever. "
            f"Most people get this wrong, but here's the secret.{tone_note}"
        ),
        cta=f"Follow for more tips on {brief}!",
    )


async def copywriter(state: dict[str, Any]) -> dict[str, Any]:
    brief = state["brief"]
    brand_profile = state.get("brand_profile") or {}
    content_type = state.get("content_type", "facebook_post")

    if not state.get("provider_available"):
        draft = _mock_draft(content_type, brief, brand_profile)
        return {"draft": draft.model_dump()}

    base_system = SYSTEM_TEMPLATES.get(content_type, SYSTEM_TEMPLATES["facebook_post"])
    schema = DRAFT_SCHEMAS.get(content_type, FacebookPostDraft)

    brand_voice_section = _format_brand_voice(brand_profile)
    insights_data = state.get("insights") or {}
    custom_structure = state.get("custom_structure") or ""

    if custom_structure:
        system = (
            f"{base_system}\n\n"
            "## CUSTOM STRUCTURE (ƯU TIÊN CAO NHẤT)\n"
            f"Người dùng yêu cầu cấu trúc riêng. BỎ QUA framework mặc định.\n"
            f"Sinh nội dung theo cấu trúc sau:\n{custom_structure}\n\n"
            "Vẫn tuân thủ các quy tắc chất lượng: viết dài, chi tiết, có chiều sâu."
        )
    else:
        system = (
            f"{base_system}\n\n"
            "## HƯỚNG DẪN THỰC HIỆN\n"
            "1. Phân tích mục tiêu marketing và brief để chọn framework phù hợp nhất.\n"
            "2. Ghi rõ framework đang dùng ở đầu body.\n"
            "3. Viết nội dung ĐẦY ĐỦ, CHI TIẾT theo đúng cấu trúc framework đã chọn.\n"
            "4. Mỗi phần trong framework phải có nội dung thực chất, không sơ sài.\n"
            "5. Tối ưu cho mục tiêu: chuyển đổi, SEO, hoặc engagement tùy content type."
        )

    insights_section = ""
    if insights_data:
        insights_section = f"\n## Dữ liệu phân tích sẵn:\n{insights_data}\n"

    fused = state.get("fused_output") or {}
    if fused:
        insights_section += f"\n## Creative Brief (tổng hợp từ nghiên cứu):\n{fused.get('unified_brief', '')}\n"
        if fused.get("key_messages"):
            insights_section += "Key messages: " + ", ".join(fused["key_messages"]) + "\n"

    research_data = state.get("research_output") or {}
    if research_data:
        if research_data.get("pain_points"):
            insights_section += "\n## Pain points khách hàng:\n" + "\n".join(f"- {p}" for p in research_data["pain_points"]) + "\n"
        if research_data.get("motivations"):
            insights_section += "\n## Động lực mua hàng:\n" + "\n".join(f"- {m}" for m in research_data["motivations"]) + "\n"

    seo_data = state.get("seo_output") or {}
    if seo_data and content_type == "seo_blog":
        insights_section += f"\n## SEO Data:\nPrimary keyword: {seo_data.get('primary_keyword', '')}\n"
        if seo_data.get("secondary_keywords"):
            insights_section += "Secondary: " + ", ".join(seo_data["secondary_keywords"]) + "\n"
        if seo_data.get("search_intent"):
            insights_section += f"Search intent: {seo_data['search_intent']}\n"

    extra_context = ""
    industry = state.get("industry", "")
    target_audience = state.get("target_audience", "")
    tone = state.get("tone", "")
    cta_text = state.get("cta_text", "")
    if industry:
        extra_context += f"Ngành nghề: {industry}\n"
    if target_audience:
        extra_context += f"Khách hàng mục tiêu: {target_audience}\n"
    if tone:
        extra_context += f"Giọng văn yêu cầu: {tone}\n"
    if cta_text:
        extra_context += f"CTA mong muốn: {cta_text}\n"

    user = (
        f"## THÔNG TIN ĐẦU VÀO\n"
        f"Sản phẩm/Dịch vụ: {brief}\n"
        f"Mục tiêu marketing: {state.get('marketing_goal', 'Tăng engagement')}\n"
        f"{extra_context}"
        f"{insights_section}"
        f"{brand_voice_section}\n\n"
        "Hãy chọn framework phù hợp nhất và viết nội dung HOÀN CHỈNH, DÀI, CHI TIẾT ngay bây giờ."
    )
    result = await generate_structured("fast", system, user, schema)
    final = result.model_dump()
    return {"draft": final, "final": final, "formatted_final": final}
