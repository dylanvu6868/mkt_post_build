"use client";
import { useState } from "react";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, LabTextarea, ChipGroup } from "@/components/lab-ui";


const REGIONS = ["Toàn quốc", "Miền Bắc", "Miền Trung", "Miền Nam", "Tây Nguyên", "Đồng bằng sông Cửu Long"];
interface CulturalRisk { region: string; risk_description: string; severity: string; }
interface BlindspotResult { overall_safe: boolean; cultural_risks: CulturalRisk[]; safe_rewrite: string; localization_tips: string[]; }

const SEVERITY_COLOR: Record<string, string> = {
  "Thấp": "text-emerald-500", "Trung bình": "text-amber-500", "Cao": "text-red-500", "Nguy hiểm": "text-red-600",
};

export default function BlindspotPage() {const [content, setContent] = useLocalDraft("vitba_lab_draft_blindspot_content", "");
  const [region, setRegion] = useLocalDraft("vitba_lab_draft_blindspot_region", REGIONS[0]);
  const [copied, setCopied] = useState(false);
  const { run, result, loading, error } = useLabTool<BlindspotResult>("/blindspot");

  async function handleRun() {
    if (!content.trim()) return;
    await run({ content, target_region: region });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Cultural Risk Detector" />
      <ToolHeader name="Cultural Risk Detector" description="Phát hiện các lỗi ngôn ngữ, hàm ý văn hoá và tín ngưỡng vùng miền có thể gây hiểu lầm hoặc xúc phạm nhóm đối tượng cụ thể." tag="available" />


      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Khu vực mục tiêu</label>
        <div className="flex gap-1.5 flex-wrap">
          {REGIONS.map(r => <button key={r} onClick={() => setRegion(r)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${region === r ? "border-foreground/30 bg-foreground/5 text-foreground" : "border-border/50 text-muted-foreground hover:border-border"}`}>{r}</button>)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <LabTextarea label="Nội dung" value={content} onChange={setContent} placeholder="Nhập nội dung..." />
          <RunButton loading={loading} disabled={!content.trim()} onClick={handleRun} loadingText="Vitba Tool" idleText="Chạy" className="w-full" />
          {error && <ErrorBox message={error} />}
        </div>

        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              <div className={`rounded-lg border px-4 py-3 flex items-center gap-2 ${result.overall_safe ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                <div className={`w-2 h-2 rounded-full ${result.overall_safe ? "bg-emerald-500" : "bg-amber-500"}`} />
                <p className={`text-xs font-semibold ${result.overall_safe ? "text-emerald-500" : "text-amber-500"}`}>
                  {result.overall_safe ? "Nội dung an toàn — không phát hiện rủi ro văn hoá" : `Phát hiện ${result.cultural_risks.length} vấn đề văn hoá cần lưu ý`}
                </p>
              </div>
              {result.cultural_risks.map((risk, i) => (
                <div key={i} className="rounded-lg border border-border/50 bg-background px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold">{risk.region}</p>
                    <span className={`text-[10px] font-semibold uppercase ${SEVERITY_COLOR[risk.severity] ?? "text-muted-foreground"}`}>{risk.severity}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{risk.risk_description}</p>
                </div>
              ))}
              <div className="rounded-lg border border-border/50 bg-background">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-xs font-medium">Phiên bản an toàn toàn quốc</span></div>
                  <button onClick={() => { navigator.clipboard.writeText(result.safe_rewrite); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">{copied ? "Đã sao chép" : "Sao chép"}</button>
                </div>
                <p className="px-4 py-4 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{result.safe_rewrite}</p>
              </div>
            </>
          ) : (
            <div className="h-full min-h-[320px] rounded-lg border border-dashed border-border/40 flex flex-col items-center justify-center gap-2.5 text-muted-foreground/30">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>
              <p className="text-xs">Kết quả phân tích sẽ xuất hiện tại đây</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
