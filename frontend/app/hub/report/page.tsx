"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLabTool } from "@/hooks/use-lab-tool";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight, ArrowLeft, Check, Sparkles, Edit2, FileDown } from "lucide-react";

interface ReportResult {
  markdown_content: string;
}

const SUGGESTIONS = {
  industry: ["SaaS & Tech", "F&B", "E-commerce", "EdTech", "HealthTech", "Fintech", "Agency/Dịch vụ", "Bất động sản", "Bán lẻ/D2C"],
  business_model: ["B2B", "B2C", "B2B2C", "D2C", "Subscription (Đăng ký)", "Marketplace", "Freemium"],
  target_market: ["Toàn quốc", "TP.HCM", "Hà Nội", "Đô thị lớn", "Global/Quốc tế"],
  stage: ["Ý tưởng (Idea/Concept)", "Bản nháp (MVP)", "Mới ra mắt (Early Stage)", "Đang tăng trưởng (Scaling)", "Đã có lợi nhuận (Profitable)"],
  goal_3m: ["Hoàn thiện sản phẩm", "Đạt 100 khách hàng đầu tiên", "Đạt Product-Market Fit", "Tuyển dụng đội ngũ", "Hòa vốn"],
  goal_6m: ["Hòa vốn (Break-even)", "Tăng trưởng gấp đôi", "Mở rộng tính năng mới", "Gọi vốn Seed"],
  goal_12m: ["Mở rộng toàn quốc", "Gọi vốn Series A", "Doanh thu 1 triệu USD", "Thống lĩnh thị trường ngách"],
  budget: ["Dưới 10 triệu/tháng", "10 - 50 triệu/tháng", "50 - 100 triệu/tháng", "100 - 500 triệu/tháng", "Không giới hạn (Phụ thuộc ROI)"],
  resources: ["Chỉ có 1 Founder", "Team nhỏ (2-5 người)", "Team In-house đầy đủ", "Thuê Agency ngoài"],
  price: ["Dưới 100k", "100k - 500k", "500k - 2 Triệu", "2 Triệu - 10 Triệu", "High-ticket (> 10 Triệu)"]
};

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

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const reportRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isWizardCollapsed, setIsWizardCollapsed] = useState(false);

  // Auto-save & load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("vitba_report_draft");
    if (saved) {
      try {
        setFormData(JSON.parse(saved));
      } catch(e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("vitba_report_draft", JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    if (result) {
      setIsWizardCollapsed(true);
    }
  }, [result]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSuggestion = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  async function handleRun() {
    if (!formData.name.trim() || !formData.industry.trim()) return;
    await run(formData);
  }

  const nextStep = () => {
    if (currentStep === 1 && (!formData.name.trim() || !formData.industry.trim())) {
      alert("Vui lòng điền Tên dự án và Lĩnh vực trước khi tiếp tục!");
      return;
    }
    if (currentStep < totalSteps) setCurrentStep(c => c + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(c => c - 1);
  };

  const renderChips = (field: keyof typeof SUGGESTIONS) => (
    <div className="flex flex-wrap gap-2 mb-3">
      {SUGGESTIONS[field].map(s => (
        <button 
          key={s} 
          onClick={() => handleSuggestion(field, s)} 
          className={`px-3 py-1.5 rounded-xl text-[13px] font-medium border transition-all ${
            formData[field] === s 
            ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105' 
            : 'bg-secondary text-muted-foreground hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50'
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-300">
            <div>
              <h3 className="text-xl font-bold mb-1.5">1. Thông tin cơ bản</h3>
              <p className="text-muted-foreground text-sm">Hãy giới thiệu tổng quan về dự án của bạn.</p>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-semibold flex items-center gap-1">Tên doanh nghiệp/dự án <span className="text-red-500">*</span></label>
              <input name="name" value={formData.name} onChange={handleChange} className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-base font-medium focus:ring-0 focus:border-blue-500 outline-none transition-colors" placeholder="VD: Vitba" autoFocus />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold flex items-center gap-1">Lĩnh vực/Ngành hàng <span className="text-red-500">*</span></label>
              {renderChips("industry")}
              <input name="industry" value={formData.industry} onChange={handleChange} className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 focus:ring-0 focus:border-blue-500 outline-none transition-colors" placeholder="Hoặc nhập lĩnh vực khác..." />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold">Mô hình kinh doanh</label>
              {renderChips("business_model")}
              <input name="business_model" value={formData.business_model} onChange={handleChange} className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 focus:ring-0 focus:border-blue-500 outline-none transition-colors" placeholder="Hoặc nhập mô hình khác..." />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-300">
            <div>
              <h3 className="text-xl font-bold mb-1.5">2. Sản phẩm & Thị trường</h3>
              <p className="text-muted-foreground text-sm">Bạn bán cái gì và bán cho ai?</p>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-semibold">Sản phẩm/Dịch vụ cốt lõi</label>
              <textarea name="product" value={formData.product} onChange={handleChange} className="w-full h-20 resize-none rounded-xl border-2 border-border bg-card px-4 py-3 focus:ring-0 focus:border-blue-500 outline-none transition-colors text-sm" placeholder="Mô tả ngắn gọn sản phẩm hoặc dịch vụ bạn cung cấp..." autoFocus />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold">Khách hàng mục tiêu</label>
              <textarea name="target_customer" value={formData.target_customer} onChange={handleChange} className="w-full h-20 resize-none rounded-xl border-2 border-border bg-card px-4 py-3 focus:ring-0 focus:border-blue-500 outline-none transition-colors text-sm" placeholder="Độ tuổi, thu nhập, sở thích, nỗi đau của khách hàng..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold">Thị trường nhắm đến</label>
                {renderChips("target_market")}
                <input name="target_market" value={formData.target_market} onChange={handleChange} className="w-full rounded-xl border-2 border-border bg-card px-4 py-2.5 focus:border-blue-500 outline-none" placeholder="VD: Đông Nam Á..." />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold">Phân khúc giá</label>
                {renderChips("price")}
                <input name="price" value={formData.price} onChange={handleChange} className="w-full rounded-xl border-2 border-border bg-card px-4 py-2.5 focus:border-blue-500 outline-none" placeholder="VD: Gói rẻ nhất 50k..." />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold">Giai đoạn hiện tại của dự án</label>
              {renderChips("stage")}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-300">
            <div>
              <h3 className="text-xl font-bold mb-1.5">3. Mục tiêu (Goals)</h3>
              <p className="text-muted-foreground text-sm">Kỳ vọng của bạn trong tương lai gần và xa.</p>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-semibold">Mục tiêu 3 tháng (Ngắn hạn)</label>
              {renderChips("goal_3m")}
              <input name="goal_3m" value={formData.goal_3m} onChange={handleChange} className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 focus:border-blue-500 outline-none" placeholder="Nhập mục tiêu khác..." autoFocus />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold">Mục tiêu 6 tháng (Trung hạn)</label>
              {renderChips("goal_6m")}
              <input name="goal_6m" value={formData.goal_6m} onChange={handleChange} className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 focus:border-blue-500 outline-none" placeholder="Nhập mục tiêu khác..." />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold">Mục tiêu 1 năm (Dài hạn)</label>
              {renderChips("goal_12m")}
              <input name="goal_12m" value={formData.goal_12m} onChange={handleChange} className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 focus:border-blue-500 outline-none" placeholder="Nhập mục tiêu khác..." />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-300">
            <div>
              <h3 className="text-xl font-bold mb-1.5">4. Ngân sách & Nguồn lực</h3>
              <p className="text-muted-foreground text-sm">Đánh giá nguồn cung tài chính và nhân sự của bạn.</p>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-semibold">Ngân sách Marketing / Tháng</label>
              {renderChips("budget")}
              <input name="budget" value={formData.budget} onChange={handleChange} className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 focus:border-blue-500 outline-none" placeholder="Nhập mức ngân sách khác..." autoFocus />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold">Nguồn lực nhân sự hiện có</label>
              {renderChips("resources")}
              <textarea name="resources" value={formData.resources} onChange={handleChange} className="w-full h-20 resize-none rounded-xl border-2 border-border bg-card px-4 py-3 focus:border-blue-500 outline-none text-sm" placeholder="Mô tả cụ thể (Ví dụ: 1 Dev, 1 Content Writer, chưa có Sales)..." />
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-300">
            <div>
              <h3 className="text-xl font-bold mb-1.5">5. Phân tích Cạnh tranh (SWOT)</h3>
              <p className="text-muted-foreground text-sm">Bạn đang đứng ở đâu so với đối thủ?</p>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-semibold">Đối thủ cạnh tranh trực tiếp / gián tiếp</label>
              <textarea name="competitors" value={formData.competitors} onChange={handleChange} className="w-full h-16 resize-none rounded-xl border-2 border-border bg-card px-4 py-3 focus:border-blue-500 outline-none text-sm" placeholder="Nhập tên đối thủ hoặc link website của họ..." autoFocus />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold">Điểm mạnh (Strengths)</label>
                <textarea name="strengths" value={formData.strengths} onChange={handleChange} className="w-full h-24 resize-none rounded-xl border-2 border-border bg-card px-4 py-3 focus:border-blue-500 outline-none text-sm" placeholder="Lợi thế cạnh tranh của bạn là gì? (Ví dụ: Công nghệ lõi, giá rẻ...)" />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold">Điểm yếu (Weaknesses)</label>
                <textarea name="weaknesses" value={formData.weaknesses} onChange={handleChange} className="w-full h-24 resize-none rounded-xl border-2 border-border bg-card px-4 py-3 focus:border-blue-500 outline-none text-sm" placeholder="Hạn chế hiện tại? (Ví dụ: Thiếu vốn, thương hiệu mới...)" />
              </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-4rem)] flex flex-col py-6">
      {/* Header section (fixed top) */}
      <div className="shrink-0 space-y-4 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => router.push("/hub")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2v7.31" /><path d="M14 9.3V1.99" /><path d="M8.5 2h7" /><path d="M14 9.3a6.5 6.5 0 1 1-4 0" /><path d="M5.52 16h12.96" /></svg>
            Hub
          </button>
          <span className="text-border">/</span>
          <span className="text-foreground font-medium">Vitba Report</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 inline-block">
              Vitba Report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Báo cáo chiến lược & marketing toàn diện
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area (Flexible & Scrollable) */}
      <div className="flex-1 overflow-hidden flex flex-col gap-6">
        
        {/* WIZARD CONTAINER */}
        {!isWizardCollapsed ? (
          <div className="bg-card border-2 border-border/60 rounded-[1.5rem] shadow-xl shadow-blue-900/5 flex flex-col flex-1 min-h-0 overflow-hidden">
            
            {/* Progress Bar (Fixed in wizard) */}
            <div className="p-6 md:px-8 shrink-0 border-b border-border/50 bg-card z-10">
              <div className="flex justify-between text-sm font-medium text-muted-foreground mb-3">
                <span>Bước {currentStep} / {totalSteps}</span>
                <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {/* Step Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              {renderStepContent()}
            </div>

            {/* Navigation Buttons (Fixed bottom in wizard) */}
            <div className="p-6 md:px-8 shrink-0 border-t border-border bg-card/95 backdrop-blur z-10 flex items-center justify-between">
              <button
                onClick={prevStep}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors text-sm ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'hover:bg-secondary text-foreground'}`}
              >
                <ArrowLeft size={18} /> Quay lại
              </button>

              {currentStep < totalSteps ? (
                <button
                  onClick={nextStep}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-sm transition-transform hover:-translate-y-0.5 text-sm"
                >
                  Tiếp tục <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  onClick={handleRun}
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:opacity-90 shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-base"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Đang phân tích...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} /> Tạo Báo Cáo
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          // Collapsed Wizard Summary
          <div className="bg-card border-2 border-border/60 rounded-2xl p-4 px-6 shrink-0 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
            <div>
              <h3 className="font-bold text-lg">{formData.name || "Dự án mới"}</h3>
              <p className="text-sm text-muted-foreground">{formData.industry || "Chưa chọn ngành nghề"}</p>
            </div>
            <button 
              onClick={() => setIsWizardCollapsed(false)}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors"
            >
              <Edit2 size={16} /> Chỉnh sửa thông tin
            </button>
          </div>
        )}

        {error && (
          <div className="shrink-0 bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 flex items-center justify-center">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* REPORT RESULT CONTAINER (Takes remaining height when wizard is collapsed) */}
        {result && (
          <div className="flex-1 min-h-0 bg-card border-2 border-border/80 rounded-[1.5rem] overflow-hidden shadow-xl flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="shrink-0 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-border p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">Bản Báo Cáo Chiến Lược</h2>
                  <p className="text-xs text-muted-foreground">Tạo tự động bởi Vitba Report AI</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-secondary transition-colors shadow-sm text-blue-700"
                >
                  <FileDown size={16} /> Xuất PDF
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.markdown_content);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-secondary transition-colors shadow-sm"
                >
                  {copied ? <><Check className="text-green-500" size={16} /> Đã sao chép</> : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg> Sao chép Markdown</>}
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-white custom-scrollbar print:p-0 print:overflow-visible">
              <article className="prose prose-sm md:prose-base prose-blue max-w-none 
                prose-headings:font-bold prose-headings:text-slate-900 
                prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                prose-p:text-slate-600 prose-p:leading-relaxed
                prose-li:text-slate-600
                prose-strong:text-slate-900
                prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-slate-700
                prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-pre:rounded-xl
                prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result.markdown_content}
                </ReactMarkdown>
              </article>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
