"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  Globe,
  MessageSquare,
  Brain,
  Repeat,
  ChartColumnIncreasing,
  TrendingUp,
  Users,
  Dna,
  RefreshCw,
  Clapperboard,
  AudioLines,
  FlaskConical,
  History,
  ChevronRight,
  Zap,
  Swords,
  Crosshair,
  Share2,
  UserSearch,
  Hash,
  Languages,
  Search,
  type LucideIcon,
} from "lucide-react";

const CATEGORIES = [
  {
    id: "brand-safety",
    label: "Bảo vệ thương hiệu",
    tools: [
      {
        id: "shield",
        href: "/hub/lab/shield",
        name: "Content Safety Scanner",
        tagline: "Quét và vô hiệu hoá rủi ro ngôn ngữ trước khi đăng tải",
        tag: "available",
        icon: ShieldCheck,
      },
      {
        id: "blindspot",
        href: "/hub/lab/blindspot",
        name: "Cultural Risk Detector",
        tagline: "Phát hiện điểm mù văn hoá, tín ngưỡng vùng miền trước khi phát hành",
        tag: "available",
        icon: Globe,
      },
      {
        id: "simulator",
        href: "/hub/lab/simulator",
        name: "Audience Response Simulator",
        tagline: "Mô phỏng phản ứng và kịch bản bình luận của 20 nhóm người dùng",
        tag: "available",
        icon: MessageSquare,
      },
    ],
  },
  {
    id: "persuasion",
    label: "Tối ưu thuyết phục",
    tools: [
      {
        id: "psycho",
        href: "/hub/lab/psycho",
        name: "Emotion Trigger Optimizer",
        tagline: "Tái cấu trúc nội dung theo khung PAS để kích hoạt cảm xúc mục tiêu",
        tag: "available",
        icon: Brain,
      },
      {
        id: "reverse",
        href: "/hub/lab/reverse",
        name: "Reverse Psychology Engine",
        tagline: "Chuyển đổi thông điệp trực diện thành chiến thuật kích thích phản kháng",
        tag: "available",
        icon: Repeat,
      },
      {
        id: "abtest",
        href: "/hub/lab/abtest",
        name: "A/B Test Lab",
        tagline: "Đánh giá 2 variant, chấm điểm, chọn winner + gợi ý cải thiện",
        tag: "available",
        icon: Swords,
      },
    ],
  },
  {
    id: "distribution",
    label: "Phân phối & Tiếp cận",
    tools: [
      {
        id: "hexbreaker",
        href: "/hub/lab/hexbreaker",
        name: "Organic Reach Optimizer",
        tagline: "Phân tích và tái cấu trúc nội dung để tối đa phạm vi tiếp cận tự nhiên",
        tag: "available",
        icon: ChartColumnIncreasing,
      },
      {
        id: "trendjack",
        href: "/hub/lab/trendjack",
        name: "Trend Integration Engine",
        tagline: "Lồng ghép từ khoá xu hướng vào nội dung hiện có mà không làm gãy thông điệp",
        tag: "available",
        icon: TrendingUp,
      },
      {
        id: "hashtag",
        href: "/hub/lab/hashtag",
        name: "Hashtag Universe",
        tagline: "Vũ trụ hashtag theo framework 3-6-3 + trend VN + danh sách nên tránh",
        tag: "available",
        icon: Hash,
      },
      {
        id: "influencer",
        href: "/hub/lab/influencer",
        name: "Influencer Match",
        tagline: "Đề xuất profile influencer phù hợp + template brief + kịch bản tiếp cận",
        tag: "available",
        icon: UserSearch,
      },
    ],
  },
  {
    id: "content-production",
    label: "Sản xuất nội dung",
    tools: [
      {
        id: "persona",
        href: "/hub/lab/persona",
        name: "Voice & Tone Adapter",
        tagline: "Chuyển đổi giọng viết sang 6 phân khúc đối tượng khác nhau trong một thao tác",
        tag: "available",
        icon: Users,
      },
      {
        id: "dna",
        href: "/hub/lab/dna",
        name: "Viral Structure Analyzer",
        tagline: "Trích xuất cấu trúc Hook–Body–CTA từ nội dung viral và tái ứng dụng",
        tag: "available",
        icon: Dna,
      },
      {
        id: "evergreen",
        href: "/hub/lab/evergreen",
        name: "Content Revitalizer",
        tagline: "Cập nhật ngữ nghĩa và văn phong của nội dung cũ theo bối cảnh hiện tại",
        tag: "available",
        icon: RefreshCw,
      },
      {
        id: "hook",
        href: "/hub/lab/hook",
        name: "Hook Generator",
        tagline: "Sinh 10 hook theo 7 công thức (AIDA, PAS, Curiosity Gap...) cho A/B test",
        tag: "available",
        icon: Zap,
      },
      {
        id: "repurposer",
        href: "/hub/lab/repurposer",
        name: "Content Repurposer",
        tagline: "1 nội dung → nhiều định dạng (FB, TikTok, Email, Instagram) trong 1 thao tác",
        tag: "available",
        icon: Share2,
      },
    ],
  },
  {
    id: "competitive-intel",
    label: "Nghiên cứu đối thủ",
    tools: [
      {
        id: "competitor-spy",
        href: "/hub/lab/competitor-spy",
        name: "Competitor Spy",
        tagline: "Bóc tách chiến lược content, tần suất, giọng văn, framework của đối thủ",
        tag: "available",
        icon: Crosshair,
      },
    ],
  },
  {
    id: "multimedia",
    label: "Đa phương tiện",
    tools: [
      {
        id: "cinematic",
        href: "/hub/lab/cinematic",
        name: "Visual Prompt Director",
        tagline: "Chuyển đổi nội dung văn bản thành storyboard và prompt hình ảnh AI chuyên nghiệp",
        tag: "available",
        icon: Clapperboard,
      },
      {
        id: "audiohook",
        href: "/hub/lab/audiohook",
        name: "Voiceover Script Optimizer",
        tagline: "Đồng bộ kịch bản đọc với nhịp BPM nhạc nền và xuất SSML cho AI voice",
        tag: "available",
        icon: AudioLines,
      },
    ],
  },
  {
    id: "vietnam-pack",
    label: "Việt Nam Pack",
    tools: [
      {
        id: "dialect",
        href: "/hub/lab/dialect",
        name: "Dialect Adapter",
        tagline: "Chuyển nội dung sang 3 phương ngữ Bắc/Trung/Nam + phiên bản trung lập",
        tag: "available",
        icon: Languages,
      },
    ],
  },
  {
    id: "seo",
    label: "Vitba SEO",
    tools: [
      {
        id: "keyword-research",
        href: "/hub/lab/keyword-research",
        name: "Keyword Research",
        tagline: "Nghiên cứu từ khóa thực tế: search volume, độ khó, CPC, xu hướng — dữ liệu từ DataForSEO",
        tag: "new",
        icon: Search,
      },
      {
        id: "rank-tracker",
        href: "/hub/lab/rank-tracker",
        name: "Rank Tracker",
        tagline: "Theo dõi thứ hạng domain: authority, ETV, từ khóa đang xếp hạng",
        tag: "new",
        icon: TrendingUp,
      },
      {
        id: "backlinks",
        href: "/hub/lab/backlinks",
        name: "Backlinks Analyzer",
        tagline: "Phân tích backlinks: tổng quan, referring domains, liên kết mới nhất",
        tag: "new",
        icon: Share2,
      },
      {
        id: "serp-spy",
        href: "/hub/lab/serp-spy",
        name: "SERP Spy",
        tagline: "Do thám SERP: kết quả tìm kiếm, đối thủ cạnh tranh, cơ hội lọt top",
        tag: "new",
        icon: Crosshair,
      },
      {
        id: "seo-analysis",
        href: "/hub/lab/seo-analysis",
        name: "Vitba SEO Analysis",
        tagline: "Phân tích SEO chuyên sâu: đối thủ, keyword gap, content plan, backlink, technical + roadmap 30-60-90 ngày",
        tag: "available",
        icon: Globe,
      },
    ],
  },
];

