"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight, History, FlaskConical, type LucideIcon } from "lucide-react";
import { CATEGORIES, TAG_STYLES, TAG_LABELS } from "@/lib/lab-tools";

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
