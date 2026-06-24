from pydantic import BaseModel, Field


class Plan(BaseModel):
    tasks: list[str] = Field(default_factory=lambda: ["research", "seo", "brand"])


class Research(BaseModel):
    pain_points: list[str]
    customer_motivations: list[str]
    product_benefits: list[str]
    industry_context: str


class SEO(BaseModel):
    primary_keyword: str
    secondary_keywords: list[str]
    search_intent: str
    meta_description: str


class BrandContext(BaseModel):
    relevant_context: list[str]
    brand_notes: str


class FusedBrief(BaseModel):
    unified_brief: str


class Insights(BaseModel):
    primary_keyword: str
    secondary_keywords: list[str]
    pain_points: list[str]
    product_benefits: list[str]
    creative_angle: str


# --- Content type drafts ---

class FacebookPostDraft(BaseModel):
    hook: str = Field(description="Câu mở đầu gây ấn tượng mạnh, dừng scroll.")
    body: str = Field(description="Nội dung chính của bài viết. BẮT BUỘC PHẢI DÀI VÀ RẤT CHI TIẾT (300-500 từ), phân tích sâu sắc các luận điểm theo framework, không được viết ngắn hời hợt.")
    cta: str = Field(description="Lời kêu gọi hành động mạnh mẽ.")
    hashtags: list[str] = Field(description="Danh sách 5-8 hashtag, MỖI HASHTAG BẮT BUỘC BẮT ĐẦU BẰNG DẤU '#' (ví dụ: '#marketing').")


class FAQItem(BaseModel):
    question: str = Field(description="Câu hỏi thường gặp (đặt theo góc nhìn của người dùng).")
    answer: str = Field(description="Câu trả lời chi tiết, dễ hiểu và rõ ràng.")


class SeoBlogDraft(BaseModel):
    seo_title: str = Field(description="Tiêu đề chuẩn SEO, hấp dẫn, chứa keyword.")
    meta_description: str = Field(description="Đoạn mô tả ngắn gọn (khoảng 150-160 ký tự) tối ưu CTR.")
    outline: list[str] = Field(description="Dàn ý chính của bài viết (các Heading lớn).")
    blog_content: str = Field(description="Nội dung chi tiết của bài blog. BẮT BUỘC PHẢI RẤT DÀI VÀ CÓ CHIỀU SÂU (1500-2000 từ), phân tích cực kỳ chuyên sâu, đầy đủ các heading (H2, H3), bullet points và tối ưu SEO.")
    faq: list[FAQItem] = Field(description="Danh sách các câu hỏi thường gặp và câu trả lời chi tiết.")


class EmailDraft(BaseModel):
    subject: str = Field(description="Tiêu đề email gây tò mò, hấp dẫn (tối đa 50 ký tự).")
    body: str = Field(description="Nội dung chi tiết của email. Đảm bảo ngôn từ thuyết phục, cá nhân hóa, chạm đúng nỗi đau và đưa ra giải pháp rõ ràng.")
    cta: str = Field(description="Lời kêu gọi hành động rõ ràng và nổi bật.")


class LandingPageDraft(BaseModel):
    headline: str = Field(description="Tiêu đề chính (H1) đánh trúng insight, gây chú ý mạnh mẽ.")
    subheadline: str = Field(description="Tiêu đề phụ bổ sung và làm rõ giá trị cho tiêu đề chính.")
    benefits: list[str] = Field(description="Danh sách chi tiết các lợi ích và tính năng vượt trội (có dẫn chứng thuyết phục).")
    cta: str = Field(description="Nút kêu gọi hành động nổi bật nhất (ví dụ: 'Đăng ký ngay').")


class TikTokScriptDraft(BaseModel):
    hook: str = Field(description="3 giây đầu tiên của kịch bản, cực kỳ ấn tượng.")
    script: str = Field(description="Nội dung chi tiết của kịch bản video. BẮT BUỘC PHẢI DÀI VÀ CỰC KỲ CHI TIẾT cho video 60-90 giây, chia rõ từng cảnh quay (Thời gian, Hình ảnh, Voiceover, Text overlay, Âm thanh). Kèm theo Caption bài đăng và Hashtag (BẮT BUỘC dùng '#').")
    cta: str = Field(description="Kêu gọi hành động ở cuối video.")


DRAFT_SCHEMAS: dict[str, type[BaseModel]] = {
    "facebook_post": FacebookPostDraft,
    "seo_blog": SeoBlogDraft,
    "email": EmailDraft,
    "landing_page": LandingPageDraft,
    "tiktok_script": TikTokScriptDraft,
}


class Review(BaseModel):
    score: int
    suggestions: list[str]
    final_content: dict
