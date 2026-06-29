"use client";

import { useState } from "react";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, ResultBox, LabInput } from "@/components/lab-ui";
import { Globe, TrendingUp, Search, DollarSign, BarChart3 } from "lucide-react";

interface MetricBucket {
  pos_1: number;
  pos_2_3: number;
  pos_4_10: number;
  pos_11_20: number;
  pos_21_30: number;
  pos_31_40: number;
  pos_41_50: number;
  pos_51_60: number;
  pos_61_70: number;
  pos_71_80: number;
  pos_81_90: number;
  pos_91_100: number;
  etv: number;
  count: number;
  estimated_paid_traffic_cost: number;
  is_new: number;
  is_up: number;
  is_down: number;
  is_lost: number;
}

interface RankOverviewItem {
  metrics?: { organic?: MetricBucket; paid?: MetricBucket };
  domain_rank?: number;
}

interface RankedKeywordItem {
  keyword: string;
  keyword_vi?: string;
  keyword_data?: {
    keyword: string;
    keyword_vi?: string;
    keyword_info?: { search_volume: number; cpc: number | null };
  };
  search_volume?: number;
  cpc?: number;
  rank_absolute?: number;
  ranked_serp_element?: { serp_item?: { rank_absolute?: number } };
}

interface RankTrackerResult {
  rank_overview: { items: RankOverviewItem[] };
  ranked_keywords: { items: (RankedKeywordItem | { items?: RankedKeywordItem[] })[] };
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function flattenRanked(raw: (RankedKeywordItem | { items?: RankedKeywordItem[] })[]): RankedKeywordItem[] {
  const out: RankedKeywordItem[] = [];
  for (const entry of raw) {
    if ("items" in entry && Array.isArray(entry.items)) {
      for (const inner of entry.items) {
        if (inner && typeof inner === "object" && "items" in inner && Array.isArray((inner as any).items)) {
          out.push(...(inner as any).items);
        } else {
          out.push(inner);
        }
      }
    } else if ("items" in entry && (entry as any).items === null) {
      // skip
    } else {
      out.push(entry as RankedKeywordItem);
    }
  }
  return out;
}

function RadialGauge({ value, max, size = 80, label, unit }: { value: number; max: number; size?: number; label: string; unit?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={5} className="text-muted/20" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold tabular-nums" style={{ color }}>{formatNumber(value)}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{label}</p>
        {unit && <p className="text-[9px] text-muted-foreground/40">{unit}</p>}
      </div>
    </div>
  );
}

function PositionBar({ label, count, maxCount, color }: { label: string; count: number; maxCount: number; color: string }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-semibold text-muted-foreground/60 w-16 text-right tabular-nums">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-muted/30 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-bold tabular-nums w-10 text-right">{formatNumber(count)}</span>
    </div>
  );
}

