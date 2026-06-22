"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        ),
      },
      {
        id: "blindspot",
        href: "/hub/lab/blindspot",
        name: "Cultural Risk Detector",
        tagline: "Phát hiện điểm mù văn hoá, tín ngưỡng vùng miền trước khi phát hành",
        tag: "available",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
          </svg>
        ),
      },
      {
        id: "simulator",
        href: "/hub/lab/simulator",
        name: "Audience Response Simulator",
        tagline: "Mô phỏng phản ứng và kịch bản bình luận của 20 nhóm người dùng",
        tag: "available",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        ),
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
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
          </svg>
        ),
      },
      {
        id: "reverse",
        href: "/hub/lab/reverse",
        name: "Reverse Psychology Engine",
        tagline: "Chuyển đổi thông điệp trực diện thành chiến thuật kích thích phản kháng",
        tag: "available",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>
          </svg>
        ),
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
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
          </svg>
        ),
      },
      {
        id: "trendjack",
        href: "/hub/lab/trendjack",
        name: "Trend Integration Engine",
        tagline: "Lồng ghép từ khoá xu hướng vào nội dung hiện có mà không làm gãy thông điệp",
        tag: "available",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
          </svg>
        ),
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
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        ),
      },
      {
        id: "dna",
        href: "/hub/lab/dna",
        name: "Viral Structure Analyzer",
        tagline: "Trích xuất cấu trúc Hook–Body–CTA từ nội dung viral và tái ứng dụng",
        tag: "available",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="m10.5 20.5 1-1.5"/><path d="m13.5 3.5-1 1.5"/><path d="m13.5 20.5-1-1.5"/><path d="m10.5 3.5 1 1.5"/>
            <path d="M12 21A4.5 4.5 0 0 1 7.5 16.5c0-1.28.53-2.43 1.38-3.26a4.52 4.52 0 0 0 0-6.48 4.5 4.5 0 0 1-1.38-3.26A4.5 4.5 0 0 1 12 3a4.5 4.5 0 0 1 4.5 4.5c0 1.28-.53 2.43-1.38 3.26a4.52 4.52 0 0 0 0 6.48 4.5 4.5 0 0 1 1.38 3.26A4.5 4.5 0 0 1 12 21Z"/>
          </svg>
        ),
      },
      {
        id: "evergreen",
        href: "/hub/lab/evergreen",
        name: "Content Revitalizer",
        tagline: "Cập nhật ngữ nghĩa và văn phong của nội dung cũ theo bối cảnh hiện tại",
        tag: "available",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
          </svg>
        ),
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
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M17 3v18"/>
            <path d="M3 7h4"/><path d="M3 12h4"/><path d="M3 17h4"/><path d="M17 7h4"/><path d="M17 12h4"/><path d="M17 17h4"/>
          </svg>
        ),
      },
      {
        id: "audiohook",
        href: "/hub/lab/audiohook",
        name: "Voiceover Script Optimizer",
        tagline: "Đồng bộ kịch bản đọc với nhịp BPM nhạc nền và xuất SSML cho AI voice",
        tag: "available",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        ),
      },
    ],
  },
];

const TAG_STYLES = {
  available: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
  beta: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  soon: "bg-muted text-muted-foreground border border-border/50",
};

const TAG_LABELS = {
  available: "Khả dụng",
  beta: "Beta",
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
              <div className="w-6 h-6 rounded-md bg-foreground/5 border border-border/50 flex items-center justify-center">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/>
                  <path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/>
                </svg>
              </div>
              <h1 className="text-xl font-semibold tracking-tight">Vitba Lab</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-foreground/5 border border-border/50 text-muted-foreground">
                Độc quyền
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              Bộ công cụ AI chuyên biệt giúp chuẩn hoá và tối ưu nội dung marketing theo tiêu chuẩn chuyên nghiệp.
            </p>
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
                    "group w-full flex items-center gap-4 rounded-xl border border-border/50 bg-card/30 px-4 py-3.5",
                    "hover:bg-card hover:border-border hover:shadow-sm transition-all duration-150 text-left"
                  )}
                >
                  {/* Icon */}
                  <div className="shrink-0 w-9 h-9 rounded-lg border border-border/50 bg-background flex items-center justify-center text-foreground/60 group-hover:text-foreground group-hover:border-border transition-colors">
                    {tool.icon}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[13px] font-semibold text-foreground leading-none">{tool.name}</p>
                      <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider", TAG_STYLES[tool.tag as keyof typeof TAG_STYLES])}>
                        {TAG_LABELS[tool.tag as keyof typeof TAG_LABELS]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug truncate">{tool.tagline}</p>
                  </div>

                  {/* Arrow */}
                  <div className="shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                    </svg>
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
