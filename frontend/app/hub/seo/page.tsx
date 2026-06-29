"use client";

import { useState } from "react";
import { useLabTool } from "@/hooks/use-lab-tool";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { btn, inp } from "@/lib/ui-tokens";
import {
  Search,
  Globe,
  FileText,
  Copy,
  Check,
  ExternalLink,
  Link,
  TrendingUp,
  DollarSign,
  BarChart3,
  Activity,
  Hash,
  Users,
  Crosshair,
  Award,
  Target,
  Zap,
  Clock,
  Share2,
  ArrowUpRight,
  Shield,
  Sparkles,
} from "lucide-react";

const LOCATION_CODE = 2840;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flatten<T>(raw: any[]): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  for (const entry of raw) {
    if (entry && typeof entry === "object" && "items" in entry && Array.isArray(entry.items)) {
      for (const inner of entry.items) {
        if (inner && typeof inner === "object" && "items" in inner && Array.isArray(inner.items)) {
          out.push(...inner.items);
        } else {
          out.push(inner as T);
        }
      }
    } else if (entry && typeof entry === "object" && "items" in entry && entry.items === null) {
      // skip null items (e.g. competitors with no results)
    } else {
      out.push(entry as T);
    }
  }
  return out;
}

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
  keyword_data?: { keyword: string; keyword_vi?: string; keyword_info?: KeywordInfo };
  search_volume?: number;
  cpc?: number;
  keyword_difficulty?: number;
  competition?: number;
  ranked_serp_element?: { serp_item?: { rank_absolute?: number } };
  rank_absolute?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface KeywordResearchResult { overview: { items: any[] }; ideas: { items: any[] }; related: { items: any[] } }

interface MetricBucket {
  pos_1: number; pos_2_3: number; pos_4_10: number; pos_11_20: number;
  pos_21_30: number; pos_31_40: number; pos_41_50: number;
  pos_51_60: number; pos_61_70: number; pos_71_80: number;
  pos_81_90: number; pos_91_100: number;
  etv: number; count: number; estimated_paid_traffic_cost: number;
  is_new: number; is_up: number; is_down: number; is_lost: number;
}

