"use client";

import { useState } from "react";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, ResultBox, LabInput } from "@/components/lab-ui";
import { Search, TrendingUp, DollarSign, BarChart3, Activity } from "lucide-react";

interface KeywordItem {
  keyword: string;
  search_volume: number;
  cpc: number;
  keyword_difficulty: number;
  competition: number;
  trends?: number[];
}

interface KeywordResearchResult {
  overview: { items: KeywordItem[] };
  ideas: { items: KeywordItem[] };
  related: { items: KeywordItem[] };
}

function DifficultyBadge({ score }: { score: number }) {
  let color = "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (score > 70) color = "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20";
  else if (score > 40) color = "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${color}`}>
      {score}
    </span>
  );
}

function CompetitionBar({ value }: { value: number }) {
  const pct = Math.min(value * 100, 100);
  let color = "bg-emerald-500";
  if (pct > 70) color = "bg-red-500";
  else if (pct > 40) color = "bg-amber-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground font-medium tabular-nums">{value.toFixed(2)}</span>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function KeywordTable({ items, title }: { items: KeywordItem[]; title: string }) {
  if (!items || items.length === 0) return null;
  return (
    <ResultBox title={title} dotColor="bg-primary">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 pr-4">Keyword</th>
              <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 px-3">
                <span className="inline-flex items-center gap-1"><Search size={10} /> Volume</span>
              </th>
              <th className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 px-3">
                <span className="inline-flex items-center gap-1"><BarChart3 size={10} /> Difficulty</span>
              </th>
              <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 px-3">
                <span className="inline-flex items-center gap-1"><DollarSign size={10} /> CPC</span>
              </th>
              <th className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pb-2 pl-3">
                <span className="inline-flex items-center gap-1"><Activity size={10} /> Competition</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                <td className="py-2.5 pr-4">
                  <span className="text-[13px] font-medium text-foreground">{item.keyword}</span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className="text-xs font-semibold tabular-nums">{formatNumber(item.search_volume)}</span>
                </td>
                <td className="py-2.5 px-3 text-center">
                  <DifficultyBadge score={item.keyword_difficulty} />
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className="text-xs tabular-nums">${item.cpc.toFixed(2)}</span>
                </td>
                <td className="py-2.5 pl-3 text-right">
                  <CompetitionBar value={item.competition} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ResultBox>
  );
}

export default function KeywordResearchPage() {
  const [keyword, setKeyword] = useState("");
  const locationCode = 2840;
  const { run, result, loading, error } = useLabTool<KeywordResearchResult>("/keyword-research");

  async function handleRun() {
    if (!keyword.trim()) return;
    await run({ keyword: keyword.trim(), location_code: locationCode });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Keyword Research" />
      <ToolHeader
        name="Keyword Research"
        description="Nghiên cứu từ khóa thực tế: search volume, độ khó, CPC, xu hướng — dữ liệu từ DataForSEO."
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
              placeholder="VD: marketing AI, SEO automation..."
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

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              {result.overview?.items && result.overview.items.length > 0 && (
                <KeywordTable items={result.overview.items} title="Tổng quan từ khóa" />
              )}
              {result.ideas?.items && result.ideas.items.length > 0 && (
                <KeywordTable items={result.ideas.items} title="Gợi ý từ khóa" />
              )}
              {result.related?.items && result.related.items.length > 0 && (
                <KeywordTable items={result.related.items} title="Từ khóa liên quan" />
              )}
              {(!result.overview?.items?.length && !result.ideas?.items?.length && !result.related?.items?.length) && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground/40">
                    <Search size={20} />
                  </div>
                  <p className="text-xs text-muted-foreground/50 font-medium">Không tìm thấy dữ liệu từ khóa</p>
                </div>
              )}
            </>
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
