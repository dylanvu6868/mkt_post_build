"use client";
import { useState } from "react";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, LabTextarea, ScoreBar } from "@/components/lab-ui";

interface ShieldResult {
  risk_score: number;
  risk_reasons: string[];
  safe_versions: string[];
}

export default function ShieldPage() {
  const [content, setContent] = useLocalDraft("vitba_lab_draft_shield_content", "");
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
      <LabBreadcrumb tool="Content Safety Scanner" />
      <ToolHeader
        name="Content Safety Scanner"
        description="Phân tích và định lượng mức độ rủi ro ngôn ngữ trong nội dung. Xuất điểm rủi ro và tối thiểu 3 phiên bản thay thế an toàn."
        tag="available"
      />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <LabTextarea label="Nội dung cần kiểm tra" value={content} onChange={setContent} placeholder="Nhập nội dung bài viết cần phân tích rủi ro..." />
          <RunButton loading={loading} disabled={!content.trim()} onClick={handleRun} loadingText="Đang phân tích..." idleText="Phân tích nội dung" className="w-full" />
          {error && <ErrorBox message={error} />}
        </div>

        <div className="lg:col-span-3 space-y-4">
          {result && scoreLevel ? (
            <>
              <div className="lab-result-box">
                <div className="lab-result-header justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                    <span className="text-xs font-semibold text-foreground/80">Điểm rủi ro</span>
                  </div>
                  <span className={`text-sm font-semibold ${scoreLevel.color}`}>{scoreLevel.label}</span>
                </div>
                <div className="px-4 py-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1"><ScoreBar score={result.risk_score} max={100} colorClass={scoreLevel.bar} /></div>
                    <span className={`text-xl font-bold tabular-nums ${scoreLevel.color}`}>{result.risk_score}</span>
                  </div>
                  {result.risk_reasons.length > 0 && (
                    <div className="pt-2 border-t border-border/40 space-y-1.5">
                      <p className="lab-section-label">Lý do</p>
                      {result.risk_reasons.map((r, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
                          <p className="text-xs text-muted-foreground">{r}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="lab-section-label">Phiên bản thay thế an toàn</p>
                {result.safe_versions.map((ver, i) => (
                  <div key={i} className="lab-result-box">
                    <div className="lab-result-header">
                      <span className="text-[11px] font-medium text-muted-foreground">Phiên bản {i + 1}</span>
                      <button onClick={() => { navigator.clipboard.writeText(ver); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 2000); }} className="lab-copy-btn">
                        {copiedIdx === i ? "Đã sao chép" : "Sao chép"}
                      </button>
                    </div>
                    <p className="px-4 py-3 text-sm text-foreground/90 leading-relaxed">{ver}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="lab-empty-state">
              <div className="lab-empty-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
              </div>
              <p className="text-xs text-muted-foreground/50 font-medium">Kết quả phân tích sẽ xuất hiện tại đây</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
