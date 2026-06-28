"use client";

import { useState } from "react";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, ResultBox, LabInput } from "@/components/lab-ui";
import { Crosshair, Search, Globe, ExternalLink, Users } from "lucide-react";

interface SerpResultItem {
  rank: number;
  domain: string;
  title: string;
  url: string;
  description?: string;
}

interface CompetitorItem {
  domain: string;
  rank: number;
  intersecting_keywords: number;
}

interface SerpSpyResult {
  serp_results: { items: SerpResultItem[] };
  competitors: { items: CompetitorItem[] };
}

function RankBadge({ rank }: { rank: number }) {
  let color = "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (rank <= 3) color = "text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30";
  else if (rank <= 10) color = "text-primary bg-primary/10 border-primary/20";
  else color = "text-muted-foreground bg-muted/50 border-border/50";
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-bold border ${color}`}>
      {rank}
    </span>
  );
}

function truncateUrl(url: string, max = 60): string {
  return url.length > max ? url.slice(0, max) + "…" : url;
}

export default function SerpSpyPage() {
  const [keyword, setKeyword] = useState("");
  const locationCode = 2840;
  const { run, result, loading, error } = useLabTool<SerpSpyResult>("/serp-spy");

  async function handleRun() {
    if (!keyword.trim()) return;
    await run({ keyword: keyword.trim(), location_code: locationCode });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="SERP Spy" />
      <ToolHeader
        name="SERP Spy"
        description="Do thám SERP: kết quả tìm kiếm, đối thủ cạnh tranh, cơ hội lọt top."
        tag="new"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
            <LabInput
              label="Từ khóa"
              value={keyword}
              onChange={setKeyword}
              placeholder="VD: SEO tool, marketing AI..."
            />
          </div>
          <RunButton
            loading={loading}
            disabled={!keyword.trim()}
            onClick={handleRun}
            loadingText="Đang do thám..."
            idleText="Do thám SERP"
            className="w-full"
          />
          {error && <ErrorBox message={error} />}
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              {result.serp_results?.items && result.serp_results.items.length > 0 && (
                <ResultBox title="Kết quả SERP" dotColor="bg-primary">
                  <div className="space-y-2">
                    {result.serp_results.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-xl border border-border/30 bg-card/20 hover:bg-card/50 hover:border-border/50 transition-all"
                      >
                        <RankBadge rank={item.rank} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Globe size={10} className="text-muted-foreground/60 shrink-0" />
                            <span className="text-[11px] text-muted-foreground font-medium">{item.domain}</span>
                          </div>
                          <p className="text-[13px] font-semibold text-foreground leading-snug truncate">{item.title}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <ExternalLink size={9} className="text-muted-foreground/40 shrink-0" />
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-primary/70 hover:text-primary truncate"
                            >
                              {truncateUrl(item.url)}
                            </a>
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-muted-foreground/70 mt-1 line-clamp-2">{item.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ResultBox>
              )}

              {result.competitors?.items && result.competitors.items.length > 0 && (
                <ResultBox title="Đối thủ cạnh tranh" dotColor="bg-primary">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 pr-4">Domain</th>
                          <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 px-3">
                            <Search size={10} className="inline mr-1" /> Rank
                          </th>
                          <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 pl-3">
                            <Users size={10} className="inline mr-1" /> Keyword chung
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.competitors.items.map((item, i) => (
                          <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 pr-4">
                              <span className="text-[13px] font-medium text-foreground">{item.domain}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="text-xs font-semibold tabular-nums">#{item.rank}</span>
                            </td>
                            <td className="py-2.5 pl-3 text-right">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                {item.intersecting_keywords} keyword
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ResultBox>
              )}

              {(!result.serp_results?.items?.length && !result.competitors?.items?.length) && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground/40">
                    <Crosshair size={20} />
                  </div>
                  <p className="text-xs text-muted-foreground/50 font-medium">Không tìm thấy kết quả SERP</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground/40">
                <Crosshair size={20} />
              </div>
              <p className="text-xs text-muted-foreground/50 font-medium">Nhập từ khóa để do thám SERP</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
