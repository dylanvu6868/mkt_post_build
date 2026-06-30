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
