"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLabTool } from "@/hooks/use-lab-tool";

interface DNAResult {
  dna_analysis: { hook: string; body_rhythm: string; cta: string };
  remixed_content: string;
  remix_tips: string[];
}

function LabBreadcrumb({ tool }: { tool: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2 text-sm">
      <button onClick={() => router.push("/hub/lab")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2v7.31" /><path d="M14 9.3V1.99" /><path d="M8.5 2h7" /><path d="M14 9.3a6.5 6.5 0 1 1-4 0" /><path d="M5.52 16h12.96" /></svg>
        Vitba Tool
      </button>
      <span className="text-border">/</span>
      <span className="text-foreground font-medium">{tool}</span>
    </div>
  );
}

export default function DNAPage() {
  const [viralContent, setViralContent] = useState("");
  const [userTopic, setUserTopic] = useState("");
  const [copied, setCopied] = useState(false);
  const { run, result, loading, error } = useLabTool<DNAResult>("/dna");

  async function handleRun() {
    if (!viralContent.trim() || !userTopic.trim()) return;
    await run({ viral_content: viralContent, user_topic: userTopic });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Viral Structure Analyzer" />
      <div className="border-b border-border/50 pb-5">
        <div className="flex items-start gap-2">
          <h1 className="text-lg font-semibold tracking-tight">Viral Structure Analyzer</h1>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mt-0.5">Khả dụng</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
          Trích xuất cấu trúc Hook–Nhịp điệu–CTA từ nội dung viral đã được kiểm chứng, sau đó tái ứng dụng vào chủ đề của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nội dung viral cần phân tích</label>
          <textarea value={viralContent} onChange={e => setViralContent(e.target.value)} placeholder="Dán bài viết viral của đối thủ hoặc bất kỳ nội dung có lượt tương tác cao..." className="w-full h-44 resize-none rounded-lg border border-border/50 bg-background px-3.5 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all custom-scrollbar" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Chủ đề / sản phẩm của bạn</label>
          <textarea value={userTopic} onChange={e => setUserTopic(e.target.value)} placeholder="Mô tả sản phẩm, dịch vụ hoặc thông điệp bạn muốn áp vào cấu trúc đó..." className="w-full h-44 resize-none rounded-lg border border-border/50 bg-background px-3.5 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all custom-scrollbar" />
        </div>
      </div>

      <button onClick={handleRun} disabled={loading || !viralContent.trim() || !userTopic.trim()} className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground text-background text-sm font-medium py-2.5 hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
        {loading ? <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Đang phân tích cấu trúc...</> : "Phân tích & Tái ứng dụng"}
      </button>
      {error && <p className="text-xs text-red-500 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">{error}</p>}

      {result && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-3 gap-3">
            {[["Hook", result.dna_analysis.hook], ["Nhịp điệu thân bài", result.dna_analysis.body_rhythm], ["CTA", result.dna_analysis.cta]].map(([label, val]) => (
              <div key={label} className="rounded-lg border border-border/50 bg-background px-3.5 py-3 space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{val}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border/50 bg-background">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-xs font-medium">Nội dung đã tái cấu trúc</span></div>
              <button onClick={() => { navigator.clipboard.writeText(result.remixed_content); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">{copied ? "Đã sao chép" : "Sao chép"}</button>
            </div>
            <p className="px-4 py-4 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{result.remixed_content}</p>
          </div>
          {result.remix_tips.length > 0 && (
            <div className="rounded-lg border border-border/50 bg-background px-4 py-3 space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Đề xuất tối ưu thêm</p>
              {result.remix_tips.map((tip, i) => <div key={i} className="flex items-start gap-2.5"><span className="text-[10px] text-muted-foreground font-semibold tabular-nums shrink-0 mt-0.5">{String(i + 1).padStart(2, "0")}</span><p className="text-xs text-muted-foreground leading-relaxed">{tip}</p></div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
