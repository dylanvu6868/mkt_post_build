"use client";
import { useState } from "react";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { useLabTool } from "@/hooks/use-lab-tool";
import { useLabHistoryRestore } from "@/hooks/use-lab-history-restore";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, LabTextarea, ChipGroup } from "@/components/lab-ui";


const PLATFORMS = ["Facebook", "TikTok", "Instagram", "LinkedIn", "Twitter/X"];
interface Issue { issue: string; fix: string; }
interface HexResult { reach_score: number; issues: Issue[]; optimized_content: string; hashtag_suggestions: string[]; }

export default function HexBreakerPage() {const [content, setContent] = useLocalDraft("vitba_lab_draft_hexbreaker_content", "");
  const [platform, setPlatform] = useLocalDraft("vitba_lab_draft_hexbreaker_platform", "Facebook");
  const [copied, setCopied] = useState(false);
  const { run, result, setResult, loading, error } = useLabTool<HexResult>("/hexbreaker");

  // Mở lại kết quả đã lưu từ trang Lịch sử (?hist={id})
  useLabHistoryRestore((item) => {
    const inp = item.input_data as Record<string, string> | null;
    if (inp) {
      if (inp.content !== undefined) setContent(String(inp.content));
      if (inp.platform !== undefined) setPlatform(String(inp.platform));
    }
    if (item.output_data) setResult(item.output_data as unknown as HexResult);
  });

  async function handleRun() {
    if (!content.trim()) return;
    await run({ content, platform });
  }

  const scoreColor = result ? (result.reach_score >= 70 ? "text-emerald-500" : result.reach_score >= 40 ? "text-amber-500" : "text-red-500") : "";
  const barColor = result ? (result.reach_score >= 70 ? "bg-emerald-500" : result.reach_score >= 40 ? "bg-amber-500" : "bg-red-500") : "";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Organic Reach Optimizer" />
      <ToolHeader name="Organic Reach Optimizer" description="Phân tích các tác nhân giảm phạm vi tiếp cận tự nhiên và tái cấu trúc nội dung để tối đa hiệu suất phân phối theo thuật toán." tag="available" />


      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nền tảng</label>
        <div className="flex gap-1.5">
          {PLATFORMS.map(p => <button key={p} onClick={() => setPlatform(p)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${platform === p ? "border-foreground/30 bg-foreground/5 text-foreground" : "border-border/50 text-muted-foreground hover:border-border"}`}>{p}</button>)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nội dung cần tối ưu</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder={`Dán nội dung ${platform} cần cải thiện phạm vi tiếp cận...`} className="w-full h-52 resize-none rounded-lg border border-border/50 bg-background px-3.5 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all custom-scrollbar" />
          </div>
          <RunButton loading={loading} disabled={!content.trim()} onClick={handleRun} loadingText="Vitba Tool" idleText="Chạy" className="w-full" />
          {error && <ErrorBox message={error} />}
          {result && (
            <div className="rounded-lg border border-border/50 bg-background p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Điểm reach dự đoán</span>
                <span className={`text-lg font-bold tabular-nums ${scoreColor}`}>{result.reach_score}<span className="text-xs font-normal text-muted-foreground">/100</span></span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${result.reach_score}%` }} />
              </div>
              {result.hashtag_suggestions.length > 0 && (
                <div className="pt-2 border-t border-border/40">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Hashtag đề xuất</p>
                  <div className="flex flex-wrap gap-1">
                    {result.hashtag_suggestions.map((tag, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              {result.issues.length > 0 && (
                <div className="rounded-lg border border-border/50 bg-background px-4 py-3 space-y-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Vấn đề phát hiện</p>
                  {result.issues.map((iss, i) => (
                    <div key={i} className="grid grid-cols-2 gap-3 pb-3 border-b border-border/30 last:border-0 last:pb-0">
                      <div><p className="text-[10px] text-amber-500 font-semibold uppercase mb-0.5">Vấn đề</p><p className="text-xs text-foreground/80">{iss.issue}</p></div>
                      <div><p className="text-[10px] text-emerald-500 font-semibold uppercase mb-0.5">Giải pháp</p><p className="text-xs text-foreground/80">{iss.fix}</p></div>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-lg border border-border/50 bg-background">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-xs font-medium">Nội dung đã tối ưu</span></div>
                  <button onClick={() => { navigator.clipboard.writeText(result.optimized_content); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">{copied ? "Đã sao chép" : "Sao chép"}</button>
                </div>
                <p className="px-4 py-4 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{result.optimized_content}</p>
              </div>
            </>
          ) : (
            <div className="h-full min-h-[320px] rounded-lg border border-dashed border-border/40 flex flex-col items-center justify-center gap-2.5 text-muted-foreground/30">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
              <p className="text-xs">Kết quả phân tích sẽ xuất hiện tại đây</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
