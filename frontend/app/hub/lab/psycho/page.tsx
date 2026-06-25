"use client";
import { useState } from "react";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, ResultBox, LabTextarea, ChipGroup } from "@/components/lab-ui";

const EMOTIONS = [
  { id: "FOMO", label: "FOMO", desc: "Sợ bỏ lỡ cơ hội" },
  { id: "Khan hiếm", label: "Khan hiếm", desc: "Tạo cảm giác giới hạn, cấp bách" },
  { id: "Tò mò", label: "Tò mò", desc: "Kích thích muốn khám phá thêm" },
  { id: "Tin tưởng", label: "Tin tưởng", desc: "Xây dựng uy tín và độ tin cậy" },
  { id: "Cảm hứng", label: "Cảm hứng", desc: "Truyền động lực hành động" },
  { id: "Đau điểm", label: "Đau điểm", desc: "Chạm vào vấn đề người đọc đang gặp" },
];

interface PsychoResult {
  emotion_analysis: string;
  optimized_content: string;
  pas_breakdown: Record<string, string>;
}

export default function PsychoPage() {
  const [content, setContent] = useState("");
  const [emotion, setEmotion] = useState(EMOTIONS[0].id);
  const [copied, setCopied] = useState(false);
  const { run, result, loading, error } = useLabTool<PsychoResult>("/psycho");

  async function handleRun() {
    if (!content.trim()) return;
    await run({ content, target_emotion: emotion });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Emotion Trigger Optimizer" />
      <ToolHeader name="Emotion Trigger Optimizer" description="Tái cấu trúc nội dung theo khung PAS (Problem→Agitate→Solve) để kích hoạt chính xác phản ứng cảm xúc mục tiêu và tăng tỷ lệ chuyển đổi." tag="available" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <ChipGroup label="Cảm xúc mục tiêu" options={EMOTIONS.map(e => ({ value: e.id, label: `${e.label} — ${e.desc}` }))} value={emotion} onChange={setEmotion} />
          <LabTextarea label="Nội dung gốc" value={content} onChange={setContent} placeholder="Dán nội dung cần tối ưu cảm xúc..." />
          <RunButton loading={loading} disabled={!content.trim()} onClick={handleRun} loadingText="Đang xử lý..." idleText="Tối ưu cảm xúc" className="w-full" />
          {error && <ErrorBox message={error} />}
        </div>
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              <ResultBox title="Phân tích" dotColor="bg-primary">
                <p className="text-xs text-muted-foreground leading-relaxed">{result.emotion_analysis}</p>
              </ResultBox>
              <ResultBox title="Nội dung đã tối ưu" dotColor="bg-emerald-500" onCopy={() => { navigator.clipboard.writeText(result.optimized_content); setCopied(true); setTimeout(() => setCopied(false), 2000); }} copied={copied}>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{result.optimized_content}</p>
              </ResultBox>
              {Object.keys(result.pas_breakdown).length > 0 && (
                <div className="lab-result-box">
                  <div className="lab-result-header"><span className="text-xs font-semibold text-foreground/80">Phân tích cấu trúc PAS</span></div>
                  <div className="px-4 py-4 space-y-2.5">
                    {Object.entries(result.pas_breakdown).map(([key, val]) => (
                      <div key={key}>
                        <p className="lab-section-label mb-0.5">{key}</p>
                        <p className="text-xs text-foreground/80 leading-relaxed">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="lab-empty-state">
              <div className="lab-empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" /><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" /></svg></div>
              <p className="text-xs text-muted-foreground/50 font-medium">Kết quả tối ưu sẽ xuất hiện tại đây</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