const TAG_STYLES = {
  available: "bg-primary/10 text-primary border border-primary/20",
  beta: "bg-primary/10 text-primary border border-primary/20",
  new: "bg-primary/10 text-primary border border-primary/20",
  soon: "bg-muted text-muted-foreground border border-border/50",
};

const TAG_LABELS = {
  available: "Khả dụng",
  beta: "Beta",
  new: "Mới",
  soon: "Sắp ra mắt",
};

export default function VitbaLabPage() {
  const router = useRouter();
  const totalTools = CATEGORIES.reduce((acc, cat) => acc + cat.tools.length, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
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

      {/* Categories */}
      <div className="space-y-8">
        {CATEGORIES.map((cat) => (
          <div key={cat.id} className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {cat.label}
            </h2>
            <div className="grid gap-2">
              {cat.tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => router.push(tool.href)}
                  className={cn(
                    "group w-full flex items-center gap-4 rounded-2xl border border-border/40 bg-card/30 px-5 py-4",
                    "hover:bg-card hover:border-border/70 hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)] transition-all duration-200 text-left"
                  )}
                >
                  {/* Icon */}
                  <div className="shrink-0 w-10 h-10 rounded-xl border border-border/40 bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 group-hover:border-primary/30 transition-all duration-200">
                    {(() => { const ToolIcon = tool.icon as LucideIcon; return <ToolIcon size={18} />; })()}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[13px] font-semibold text-foreground leading-none">{tool.name}</p>
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider", TAG_STYLES[tool.tag as keyof typeof TAG_STYLES])}>
                        {TAG_LABELS[tool.tag as keyof typeof TAG_LABELS]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug truncate">{tool.tagline}</p>
                  </div>

                  {/* Arrow */}
                  <div className="shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all">
                    <ChevronRight size={14} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
