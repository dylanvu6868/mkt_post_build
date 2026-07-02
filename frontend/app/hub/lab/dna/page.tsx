"use client";
import { useState } from "react";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { useLabTool } from "@/hooks/use-lab-tool";
import { useLabHistoryRestore } from "@/hooks/use-lab-history-restore";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, ResultBox, LabTextarea } from "@/components/lab-ui";

interface DNAResult {
  dna_analysis: { hook: string; body_rhythm: string; cta: string };
  remixed_content: string;
  remix_tips: string[];
}

export default function DNAPage() {
  const [viralContent, setViralContent] = useLocalDraft("vitba_lab_draft_dna_viralContent", "");
  const [userTopic, setUserTopic] = useLocalDraft("vitba_lab_draft_dna_userTopic", "");
  const [copied, setCopied] = useState(false);
  const { run, result, setResult, loading, error } = useLabTool<DNAResult>("/dna");

  // Mở lại kết quả đã lưu từ trang Lịch sử (?hist={id})
  useLabHistoryRestore((item) => {
    const inp = item.input_data as Record<string, string> | null;
    if (inp) {
      if (inp.viral_content !== undefined) setViralContent(String(inp.viral_content));
      if (inp.user_topic !== undefined) setUserTopic(String(inp.user_topic));
    }
    if (item.output_data) setResult(item.output_data as unknown as DNAResult);
  });

  async function handleRun() {
    if (!viralContent.trim() || !userTopic.trim()) return;
    await run({ viral_content: viralContent, user_topic: userTopic });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Viral Structure Analyzer" />
      <ToolHeader name="Viral Structure Analyzer" description="Trích xuất cấu trúc Hook–Nhịp điệu–CTA từ nội dung viral đã được kiểm chứng, sau đó tái ứng dụng vào chủ đề của bạn." tag="available" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <LabTextarea label="Nội dung viral cần phân tích" value={viralContent} onChange={setViralContent} placeholder="Dán bài viết viral của đối thủ hoặc bất kỳ nội dung có lượt tương tác cao..." />
        <LabTextarea label="Chủ đề / sản phẩm của bạn" value={userTopic} onChange={setUserTopic} placeholder="Mô tả sản phẩm, dịch vụ hoặc thông điệp bạn muốn áp vào cấu trúc đó..." />
      </div>
      <RunButton loading={loading} disabled={!viralContent.trim() || !userTopic.trim()} onClick={handleRun} loadingText="Đang phân tích cấu trúc..." idleText="Giải mã DNA Viral" className="w-full" />
      {error && <ErrorBox message={error} />}

      {result ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="lab-result-box"><div className="lab-result-header"><span className="text-xs font-semibold text-foreground/80">Hook</span></div><p className="px-4 py-3 text-xs text-foreground/90">{result.dna_analysis.hook}</p></div>
            <div className="lab-result-box"><div className="lab-result-header"><span className="text-xs font-semibold text-foreground/80">Nhịp điệu</span></div><p className="px-4 py-3 text-xs text-foreground/90">{result.dna_analysis.body_rhythm}</p></div>
            <div className="lab-result-box"><div className="lab-result-header"><span className="text-xs font-semibold text-foreground/80">CTA</span></div><p className="px-4 py-3 text-xs text-foreground/90">{result.dna_analysis.cta}</p></div>
          </div>
          <ResultBox title="Nội dung đã tái cấu trúc" dotColor="bg-emerald-500" onCopy={() => { navigator.clipboard.writeText(result.remixed_content); setCopied(true); setTimeout(() => setCopied(false), 2000); }} copied={copied}>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{result.remixed_content}</p>
          </ResultBox>
          <ResultBox title="Mẹo tối ưu" dotColor="bg-primary">
            <ul className="space-y-1.5 text-sm text-foreground/90">
              {result.remix_tips.map((t, i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span> {t}</li>)}
            </ul>
          </ResultBox>
        </div>
      ) : (
        <div className="lab-empty-state">
          <div className="lab-empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m10.5 20.5 1-1.5"/><path d="m13.5 3.5-1 1.5"/><path d="M12 21A4.5 4.5 0 0 1 7.5 16.5c0-1.28.53-2.43 1.38-3.26a4.52 4.52 0 0 0 0-6.48 4.5 4.5 0 0 1-1.38-3.26A4.5 4.5 0 0 1 12 3a4.5 4.5 0 0 1 4.5 4.5c0 1.28-.53 2.43-1.38 3.26a4.52 4.52 0 0 0 0 6.48 4.5 4.5 0 0 1 1.38 3.26A4.5 4.5 0 0 1 12 21Z"/></svg></div>
          <p className="text-xs text-muted-foreground/50 font-medium">Kết quả phân tích sẽ xuất hiện tại đây</p>
        </div>
      )}
    </div>
  );
}
