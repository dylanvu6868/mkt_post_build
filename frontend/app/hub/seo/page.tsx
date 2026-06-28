"use client";

import { useState } from "react";
import { useLabTool } from "@/hooks/use-lab-tool";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  LayoutGrid,
  Target,
  Zap,
  Clock,
  Share2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const LOCATION_CODE = 2840;

/* ------------------------------------------------------------------ */
/*  Type interfaces                                                     */
/* ------------------------------------------------------------------ */
interface KeywordItem {
  keyword: string;
  search_volume: number;
  cpc: number;
  keyword_difficulty: number;
  competition: number;
}

interface KeywordResearchResult {
  overview: { items: KeywordItem[] };
  ideas: { items: KeywordItem[] };
  related: { items: KeywordItem[] };
}

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

interface SummaryItem {
  backlinks: number;
  domains: number;
  dofollow: number;
  ref_domains: number;
}

interface ReferringDomainItem {
  domain: string;
  backlinks: number;
  domain_rank: number;
}

interface BacklinkItem {
  url_from: string;
  domain_from: string;
  anchor: string;
  domain_rank: number;
}

interface BacklinksResult {
  summary: { items: SummaryItem[] };
  referring_domains: { items: ReferringDomainItem[] };
  backlinks: { items: BacklinkItem[] };
}

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

