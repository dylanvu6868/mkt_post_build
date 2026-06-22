"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLabTool } from "@/hooks/use-lab-tool";

interface ShieldResult {
  risk_score: number;
  risk_reasons: string[];
  safe_versions: string[];
}

export default function ShieldPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const { run, result, loading, error } = useLabTool<ShieldResult>("/shield");

  async function handleRun() {
    if (!content.trim()) return;
    await run({ content });
  }

  const scoreLevel = result
    ? result.risk_score >= 70 ? { label: "Rủi ro cao", color: "text-red-500", bar: "bg-red-500" }
    : result.risk_score >= 40 ? { label: "Cần chú ý", color: "text-amber-500", bar: "bg-amber-500" }
    : { label: "An toàn", color: "text-emerald-500", bar: "bg-emerald-500" }
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => router.push("/hub/lab")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/></svg>
          Vitba Lab
        </button>
        <span className="text-border">/</span>
        <span className="text-foreground font-medium">Content Safety Scanner</span>
      </div>

      <div className="border-b border-border/50 pb-5">
        <div className="flex items-start gap-2">
          <h1 className="text-lg font-semibold tracking-tight">Content Safety Scanner</h1>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mt-0.5">Khả dụng</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
          Phân tích và định lượng mức độ rủi ro ngôn ngữ trong nội dung. Xuất điểm rủi ro và tối thiểu 3 phiên bản thay thế an toàn.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nội dung cần kiểm tra</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Nhập nội dung bài viết cần phân tích rủi ro..." className="w-full h-52 resize-none rounded-lg border border-border/50 bg-background px-3.5 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all custom-scrollbar" />
          </div>
          <button onClick={handleRun} disabled={loading || !content.trim()} className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground text-background text-sm font-medium py-2.5 hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            {loading ? <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Đang phân tích...</> : "Phân tích nội dung"}
          </button>
          {error && <p className="text-xs text-red-500 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">{error}</p>}
        </div>

        <div className="lg:col-span-3 space-y-4">
          {result && scoreLevel ? (
            <>
              <div className="rounded-lg border border-border/50 bg-background p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Điểm rủi ro</span>
                  <span className={`text-sm font-semibold ${scoreLevel.color}`}>{scoreLevel.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${scoreLevel.bar}`} style={{ width: `${result.risk_score}%` }} />
                  </div>
                  <span className={`text-xl font-bold tabular-nums ${scoreLevel.color}`}>{result.risk_score}</span>
                </div>
                {result.risk_reasons.length > 0 && (
                  <div className="pt-2 border-t border-border/40 space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Lý do</p>
                    {result.risk_reasons.map((r, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
                        <p className="text-xs text-muted-foreground">{r}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phiên bản thay thế an toàn</p>
                {result.safe_versions.map((ver, i) => (
                  <div key={i} className="rounded-lg border border-border/50 bg-background">
                    <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/40">
                      <span className="text-[11px] font-medium text-muted-foreground">Phiên bản {i + 1}</span>
                      <button onClick={() => { navigator.clipboard.writeText(ver); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 2000); }} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                        {copiedIdx === i ? "Đã sao chép" : "Sao chép"}
                      </button>
                    </div>
                    <p className="px-3.5 py-3 text-sm text-foreground/90 leading-relaxed">{ver}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-full min-h-[320px] rounded-lg border border-dashed border-border/40 flex flex-col items-center justify-center gap-2.5 text-muted-foreground/30">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              <p className="text-xs">Kết quả phân tích sẽ xuất hiện tại đây</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
