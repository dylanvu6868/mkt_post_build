"use client";
import { useState } from "react";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, ResultBox, LabInput, ChipGroup } from "@/components/lab-ui";

interface InfluencerProfile { tier: string; follower_range: string; profile_description: string; content_style: string; estimated_cost: string }
interface InfluencerResult {
  recommended_profiles: InfluencerProfile[];
  brief_template: string;
  outreach_script: string;
  kpi_to_track: string[];
}

export default function InfluencerPage() {
  const [niche, setNiche] = useState("");
  const [budget, setBudget] = useState("5-20 triệu VND");
  const [platform, setPlatform] = useState<"TikTok" | "Instagram" | "Facebook" | "YouTube">("TikTok");
  const { run, result, loading, error } = useLabTool<InfluencerResult>("/influencer");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Influencer Match" />
      <ToolHeader name="Influencer Match" description="Đề xuất profile influencer phù hợp + template brief + kịch bản tiếp cận + KPI." tag="available" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <LabInput label="Ngành nghề" value={niche} onChange={setNiche} placeholder="VD: Mỹ phẩm, F&B, Tech..." />
          <LabInput label="Ngân sách" value={budget} onChange={setBudget} placeholder="VD: 5-20 triệu VND" />
          <ChipGroup
            label="Nền tảng"
            options={[
              { value: "TikTok", label: "TikTok" },
              { value: "Instagram", label: "Instagram" },
              { value: "Facebook", label: "Facebook" },
              { value: "YouTube", label: "YouTube" },
            ]}
            value={platform}
            onChange={setPlatform}
          />
          <RunButton loading={loading} disabled={!niche.trim()} onClick={() => run({ niche, budget, platform })} loadingText="Đang tìm match..." idleText="Tìm influencer" />
          {error && <ErrorBox message={error} />}
        </div>
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              {result.recommended_profiles.map((p, i) => (
                <div key={i} className="rounded-xl border border-border/40 bg-card/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{p.tier}</span>
                    <span className="text-xs text-muted-foreground">{p.follower_range}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">{p.profile_description}</p>
                  <p className="text-[11px] text-muted-foreground mb-1">Phong cách: {p.content_style}</p>
                  <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{p.estimated_cost}</p>
                </div>
              ))}
              <ResultBox title="Template Brief" dotColor="bg-primary">
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{result.brief_template}</p>
              </ResultBox>
              <ResultBox title="Kịch bản tiếp cận" dotColor="bg-primary">
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{result.outreach_script}</p>
              </ResultBox>
              <ResultBox title="KPI cần theo dõi" dotColor="bg-emerald-500">
                <div className="flex flex-wrap gap-2">
                  {result.kpi_to_track.map((k, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">{k}</span>)}
                </div>
              </ResultBox>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground/40">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <p className="text-xs text-muted-foreground/50 font-medium">Nhập thông tin để tìm influencer phù hợp</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