interface SeoAnalysisResult {
  report: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

function scoreBgColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function scoreRingColor(score: number): string {
  if (score >= 80) return "stroke-green-500";
  if (score >= 50) return "stroke-amber-500";
  return "stroke-red-500";
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

/* ------------------------------------------------------------------ */
/*  Score Gauge (circular SVG)                                          */
/* ------------------------------------------------------------------ */
function ScoreGauge({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center gap-2">
      <svg width="140" height="140" className="-rotate-90">
        <circle
          cx="70" cy="70" r={radius}
          fill="none" className="stroke-muted" strokeWidth="10"
        />
        <circle
          cx="70" cy="70" r={radius}
          fill="none" className={scoreRingColor(score)}
          strokeWidth="10" strokeDasharray={circumference}
          strokeDashoffset={offset} strokeLinecap="round"
        />
      </svg>
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{ width: 140, height: 140 }}
      >
        <span className={`text-3xl font-bold ${scoreColor(score)}`}>{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Cell                                                           */
/* ------------------------------------------------------------------ */
function StatCell({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border px-3 py-2 text-center">
      {icon && <div className="mb-1 flex justify-center text-muted-foreground/60">{icon}</div>}
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card (backlinks style)                                         */
/* ------------------------------------------------------------------ */
function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="text-muted-foreground/60">{icon}</div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
          {label}
        </p>
      </div>
      <p className="text-xl font-bold tabular-nums">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Difficulty Badge                                                    */
/* ------------------------------------------------------------------ */
function DifficultyBadge({ score }: { score: number }) {
  let color =
    "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (score > 70)
    color = "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20";
  else if (score > 40)
    color =
      "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${color}`}
    >
      {score}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Competition Bar                                                     */
/* ------------------------------------------------------------------ */
function CompetitionBar({ value }: { value: number }) {
  const pct = Math.min(value * 100, 100);
  let color = "bg-emerald-500";
  if (pct > 70) color = "bg-red-500";
  else if (pct > 40) color = "bg-amber-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Rank Badge                                                          */
/* ------------------------------------------------------------------ */
function RankBadge({ rank }: { rank: number }) {
  let color =
    "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (rank <= 3)
    color =
      "text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30";
  else if (rank <= 10)
    color = "text-primary bg-primary/10 border-primary/20";
  else color = "text-muted-foreground bg-muted/50 border-border/50";
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-lg border text-[10px] font-bold ${color}`}
    >
      {rank}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Domain Rank Badge                                                   */
/* ------------------------------------------------------------------ */
function DomainRankBadge({ score }: { score: number }) {
  let color =
    "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (score > 70)
    color = "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20";
  else if (score > 40)
    color =
      "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${color}`}
    >
      {score}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Markdown Renderer (from seo-analysis page)                          */
/* ------------------------------------------------------------------ */
function MarkdownRenderer({ content }: { content: string }) {
  const html = convertMarkdown(content);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

function convertMarkdown(md: string): string {
  let html = md;
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
  html = html.replace(/`(.+?)`/g, "<code>$1</code>");
  html = html.replace(/^\|(.+)\|$/gm, (match) => {
    const cells = match.split("|").filter((c) => c.trim());
    const isSeparator = cells.every((c) => /^[\s-:]+$/.test(c));
    if (isSeparator) return "";
    return `<tr>${cells.map((c) => `<td>${c.trim()}</td>`).join("")}</tr>`;
  });
  html = html.replace(/(<tr>[\s\S]*?<\/tr>)/g, "<table>$1</table>");
  html = html.replace(/<\/table>\s*<table>/g, "");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
  html = html.replace(/<\/ul>\s*<ul>/g, "");
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;
  html = html.replace(/<p><h/g, "<h").replace(/<\/h(\d)><\/p>/g, "</h$1>");
  html = html
    .replace(/<p><table/g, "<table")
    .replace(/<\/table><\/p>/g, "</table>");
  html = html.replace(/<p><ul/g, "<ul").replace(/<\/ul><\/p>/g, "</ul>");
  html = html
    .replace(/<p><pre/g, "<pre")
    .replace(/<\/pre><\/p>/g, "</pre>");
  html = html.replace(/<p>\s*<\/p>/g, "");
  return html;
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton per section                                        */
/* ------------------------------------------------------------------ */
function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
      <CardContent className="space-y-3 pt-6">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
      <CardContent className="space-y-2 pt-6">
        <Skeleton className="h-6 w-full" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                         */
/* ------------------------------------------------------------------ */
function EmptySection({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/40 bg-muted/50 text-muted-foreground/40">
        {icon}
      </div>
      <p className="text-xs font-medium text-muted-foreground/50">{text}</p>
    </div>
  );
}

/* ================================================================== */
/*  TAB: TỔNG QUAN (Overview)                                          */
/* ================================================================== */
function OverviewTab({
  rankResult,
  rankLoading,
  backlinksResult,
  backlinksLoading,
  kwResult,
  kwLoading,
}: {
  rankResult: RankTrackerResult | null;
  rankLoading: boolean;
  backlinksResult: BacklinksResult | null;
  backlinksLoading: boolean;
  kwResult: KeywordResearchResult | null;
  kwLoading: boolean;
}) {
  const loading = rankLoading || backlinksLoading || kwLoading;
  const overview = rankResult?.rank_overview?.items?.[0];
  const summary = backlinksResult?.summary?.items?.[0];
  const kwCount = kwResult?.overview?.items?.length ?? 0;
  const hasData = overview || summary || kwCount > 0;

  if (loading) return <SectionSkeleton rows={6} />;
  if (!hasData) {
    return (
      <EmptySection
        icon={<Award size={20} />}
        text="Chưa có dữ liệu tổng quan. Hãy tạo báo cáo SEO trước."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Score + Key metrics row */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            {/* Score gauge */}
            <div className="relative">
              <ScoreGauge score={overview?.domain_rank ?? 0} />
              <p className="mt-1 text-center text-[10px] font-medium text-muted-foreground">
                Domain Authority
              </p>
            </div>
            {/* Stats grid */}
            <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
              <StatCell
                label="Thứ hạng Top"
                value={overview?.rank_absolute ? `#${overview.rank_absolute}` : "—"}
                icon={<Target size={14} />}
              />
              <StatCell
                label="ETV"
                value={overview?.etv ? formatNumber(overview.etv) : "—"}
                icon={<TrendingUp size={14} />}
              />
              <StatCell
                label="Backlinks"
                value={summary?.backlinks ? formatNumber(summary.backlinks) : "—"}
                icon={<Link size={14} />}
              />
              <StatCell
                label="Referring Domains"
                value={summary?.ref_domains ? formatNumber(summary.ref_domains) : "—"}
                icon={<Share2 size={14} />}
              />
              <StatCell
                label="Từ khóa tìm thấy"
                value={kwCount > 0 ? kwCount : "—"}
                icon={<Search size={14} />}
              />
              <StatCell
                label="Trang chính"
                value={overview?.main_page ?? "—"}
                icon={<Globe size={14} />}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-emerald-500/70 to-emerald-500/40" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap size={16} className="text-emerald-500" />
              Sức mạnh Domain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {overview
                ? overview.domain_rank >= 70
                  ? "Domain mạnh — có khả năng cạnh tranh cao."
                  : overview.domain_rank >= 40
                    ? "Domain trung bình — cần cải thiện authority."
                    : "Domain yếu — cần xây dựng backlinks và nội dung."
                : "Chưa có dữ liệu đánh giá."}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-blue-500/70 to-blue-500/40" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Link size={16} className="text-blue-500" />
              Hồ sơ Backlink
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {summary
                ? `${formatNumber(summary.backlinks)} backlinks từ ${formatNumber(summary.ref_domains)} referring domains. Dofollow: ${formatNumber(summary.dofollow)}.`
                : "Chưa có dữ liệu backlink."}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-purple-500 via-purple-500/70 to-purple-500/40" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Search size={16} className="text-purple-500" />
              Tiềm năng từ khóa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {kwResult?.overview?.items?.[0]
                ? `Từ khóa chính: "${kwResult.overview.items[0].keyword}" — Volume: ${formatNumber(kwResult.overview.items[0].search_volume)}, Difficulty: ${kwResult.overview.items[0].keyword_difficulty}/100.`
                : "Chưa có dữ liệu từ khóa."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  TAB: TỪ KHÓA (Keywords)                                             */
/* ================================================================== */
function KeywordsTab({
  kwResult,
  kwLoading,
  rankResult,
  rankLoading,
}: {
  kwResult: KeywordResearchResult | null;
  kwLoading: boolean;
  rankResult: RankTrackerResult | null;
  rankLoading: boolean;
}) {
  const loading = kwLoading || rankLoading;
  const overviewItems = kwResult?.overview?.items ?? [];
  const ideasItems = kwResult?.ideas?.items ?? [];
  const relatedItems = kwResult?.related?.items ?? [];
  const rankedItems = rankResult?.ranked_keywords?.items ?? [];
  const hasData =
    overviewItems.length > 0 ||
    ideasItems.length > 0 ||
    relatedItems.length > 0 ||
    rankedItems.length > 0;

  if (loading) return <TableSkeleton rows={8} />;
  if (!hasData) {
    return (
      <EmptySection
        icon={<Search size={20} />}
        text="Chưa có dữ liệu từ khóa. Hãy tạo báo cáo SEO trước."
      />
    );
  }

  function KeywordTable({
    items,
    title,
  }: {
    items: KeywordItem[];
    title: string;
  }) {
    if (items.length === 0) return null;
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
        <CardHeader>
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="pr-4 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  Keyword
                </th>
                <th className="px-3 pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  <Search size={10} className="mr-1 inline" />
                  Volume
                </th>
                <th className="px-3 pb-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  <BarChart3 size={10} className="mr-1 inline" />
                  Difficulty
                </th>
                <th className="px-3 pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  <DollarSign size={10} className="mr-1 inline" />
                  CPC
                </th>
                <th className="pl-3 pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  <Activity size={10} className="mr-1 inline" />
                  Competition
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr
                  key={i}
                  className="border-b border-border/20 transition-colors hover:bg-muted/20"
                >
                  <td className="pr-4 py-2.5">
                    <span className="text-[13px] font-medium text-foreground">
                      {item.keyword}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-xs font-semibold tabular-nums">
                      {formatNumber(item.search_volume)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <DifficultyBadge score={item.keyword_difficulty} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-xs tabular-nums">
                      ${item.cpc.toFixed(2)}
                    </span>
                  </td>
                  <td className="pl-3 py-2.5 text-right">
                    <CompetitionBar value={item.competition} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ranked keywords from rank tracker */}
      {rankedItems.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
          <CardHeader>
            <CardTitle className="text-sm">
              <Hash size={14} className="mr-1.5 inline" />
              Từ khóa đang xếp hạng
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="pr-4 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    Keyword
                  </th>
                  <th className="px-3 pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    <Search size={10} className="mr-1 inline" />
                    Volume
                  </th>
                  <th className="px-3 pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    <DollarSign size={10} className="mr-1 inline" />
                    CPC
                  </th>
                  <th className="pl-3 pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    <Hash size={10} className="mr-1 inline" />
                    Rank
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankedItems.map((item, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/20 transition-colors hover:bg-muted/20"
                  >
                    <td className="pr-4 py-2.5">
                      <span className="text-[13px] font-medium text-foreground">
                        {item.keyword}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-xs font-semibold tabular-nums">
                        {formatNumber(item.search_volume)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-xs tabular-nums">
                        ${item.cpc.toFixed(2)}
                      </span>
                    </td>
                    <td className="pl-3 py-2.5 text-right">
                      <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        #{item.rank_absolute}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Keyword research tables */}
      <KeywordTable items={overviewItems} title="Tổng quan từ khóa" />
      <KeywordTable items={ideasItems} title="Gợi ý từ khóa" />
      <KeywordTable items={relatedItems} title="Từ khóa liên quan" />
    </div>
  );
}

/* ================================================================== */
/*  TAB: BACKLINKS                                                      */
/* ================================================================== */
function BacklinksTab({
  result,
  loading,
}: {
  result: BacklinksResult | null;
  loading: boolean;
}) {
  if (loading) return <SectionSkeleton rows={6} />;

  const summary = result?.summary?.items?.[0];
  const refDomains = result?.referring_domains?.items ?? [];
  const recentBacklinks = result?.backlinks?.items ?? [];
  const hasData = summary || refDomains.length > 0 || recentBacklinks.length > 0;

  if (!hasData) {
    return (
      <EmptySection
        icon={<Link size={20} />}
        text="Chưa có dữ liệu backlinks. Hãy tạo báo cáo SEO trước."
      />
    );
  }

  function truncateUrl(url: string, max = 50): string {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Tổng Backlinks"
            value={summary.backlinks}
            icon={<Link size={14} />}
          />
          <StatCard
            label="Referring Domains"
            value={summary.ref_domains}
            icon={<ExternalLink size={14} />}
          />
          <StatCard
            label="Dofollow"
            value={summary.dofollow}
            icon={<Share2 size={14} />}
          />
          <StatCard
            label="IP Domains"
            value={summary.domains}
            icon={<Globe size={14} />}
          />
        </div>
      )}

      {/* Referring Domains */}
      {refDomains.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
          <CardHeader>
            <CardTitle className="text-sm">
              <ExternalLink size={14} className="mr-1.5 inline" />
              Referring Domains
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="pr-4 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    Domain
                  </th>
                  <th className="px-3 pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    Backlinks
                  </th>
                  <th className="pl-3 pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    Domain Rank
                  </th>
                </tr>
              </thead>
              <tbody>
                {refDomains.map((item, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/20 transition-colors hover:bg-muted/20"
                  >
                    <td className="pr-4 py-2.5">
                      <span className="text-[13px] font-medium text-foreground">
                        {item.domain}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-xs font-semibold tabular-nums">
                        {formatNumber(item.backlinks)}
                      </span>
                    </td>
                    <td className="pl-3 py-2.5 text-right">
                      <DomainRankBadge score={item.domain_rank} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Recent Backlinks */}
      {recentBacklinks.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
          <CardHeader>
            <CardTitle className="text-sm">
              <Link size={14} className="mr-1.5 inline" />
              Backlinks gần đây
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="pr-4 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    URL
                  </th>
                  <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    Anchor
                  </th>
                  <th className="pl-3 pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    DR
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentBacklinks.slice(0, 20).map((item, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/20 transition-colors hover:bg-muted/20"
                  >
                    <td className="max-w-[200px] pr-4 py-2.5">
                      <a
                        href={item.url_from}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
                      >
                        <ExternalLink size={10} />
                        <span className="truncate">
                          {truncateUrl(item.url_from)}
                        </span>
                      </a>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {item.domain_from}
                      </p>
                    </td>
                    <td className="max-w-[150px] px-3 py-2.5">
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.anchor}
                      </span>
                    </td>
                    <td className="pl-3 py-2.5 text-right">
                      <DomainRankBadge score={item.domain_rank} />
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

/* ================================================================== */
/*  TAB: SERP & ĐỐI THỦ                                                 */
/* ================================================================== */
function SerpTab({
  result,
  loading,
}: {
  result: SerpSpyResult | null;
  loading: boolean;
}) {
  if (loading) return <SectionSkeleton rows={6} />;

  const serpItems = result?.serp_results?.items ?? [];
  const competitorItems = result?.competitors?.items ?? [];
  const hasData = serpItems.length > 0 || competitorItems.length > 0;

  if (!hasData) {
    return (
      <EmptySection
        icon={<Crosshair size={20} />}
        text="Chưa có dữ liệu SERP. Hãy tạo báo cáo SEO trước."
      />
    );
  }

  function truncateUrl(url: string, max = 60): string {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }

  return (
    <div className="space-y-6">
      {/* SERP Results */}
      {serpItems.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
          <CardHeader>
            <CardTitle className="text-sm">
              <Search size={14} className="mr-1.5 inline" />
              Kết quả SERP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {serpItems.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-border/30 bg-card/20 p-3 transition-all hover:border-border/50 hover:bg-card/50"
              >
                <RankBadge rank={item.rank} />
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <Globe size={10} className="shrink-0 text-muted-foreground/60" />
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {item.domain}
                    </span>
                  </div>
                  <p className="truncate text-[13px] font-semibold leading-snug text-foreground">
                    {item.title}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    <ExternalLink size={9} className="shrink-0 text-muted-foreground/40" />
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-[10px] text-primary/70 hover:text-primary"
                    >
                      {truncateUrl(item.url)}
                    </a>
                  </div>
                  {item.description && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground/70">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Competitors */}
      {competitorItems.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
          <CardHeader>
            <CardTitle className="text-sm">
              <Users size={14} className="mr-1.5 inline" />
              Đối thủ cạnh tranh
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="pr-4 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    Domain
                  </th>
                  <th className="px-3 pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    <Search size={10} className="mr-1 inline" />
                    Rank
                  </th>
                  <th className="pl-3 pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    <Users size={10} className="mr-1 inline" />
                    Keyword chung
                  </th>
                </tr>
              </thead>
              <tbody>
                {competitorItems.map((item, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/20 transition-colors hover:bg-muted/20"
                  >
                    <td className="pr-4 py-2.5">
                      <span className="text-[13px] font-medium text-foreground">
                        {item.domain}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-xs font-semibold tabular-nums">
                        #{item.rank}
                      </span>
                    </td>
                    <td className="pl-3 py-2.5 text-right">
                      <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {item.intersecting_keywords} keyword
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

/* ================================================================== */
/*  TAB: PHÂN TÍCH CHUYÊN SÂU (Deep Analysis)                          */
/* ================================================================== */
function DeepAnalysisTab({
  result,
  loading,
  domain,
}: {
  result: SeoAnalysisResult | null;
  loading: boolean;
  domain: string;
}) {
  const [copied, setCopied] = useState(false);

  if (loading) return <SectionSkeleton rows={8} />;

  if (!result?.report) {
    return (
      <EmptySection
        icon={<FileText size={20} />}
        text="Chưa có báo cáo phân tích chuyên sâu. Hãy tạo báo cáo SEO trước."
      />
    );
  }

  function handleCopy() {
    if (result?.report) {
      navigator.clipboard.writeText(result.report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText className="h-4 w-4 text-primary" />
          Báo cáo SEO chuyên sâu — {domain}
        </h3>
        <button onClick={handleCopy} className={`${btn} text-xs`}>
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" /> Đã copy
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy báo cáo
            </>
          )}
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

/* ================================================================== */
/*  MAIN PAGE                                                           */
/* ================================================================== */
export default function VitbaSeoPage() {
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState("");
  const [targetRegion, setTargetRegion] = useState("Việt Nam");
  const [keywords, setKeywords] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  // 5 lab tool hooks — one per endpoint
  const kwResearch = useLabTool<KeywordResearchResult>("/keyword-research");
  const rankTracker = useLabTool<RankTrackerResult>("/rank-tracker");
  const backlinks = useLabTool<BacklinksResult>("/backlinks");
  const serpSpy = useLabTool<SerpSpyResult>("/serp-spy");
  const seoAnalysis = useLabTool<SeoAnalysisResult>("/seo-analysis");

  const handleGenerate = async () => {
    if (!domain.trim() || generating) return;

    setGenerating(true);
    setGenerated(false);

    // Reset all prior results
    kwResearch.reset();
    rankTracker.reset();
    backlinks.reset();
    serpSpy.reset();
    seoAnalysis.reset();

    const kwBody = { keyword: domain.trim(), location_code: LOCATION_CODE };
    const rankBody = { domain: domain.trim(), location_code: LOCATION_CODE };
    const backBody = { domain: domain.trim() };
    const serpBody = { keyword: domain.trim(), location_code: LOCATION_CODE };
    const seoBody = {
      domain: domain.trim(),
      industry: industry.trim(),
      target_region: targetRegion.trim(),
      keywords: keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      competitors: competitors
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    };

    // Fire all 5 in parallel
    await Promise.allSettled([
      kwResearch.run(kwBody),
      rankTracker.run(rankBody),
      backlinks.run(backBody),
      serpSpy.run(serpBody),
      seoAnalysis.run(seoBody),
    ]);

    setGenerating(false);
    setGenerated(true);
  };

  // Any loading state (for the button)
  const anyLoading =
    kwResearch.loading ||
    rankTracker.loading ||
    backlinks.loading ||
    serpSpy.loading ||
    seoAnalysis.loading;

  // Any error (for display)
  const anyError =
    kwResearch.error ||
    rankTracker.error ||
    backlinks.error ||
    serpSpy.error ||
    seoAnalysis.error;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ── */}
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
          <Search className="h-8 w-8 text-primary" />
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Vitba SEO
          </span>
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Báo cáo SEO toàn diện: keyword research, rank tracking, backlinks,
          SERP intelligence &amp; phân tích chuyên sâu.
        </p>
      </div>

      {/* ── Form Card ── */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Domain (required) */}
            <div className="md:col-span-2 lg:col-span-1">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground/60">
                <Globe className="mr-1 inline h-3 w-3" />
                Domain *
              </label>
              <input
                className={inp}
                placeholder="vitba.ai"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && domain.trim()) handleGenerate();
                }}
              />
            </div>

            {/* Industry */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground/60">
                Ngành nghề
              </label>
              <input
                className={inp}
                placeholder="SaaS, AI Marketing, F&B..."
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>

            {/* Target Region */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground/60">
                Khu vực
              </label>
              <input
                className={inp}
                placeholder="Việt Nam"
                value={targetRegion}
                onChange={(e) => setTargetRegion(e.target.value)}
              />
            </div>

            {/* Keywords */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground/60">
                <Search className="mr-1 inline h-3 w-3" />
                Từ khóa chính (phẩy)
              </label>
              <input
                className={inp}
                placeholder="marketing AI, SEO automation..."
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>

            {/* Competitors */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground/60">
                <Users className="mr-1 inline h-3 w-3" />
                Đối thủ (phẩy)
              </label>
              <input
                className={inp}
                placeholder="canva.com, copy.ai..."
                value={competitors}
                onChange={(e) => setCompetitors(e.target.value)}
              />
            </div>

            {/* Generate button */}
            <div className="flex items-end">
              <button
                className={`${btn} w-full`}
                onClick={handleGenerate}
                disabled={generating || !domain.trim()}
              >
                {generating ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Đang tạo báo cáo...
                  </>
                ) : (
                  <>
                    <Target className="mr-2 h-4 w-4" />
                    Tạo báo cáo SEO
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error summary */}
          {anyError && (
            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
              <p className="text-xs font-medium text-red-600 dark:text-red-400">
                Một số API gặp lỗi — kết quả có thể không đầy đủ. Chi tiết hiển
                thị dưới từng tab.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Report Sections (shown after generation) ── */}
      {generating || generated ? (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex-wrap gap-1 bg-muted/50 p-1">
            <TabsTrigger
              value="overview"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              <Award className="mr-1.5 h-3.5 w-3.5" />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger
              value="keywords"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              <Search className="mr-1.5 h-3.5 w-3.5" />
              Từ khóa
            </TabsTrigger>
            <TabsTrigger
              value="backlinks"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              <Link className="mr-1.5 h-3.5 w-3.5" />
              Backlinks
            </TabsTrigger>
            <TabsTrigger
              value="serp"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              <Crosshair className="mr-1.5 h-3.5 w-3.5" />
              SERP &amp; Đối thủ
            </TabsTrigger>
            <TabsTrigger
              value="deep"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Phân tích chuyên sâu
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              rankResult={rankTracker.result}
              rankLoading={rankTracker.loading}
              backlinksResult={backlinks.result}
              backlinksLoading={backlinks.loading}
              kwResult={kwResearch.result}
              kwLoading={kwResearch.loading}
            />
          </TabsContent>

          <TabsContent value="keywords">
            <KeywordsTab
              kwResult={kwResearch.result}
              kwLoading={kwResearch.loading}
              rankResult={rankTracker.result}
              rankLoading={rankTracker.loading}
            />
          </TabsContent>

          <TabsContent value="backlinks">
            <BacklinksTab
              result={backlinks.result}
              loading={backlinks.loading}
            />
          </TabsContent>

          <TabsContent value="serp">
            <SerpTab result={serpSpy.result} loading={serpSpy.loading} />
          </TabsContent>

          <TabsContent value="deep">
            <DeepAnalysisTab
              result={seoAnalysis.result}
              loading={seoAnalysis.loading}
              domain={domain.trim()}
            />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
