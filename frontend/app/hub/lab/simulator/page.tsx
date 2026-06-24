"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLabTool } from "@/hooks/use-lab-tool";

interface Comment { type: string; content: string; }
interface SimResult { overall_sentiment: string; positive_pct: number; negative_pct: number; comments: Comment[]; crisis_advice: string; }

const TYPE_MAP: Record<string, { label: string; dot: string }> = {
  fan: { label: "Ủng hộ", dot: "bg-emerald-500" },
  hater: { label: "Phản đối", dot: "bg-red-500" },
  neutral: { label: "Trung lập", dot: "bg-muted-foreground" },
  question: { label: "Thắc mắc", dot: "bg-primary" },
};

export default function SimulatorPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const { run, result, loading, error } = useLabTool<SimResult>("/simulator");

  async function handleRun() {
    if (!content.trim()) return;
    await run({ content });
  }

  const filtered = result?.comments.filter(c => filter === "all" || c.type === filter) ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => router.push("/hub/lab")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2v7.31" /><path d="M14 9.3V1.99" /><path d="M8.5 2h7" /><path d="M14 9.3a6.5 6.5 0 1 1-4 0" /><path d="M5.52 16h12.96" /></svg>
          Vitba Lab
        </button>
        <span className="text-border">/</span>
        <span className="text-foreground font-medium">Audience Response Simulator</span>
      </div>

      <div className="border-b border-border/50 pb-5">
        <div className="flex items-start gap-2">
          <h1 className="text-lg font-semibold tracking-tight">Audience Response Simulator</h1>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mt-0.5">Khả dụng</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
          Mô phỏng phản ứng của 20 nhóm người dùng khác nhau trước khi đăng tải. Đánh giá chỉ số sentiment và nhận kịch bản xử lý rủi ro.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nội dung cần kiểm định</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Dán nội dung bài viết chuẩn bị đăng tải..." className="w-full h-52 resize-none rounded-lg border border-border/50 bg-background px-3.5 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all custom-scrollbar" />
          </div>
          <button onClick={handleRun} disabled={loading || !content.trim()} className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground text-background text-sm font-medium py-2.5 hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            {loading ? <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Đang mô phỏng...</> : "Chạy mô phỏng"}
          </button>
          {error && <p className="text-xs text-red-500 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">{error}</p>}
          {result && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border/50 bg-background p-4 space-y-2.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sentiment overview</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${result.positive_pct}%` }} />
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-500 font-medium">{result.positive_pct}% Tích cực</span>
                  <span className="text-red-500 font-medium">{result.negative_pct}% Tiêu cực</span>
                </div>
                <p className="text-xs font-semibold text-foreground">{result.overall_sentiment}</p>
              </div>
              {result.crisis_advice && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3.5 py-3 space-y-1">
                  <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Cảnh báo rủi ro</p>
                  <p className="text-xs text-foreground/80 leading-relaxed">{result.crisis_advice}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-3 space-y-3">
          {result ? (
            <>
              <div className="flex items-center gap-2">
                {["all", "fan", "hater", "neutral", "question"].map(f => (
                  <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${filter === f ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {f === "all" ? "Tất cả" : TYPE_MAP[f]?.label ?? f}
                  </button>
                ))}
              </div>
              <div className="space-y-2 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
                {filtered.map((c, i) => {
                  const meta = TYPE_MAP[c.type] ?? { label: c.type, dot: "bg-muted-foreground" };
                  return (
                    <div key={i} className="rounded-lg border border-border/50 bg-background px-3.5 py-3 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{meta.label}</span>
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed">{c.content}</p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-full min-h-[320px] rounded-lg border border-dashed border-border/40 flex flex-col items-center justify-center gap-2.5 text-muted-foreground/30">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              <p className="text-xs">Kết quả mô phỏng sẽ xuất hiện tại đây</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
