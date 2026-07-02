"use client";
import { useState } from "react";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { useLabTool } from "@/hooks/use-lab-tool";
import { useLabHistoryRestore } from "@/hooks/use-lab-history-restore";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, LabTextarea, ChipGroup } from "@/components/lab-ui";


interface TrendResult { trend_analysis: string; injected_content: string; trend_keywords: string[]; timing_advice: string; }

export default function TrendJackPage() {const [content, setContent] = useLocalDraft("vitba_lab_draft_trendjack_content", "");
  const [trends, setTrends] = useLocalDraft("vitba_lab_draft_trendjack_trends", "");
  const [copied, setCopied] = useState(false);
  const { run, result, setResult, loading, error } = useLabTool<TrendResult>("/trendjack");

  // Mở lại kết quả đã lưu từ trang Lịch sử (?hist={id})
  useLabHistoryRestore((item) => {
    const inp = item.input_data as Record<string, string> | null;
    if (inp) {
      if (inp.content !== undefined) setContent(String(inp.content));
      if (inp.current_trends !== undefined) setTrends(String(inp.current_trends));
    }
    if (item.output_data) setResult(item.output_data as unknown as TrendResult);
  });

  async function handleRun() {
    if (!content.trim()) return;
    await run({ content, current_trends: trends });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Trend Integration Engine" />
      <ToolHeader name="Trend Integration Engine" description="Tích hợp từ khoá và xu hướng đang viral vào nội dung hiện có mà không làm mất tính nhất quán của thông điệp." tag="available" />


      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Xu hướng hiện tại</label>
            <textarea value={trends} onChange={e => setTrends(e.target.value)} placeholder="Nhập các từ khoá, hashtag, meme hoặc xu hướng đang hot để tích hợp vào nội dung..." className="w-full h-24 resize-none rounded-lg border border-border/50 bg-background px-3.5 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all custom-scrollbar" />
          </div>
          <LabTextarea label="Nội dung" value={content} onChange={setContent} placeholder="Nhập nội dung..." />
          <RunButton loading={loading} disabled={!content.trim()} onClick={handleRun} loadingText="Vitba Tool" idleText="Chạy" className="w-full" />
          {error && <ErrorBox message={error} />}
        </div>

        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              <div className="rounded-lg border border-border/50 bg-background px-4 py-3 space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Phân tích xu hướng</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{result.trend_analysis}</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-background">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-xs font-medium">Nội dung đã tích hợp xu hướng</span></div>
                  <button onClick={() => { navigator.clipboard.writeText(result.injected_content); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">{copied ? "Đã sao chép" : "Sao chép"}</button>
                </div>
                <p className="px-4 py-4 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{result.injected_content}</p>
              </div>
              {result.trend_keywords.length > 0 && (
                <div className="rounded-lg border border-border/50 bg-background px-4 py-3 space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Từ khoá trend đã tích hợp</p>
                  <div className="flex flex-wrap gap-1.5">{result.trend_keywords.map((kw, i) => <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{kw}</span>)}</div>
                </div>
              )}
              <div className="rounded-lg border border-border/50 bg-background px-4 py-3 space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Thời điểm đăng tối ưu</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{result.timing_advice}</p>
              </div>
            </>
          ) : (
            <div className="h-full min-h-[320px] rounded-lg border border-dashed border-border/40 flex flex-col items-center justify-center gap-2.5 text-muted-foreground/30">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
              <p className="text-xs">Kết quả sẽ xuất hiện tại đây</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