function MovementBadge({ up, down, isNew, lost }: { up: number; down: number; isNew: number; lost: number }) {
  return (
    <div className="flex gap-3 flex-wrap">
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        +{formatNumber(isNew)} mới
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
        {formatNumber(up)} lên hạng
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        {formatNumber(down)} xuống hạng
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
        -{formatNumber(lost)} mất
      </span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const color =
    rank <= 3
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
      : rank <= 10
        ? "text-primary bg-primary/10 border-primary/20"
        : rank <= 30
          ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
          : "text-muted-foreground bg-muted/50 border-border/50";
  return (
    <span className={`inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded-lg text-[10px] font-bold border ${color}`}>
      #{rank}
    </span>
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

  const rawOverview = result?.rank_overview?.items?.[0];
  const overview = (rawOverview?.metrics?.organic ? rawOverview : (rawOverview as any)?.items?.[0]) as typeof rawOverview;
  const organic = overview?.metrics?.organic;
  const rankedItems = result?.ranked_keywords?.items ? flattenRanked(result.ranked_keywords.items) : [];

  const posData = organic
    ? [
        { label: "#1", count: organic.pos_1, color: "bg-emerald-500" },
        { label: "#2-3", count: organic.pos_2_3, color: "bg-emerald-400" },
        { label: "#4-10", count: organic.pos_4_10, color: "bg-blue-500" },
        { label: "#11-20", count: organic.pos_11_20, color: "bg-amber-500" },
        { label: "#21-50", count: organic.pos_21_30 + organic.pos_31_40 + organic.pos_41_50, color: "bg-orange-400" },
        { label: "#51-100", count: organic.pos_51_60 + organic.pos_61_70 + organic.pos_71_80 + organic.pos_81_90 + organic.pos_91_100, color: "bg-red-400" },
      ]
    : [];
  const maxPosCount = Math.max(...posData.map(p => p.count), 1);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Rank Tracker" />
      <ToolHeader
        name="Rank Tracker"
        description="Theo dõi thứ hạng domain: authority, ETV, từ khóa đang xếp hạng."
        tag="new"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
            <LabInput label="Domain" value={domain} onChange={setDomain} placeholder="vitba.ai" />
          </div>
          <RunButton loading={loading} disabled={!domain.trim()} onClick={handleRun} loadingText="Đang tra cứu..." idleText="Tra cứu thứ hạng" className="w-full" />
          {error && <ErrorBox message={error} />}
        </div>

        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              {organic && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border/50 bg-card/40 p-4 flex justify-center">
                      <RadialGauge value={organic.count} max={50000} label="Tổng keyword" />
                    </div>
                    <div className="rounded-xl border border-border/50 bg-card/40 p-4 flex justify-center">
                      <RadialGauge value={Math.round(organic.etv)} max={100000} label="Lưu lượng" unit="ETV/tháng" />
                    </div>
                    <div className="rounded-xl border border-border/50 bg-card/40 p-4 flex justify-center">
                      <RadialGauge value={Math.round(organic.estimated_paid_traffic_cost)} max={10000} label="Giá trị traffic" unit="USD/tháng" />
                    </div>
                  </div>

                  <ResultBox title="Phân bố vị trí" dotColor="bg-primary">
                    <div className="space-y-2.5">
                      {posData.map(p => (
                        <PositionBar key={p.label} label={p.label} count={p.count} maxCount={maxPosCount} color={p.color} />
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-border/30">
                      <MovementBadge up={organic.is_up} down={organic.is_down} isNew={organic.is_new} lost={organic.is_lost} />
                    </div>
                  </ResultBox>
                </>
              )}

              {rankedItems.length > 0 && (
                <ResultBox title="Từ khóa đang xếp hạng" dotColor="bg-primary">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 pr-4">Keyword</th>
                          <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 px-3">
                            <Search size={10} className="inline mr-1" />Volume
                          </th>
                          <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 px-3">
                            <DollarSign size={10} className="inline mr-1" />CPC
                          </th>
                          <th className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 pl-3">
                            <BarChart3 size={10} className="inline mr-1" />Vị trí
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankedItems.map((item, i) => {
                          const kd = item.keyword_data;
                          const ki = kd?.keyword_info;
                          const kw = kd?.keyword_vi ?? kd?.keyword ?? item.keyword_vi ?? item.keyword;
                          const vol = ki?.search_volume ?? item.search_volume ?? 0;
                          const cpc = ki?.cpc ?? item.cpc ?? 0;
                          const rank = item.ranked_serp_element?.serp_item?.rank_absolute ?? item.rank_absolute ?? 0;
                          return (
                            <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                              <td className="py-2.5 pr-4">
                                <span className="text-[13px] font-medium text-foreground">{kw}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="text-xs font-semibold tabular-nums">{formatNumber(vol)}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="text-xs tabular-nums">{cpc ? `$${cpc.toFixed(2)}` : "—"}</span>
                              </td>
                              <td className="py-2.5 pl-3 text-center">
                                <RankBadge rank={rank} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </ResultBox>
              )}

              {!organic && rankedItems.length === 0 && (
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
