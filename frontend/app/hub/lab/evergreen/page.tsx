"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLabTool } from "@/hooks/use-lab-tool";

interface EvergreenResult { original_core: string; refreshed_content: string; updated_elements: string[]; repost_tips: string; }

export default function EvergreenPage() {
  const router = useRouter();
  const [oldContent, setOldContent] = useState("");
  const [yearCtx, setYearCtx] = useState("Giữa năm 2025 — thế hệ Alpha, AI bùng nổ, xu hướng slow living");
  const [copied, setCopied] = useState(false);
  const { run, result, loading, error } = useLabTool<EvergreenResult>("/evergreen");

  async function handleRun() {
    if (!oldContent.trim()) return;
    await run({ old_content: oldContent, target_year_context: yearCtx });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => router.push("/hub/lab")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2v7.31" /><path d="M14 9.3V1.99" /><path d="M8.5 2h7" /><path d="M14 9.3a6.5 6.5 0 1 1-4 0" /><path d="M5.52 16h12.96" /></svg>
          Vitba Lab
        </button>
        <span className="text-border">/</span>
        <span className="text-foreground font-medium">Content Revitalizer</span>
      </div>
      <div className="border-b border-border/50 pb-5">
        <div className="flex items-start gap-2">
          <h1 className="text-lg font-semibold tracking-tight">Content Revitalizer</h1>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mt-0.5">Khả dụng</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">Cập nhật ngữ nghĩa, ví dụ minh hoạ và văn phong của nội dung cũ theo bối cảnh hiện tại, giữ nguyên cấu trúc cảm xúc đã chứng minh hiệu quả.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bối cảnh thời điểm hiện tại</label>
            <input value={yearCtx} onChange={e => setYearCtx(e.target.value)} className="w-full rounded-lg border border-border/50 bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nội dung cũ cần làm mới</label>
            <textarea value={oldContent} onChange={e => setOldContent(e.target.value)} placeholder="Dán bài viết cũ từng hoạt động tốt mà bạn muốn làm mới hoàn toàn..." className="w-full h-48 resize-none rounded-lg border border-border/50 bg-background px-3.5 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all custom-scrollbar" />
          </div>
          <button onClick={handleRun} disabled={loading || !oldContent.trim()} className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground text-background text-sm font-medium py-2.5 hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            {loading ? <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Đang làm mới nội dung...</> : "Làm mới nội dung"}
          </button>
          {error && <p className="text-xs text-red-500 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">{error}</p>}
        </div>

        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              <div className="rounded-lg border border-border/50 bg-background px-4 py-3 space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Thông điệp lõi được giữ lại</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{result.original_core}</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-background">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-xs font-medium">Nội dung đã làm mới</span></div>
                  <button onClick={() => { navigator.clipboard.writeText(result.refreshed_content); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">{copied ? "Đã sao chép" : "Sao chép"}</button>
                </div>
                <p className="px-4 py-4 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{result.refreshed_content}</p>
              </div>
              {result.updated_elements.length > 0 && (
                <div className="rounded-lg border border-border/50 bg-background px-4 py-3 space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Các yếu tố đã được cập nhật</p>
                  {result.updated_elements.map((el, i) => <div key={i} className="flex items-start gap-2"><div className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" /><p className="text-xs text-muted-foreground">{el}</p></div>)}
                </div>
              )}
              <div className="rounded-lg border border-border/50 bg-background px-4 py-3 space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Chiến lược tái đăng</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{result.repost_tips}</p>
              </div>
            </>
          ) : (
            <div className="h-full min-h-[320px] rounded-lg border border-dashed border-border/40 flex flex-col items-center justify-center gap-2.5 text-muted-foreground/30">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></svg>
              <p className="text-xs">Nội dung đã làm mới sẽ xuất hiện tại đây</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
