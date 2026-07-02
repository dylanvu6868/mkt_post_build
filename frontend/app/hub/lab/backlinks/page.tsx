"use client";

import { useLocalDraft } from "@/hooks/use-local-draft";
import { useLabTool } from "@/hooks/use-lab-tool";
import { useLabHistoryRestore } from "@/hooks/use-lab-history-restore";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, ResultBox, LabInput } from "@/components/lab-ui";
import { Globe, Link, ExternalLink, Share2, Shield, ArrowUpRight } from "lucide-react";

interface SummaryItem {
  backlinks: number;
  referring_domains: number;
  referring_domains_nofollow: number;
  referring_ips: number;
  referring_subnets: number;
  broken_backlinks: number;
  broken_pages: number;
  rank: number;
}

interface ReferringDomainItem {
  domain: string;
  backlinks: number;
  rank: number;
}

interface BacklinkItem {
  url_from: string;
  domain_from: string;
  anchor: string;
  rank: number;
  dofollow: boolean;
  page_from_title?: string;
}

interface BacklinksResult {
  summary: { items: SummaryItem[] };
  referring_domains: { items: (ReferringDomainItem | { items?: ReferringDomainItem[] })[] };
  backlinks: { items: (BacklinkItem | { items?: BacklinkItem[] })[] };
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
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

function RadialGauge({ value, max, size = 72, label, color: forceColor }: { value: number; max: number; size?: number; label: string; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = forceColor ?? (pct >= 60 ? "#22c55e" : pct >= 30 ? "#f59e0b" : "#ef4444");
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={4} className="text-muted/20" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold tabular-nums" style={{ color }}>{formatNumber(value)}</span>
        </div>
      </div>
      <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider text-center">{label}</p>
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

function truncateUrl(url: string, max = 50): string {
  return url.length > max ? url.slice(0, max) + "…" : url;
}

export default function BacklinksPage() {
  const [domain, setDomain] = useLocalDraft("vitba_lab_draft_backlinks_domain", "");
  const { run, result, setResult, loading, error } = useLabTool<BacklinksResult>("/backlinks");

  // Mở lại kết quả đã lưu từ trang Lịch sử (?hist={id})
  useLabHistoryRestore((item) => {
    const inp = item.input_data as Record<string, string> | null;
    if (inp) {
      if (inp.domain !== undefined) setDomain(String(inp.domain));
    }
    if (item.output_data) setResult(item.output_data as unknown as BacklinksResult);
  });

  async function handleRun() {
    if (!domain.trim()) return;
    await run({ domain: domain.trim() });
  }

  const summary = result?.summary?.items?.[0];
  const refDomains = result?.referring_domains?.items ? flatten<ReferringDomainItem>(result.referring_domains.items) : [];
  const backlinks = result?.backlinks?.items ? flatten<BacklinkItem>(result.backlinks.items) : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Backlinks Analyzer" />
      <ToolHeader
        name="Backlinks Analyzer"
        description="Phân tích backlinks: tổng quan, referring domains, liên kết mới nhất."
        tag="new"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
            <LabInput label="Domain" value={domain} onChange={setDomain} placeholder="vitba.ai" />
          </div>
          <RunButton loading={loading} disabled={!domain.trim()} onClick={handleRun} loadingText="Đang phân tích..." idleText="Phân tích backlinks" className="w-full" />
          {error && <ErrorBox message={error} />}
        </div>

        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
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
                          <Link size={10} /> {formatNumber(summary.referring_domains_nofollow)} nofollow domains
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}

              {refDomains.length > 0 && (
                <ResultBox title="Referring Domains" dotColor="bg-primary">
                  <div className="overflow-x-auto">
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
                            <td className="py-2.5 pr-4">
                              <span className="text-[13px] font-medium text-foreground">{item.domain}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="text-xs font-semibold tabular-nums">{formatNumber(item.backlinks)}</span>
                            </td>
                            <td className="py-2.5 pl-3 flex justify-end">
                              <DomainRankBar rank={item.rank} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ResultBox>
              )}

              {backlinks.length > 0 && (
                <ResultBox title="Backlinks gần đây" dotColor="bg-primary">
                  <div className="space-y-2">
                    {backlinks.slice(0, 20).map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border/30 bg-card/20 hover:bg-card/50 hover:border-border/50 transition-all">
                        <div className="shrink-0 mt-0.5">
                          <DomainRankBar rank={item.rank} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Globe size={10} className="text-muted-foreground/60 shrink-0" />
                            <span className="text-[11px] text-muted-foreground font-medium">{item.domain_from}</span>
                            {item.dofollow && (
                              <span className="px-1.5 py-0 rounded text-[8px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">follow</span>
                            )}
                          </div>
                          <a
                            href={item.url_from}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] text-primary hover:underline font-medium inline-flex items-center gap-1"
                          >
                            <ArrowUpRight size={10} />
                            <span className="truncate">{truncateUrl(item.url_from)}</span>
                          </a>
                          {item.anchor && (
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">Anchor: {item.anchor}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ResultBox>
              )}

              {!summary && refDomains.length === 0 && backlinks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground/40">
                    <Link size={20} />
                  </div>
                  <p className="text-xs text-muted-foreground/50 font-medium">Không tìm thấy dữ liệu backlinks</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground/40">
                <Share2 size={20} />
              </div>
              <p className="text-xs text-muted-foreground/50 font-medium">Nhập domain để phân tích backlinks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
