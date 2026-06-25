"use client";
import { useState } from "react";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, ResultBox, LabInput, ChipGroup } from "@/components/lab-ui";

interface HashtagGroup { category: string; hashtags: string[]; purpose: string }
interface HashtagResult {
  groups: HashtagGroup[];
  recommended_mix: string;
  trending_now: string[];
  avoid_list: string[];
}

const GROUP_COLORS: Record<string, string> = {
  Primary: "bg-primary",
  Secondary: "bg-primary/60",
  Niche: "bg-emerald-500",
};

export default function HashtagPage() {
  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState<"Facebook" | "TikTok" | "Instagram" | "YouTube">("Facebook");
  const [region, setRegion] = useState("Việt Nam");
  const { run, result, loading, error } = useLabTool<HashtagResult>("/hashtag");
  const [copied, setCopied] = useState(false);

  const copyMix = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.recommended_mix).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Hashtag Universe" />
      <ToolHeader name="Hashtag Universe" description="Vũ trụ hashtag theo framework 3-6-3 + trend VN + danh sách nên tránh." tag="available" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <LabInput label="Ngành nghề" value={niche} onChange={setNiche} placeholder="VD: Cà phê, Fitness, SaaS..." />
          <ChipGroup
            label="Nền tảng"
            options={[
              { value: "Facebook", label: "Facebook" },
              { value: "TikTok", label: "TikTok" },
              { value: "Instagram", label: "Instagram" },
              { value: "YouTube", label: "YouTube" },
            ]}
            value={platform}
            onChange={setPlatform}
          />
          <LabInput label="Khu vực" value={region} onChange={setRegion} placeholder="Việt Nam" />
          <RunButton loading={loading} disabled={!niche.trim()} onClick={() => run({ niche, platform, region })} loadingText="Đang xây vũ trụ..." idleText="Xây vũ trụ hashtag" />
          {error && <ErrorBox message={error} />}
        </div>
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              {result.groups.map((g, i) => (
                <ResultBox key={i} title={g.category} dotColor={GROUP_COLORS[g.category] ?? "bg-primary"}>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {g.hashtags.map((h, j) => (
                      <span key={j} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">{h}</span>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{g.purpose}</p>
                </ResultBox>
              ))}
              <ResultBox title="Mix 12 hashtag tối ưu" dotColor="bg-primary" onCopy={copyMix} copied={copied}>
                <p className="text-sm text-foreground/90">{result.recommended_mix}</p>
              </ResultBox>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">Trending VN</p>
                  <div className="flex flex-wrap gap-1">
                    {result.trending_now.map((h, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{h}</span>)}
                  </div>
                </div>
                <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3">
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2">Nên tránh</p>
                  <div className="flex flex-wrap gap-1">
                    {result.avoid_list.map((h, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 line-through">{h}</span>)}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground/40">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
              </div>
              <p className="text-xs text-muted-foreground/50 font-medium">Nhập ngành để xây vũ trụ hashtag</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
