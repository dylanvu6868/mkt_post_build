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
