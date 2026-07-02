"use client";

import { useLocalDraft } from "@/hooks/use-local-draft";
import { useLabTool } from "@/hooks/use-lab-tool";
import { useLabHistoryRestore } from "@/hooks/use-lab-history-restore";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, ResultBox, LabInput } from "@/components/lab-ui";
import { Search, TrendingUp, DollarSign, Activity, Sparkles } from "lucide-react";

interface KeywordInfo {
  search_volume: number;
  cpc: number | null;
  competition: number | null;
  competition_level: string | null;
  monthly_searches?: { year: number; month: number; search_volume: number }[];
}

interface KeywordItem {
  keyword: string;
  keyword_vi?: string;
  keyword_info?: KeywordInfo;
  keyword_data?: {
    keyword: string;
    keyword_vi?: string;
    keyword_info?: KeywordInfo;
  };
  search_volume?: number;
  cpc?: number;
  keyword_difficulty?: number;
  competition?: number;
}

interface KeywordResearchResult {
  overview: { items: (KeywordItem | { items?: KeywordItem[] })[] };
  ideas: { items: (KeywordItem | { items?: KeywordItem[] })[] };
  related: { items: (KeywordItem | { items?: KeywordItem[] })[] };
}

function getKw(item: KeywordItem) {
  const kd = item.keyword_data;
  const ki = kd?.keyword_info ?? item.keyword_info;
  return {
    keyword: kd?.keyword_vi ?? kd?.keyword ?? item.keyword_vi ?? item.keyword,
    volume: ki?.search_volume ?? item.search_volume ?? 0,
    cpc: ki?.cpc ?? item.cpc ?? 0,
    competition: ki?.competition ?? item.competition ?? 0,
    competitionLevel: ki?.competition_level ?? null,
    monthly: ki?.monthly_searches ?? [],
  };
}

function flattenItems(raw: (KeywordItem | { items?: KeywordItem[] })[]): KeywordItem[] {
  const out: KeywordItem[] = [];
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
      out.push(entry as KeywordItem);
    }
  }
  return out;
}

