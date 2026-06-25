"use client";
import { useState } from "react";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, ResultBox, LabTextarea, LabInput, ChipGroup } from "@/components/lab-ui";
import { inp } from "@/lib/ui-tokens";

interface ABTestResult {
  winner: string;
  winner_reason: string;
  score_a: number;
  score_b: number;
  predicted_engagement_a: string;
  predicted_engagement_b: string;
  improvement_suggestions: string[];
}

export default function ABTestPage() {
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");
  const [platform, setPlatform] = useState<"Facebook" | "TikTok" | "Instagram" | "LinkedIn">("Facebook");
  const { run, result, loading, error } = useLabTool<ABTestResult>("/abtest");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="A/B Test Lab" />
      <ToolHeader name="A/B Test Lab" description="Đánh giá 2 variant nội dung, chấm điểm, chọn winner và gợi ý cải thiện." tag="available" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <LabTextarea label="Variant A" value={variantA} onChange={setVariantA} placeholder="Dán variant A..." rows={40} />
        </div>
        <div className="space-y-4">
          <LabTextarea label="Variant B" value={variantB} onChange={setVariantB} placeholder="Dán variant B..." rows={40} />
        </div>
      </div>
      <div className="space-y-4">
        <ChipGroup
          label="Nền tảng"
          options={[
            { value: "Facebook", label: "Facebook" },
            { value: "TikTok", label: "TikTok" },
            { value: "Instagram", label: "Instagram" },
            { value: "LinkedIn", label: "LinkedIn" },
          ]}
          value={platform}
          onChange={setPlatform}
        />
        <RunButton loading={loading} disabled={!variantA.trim() || !variantB.trim()} onClick={() => run({ variant_a: variantA, variant_b: variantB, platform })} loadingText="Đang đánh giá..." idleText="Chạy A/B Test" />
        {error && <ErrorBox message={error} />}
      </div>
      {result && (
        <div className="space-y-4">
          <div className={`rounded-2xl border p-5 ${result.winner === "A" ? "border-primary/30 bg-primary/5" : "border-border/50 bg-card/30"}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-foreground">Variant {result.winner} chiến thắng</span>
              <span className="text-2xl font-black text-primary">{result.winner === "A" ? result.score_a : result.score_b}/100</span>
            </div>
            <p className="text-sm text-muted-foreground">{result.winner_reason}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground">Variant A</span>
                <span className={`text-lg font-bold ${result.score_a >= 70 ? "text-emerald-500" : result.score_a >= 50 ? "text-amber-500" : "text-red-500"}`}>{result.score_a}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{result.predicted_engagement_a}</p>
            </div>
            <div className="rounded-xl border border-border/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground">Variant B</span>
                <span className={`text-lg font-bold ${result.score_b >= 70 ? "text-emerald-500" : result.score_b >= 50 ? "text-amber-500" : "text-red-500"}`}>{result.score_b}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{result.predicted_engagement_b}</p>
            </div>
          </div>
          <ResultBox title="Gợi ý cải thiện" dotColor="bg-amber-500">
            <ul className="space-y-2 text-sm text-foreground/90">
              {result.improvement_suggestions.map((s, i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span> {s}</li>)}
            </ul>
          </ResultBox>
        </div>
      )}
    </div>
  );
}
