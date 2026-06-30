"use client";

import { useState } from "react";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox } from "@/components/lab-ui";
import { btn } from "@/lib/ui-tokens";
import { Globe, Search, Copy, Check, FileText } from "lucide-react";
import { MarkdownRenderer } from "@/lib/markdown";

interface SeoAnalysisResult {
  report: string;
}

export default function SeoAnalysisPage() {
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState("");
  const [targetRegion, setTargetRegion] = useState("Việt Nam");
  const [keywords, setKeywords] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [gscData, setGscData] = useState("");
  const [copied, setCopied] = useState(false);

  const { run, result, loading, error } = useLabTool<SeoAnalysisResult>("/seo-analysis");

  async function handleRun() {
    if (!domain.trim()) return;
    await run({
      domain: domain.trim(),
      industry: industry.trim(),
      target_region: targetRegion.trim(),
      keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
      competitors: competitors.split(",").map((c) => c.trim()).filter(Boolean),
      gsc_data: gscData.trim(),
    });
  }

  function handleCopy() {
    if (result?.report) {
      navigator.clipboard.writeText(result.report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Vitba SEO Analysis" />
      <ToolHeader
        name="Vitba SEO Analysis"
        description="Phân tích SEO chuyên sâu: đối thủ, keyword gap, nội dung, backlink, kỹ thuật + roadmap 30-60-90 ngày."
        tag="new"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1">
                <Globe className="h-3 w-3" /> Domain *
              </label>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                placeholder="vitba.ai"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Ngành nghề</label>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                placeholder="SaaS, AI Marketing, F&B..."
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Khu vực mục tiêu</label>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                placeholder="Việt Nam"
                value={targetRegion}
                onChange={(e) => setTargetRegion(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1">
                <Search className="h-3 w-3" /> Từ khóa chính (phẩy ngăn cách)
              </label>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                placeholder="marketing AI, tạo nội dung, SEO automation"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Đối thủ (phẩy ngăn cách)</label>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                placeholder="canva.com, copy.ai, jasper.ai"
                value={competitors}
                onChange={(e) => setCompetitors(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Dữ liệu GSC (tùy chọn)</label>
              <textarea
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none resize-y"
                rows={3}
                placeholder="Paste dữ liệu Google Search Console nếu có..."
                value={gscData}
                onChange={(e) => setGscData(e.target.value)}
              />
            </div>
          </div>

          <RunButton
            loading={loading}
            disabled={!domain.trim()}
            onClick={handleRun}
            loadingText="Đang phân tích SEO..."
            idleText="Phân tích SEO"
            className="w-full"
          />
          {error && <ErrorBox message={error} />}
        </div>

        {/* Report */}
        <div className="lg:col-span-3 space-y-4">
          {result?.report ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Báo cáo SEO
                </h3>
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
          ) : (
            <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border border-border bg-card/30">
              <div className="text-center max-w-sm">
                <Search className="mx-auto h-16 w-16 opacity-20 text-primary" />
                <p className="mt-4 text-lg font-medium text-muted-foreground">Vitba SEO Analysis</p>
                <p className="mt-2 text-sm text-muted-foreground/70">
                  Nhập domain và thông tin bên trái để tạo báo cáo SEO hoàn chỉnh: đối thủ, keyword gap, content plan, backlink, technical, roadmap 30-60-90 ngày.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
