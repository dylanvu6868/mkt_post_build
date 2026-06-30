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
