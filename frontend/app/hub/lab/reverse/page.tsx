"use client";
import { useState } from "react";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, LabTextarea, ChipGroup } from "@/components/lab-ui";


interface ReverseResult { analysis: string; reversed_hook: string; reversed_content: string; psychology_used: string; }

export default function ReversePage() {
  const [content, setContent] = useLocalDraft("vitba_lab_draft_reverse_content", "");
  const [copied, setCopied] = useState(false);
  const { run, result, loading, error } = useLabTool<ReverseResult>("/reverse");

  async function handleRun() {
    if (!content.trim()) return;
    await run({ content });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Reverse Psychology Engine" />
      <ToolHeader name="Reverse Psychology Engine" description="Chuyển đổi thông điệp marketing trực tiếp thành chiến thuật kích thích phản kháng tâm lý — tạo sức hút bằng cách thách thức thay vì thuyết phục." tag="available" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <LabTextarea label="Nội dung gốc (thông điệp trực tiếp)" value={content} onChange={setContent} placeholder="Dán nội dung quảng cáo thông thường cần chuyển đổi..." />
          <RunButton loading={loading} disabled={!content.trim()} onClick={handleRun} loadingText="Đang xử lý..." idleText="Áp dụng tâm lý ngược" className="w-full" />
          {error && <ErrorBox message={error} />}
        </div>
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              <div className="rounded-lg border border-border/50 bg-background px-4 py-3 space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Chiến thuật được áp dụng</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{result.psychology_used}</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-background px-4 py-3 space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Hook mới</p>
                <p className="text-sm font-medium text-foreground italic">"{result.reversed_hook}"</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-background">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-xs font-medium">Nội dung đã chuyển đổi</span></div>
                  <button onClick={() => { navigator.clipboard.writeText(result.reversed_content); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">{copied ? "Đã sao chép" : "Sao chép"}</button>
                </div>
                <p className="px-4 py-4 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{result.reversed_content}</p>
              </div>
            </>
          ) : (
            <div className="h-full min-h-[320px] rounded-lg border border-dashed border-border/40 flex flex-col items-center justify-center gap-2.5 text-muted-foreground/30">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
              <p className="text-xs">Kết quả sẽ xuất hiện tại đây</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
