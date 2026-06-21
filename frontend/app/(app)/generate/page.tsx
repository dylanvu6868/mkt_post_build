"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store/project";
import { useGenerate } from "@/hooks/use-generate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Bot, Send, Plus, Check, Copy, RefreshCcw, FileText } from "lucide-react";
import { CONTENT_TYPE_LABELS, ALL_CONTENT_TYPES } from "@/lib/plan";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import { handleApiPlanError } from "@/lib/plan-errors";
import { PlanUsageBar } from "@/components/plan-usage-bar";

const AGENT_STEPS = [
  "copywriter",
];

function Field({
  label,
  value,
  bold,
  medium,
  pre,
}: {
  label: string;
  value?: string;
  bold?: boolean;
  medium?: boolean;
  pre?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="bg-muted border border-border rounded-xl p-4">
      <p className="text-[11px] font-bold text-yellow-500/70 uppercase tracking-wider mb-2">{label}</p>
      <p
        className={
          bold
            ? "text-lg font-bold text-foreground leading-tight"
            : medium
              ? "text-base font-medium text-neutral-200"
              : pre
                ? "text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed"
                : "text-sm text-neutral-300"
        }
      >
        {value}
      </p>
    </div>
  );
}

function DraftRenderer({
  contentType,
  draft,
}: {
  contentType: string;
  draft: Record<string, unknown>;
}) {
  if (contentType === "facebook_post") {
    const d = draft as {
      hook?: string;
      body?: string;
      cta?: string;
      hashtags?: string[];
    };
    return (
      <div className="space-y-3">
        <Field label="Hook" value={d.hook} bold />
        <Field label="Body" value={d.body} pre />
        <Field label="Call to Action" value={d.cta} medium />
        {d.hashtags && (
          <div className="flex gap-2 flex-wrap pt-2">
            {d.hashtags.map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (contentType === "seo_blog") {
    const d = draft as {
      seo_title?: string;
      meta_description?: string;
      outline?: string[];
      blog_content?: string;
      faq?: { question: string; answer: string }[];
    };
    return (
      <div className="space-y-3">
        <Field label="SEO Title" value={d.seo_title} bold />
        <Field label="Meta Description" value={d.meta_description} />
        {d.outline && (
          <div className="bg-muted border border-border rounded-xl p-4">
            <p className="text-[11px] font-bold text-yellow-500/70 uppercase tracking-wider mb-2">Outline</p>
            <ul className="list-disc list-inside text-sm space-y-1.5 text-neutral-300">
              {d.outline.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        <Field label="Blog Content" value={d.blog_content} pre />
        {d.faq && d.faq.length > 0 && (
          <div className="bg-muted border border-border rounded-xl p-4">
            <p className="text-[11px] font-bold text-yellow-500/70 uppercase tracking-wider mb-3">FAQ</p>
            <div className="space-y-3">
              {d.faq.map((item, i) => (
                <div key={i} className="pl-3 border-l-2 border-yellow-500/30">
                  <p className="text-sm font-semibold text-neutral-200 mb-1">{item.question}</p>
                  <p className="text-sm text-neutral-400">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (contentType === "email") {
    const d = draft as { subject?: string; body?: string; cta?: string };
    return (
      <div className="space-y-3">
        <Field label="Subject Line" value={d.subject} bold />
        <Field label="Email Body" value={d.body} pre />
        <Field label="Call to Action" value={d.cta} medium />
      </div>
    );
  }

  if (contentType === "landing_page") {
    const d = draft as {
      headline?: string;
      subheadline?: string;
      benefits?: string[];
      cta?: string;
    };
    return (
      <div className="space-y-3">
        <Field label="Main Headline" value={d.headline} bold />
        <Field label="Subheadline" value={d.subheadline} medium />
        {d.benefits && (
          <div className="bg-muted border border-border rounded-xl p-4">
            <p className="text-[11px] font-bold text-yellow-500/70 uppercase tracking-wider mb-2">Key Benefits</p>
            <ul className="list-disc list-inside text-sm space-y-1.5 text-neutral-300">
              {d.benefits.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        )}
        <Field label="Call to Action" value={d.cta} medium />
      </div>
    );
  }

  if (contentType === "tiktok_script") {
    const d = draft as { hook?: string; script?: string; cta?: string };
    return (
      <div className="space-y-3">
        <Field label="Hook (First 3s)" value={d.hook} bold />
        <Field label="Video Script" value={d.script} pre />
        <Field label="Call to Action" value={d.cta} medium />
      </div>
    );
  }

  return (
    <pre className="text-sm text-neutral-300 whitespace-pre-wrap bg-muted p-4 rounded-xl border border-border">
      {JSON.stringify(draft, null, 2)}
    </pre>
  );
}

function formatDraftAsText(
  contentType: string,
  draft: Record<string, unknown>,
): string {
  if (contentType === "facebook_post") {
    const d = draft as { hook?: string; body?: string; cta?: string; hashtags?: string[] };
    return [d.hook, "", d.body, "", d.cta, "", d.hashtags?.join(" ")].filter(Boolean).join("\n");
  }
  if (contentType === "seo_blog") {
    const d = draft as { seo_title?: string; meta_description?: string; blog_content?: string; faq?: { question: string; answer: string }[] };
    const faqText = d.faq?.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n") ?? "";
    return [d.seo_title, d.meta_description, "", d.blog_content, "", faqText].filter(Boolean).join("\n");
  }
  if (contentType === "email") {
    const d = draft as { subject?: string; body?: string; cta?: string };
    return [`Subject: ${d.subject}`, "", d.body, "", d.cta].filter(Boolean).join("\n");
  }
  if (contentType === "landing_page") {
    const d = draft as { headline?: string; subheadline?: string; benefits?: string[]; cta?: string };
    return [d.headline, d.subheadline, "", d.benefits?.map((b) => `• ${b}`).join("\n"), "", d.cta].filter(Boolean).join("\n");
  }
  if (contentType === "tiktok_script") {
    const d = draft as { hook?: string; script?: string; cta?: string };
    return [`[HOOK] ${d.hook}`, "", d.script, "", `[CTA] ${d.cta}`].filter(Boolean).join("\n");
  }
  return JSON.stringify(draft, null, 2);
}

export default function GeneratePage() {
  const router = useRouter();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { start, jobStatus, polling, reset } = useGenerate();
  const { data: planData } = usePlanLimits();

  const allowedTypes = planData?.limits.content_types ?? ["facebook_post", "email"];
  const contentTypes = ALL_CONTENT_TYPES
    .filter((t) => allowedTypes.includes(t))
    .map((value) => ({
      value,
      label: CONTENT_TYPE_LABELS[value] ?? value,
      locked: false,
    }));

  const [brief, setBrief] = useState("");
  const [goal, setGoal] = useState("");
  const [contentType, setContentType] = useState("facebook_post");
  const [loading, setLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentTypes.length > 0 && !contentTypes.some((t) => t.value === contentType)) {
      setContentType(contentTypes[0].value);
    }
  }, [contentTypes, contentType]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [jobStatus]);

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center px-4 animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-yellow-500/10 border border-yellow-500/20 rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(234,179,8,0.15)]">
          <Sparkles className="w-10 h-10 text-yellow-500" />
        </div>
        <h1 className="text-4xl font-extrabold mb-4 tracking-tight">Vitba.ai Workspace</h1>
        <p className="text-neutral-400 text-lg max-w-md mx-auto">Vui lòng chọn hoặc tạo một dự án mới để bắt đầu thiết kế nội dung.</p>
      </div>
    );
  }

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!brief.trim() || loading) return;
    setLoading(true);
    try {
      await start({
        project_id: activeProject.id,
        content_type: contentType,
        brief: brief.trim(),
        marketing_goal: goal.trim(),
      });
    } catch (err) {
      handleApiPlanError(err, () => router.push("/pricing"), "Failed to start generation");
    } finally {
      setLoading(false);
    }
  };

  const handleNewTopic = () => {
    reset();
    setBrief("");
    setGoal("");
  };

  const draft = jobStatus?.result?.draft as Record<string, unknown> | undefined;
  const review = jobStatus?.result?.review as { score?: number; suggestions?: string[] } | undefined;
  const typeLabel = contentTypes.find((t) => t.value === contentType)?.label ?? contentType;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-4xl mx-auto px-4 relative">
      
      {/* Scrollable Conversation Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-8 scrollbar-hide pt-4">
        {!jobStatus ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="w-20 h-20 bg-yellow-500/10 border border-yellow-500/20 rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(234,179,8,0.15)]">
              <Bot className="w-10 h-10 text-yellow-500" />
            </div>
            <h1 className="text-4xl font-extrabold mb-4 tracking-tight">Sáng tạo nội dung với AI</h1>
            <p className="text-neutral-400 text-lg max-w-lg mx-auto leading-relaxed">
              Hãy cho tôi biết bạn muốn viết gì hôm nay. Các trợ lý ảo chuyên môn (Planner, SEO, Copywriter) sẽ cùng nhau hoàn thiện cho bạn.
            </p>
          </div>
        ) : (
          <div className="space-y-10 py-6 animate-in fade-in duration-500">
            {/* User Message */}
            <div className="flex items-start gap-4 flex-row-reverse">
              <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-foreground">U</span>
              </div>
              <div className="bg-muted border border-border rounded-2xl p-4 max-w-[85%] text-sm text-neutral-100 shadow-md">
                <p className="whitespace-pre-wrap">{brief}</p>
                {goal && (
                  <div className="mt-2 pt-2 border-t border-border flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">Mục tiêu:</span>
                    <span className="text-xs text-yellow-400 font-medium">{goal}</span>
                  </div>
                )}
              </div>
            </div>

            {/* AI Response Area */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 space-y-4 max-w-3xl">
                
                {/* Pipeline Status Box */}
                <div className="bg-black/40 border border-border rounded-2xl p-5 shadow-lg backdrop-blur-sm">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-foreground">
                    <Sparkles className="w-4 h-4 text-yellow-500" /> 
                    {polling ? "Vitba Agents đang xử lý..." : jobStatus.status === "error" ? "Đã xảy ra lỗi" : "Quá trình sáng tạo hoàn tất"}
                    {polling && (
                      <span className="flex h-2 w-2 ml-2">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                      </span>
                    )}
                  </h3>
                  
                  <div className="flex flex-wrap gap-2">
                    {AGENT_STEPS.map((step) => {
                      const currentIdx = AGENT_STEPS.indexOf(jobStatus.current_step ?? "");
                      const stepIdx = AGENT_STEPS.indexOf(step);
                      const isDone = jobStatus.status === "done" || stepIdx < currentIdx;
                      const isActive = stepIdx === currentIdx && jobStatus.status !== "done" && jobStatus.status !== "error";
                      
                      return (
                        <div key={step} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all duration-300 ${isDone ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : isActive ? 'bg-muted border-border text-foreground shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-105' : 'bg-transparent border-border text-neutral-600'}`}>
                          {isDone && <Check className="w-3 h-3" />}
                          {isActive && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                          <span>{{insights_agent: "Insights", copywriter: "Copywriter"}[step] ?? step}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {jobStatus.status === "error" && (
                    <div className="mt-4 text-sm text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20">
                      Error: {jobStatus.error}
                    </div>
                  )}
                </div>

                {/* Generated Content Box */}
                {jobStatus.status === "done" && draft && (
                  <div className="bg-[#0f0f0f] border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-muted px-6 py-4 border-b border-border flex justify-between items-center">
                      <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
                        <FileText className="w-4 h-4 text-yellow-500" /> {typeLabel}
                      </h2>
                      {review?.score != null && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold">
                          Điểm chất lượng: {review.score}/100
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6">
                      <DraftRenderer contentType={contentType} draft={draft} />

                      {review?.suggestions && review.suggestions.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-border">
                          <p className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5" /> Gợi ý cải thiện từ Reviewer
                          </p>
                          <ul className="space-y-2.5">
                            {review.suggestions.map((s, i) => (
                              <li key={i} className="text-sm text-neutral-400 flex items-start gap-3">
                                <span className="text-yellow-500/50 mt-1 text-[10px]">■</span> {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mt-8 flex gap-3">
                        <Button 
                          onClick={() => {
                            navigator.clipboard.writeText(formatDraftAsText(contentType, draft));
                            toast.success("Đã copy vào clipboard!");
                          }}
                          className="bg-muted hover:bg-accent text-foreground border-0"
                        >
                          <Copy className="w-4 h-4 mr-2" /> Sao chép
                        </Button>
                        <Button 
                          onClick={() => handleGenerate()} 
                          variant="outline"
                          className="border-border hover:bg-accent"
                        >
                          <RefreshCcw className="w-4 h-4 mr-2" /> Tạo lại
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Prompt Box Area */}
      <div className="pb-6 pt-2 shrink-0 relative z-10">
        {planData?.usage.daily_generations && (
          <div className="mb-3 px-1">
            <PlanUsageBar label="Lượt tạo hôm nay" item={planData.usage.daily_generations} />
          </div>
        )}
        <div className="bg-black/60 backdrop-blur-xl border border-border rounded-3xl p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] focus-within:border-yellow-500/50 focus-within:shadow-[0_0_30px_rgba(234,179,8,0.15)] transition-all duration-300">
          
          <div className="flex gap-2 mb-3 px-1">
            <Select value={contentType} onValueChange={setContentType} disabled={loading || polling}>
              <SelectTrigger className="w-fit min-w-[160px] h-8 bg-muted border-transparent text-xs font-medium rounded-full focus:ring-yellow-500 focus:border-yellow-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contentTypes.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value}>
                    {ct.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input 
              placeholder="Mục tiêu (vd: Tăng tương tác)"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              className="h-8 bg-muted border-transparent text-xs font-medium rounded-full w-[220px] focus-visible:ring-yellow-500 focus-visible:border-yellow-500"
              disabled={loading || polling}
            />
          </div>

          <div className="relative flex items-end">
            <Textarea
              value={brief}
              onChange={e => setBrief(e.target.value)}
              placeholder={loading || polling ? "Vitba Agents đang miệt mài sáng tạo..." : "Mô tả ý tưởng nội dung của bạn..."}
              className="w-full min-h-[44px] max-h-[200px] bg-transparent border-0 resize-none focus-visible:ring-0 py-2.5 px-4 text-sm placeholder:text-neutral-500 scrollbar-hide"
              disabled={loading || polling}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (brief.trim() && !loading && !polling) {
                    handleGenerate();
                  }
                }
              }}
            />
            <div className="shrink-0 pl-2 pb-1.5 pr-1.5 flex gap-2">
              {jobStatus && (jobStatus.status === "done" || jobStatus.status === "error") && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={handleNewTopic} 
                  className="h-9 w-9 rounded-full hover:bg-accent text-neutral-400 p-0"
                  title="Chủ đề mới"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              )}
              <Button 
                type="button" 
                onClick={() => handleGenerate()}
                disabled={loading || polling || !brief.trim()} 
                className="h-9 w-9 rounded-full bg-yellow-500 hover:bg-yellow-400 text-primary-foreground p-0 shadow-lg shadow-yellow-500/20 disabled:opacity-50 disabled:bg-neutral-700 disabled:text-neutral-500 transition-all"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </Button>
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] text-neutral-500 mt-3">Vitba.ai có thể tạo ra thông tin không chính xác. Hãy kiểm tra lại kết quả.</p>
      </div>

    </div>
  );
}
