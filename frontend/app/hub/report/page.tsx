"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLabTool } from "@/hooks/use-lab-tool";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ReportResult {
  markdown_content: string;
}

export default function ReportPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    product: "",
    business_model: "",
    target_market: "",
    target_customer: "",
    price: "",
    stage: "",
    goal_3m: "",
    goal_6m: "",
    goal_12m: "",
    budget: "",
    resources: "",
    competitors: "",
    strengths: "",
    weaknesses: "",
  });

  const { run, result, loading, error } = useLabTool<ReportResult>("/report");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  async function handleRun() {
    if (!formData.name.trim() || !formData.industry.trim()) return; // basic validation
    await run(formData);
  }

  const [copied, setCopied] = useState(false);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb header */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => router.push("/hub")}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 2v7.31" /><path d="M14 9.3V1.99" /><path d="M8.5 2h7" />
            <path d="M14 9.3a6.5 6.5 0 1 1-4 0" /><path d="M5.52 16h12.96" />
          </svg>
          Hub
        </button>
        <span className="text-border">/</span>
        <span className="text-foreground font-medium">Vitba Report</span>
      </div>

      {/* Tool header */}
      <div className="border-b border-border/50 pb-5">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">Vitba Report</h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-purple-500/10 text-purple-500 border border-purple-500/20">
                Độc quyền
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              Xây dựng bản báo cáo chiến lược doanh nghiệp, marketing, branding và MVP toàn diện dựa trên 16 trường thông tin dự án. Công cụ dành riêng cho Founder, Marketing Manager và Agency.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-6">
        {/* Left: Input panel */}
        <div className="xl:col-span-2 space-y-8 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider border-b border-border/50 pb-2">1. Thông tin chung</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Tên doanh nghiệp/dự án *</label>
                <input name="name" value={formData.name} onChange={handleChange} className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/30" placeholder="VD: Vitba" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Lĩnh vực/Ngành hàng *</label>
                <input name="industry" value={formData.industry} onChange={handleChange} className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/30" placeholder="VD: SaaS, F&B..." />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Sản phẩm/dịch vụ chính</label>
              <textarea name="product" value={formData.product} onChange={handleChange} className="w-full h-16 resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/30" placeholder="Mô tả ngắn gọn sản phẩm" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Mô hình kinh doanh</label>
                <input name="business_model" value={formData.business_model} onChange={handleChange} className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/30" placeholder="B2B, B2C, D2C..." />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Mức giá dự kiến</label>
                <input name="price" value={formData.price} onChange={handleChange} className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/30" placeholder="VD: 500k - 2tr" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Thị trường mục tiêu</label>
                <input name="target_market" value={formData.target_market} onChange={handleChange} className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/30" placeholder="VD: TP.HCM, Hà Nội" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Giai đoạn hiện tại</label>
                <input name="stage" value={formData.stage} onChange={handleChange} className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/30" placeholder="Ý tưởng, MVP, Đang scale..." />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Khách hàng mục tiêu</label>
              <textarea name="target_customer" value={formData.target_customer} onChange={handleChange} className="w-full h-16 resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/30" placeholder="Mô tả nhóm khách hàng (độ tuổi, hành vi, sở thích...)" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider border-b border-border/50 pb-2">2. Mục tiêu & Ngân sách</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Mục tiêu 3 tháng</label>
              <input name="goal_3m" value={formData.goal_3m} onChange={handleChange} className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/30" placeholder="VD: Đạt 100 users đầu tiên" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Mục tiêu 6 tháng</label>
              <input name="goal_6m" value={formData.goal_6m} onChange={handleChange} className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/30" placeholder="VD: Doanh thu 100tr/tháng" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Mục tiêu 12 tháng</label>
              <input name="goal_12m" value={formData.goal_12m} onChange={handleChange} className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/30" placeholder="VD: Scale lên toàn quốc" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Ngân sách Marketing dự kiến</label>
              <input name="budget" value={formData.budget} onChange={handleChange} className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/30" placeholder="VD: 50tr/tháng" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider border-b border-border/50 pb-2">3. Nguồn lực & Cạnh tranh</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Nguồn lực hiện có</label>
              <textarea name="resources" value={formData.resources} onChange={handleChange} className="w-full h-16 resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/30" placeholder="VD: 1 Founder, 1 Designer, 1 Dev..." />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Đối thủ cạnh tranh</label>
              <textarea name="competitors" value={formData.competitors} onChange={handleChange} className="w-full h-16 resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/30" placeholder="Liệt kê tên hoặc link đối thủ (nếu có)" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Điểm mạnh hiện tại</label>
                <textarea name="strengths" value={formData.strengths} onChange={handleChange} className="w-full h-16 resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/30" placeholder="VD: Công nghệ độc quyền" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Điểm yếu hiện tại</label>
                <textarea name="weaknesses" value={formData.weaknesses} onChange={handleChange} className="w-full h-16 resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/30" placeholder="VD: Chưa có kinh nghiệm sales" />
              </div>
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={loading || !formData.name.trim() || !formData.industry.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground text-background text-sm font-medium py-3 hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-4 sticky bottom-0"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Hệ thống đang phân tích (30-60s)...
              </>
            ) : (
              <>Tạo Vitba Report</>
            )}
          </button>

          {error && (
            <p className="text-xs text-red-500 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">{error}</p>
          )}
        </div>

        {/* Right: Output panel */}
        <div className="xl:col-span-3 space-y-4">
          {result ? (
            <div className="rounded-lg border border-border/50 bg-background h-full max-h-[calc(100vh-200px)] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0 bg-background/95 backdrop-blur z-10">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  <span className="text-xs font-medium">Báo cáo Chiến lược (Vitba Report)</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.markdown_content);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? (
                    <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>Đã sao chép</>
                  ) : (
                    <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>Sao chép Markdown</>
                  )}
                </button>
              </div>
              <div className="px-6 py-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="text-foreground">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-[15px] text-muted-foreground">{children}</p>,
                      ul: ({ children }) => <ul className="mb-4 ml-6 list-disc last:mb-0 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-4 ml-6 list-decimal last:mb-0 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="mb-1 text-[15px] text-muted-foreground">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                      code: ({ children, className }) => {
                        const isBlock = className?.includes("language-");
                        if (isBlock) {
                          return (
                            <pre className="my-4 overflow-x-auto rounded-xl bg-muted border border-border p-4 text-[13px] text-foreground no-scrollbar shadow-inner">
                              <code>{children}</code>
                            </pre>
                          );
                        }
                        return <code className="rounded bg-primary/20 text-primary px-1.5 py-0.5 text-[13px] font-mono">{children}</code>;
                      },
                      h1: ({ children }) => <h1 className="mb-4 mt-6 text-2xl font-bold text-foreground">{children}</h1>,
                      h2: ({ children }) => <h2 className="mb-3 mt-6 text-xl font-bold text-foreground">{children}</h2>,
                      h3: ({ children }) => <h3 className="mb-2 mt-5 text-lg font-semibold text-foreground">{children}</h3>,
                      h4: ({ children }) => <h4 className="mb-2 mt-4 text-base font-medium text-foreground">{children}</h4>,
                      table: ({ children }) => (
                        <div className="my-4 overflow-x-auto rounded-xl border border-border shadow-sm">
                          <table className="w-full text-[13px]">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => <thead className="bg-muted/80 border-b border-border">{children}</thead>,
                      tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
                      tr: ({ children }) => <tr className="hover:bg-muted/40 transition-colors">{children}</tr>,
                      th: ({ children }) => <th className="px-4 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">{children}</th>,
                      td: ({ children }) => <td className="px-4 py-2.5 text-muted-foreground border-t border-border/50">{children}</td>,
                    }}
                  >
                    {result.markdown_content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] rounded-lg border border-dashed border-border/40 flex flex-col items-center justify-center gap-2.5 text-muted-foreground/30">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
              <p className="text-xs">Bản báo cáo hoàn chỉnh sẽ xuất hiện tại đây sau khi phân tích</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