interface RankOverviewItem {
  metrics?: { organic?: MetricBucket; paid?: MetricBucket };
  domain_rank?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface RankTrackerResult { rank_overview: { items: any[] }; ranked_keywords: { items: any[] } }

interface BacklinksSummary {
  backlinks: number; referring_domains: number; referring_domains_nofollow: number;
  referring_ips: number; broken_backlinks: number; rank: number;
}
interface ReferringDomainItem { domain: string; backlinks: number; rank: number }
interface BacklinkItem { url_from: string; domain_from: string; anchor: string; rank: number; dofollow: boolean }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface BacklinksResult { summary: { items: any[] }; referring_domains: { items: any[] }; backlinks: { items: any[] } }

interface SerpResultItem {
  type?: string; rank_group?: number; rank_absolute?: number;
  domain?: string; title?: string; url?: string; description?: string;
}
interface CompetitorItem { domain: string; avg_position?: number; intersections?: number; rank?: number; intersecting_keywords?: number }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SerpSpyResult { serp_results: { items: any[] }; competitors: { items: any[] } }
interface SeoAnalysisResult { report: string }

function getKw(item: KeywordItem) {
  const kd = item.keyword_data;
  const ki = kd?.keyword_info ?? item.keyword_info;
  return {
    keyword: kd?.keyword_vi ?? kd?.keyword ?? item.keyword_vi ?? item.keyword ?? "—",
    volume: ki?.search_volume ?? item.search_volume ?? 0,
    cpc: ki?.cpc ?? item.cpc ?? 0,
    competition: ki?.competition ?? item.competition ?? 0,
    competitionLevel: ki?.competition_level ?? null,
    monthly: ki?.monthly_searches ?? [],
    rank: item.ranked_serp_element?.serp_item?.rank_absolute ?? item.rank_absolute ?? 0,
  };
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function truncateUrl(url: string, max = 55): string {
  return url.length > max ? url.slice(0, max) + "…" : url;
}

function RadialGauge({ value, max, size = 80, label, unit, color: forceColor }: {
  value: number; max: number; size?: number; label: string; unit?: string; color?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = forceColor ?? (pct >= 60 ? "#22c55e" : pct >= 30 ? "#f59e0b" : "#ef4444");
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={5} className="text-muted/20" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
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

function CompetitionBar({ value, level }: { value: number; level: string | null }) {
  const pct = Math.min(value * 100, 100);
  const color = pct > 70 ? "bg-red-500" : pct > 40 ? "bg-amber-500" : "bg-emerald-500";
  const textColor = pct > 70 ? "text-red-600 dark:text-red-400" : pct > 40 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-semibold tabular-nums ${textColor}`}>{level ?? `${pct.toFixed(0)}%`}</span>
    </div>
  );
}

function PositionBar({ label, count, maxCount, color }: { label: string; count: number; maxCount: number; color: string }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-semibold text-muted-foreground/60 w-14 text-right tabular-nums">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-muted/30 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-bold tabular-nums w-10 text-right">{formatNumber(count)}</span>
    </div>
  );
}

function DomainRankBar({ rank }: { rank: number }) {
  const pct = Math.min(rank, 100);
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-400";
  const textColor = pct >= 70 ? "text-emerald-600 dark:text-emerald-400" : pct >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-14 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-bold tabular-nums ${textColor}`}>{rank}</span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const color = rank <= 3
    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
    : rank <= 10 ? "text-primary bg-primary/10 border-primary/20"
    : rank <= 30 ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
    : "text-muted-foreground bg-muted/50 border-border/50";
  return (
    <span className={`inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded-lg text-[10px] font-bold border ${color}`}>
      #{rank}
    </span>
  );
}

function MiniTrend({ data }: { data: { search_volume: number }[] }) {
  if (!data || data.length < 2) return null;
  const vols = data.slice(0, 6).reverse().map(d => d.search_volume);
  const max = Math.max(...vols, 1);
  const w = 56; const h = 18;
  const points = vols.map((v, i) => `${(i / (vols.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="text-primary/60">
      <polyline fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function PositionIndicator({ position }: { position: number }) {
  const pct = Math.max(0, ((100 - position) / 100) * 100);
  const color = position <= 3 ? "#22c55e" : position <= 10 ? "#6366f1" : position <= 30 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums" style={{ color }}>#{position}</span>
    </div>
  );
}

function MarkdownRenderer({ content }: { content: string }) {
  return <div dangerouslySetInnerHTML={{ __html: convertMarkdown(content) }} />;
}
function convertMarkdown(md: string): string {
  let h = md;
  h = h.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  h = h.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  h = h.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  h = h.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/\*(.+?)\*/g, "<em>$1</em>");
  h = h.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
  h = h.replace(/`(.+?)`/g, "<code>$1</code>");
  h = h.replace(/^\|(.+)\|$/gm, (match) => {
    const cells = match.split("|").filter(c => c.trim());
    if (cells.every(c => /^[\s-:]+$/.test(c))) return "";
    return `<tr>${cells.map(c => `<td>${c.trim()}</td>`).join("")}</tr>`;
  });
  h = h.replace(/(<tr>[\s\S]*?<\/tr>)/g, "<table>$1</table>");
  h = h.replace(/<\/table>\s*<table>/g, "");
  h = h.replace(/^- (.+)$/gm, "<li>$1</li>");
  h = h.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
  h = h.replace(/<\/ul>\s*<ul>/g, "");
  h = h.replace(/\n\n/g, "</p><p>");
  h = `<p>${h}</p>`;
  h = h.replace(/<p><h/g, "<h").replace(/<\/h(\d)><\/p>/g, "</h$1>");
  h = h.replace(/<p><table/g, "<table").replace(/<\/table><\/p>/g, "</table>");
  h = h.replace(/<p><ul/g, "<ul").replace(/<\/ul><\/p>/g, "</ul>");
  h = h.replace(/<p><pre/g, "<pre").replace(/<\/pre><\/p>/g, "</pre>");
  h = h.replace(/<p>\s*<\/p>/g, "");
  return h;
}

function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
      <CardContent className="space-y-3 pt-6">
        {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </CardContent>
    </Card>
  );
}

function EmptySection({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/40 bg-muted/50 text-muted-foreground/40">{icon}</div>
      <p className="text-xs font-medium text-muted-foreground/50">{text}</p>
    </div>
  );
}

function OverviewTab({ rankResult, rankLoading, backlinksResult, backlinksLoading, kwResult, kwLoading }: {
  rankResult: RankTrackerResult | null; rankLoading: boolean;
  backlinksResult: BacklinksResult | null; backlinksLoading: boolean;
  kwResult: KeywordResearchResult | null; kwLoading: boolean;
}) {
  const loading = rankLoading || backlinksLoading || kwLoading;
  if (loading) return <SectionSkeleton rows={6} />;

  const rawOverview = rankResult?.rank_overview?.items?.[0] as RankOverviewItem | undefined;
  const overview = (rawOverview?.metrics?.organic ? rawOverview : (rawOverview as any)?.items?.[0]) as RankOverviewItem | undefined;
  const organic = overview?.metrics?.organic;
  const summary = backlinksResult?.summary?.items?.[0] as BacklinksSummary | undefined;
  const kwFlat = kwResult?.overview?.items ? flatten<KeywordItem>(kwResult.overview.items) : [];
  const hasData = organic || summary || kwFlat.length > 0;

  if (!hasData) return <EmptySection icon={<Award size={20} />} text="Chưa có dữ liệu tổng quan. Hãy tạo báo cáo SEO trước." />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/50 bg-card/40 p-4 flex justify-center">
          <RadialGauge value={organic?.count ?? 0} max={50000} label="Tổng keyword" color="#6366f1" />
        </div>
        <div className="rounded-xl border border-border/50 bg-card/40 p-4 flex justify-center">
          <RadialGauge value={Math.round(organic?.etv ?? 0)} max={100000} label="Lưu lượng" unit="ETV/tháng" color="#8b5cf6" />
        </div>
        <div className="rounded-xl border border-border/50 bg-card/40 p-4 flex justify-center">
          <RadialGauge value={summary?.backlinks ?? 0} max={100000} label="Backlinks" color="#06b6d4" />
        </div>
        <div className="rounded-xl border border-border/50 bg-card/40 p-4 flex justify-center">
          <RadialGauge value={summary?.rank ?? 0} max={100} label="Domain Rank" />
        </div>
      </div>

      {organic && (() => {
        const posData = [
          { label: "#1", count: organic.pos_1, color: "bg-emerald-500" },
          { label: "#2-3", count: organic.pos_2_3, color: "bg-emerald-400" },
          { label: "#4-10", count: organic.pos_4_10, color: "bg-blue-500" },
          { label: "#11-20", count: organic.pos_11_20, color: "bg-amber-500" },
          { label: "#21-50", count: organic.pos_21_30 + organic.pos_31_40 + organic.pos_41_50, color: "bg-orange-400" },
          { label: "#51-100", count: organic.pos_51_60 + organic.pos_61_70 + organic.pos_71_80 + organic.pos_81_90 + organic.pos_91_100, color: "bg-red-400" },
        ];
        const maxC = Math.max(...posData.map(p => p.count), 1);
        return (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
            <CardHeader><CardTitle className="text-sm"><BarChart3 size={14} className="mr-1.5 inline" />Phân bố vị trí</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {posData.map(p => <PositionBar key={p.label} label={p.label} count={p.count} maxCount={maxC} color={p.color} />)}
              </div>
              <div className="mt-4 pt-3 border-t border-border/30 flex gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">+{formatNumber(organic.is_new)} mới</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">{formatNumber(organic.is_up)} lên</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">{formatNumber(organic.is_down)} xuống</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">-{formatNumber(organic.is_lost)} mất</span>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-emerald-500/70 to-emerald-500/40" />
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Zap size={16} className="text-emerald-500" />Sức mạnh Domain</CardTitle></CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">
            {organic ? (organic.count >= 5000 ? "Domain mạnh — có khả năng cạnh tranh cao." : organic.count >= 1000 ? "Domain trung bình — cần cải thiện authority." : "Domain yếu — cần xây dựng backlinks và nội dung.") : "Chưa có dữ liệu."}
          </p></CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-blue-500/70 to-blue-500/40" />
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Link size={16} className="text-blue-500" />Hồ sơ Backlink</CardTitle></CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">
            {summary ? `${formatNumber(summary.backlinks)} backlinks từ ${formatNumber(summary.referring_domains)} referring domains.` : "Chưa có dữ liệu."}
          </p></CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-purple-500 via-purple-500/70 to-purple-500/40" />
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Search size={16} className="text-purple-500" />Tiềm năng từ khóa</CardTitle></CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">
            {kwFlat.length > 0 ? (() => { const k = getKw(kwFlat[0]); return `"${k.keyword}" — Vol: ${formatNumber(k.volume)}`; })() : "Chưa có dữ liệu."}
          </p></CardContent>
        </Card>
      </div>
    </div>
  );
}

function KeywordsTab({ kwResult, kwLoading, rankResult, rankLoading }: {
  kwResult: KeywordResearchResult | null; kwLoading: boolean;
  rankResult: RankTrackerResult | null; rankLoading: boolean;
}) {
  if (kwLoading || rankLoading) return <SectionSkeleton rows={8} />;

  const overviewItems = kwResult?.overview?.items ? flatten<KeywordItem>(kwResult.overview.items) : [];
  const ideasItems = kwResult?.ideas?.items ? flatten<KeywordItem>(kwResult.ideas.items) : [];
  const relatedItems = kwResult?.related?.items ? flatten<KeywordItem>(kwResult.related.items) : [];
  const rankedItems = rankResult?.ranked_keywords?.items ? flatten<KeywordItem>(rankResult.ranked_keywords.items) : [];
  const hasData = overviewItems.length > 0 || ideasItems.length > 0 || relatedItems.length > 0 || rankedItems.length > 0;

  if (!hasData) return <EmptySection icon={<Search size={20} />} text="Chưa có dữ liệu từ khóa. Hãy tạo báo cáo SEO trước." />;

  function KwTable({ items, title }: { items: KeywordItem[]; title: string }) {
    if (items.length === 0) return null;
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
        <CardHeader><CardTitle className="text-sm"><Sparkles size={14} className="mr-1.5 inline" />{title}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2.5 pr-4">Từ khóa</th>
                <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2.5 px-3"><Search size={10} className="inline mr-1" />Volume</th>
                <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2.5 px-3"><DollarSign size={10} className="inline mr-1" />CPC</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2.5 px-3"><Activity size={10} className="inline mr-1" />Cạnh tranh</th>
                <th className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2.5 pl-3"><TrendingUp size={10} className="inline mr-1" />Trend</th>
              </tr>
            </thead>
            <tbody>
              {items.map((raw, i) => {
                const kw = getKw(raw);
                return (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                    <td className="py-3 pr-4"><span className="text-[13px] font-medium text-foreground">{kw.keyword}</span></td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-bold tabular-nums">{formatNumber(kw.volume)}</span>
                        <div className="h-1 w-12 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary/50 transition-all" style={{ width: `${Math.min((kw.volume / 10000) * 100, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right"><span className="text-xs tabular-nums font-medium">{kw.cpc ? `$${kw.cpc.toFixed(2)}` : "—"}</span></td>
                    <td className="py-3 px-3"><CompetitionBar value={kw.competition} level={kw.competitionLevel} /></td>
                    <td className="py-3 pl-3 flex justify-center"><MiniTrend data={kw.monthly} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {rankedItems.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
          <CardHeader><CardTitle className="text-sm"><Hash size={14} className="mr-1.5 inline" />Từ khóa đang xếp hạng</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 pr-4">Keyword</th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 px-3"><Search size={10} className="inline mr-1" />Volume</th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 px-3"><DollarSign size={10} className="inline mr-1" />CPC</th>
                  <th className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 pl-3"><BarChart3 size={10} className="inline mr-1" />Vị trí</th>
                </tr>
              </thead>
              <tbody>
                {rankedItems.map((raw, i) => {
                  const kw = getKw(raw);
                  return (
                    <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 pr-4"><span className="text-[13px] font-medium text-foreground">{kw.keyword}</span></td>
                      <td className="py-2.5 px-3 text-right"><span className="text-xs font-semibold tabular-nums">{formatNumber(kw.volume)}</span></td>
                      <td className="py-2.5 px-3 text-right"><span className="text-xs tabular-nums">{kw.cpc ? `$${kw.cpc.toFixed(2)}` : "—"}</span></td>
                      <td className="py-2.5 pl-3 text-center"><RankBadge rank={kw.rank} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      <KwTable items={overviewItems} title="Tổng quan từ khóa" />
      <KwTable items={ideasItems} title="Gợi ý từ khóa" />
      <KwTable items={relatedItems} title="Từ khóa liên quan" />
    </div>
  );
}

function BacklinksTab({ result, loading }: { result: BacklinksResult | null; loading: boolean }) {
  if (loading) return <SectionSkeleton rows={6} />;

  const summary = result?.summary?.items?.[0] as BacklinksSummary | undefined;
  const refDomains = result?.referring_domains?.items ? flatten<ReferringDomainItem>(result.referring_domains.items) : [];
  const recentBacklinks = result?.backlinks?.items ? flatten<BacklinkItem>(result.backlinks.items) : [];
  const hasData = summary || refDomains.length > 0 || recentBacklinks.length > 0;

  if (!hasData) return <EmptySection icon={<Link size={20} />} text="Chưa có dữ liệu backlinks. Hãy tạo báo cáo SEO trước." />;

  return (
    <div className="space-y-6">
      {summary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border/50 bg-card/40 p-3.5 flex justify-center">
              <RadialGauge value={summary.backlinks} max={100000} label="Tổng Backlinks" color="#6366f1" />
            </div>
            <div className="rounded-xl border border-border/50 bg-card/40 p-3.5 flex justify-center">
              <RadialGauge value={summary.referring_domains} max={10000} label="Ref. Domains" color="#8b5cf6" />
            </div>
            <div className="rounded-xl border border-border/50 bg-card/40 p-3.5 flex justify-center">
              <RadialGauge value={summary.referring_ips ?? 0} max={5000} label="Ref. IPs" color="#06b6d4" />
            </div>
            <div className="rounded-xl border border-border/50 bg-card/40 p-3.5 flex justify-center">
              <RadialGauge value={summary.rank ?? 0} max={100} label="Domain Rank" />
            </div>
          </div>
          {(summary.broken_backlinks > 0 || summary.referring_domains_nofollow > 0) && (
            <div className="flex gap-3 flex-wrap">
              {summary.broken_backlinks > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                  <Shield size={10} /> {formatNumber(summary.broken_backlinks)} broken
                </span>
              )}
              {summary.referring_domains_nofollow > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Link size={10} /> {formatNumber(summary.referring_domains_nofollow)} nofollow
                </span>
              )}
            </div>
          )}
        </>
      )}

      {refDomains.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
          <CardHeader><CardTitle className="text-sm"><ExternalLink size={14} className="mr-1.5 inline" />Referring Domains</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 pr-4">Domain</th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 px-3">Backlinks</th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 pl-3">Domain Rank</th>
                </tr>
              </thead>
              <tbody>
                {refDomains.map((item, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 pr-4"><span className="text-[13px] font-medium text-foreground">{item.domain}</span></td>
                    <td className="py-2.5 px-3 text-right"><span className="text-xs font-semibold tabular-nums">{formatNumber(item.backlinks)}</span></td>
                    <td className="py-2.5 pl-3 flex justify-end"><DomainRankBar rank={item.rank} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {recentBacklinks.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
          <CardHeader><CardTitle className="text-sm"><Link size={14} className="mr-1.5 inline" />Backlinks gần đây</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentBacklinks.slice(0, 20).map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border/30 bg-card/20 hover:bg-card/50 transition-all">
                  <div className="shrink-0 mt-0.5"><DomainRankBar rank={item.rank} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Globe size={10} className="text-muted-foreground/60 shrink-0" />
                      <span className="text-[11px] text-muted-foreground font-medium">{item.domain_from}</span>
                      {item.dofollow && <span className="px-1.5 py-0 rounded text-[8px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">follow</span>}
                    </div>
                    <a href={item.url_from} target="_blank" rel="noopener noreferrer" className="text-[12px] text-primary hover:underline font-medium inline-flex items-center gap-1">
                      <ArrowUpRight size={10} /><span className="truncate">{truncateUrl(item.url_from)}</span>
                    </a>
                    {item.anchor && <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">Anchor: {item.anchor}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SerpTab({ result, loading }: { result: SerpSpyResult | null; loading: boolean }) {
  if (loading) return <SectionSkeleton rows={6} />;

  const serpItems = result?.serp_results?.items ? flatten<SerpResultItem>(result.serp_results.items).filter(i => i.type === "organic" || i.url) : [];
  const competitorItems = result?.competitors?.items ? flatten<CompetitorItem>(result.competitors.items) : [];
  const hasData = serpItems.length > 0 || competitorItems.length > 0;

  if (!hasData) return <EmptySection icon={<Crosshair size={20} />} text="Chưa có dữ liệu SERP. Hãy tạo báo cáo SEO trước." />;

  const top3 = serpItems.filter(i => (i.rank_absolute ?? i.rank_group ?? 999) <= 3).length;
  const top10 = serpItems.filter(i => (i.rank_absolute ?? i.rank_group ?? 999) <= 10).length;
  const total = serpItems.length;

  return (
    <div className="space-y-6">
      {serpItems.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/50 bg-card/40 p-3.5 text-center">
            <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{top3}</p>
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mt-0.5">Top 3</p>
            <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden mt-2">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${total > 0 ? (top3 / total) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/40 p-3.5 text-center">
            <p className="text-2xl font-bold tabular-nums text-primary">{top10}</p>
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mt-0.5">Top 10</p>
            <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden mt-2">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${total > 0 ? (top10 / total) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/40 p-3.5 text-center">
            <p className="text-2xl font-bold tabular-nums text-foreground">{total}</p>
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mt-0.5">Tổng kết quả</p>
            <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden mt-2">
              <div className="h-full rounded-full bg-foreground/30 transition-all" style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      )}

      {serpItems.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
          <CardHeader><CardTitle className="text-sm"><Search size={14} className="mr-1.5 inline" />Kết quả SERP</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {serpItems.map((item, i) => {
              const rank = item.rank_absolute ?? item.rank_group ?? i + 1;
              return (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-border/30 bg-card/20 p-3 transition-all hover:border-border/50 hover:bg-card/50">
                  <RankBadge rank={rank} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center gap-1.5">
                      <Globe size={10} className="shrink-0 text-muted-foreground/60" />
                      <span className="text-[11px] font-medium text-muted-foreground">{item.domain}</span>
                    </div>
                    <p className="truncate text-[13px] font-semibold leading-snug text-foreground">{item.title}</p>
                    {item.url && (
                      <div className="mt-1 flex items-center gap-1">
                        <ExternalLink size={9} className="shrink-0 text-muted-foreground/40" />
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="truncate text-[10px] text-primary/70 hover:text-primary">{truncateUrl(item.url)}</a>
                      </div>
                    )}
                    {item.description && <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground/70">{item.description}</p>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {competitorItems.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
          <CardHeader><CardTitle className="text-sm"><Users size={14} className="mr-1.5 inline" />Đối thủ cạnh tranh</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 pr-4">Domain</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 px-3"><BarChart3 size={10} className="inline mr-1" />Vị trí TB</th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 pl-3"><Users size={10} className="inline mr-1" />Keyword chung</th>
                </tr>
              </thead>
              <tbody>
                {competitorItems.map((item, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 pr-4"><span className="text-[13px] font-medium text-foreground">{item.domain}</span></td>
                    <td className="py-2.5 px-3"><PositionIndicator position={Math.round(item.avg_position ?? item.rank ?? 0)} /></td>
                    <td className="py-2.5 pl-3 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                        {item.intersections ?? item.intersecting_keywords ?? 0} keyword
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DeepAnalysisTab({ result, loading, domain }: { result: SeoAnalysisResult | null; loading: boolean; domain: string }) {
  const [copied, setCopied] = useState(false);
  if (loading) return <SectionSkeleton rows={8} />;
  if (!result?.report) return <EmptySection icon={<FileText size={20} />} text="Chưa có báo cáo phân tích chuyên sâu. Hãy tạo báo cáo SEO trước." />;

  function handleCopy() {
    if (result?.report) { navigator.clipboard.writeText(result.report); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><FileText className="h-4 w-4 text-primary" />Báo cáo SEO chuyên sâu — {domain}</h3>
        <button onClick={handleCopy} className={`${btn} text-xs`}>
          {copied ? <><Check className="h-3.5 w-3.5" /> Đã copy</> : <><Copy className="h-3.5 w-3.5" /> Copy báo cáo</>}
        </button>
      </div>
      <div className="max-h-[600px] overflow-y-auto rounded-xl border border-border bg-card/50 p-6">
        <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-headings:font-bold prose-h1:text-xl prose-h1:text-primary prose-h2:text-lg prose-h2:mt-6 prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h3:text-base prose-p:text-foreground/80 prose-li:text-foreground/80 prose-strong:text-foreground prose-code:text-primary prose-table:text-sm prose-th:font-semibold prose-th:bg-muted/50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-tr:border-border">
          <MarkdownRenderer content={result.report} />
        </div>
      </div>
    </div>
  );
}

export default function VitbaSeoPage() {
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState("");
  const [targetRegion, setTargetRegion] = useState("Việt Nam");
  const [keywords, setKeywords] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const kwResearch = useLabTool<KeywordResearchResult>("/keyword-research");
  const rankTracker = useLabTool<RankTrackerResult>("/rank-tracker");
  const backlinks = useLabTool<BacklinksResult>("/backlinks");
  const serpSpy = useLabTool<SerpSpyResult>("/serp-spy");
  const seoAnalysis = useLabTool<SeoAnalysisResult>("/seo-analysis");

  const handleGenerate = async () => {
    if (!domain.trim() || generating) return;
    setGenerating(true);
    setGenerated(false);
    kwResearch.reset(); rankTracker.reset(); backlinks.reset(); serpSpy.reset(); seoAnalysis.reset();

    const cleanDomain = domain.trim().split("#")[0].split("?")[0].replace(/\/+$/, "");
    await Promise.allSettled([
      kwResearch.run({ keyword: cleanDomain, location_code: LOCATION_CODE }),
      rankTracker.run({ domain: cleanDomain, location_code: LOCATION_CODE }),
      backlinks.run({ domain: cleanDomain }),
      serpSpy.run({ keyword: cleanDomain, location_code: LOCATION_CODE }),
      seoAnalysis.run({
        domain: cleanDomain,
        industry: industry.trim(),
        target_region: targetRegion.trim(),
        keywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
        competitors: competitors.split(",").map(c => c.trim()).filter(Boolean),
      }),
    ]);
    setGenerating(false);
    setGenerated(true);
  };

  const anyError = kwResearch.error || rankTracker.error || backlinks.error || serpSpy.error || seoAnalysis.error;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
          <Search className="h-8 w-8 text-primary" />
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Vitba SEO</span>
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">Báo cáo SEO toàn diện: keyword research, rank tracking, backlinks, SERP intelligence &amp; phân tích chuyên sâu.</p>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="md:col-span-2 lg:col-span-1">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground/60"><Globe className="mr-1 inline h-3 w-3" />Domain *</label>
              <input className={inp} placeholder="vitba.ai" value={domain} onChange={e => setDomain(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && domain.trim()) handleGenerate(); }} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Ngành nghề</label>
              <input className={inp} placeholder="SaaS, AI Marketing, F&B..." value={industry} onChange={e => setIndustry(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Khu vực</label>
              <input className={inp} placeholder="Việt Nam" value={targetRegion} onChange={e => setTargetRegion(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground/60"><Search className="mr-1 inline h-3 w-3" />Từ khóa chính (phẩy)</label>
              <input className={inp} placeholder="marketing AI, SEO automation..." value={keywords} onChange={e => setKeywords(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground/60"><Users className="mr-1 inline h-3 w-3" />Đối thủ (phẩy)</label>
              <input className={inp} placeholder="canva.com, copy.ai..." value={competitors} onChange={e => setCompetitors(e.target.value)} />
            </div>
            <div className="flex items-end">
              <button className={`${btn} w-full`} onClick={handleGenerate} disabled={generating || !domain.trim()}>
                {generating ? <><Clock className="mr-2 h-4 w-4 animate-spin" />Đang tạo báo cáo...</> : <><Target className="mr-2 h-4 w-4" />Tạo báo cáo SEO</>}
              </button>
            </div>
          </div>
          {anyError && (
            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
              <p className="text-xs font-medium text-red-600 dark:text-red-400">Một số API gặp lỗi — kết quả có thể không đầy đủ.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {(generating || generated) && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex-wrap gap-1 bg-muted/50 p-1">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"><Award className="mr-1.5 h-3.5 w-3.5" />Tổng quan</TabsTrigger>
            <TabsTrigger value="keywords" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"><Search className="mr-1.5 h-3.5 w-3.5" />Từ khóa</TabsTrigger>
            <TabsTrigger value="backlinks" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"><Link className="mr-1.5 h-3.5 w-3.5" />Backlinks</TabsTrigger>
            <TabsTrigger value="serp" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"><Crosshair className="mr-1.5 h-3.5 w-3.5" />SERP &amp; Đối thủ</TabsTrigger>
            <TabsTrigger value="deep" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"><FileText className="mr-1.5 h-3.5 w-3.5" />Phân tích chuyên sâu</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><OverviewTab rankResult={rankTracker.result} rankLoading={rankTracker.loading} backlinksResult={backlinks.result} backlinksLoading={backlinks.loading} kwResult={kwResearch.result} kwLoading={kwResearch.loading} /></TabsContent>
          <TabsContent value="keywords"><KeywordsTab kwResult={kwResearch.result} kwLoading={kwResearch.loading} rankResult={rankTracker.result} rankLoading={rankTracker.loading} /></TabsContent>
          <TabsContent value="backlinks"><BacklinksTab result={backlinks.result} loading={backlinks.loading} /></TabsContent>
          <TabsContent value="serp"><SerpTab result={serpSpy.result} loading={serpSpy.loading} /></TabsContent>
          <TabsContent value="deep"><DeepAnalysisTab result={seoAnalysis.result} loading={seoAnalysis.loading} domain={domain.trim()} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
