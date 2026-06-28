"use client";

import { useState } from "react";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, ResultBox, LabInput } from "@/components/lab-ui";
import { Globe, Link, ExternalLink, Share2 } from "lucide-react";

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

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-muted-foreground/60">{icon}</div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{label}</p>
      </div>
      <p className="text-xl font-bold tabular-nums">{typeof value === "number" ? formatNumber(value) : value}</p>
    </div>
  );
}

function DomainRankBadge({ score }: { score: number }) {
  let color = "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (score > 70) color = "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20";
  else if (score > 40) color = "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${color}`}>
      {score}
    </span>
  );
}

function truncateUrl(url: string, max = 50): string {
  return url.length > max ? url.slice(0, max) + "…" : url;
}

export default function BacklinksPage() {
  const [domain, setDomain] = useState("");
  const { run, result, loading, error } = useLabTool<BacklinksResult>("/backlinks");

  async function handleRun() {
    if (!domain.trim()) return;
    await run({ domain: domain.trim() });
  }

  const summary = result?.summary?.items?.[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Backlinks Analyzer" />
      <ToolHeader
        name="Backlinks Analyzer"
        description="Phân tích backlinks: tổng quan, referring domains, liên kết mới nhất."
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
            loadingText="Đang phân tích..."
            idleText="Phân tích backlinks"
            className="w-full"
          />
          {error && <ErrorBox message={error} />}
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              {summary && (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Tổng Backlinks" value={summary.backlinks} icon={<Link size={14} />} />
                  <StatCard label="Referring Domains" value={summary.ref_domains} icon={<ExternalLink size={14} />} />
                  <StatCard label="Dofollow" value={summary.dofollow} icon={<Share2 size={14} />} />
                  <StatCard label="IP Domains" value={summary.domains} icon={<Globe size={14} />} />
                </div>
              )}

              {result.referring_domains?.items && result.referring_domains.items.length > 0 && (
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
                        {result.referring_domains.items.map((item, i) => (
                          <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 pr-4">
                              <span className="text-[13px] font-medium text-foreground">{item.domain}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="text-xs font-semibold tabular-nums">{formatNumber(item.backlinks)}</span>
                            </td>
                            <td className="py-2.5 pl-3 text-right">
                              <DomainRankBadge score={item.domain_rank} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ResultBox>
              )}

              {result.backlinks?.items && result.backlinks.items.length > 0 && (
                <ResultBox title="Backlinks gần đây" dotColor="bg-primary">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 pr-4">URL</th>
                          <th className="text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 px-3">Anchor</th>
                          <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 pl-3">DR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.backlinks.items.slice(0, 20).map((item, i) => (
                          <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 pr-4 max-w-[200px]">
                              <a
                                href={item.url_from}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[12px] text-primary hover:underline font-medium flex items-center gap-1"
                              >
                                <ExternalLink size={10} />
                                <span className="truncate">{truncateUrl(item.url_from)}</span>
                              </a>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{item.domain_from}</p>
                            </td>
                            <td className="py-2.5 px-3 max-w-[150px]">
                              <span className="text-xs text-muted-foreground truncate block">{item.anchor}</span>
                            </td>
                            <td className="py-2.5 pl-3 text-right">
                              <DomainRankBadge score={item.domain_rank} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ResultBox>
              )}

              {(!summary && !result.referring_domains?.items?.length && !result.backlinks?.items?.length) && (
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
