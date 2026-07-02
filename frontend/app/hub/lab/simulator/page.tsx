"use client";
import { useState } from "react";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, LabTextarea, ChipGroup } from "@/components/lab-ui";


interface Comment { type: string; content: string; }
interface SimResult { overall_sentiment: string; positive_pct: number; negative_pct: number; comments: Comment[]; crisis_advice: string; }

const TYPE_MAP: Record<string, { label: string; dot: string }> = {
  fan: { label: "Ủng hộ", dot: "bg-emerald-500" },
  hater: { label: "Phản đối", dot: "bg-red-500" },
  neutral: { label: "Trung lập", dot: "bg-muted-foreground" },
  question: { label: "Thắc mắc", dot: "bg-primary" },
};

export default function SimulatorPage() {const [content, setContent] = useLocalDraft("vitba_lab_draft_simulator_content", "");
  const [filter, setFilter] = useState<string>("all");
  const { run, result, loading, error } = useLabTool<SimResult>("/simulator");

  async function handleRun() {
    if (!content.trim()) return;
    await run({ content });
  }

  const filtered = result?.comments.filter(c => filter === "all" || c.type === filter) ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Audience Response Simulator" />
      <ToolHeader name="Audience Response Simulator" description="Mô phỏng phản ứng của 20 nhóm người dùng khác nhau trước khi đăng tải. Đánh giá chỉ số sentiment và nhận kịch bản xử lý rủi ro." tag="available" />


      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <LabTextarea label="Nội dung" value={content} onChange={setContent} placeholder="Nhập nội dung..." />
          <RunButton loading={loading} disabled={!content.trim()} onClick={handleRun} loadingText="Vitba Tool" idleText="Chạy" className="w-full" />
          {error && <ErrorBox message={error} />}
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
