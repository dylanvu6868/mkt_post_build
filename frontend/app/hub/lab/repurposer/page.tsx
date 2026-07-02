"use client";
import { useState } from "react";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { useLabTool } from "@/hooks/use-lab-tool";
import { useLabHistoryRestore } from "@/hooks/use-lab-history-restore";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, ResultBox, LabTextarea } from "@/components/lab-ui";
import { inp } from "@/lib/ui-tokens";

interface RepurposedPiece { format: string; content: string; adaptation_notes: string }
interface RepurposerResult { pieces: RepurposedPiece[]; cross_post_strategy: string }

const FORMAT_PRESETS = [
  "Facebook Post, TikTok Script, Email, Instagram Caption",
  "Facebook Post, LinkedIn Post, Email, Twitter Thread",
  "TikTok Script, Instagram Reels Script, YouTube Shorts Script",
  "Email, Landing Page Copy, Ad Copy",
];

export default function RepurposerPage() {
  const [content, setContent] = useLocalDraft("vitba_lab_draft_repurposer_content", "");
  const [formats, setFormats] = useLocalDraft("vitba_lab_draft_repurposer_formats", FORMAT_PRESETS[0]);
  const { run, result, setResult, loading, error } = useLabTool<RepurposerResult>("/repurposer");

  // Mở lại kết quả đã lưu từ trang Lịch sử (?hist={id})
  useLabHistoryRestore((item) => {
    const inp = item.input_data as Record<string, string> | null;
    if (inp) {
      if (inp.source_content !== undefined) setContent(String(inp.source_content));
      if (inp.target_formats !== undefined) setFormats(String(inp.target_formats));
    }
    if (item.output_data) setResult(item.output_data as unknown as RepurposerResult);
  });
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const copy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => { setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 2000); });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Content Repurposer" />
      <ToolHeader name="Content Repurposer" description="1 nội dung → nhiều định dạng (FB, TikTok, Email, Instagram...) trong 1 thao tác." tag="available" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <LabTextarea label="Nội dung gốc" value={content} onChange={setContent} placeholder="Dán nội dung gốc (blog, bài đăng, kịch bản)..." />
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Định dạng mục tiêu</label>
            <select value={formats} onChange={(e) => setFormats(e.target.value)} className={inp}>
              {FORMAT_PRESETS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <RunButton loading={loading} disabled={!content.trim()} onClick={() => run({ source_content: content, target_formats: formats })} loadingText="Đang chuyển đổi..." idleText="Tái sử dụng nội dung" />
          {error && <ErrorBox message={error} />}
        </div>
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              {result.pieces.map((p, i) => (
                <ResultBox
                  key={i}
                  title={p.format}
                  dotColor="bg-primary"
                  onCopy={() => copy(p.content, i)}
                  copied={copiedIdx === i}
                >
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap mb-2">{p.content}</p>
                  <p className="text-[11px] text-muted-foreground italic">{p.adaptation_notes}</p>
                </ResultBox>
              ))}
              <ResultBox title="Chiến lược đăng chéo" dotColor="bg-emerald-500">
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{result.cross_post_strategy}</p>
              </ResultBox>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground/40">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
              </div>
              <p className="text-xs text-muted-foreground/50 font-medium">Dán nội dung và nhấn "Tái sử dụng"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
