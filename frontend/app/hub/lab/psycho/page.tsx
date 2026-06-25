"use client";
import { useState } from "react";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, ResultBox, LabTextarea, ChipGroup } from "@/components/lab-ui";

const EMOTIONS = [
  { id: "FOMO", label: "FOMO", desc: "S? b? l? co h?i" },
  { id: "Khan hi?m", label: "Khan hi?m", desc: "T?o c?m giác gi?i h?n, c?p bách" },
  { id: "Tò mò", label: "Tò mò", desc: "Kích thích mu?n khám phá thêm" },
  { id: "Tin tu?ng", label: "Tin tu?ng", desc: "Xây d?ng uy tín và d? tin c?y" },
  { id: "C?m h?ng", label: "C?m h?ng", desc: "Truy?n d?ng l?c hành d?ng" },
  { id: "Ðau di?m", label: "Ðau di?m", desc: "Ch?m vào v?n d? ngu?i d?c dang g?p" },
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
      <ToolHeader name="Emotion Trigger Optimizer" description="Tái c?u trúc n?i dung theo khung PAS (Problem–Agitate–Solve) d? kích ho?t chính xác ph?n ?ng c?m xúc m?c tiêu và tang t? l? chuy?n d?i." tag="available" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <ChipGroup label="C?m xúc m?c tiêu" options={EMOTIONS.map(e => ({ value: e.id, label: `${e.label} — ${e.desc}` }))} value={emotion} onChange={setEmotion} />
          <LabTextarea label="N?i dung g?c" value={content} onChange={setContent} placeholder="Dán n?i dung c?n t?i uu c?m xúc..." />
          <RunButton loading={loading} disabled={!content.trim()} onClick={handleRun} loadingText="Ðang x? lý..." idleText="T?i uu c?m xúc" className="w-full" />
          {error && <ErrorBox message={error} />}
        </div>
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              <ResultBox title="Phân tích" dotColor="bg-primary">
                <p className="text-xs text-muted-foreground leading-relaxed">{result.emotion_analysis}</p>
              </ResultBox>
              <ResultBox title="N?i dung dã t?i uu" dotColor="bg-emerald-500" onCopy={() => { navigator.clipboard.writeText(result.optimized_content); setCopied(true); setTimeout(() => setCopied(false), 2000); }} copied={copied}>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{result.optimized_content}</p>
              </ResultBox>
              {Object.keys(result.pas_breakdown).length > 0 && (
                <div className="lab-result-box">
                  <div className="lab-result-header"><span className="text-xs font-semibold text-foreground/80">Phân tích c?u trúc PAS</span></div>
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
              <p className="text-xs text-muted-foreground/50 font-medium">K?t qu? t?i uu s? xu?t hi?n t?i dây</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}