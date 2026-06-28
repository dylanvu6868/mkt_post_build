"use client";

import { useState } from "react";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, ResultBox, LabInput } from "@/components/lab-ui";
import { Globe, TrendingUp, Search, DollarSign, Hash } from "lucide-react";

interface RankOverviewItem {
  domain_rank: number;
  main_page: string;
  rank_absolute: number;
  etv: number;
}

interface RankedKeywordItem {
  keyword: string;
  search_volume: number;
  cpc: number;
  rank_absolute: number;
}

interface RankTrackerResult {
  rank_overview: { items: RankOverviewItem[] };
  ranked_keywords: { items: RankedKeywordItem[] };
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function AuthorityScore({ domain, score }: { domain: string; score: number }) {
  const color =
    score >= 70
      ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      : score >= 40
        ? "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10"
        : "text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10";
  return (
    <ResultBox title="Domain Authority" dotColor="bg-primary">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{domain}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Domain authority score</p>
        </div>
        <div className={`text-center px-4 py-2 rounded-xl border ${color}`}>
          <p className="text-2xl font-bold tabular-nums">{score}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider">/100</p>
        </div>
      </div>
    </ResultBox>
  );
}

function RankOverviewCards({ items }: { items: RankOverviewItem[] }) {
  if (!items || items.length === 0) return null;
  const item = items[0];
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-xl border border-border/50 bg-card/40 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">
          <Hash className="inline h-3 w-3 mr-1" />
          Domain Rank
        </p>
        <p className="text-lg font-bold tabular-nums">{item.domain_rank ?? "—"}</p>
      </div>
      <div className="rounded-xl border border-border/50 bg-card/40 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">
          <TrendingUp className="inline h-3 w-3 mr-1" />
          ETV
        </p>
        <p className="text-lg font-bold tabular-nums">{item.etv ? formatNumber(item.etv) : "—"}</p>
      </div>
      <div className="rounded-xl border border-border/50 bg-card/40 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">
          <Search className="inline h-3 w-3 mr-1" />
          Top Rank
        </p>
        <p className="text-lg font-bold tabular-nums">#{item.rank_absolute ?? "—"}</p>
      </div>
    </div>
  );
}

export default function RankTrackerPage() {
  const [domain, setDomain] = useState("");
  const locationCode = 2840;
  const { run, result, loading, error } = useLabTool<RankTrackerResult>("/rank-tracker");

  async function handleRun() {
    if (!domain.trim()) return;
    await run({ domain: domain.trim(), location_code: locationCode });
  }

  const overview = result?.rank_overview?.items?.[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Rank Tracker" />
      <ToolHeader
        name="Rank Tracker"
        description="Theo dõi thứ hạng domain: authority, ETV, từ khóa đang xếp hạng."
        tag="new"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
            <LabInput
              label="Domain"
              value={domain}
              onChange={setDomain}
              placeholder="vitba.ai"
            />
          </div>
          <RunButton
            loading={loading}
            disabled={!domain.trim()}
            onClick={handleRun}
            loadingText="Đang tra cứu..."
            idleText="Tra cứu thứ hạng"
            className="w-full"
          />
          {error && <ErrorBox message={error} />}
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              {overview && (
                <>
                  <AuthorityScore domain={domain.trim()} score={overview.domain_rank} />
                  <RankOverviewCards items={result.rank_overview.items} />
                </>
              )}

              {result.ranked_keywords?.items && result.ranked_keywords.items.length > 0 && (
                <ResultBox title="Từ khóa đang xếp hạng" dotColor="bg-primary">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 pr-4">Keyword</th>
                          <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 px-3">
                            <Search size={10} className="inline mr-1" /> Volume
                          </th>
                          <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 px-3">
                            <DollarSign size={10} className="inline mr-1" /> CPC
                          </th>
                          <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 pl-3">
                            <Hash size={10} className="inline mr-1" /> Rank
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.ranked_keywords.items.map((item, i) => (
                          <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 pr-4">
                              <span className="text-[13px] font-medium text-foreground">{item.keyword}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="text-xs font-semibold tabular-nums">{formatNumber(item.search_volume)}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="text-xs tabular-nums">${item.cpc.toFixed(2)}</span>
                            </td>
                            <td className="py-2.5 pl-3 text-right">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                #{item.rank_absolute}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ResultBox>
              )}

              {(!result.ranked_keywords?.items?.length && !overview) && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground/40">
                    <TrendingUp size={20} />
                  </div>
                  <p className="text-xs text-muted-foreground/50 font-medium">Không tìm thấy dữ liệu xếp hạng</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground/40">
                <Globe size={20} />
              </div>
              <p className="text-xs text-muted-foreground/50 font-medium">Nhập domain để tra cứu thứ hạng</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