function ScoreGauge({ value, max = 100, size = 56, label }: { value: number; max?: number; size?: number; label: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct > 70 ? "#ef4444" : pct > 40 ? "#f59e0b" : "#22c55e";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={4} className="text-muted/30" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function CompetitionBar({ value, level }: { value: number; level: string | null }) {
  const pct = Math.min(value * 100, 100);
  const color = pct > 70 ? "bg-red-500" : pct > 40 ? "bg-amber-500" : "bg-emerald-500";
  const textColor = pct > 70 ? "text-red-600 dark:text-red-400" : pct > 40 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-semibold tabular-nums ${textColor}`}>
        {level ?? `${pct.toFixed(0)}%`}
      </span>
    </div>
  );
}

function MiniTrend({ data }: { data: { search_volume: number }[] }) {
  if (!data || data.length < 2) return null;
  const vols = data.slice(0, 6).reverse().map(d => d.search_volume);
  const max = Math.max(...vols, 1);
  const w = 60;
  const h = 20;
  const points = vols.map((v, i) => `${(i / (vols.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="text-primary/60">
      <polyline fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function OverviewSummary({ items }: { items: KeywordItem[] }) {
  const flat = flattenItems(items);
  if (!flat || flat.length === 0) return null;
  const totalVol = flat.reduce((s, r) => s + getKw(r).volume, 0);
  const cpcs = flat.map(r => getKw(r).cpc).filter(c => c > 0);
  const avgCpc = cpcs.length > 0 ? cpcs.reduce((a, b) => a + b, 0) / cpcs.length : 0;
  const comps = flat.map(r => getKw(r).competition).filter(c => c > 0);
  const avgComp = comps.length > 0 ? comps.reduce((a, b) => a + b, 0) / comps.length : 0;

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-xl border border-border/50 bg-card/40 p-3.5 flex flex-col items-center">
        <ScoreGauge value={Math.min(totalVol, 100000)} max={100000} label="Tổng volume" />
        <p className="text-sm font-bold tabular-nums mt-1">{formatNumber(totalVol)}</p>
      </div>
      <div className="rounded-xl border border-border/50 bg-card/40 p-3.5 flex flex-col items-center">
        <ScoreGauge value={Math.round(avgComp * 100)} max={100} label="Cạnh tranh TB" />
        <p className="text-sm font-bold tabular-nums mt-1">{(avgComp * 100).toFixed(0)}%</p>
      </div>
      <div className="rounded-xl border border-border/50 bg-card/40 p-3.5 flex flex-col items-center">
        <ScoreGauge value={Math.min(avgCpc, 50)} max={50} label="CPC TB" />
        <p className="text-sm font-bold tabular-nums mt-1">${avgCpc.toFixed(2)}</p>
      </div>
    </div>
  );
}

function KeywordTable({ items, title }: { items: KeywordItem[]; title: string }) {
  const flat = flattenItems(items);
  if (!flat || flat.length === 0) return null;
  return (
    <ResultBox title={title} dotColor="bg-primary">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2.5 pr-4">
                <span className="inline-flex items-center gap-1"><Sparkles size={10} /> Từ khóa</span>
              </th>
              <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2.5 px-3">
                <span className="inline-flex items-center gap-1"><Search size={10} /> Volume</span>
              </th>
              <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2.5 px-3">
                <span className="inline-flex items-center gap-1"><DollarSign size={10} /> CPC</span>
              </th>
              <th className="text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2.5 px-3">
                <span className="inline-flex items-center gap-1"><Activity size={10} /> Cạnh tranh</span>
              </th>
              <th className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2.5 pl-3">
                <span className="inline-flex items-center gap-1"><TrendingUp size={10} /> Trend</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {flat.map((rawItem, i) => {
              const kw = getKw(rawItem);
              return (
                <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                  <td className="py-3 pr-4">
                    <span className="text-[13px] font-medium text-foreground">{kw.keyword}</span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-bold tabular-nums">{formatNumber(kw.volume)}</span>
                      <div className="h-1 w-12 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary/50 transition-all" style={{ width: `${Math.min((kw.volume / 10000) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-xs tabular-nums font-medium">
                      {kw.cpc ? `$${kw.cpc.toFixed(2)}` : "—"}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <CompetitionBar value={kw.competition} level={kw.competitionLevel} />
                  </td>
                  <td className="py-3 pl-3 flex justify-center">
                    <MiniTrend data={kw.monthly} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ResultBox>
  );
}

export default function KeywordResearchPage() {
  const [keyword, setKeyword] = useLocalDraft("vitba_lab_draft_keyword-research_keyword", "");
  const locationCode = 2840;
  const { run, result, setResult, loading, error } = useLabTool<KeywordResearchResult>("/keyword-research");

  // Mở lại kết quả đã lưu từ trang Lịch sử (?hist={id})
  useLabHistoryRestore((item) => {
    const inp = item.input_data as Record<string, string> | null;
    if (inp) {
      if (inp.keyword !== undefined) setKeyword(String(inp.keyword));
    }
    if (item.output_data) setResult(item.output_data as unknown as KeywordResearchResult);
  });

  async function handleRun() {
    if (!keyword.trim()) return;
    await run({ keyword: keyword.trim(), location_code: locationCode });
  }

  const hasResults = result && (result.overview?.items?.length || result.ideas?.items?.length || result.related?.items?.length);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Keyword Research" />
      <ToolHeader
        name="Keyword Research"
        description="Nghiên cứu từ khóa thực tế: search volume, độ khó, CPC, xu hướng — dữ liệu từ DataForSEO."
        tag="new"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
            <LabInput
              label="Từ khóa"
              value={keyword}
              onChange={setKeyword}
              placeholder="VD: thiết kế website, SEO automation..."
            />
          </div>
          <RunButton
            loading={loading}
            disabled={!keyword.trim()}
            onClick={handleRun}
            loadingText="Đang nghiên cứu..."
            idleText="Tra cứu từ khóa"
            className="w-full"
          />
          {error && <ErrorBox message={error} />}
        </div>

        <div className="lg:col-span-3 space-y-4">
          {hasResults ? (
            <>
              {result.overview?.items?.length > 0 && (
                <OverviewSummary items={result.overview.items as KeywordItem[]} />
              )}
              {result.overview?.items?.length > 0 && (
                <KeywordTable items={result.overview.items as KeywordItem[]} title="Tổng quan từ khóa" />
              )}
              {result.ideas?.items?.length > 0 && (
                <KeywordTable items={result.ideas.items as KeywordItem[]} title="Gợi ý từ khóa" />
              )}
              {result.related?.items?.length > 0 && (
                <KeywordTable items={result.related.items as KeywordItem[]} title="Từ khóa liên quan" />
              )}
            </>
          ) : result ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground/40">
                <Search size={20} />
              </div>
              <p className="text-xs text-muted-foreground/50 font-medium">Không tìm thấy dữ liệu từ khóa</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground/40">
                <TrendingUp size={20} />
              </div>
              <p className="text-xs text-muted-foreground/50 font-medium">Nhập từ khóa để tra cứu</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
