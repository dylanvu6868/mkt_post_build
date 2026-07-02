"use client";

import { useLocalDraft } from "@/hooks/use-local-draft";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, ResultBox, LabInput } from "@/components/lab-ui";
import { Crosshair, Globe, ExternalLink, Users, BarChart3 } from "lucide-react";

interface SerpResultItem {
  type?: string;
  rank_group?: number;
  rank_absolute?: number;
  domain?: string;
  title?: string;
  url?: string;
  description?: string;
  keyword?: string;
  keyword_vi?: string;
}

interface CompetitorItem {
  domain: string;
  avg_position?: number;
  se_type?: string;
  intersections?: number;
  full_domain_metrics?: Record<string, unknown>;
}

interface SerpSpyResult {
  serp_results: { items: (SerpResultItem | { items?: SerpResultItem[] })[] };
  competitors: { items: (CompetitorItem | { items?: CompetitorItem[] })[] };
}

function flatten<T>(raw: (T | { items?: T[] })[]): T[] {
  const out: T[] = [];
  for (const entry of raw) {
    if (entry && typeof entry === "object" && "items" in entry && Array.isArray((entry as { items?: T[] }).items)) {
      for (const inner of (entry as { items: T[] }).items) {
        if (inner && typeof inner === "object" && "items" in inner && Array.isArray((inner as any).items)) {
          out.push(...(inner as any).items);
        } else {
          out.push(inner);
        }
      }
    } else if (entry && typeof entry === "object" && "items" in entry && (entry as any).items === null) {
      // skip
    } else {
      out.push(entry as T);
    }
  }
  return out;
}

function RankBadge({ rank }: { rank: number }) {
  const color =
    rank <= 3
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
      : rank <= 10
        ? "text-primary bg-primary/10 border-primary/20"
        : rank <= 20
          ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
          : "text-muted-foreground bg-muted/50 border-border/50";
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-bold border ${color}`}>
      {rank}
    </span>
  );
}

function PositionIndicator({ position }: { position: number }) {
  const maxPos = 100;
  const pct = Math.max(0, ((maxPos - position) / maxPos) * 100);
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

function truncateUrl(url: string, max = 60): string {
  return url.length > max ? url.slice(0, max) + "…" : url;
}

function SerpOverview({ items }: { items: SerpResultItem[] }) {
  const organic = items.filter(i => i.type === "organic" || !i.type);
  const top3 = organic.filter(i => (i.rank_absolute ?? i.rank_group ?? 999) <= 3).length;
  const top10 = organic.filter(i => (i.rank_absolute ?? i.rank_group ?? 999) <= 10).length;
  const total = organic.length;

  return (
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
  );
}

export default function SerpSpyPage() {
  const [keyword, setKeyword] = useLocalDraft("vitba_lab_draft_serp-spy_keyword", "");
  const locationCode = 2840;
  const { run, result, loading, error } = useLabTool<SerpSpyResult>("/serp-spy");

  async function handleRun() {
    if (!keyword.trim()) return;
    await run({ keyword: keyword.trim(), location_code: locationCode });
  }

  const serpItems = result?.serp_results?.items ? flatten<SerpResultItem>(result.serp_results.items).filter(i => i.type === "organic" || i.url) : [];
  const competitors = result?.competitors?.items ? flatten<CompetitorItem>(result.competitors.items) : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="SERP Spy" />
      <ToolHeader
        name="SERP Spy"
        description="Do thám SERP: kết quả tìm kiếm, đối thủ cạnh tranh, cơ hội lọt top."
        tag="new"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
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

        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              {serpItems.length > 0 && (
                <>
                  <SerpOverview items={serpItems} />
                  <ResultBox title="Kết quả SERP" dotColor="bg-primary">
                    <div className="space-y-2">
                      {serpItems.map((item, i) => {
                        const rank = item.rank_absolute ?? item.rank_group ?? i + 1;
                        return (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-3 rounded-xl border border-border/30 bg-card/20 hover:bg-card/50 hover:border-border/50 transition-all"
                          >
                            <RankBadge rank={rank} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Globe size={10} className="text-muted-foreground/60 shrink-0" />
                                <span className="text-[11px] text-muted-foreground font-medium">{item.domain}</span>
                              </div>
                              <p className="text-[13px] font-semibold text-foreground leading-snug truncate">{item.title}</p>
                              {item.url && (
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
                              )}
                              {item.description && (
                                <p className="text-[11px] text-muted-foreground/70 mt-1 line-clamp-2">{item.description}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ResultBox>
                </>
              )}

              {competitors.length > 0 && (
                <ResultBox title="Đối thủ cạnh tranh" dotColor="bg-primary">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 pr-4">Domain</th>
                          <th className="text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 px-3">
                            <BarChart3 size={10} className="inline mr-1" />Vị trí TB
                          </th>
                          <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 pl-3">
                            <Users size={10} className="inline mr-1" />Keyword chung
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {competitors.map((item, i) => (
                          <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 pr-4">
                              <span className="text-[13px] font-medium text-foreground">{item.domain}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <PositionIndicator position={Math.round(item.avg_position ?? 0)} />
                            </td>
                            <td className="py-2.5 pl-3 text-right">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                {item.intersections ?? 0} keyword
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ResultBox>
              )}

              {serpItems.length === 0 && competitors.length === 0 && (
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
