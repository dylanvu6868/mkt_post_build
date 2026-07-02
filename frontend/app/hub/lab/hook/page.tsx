"use client";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, ResultBox, LabTextarea, ChipGroup } from "@/components/lab-ui";

interface HookVariant { formula: string; hook: string; psychology: string }
interface HookResult { hooks: HookVariant[]; best_for_engagement: string; best_for_conversion: string }

export default function HookPage() {
  const [content, setContent] = useLocalDraft("vitba_lab_draft_hook_content", "");
  const [goal, setGoal] = useLocalDraft<"engagement" | "conversion" | "awareness">("vitba_lab_draft_hook_goal", "engagement");
  const { run, result, loading, error } = useLabTool<HookResult>("/hook");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Hook Generator" />
      <ToolHeader
        name="Hook Generator"
        description="Sinh 10 hook theo 7 công thức tâm lý khác nhau cho A/B testing."
        tag="available"
      />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <LabTextarea label="Nội dung sản phẩm/bài viết" value={content} onChange={setContent} placeholder="Mô tả sản phẩm hoặc dán nội dung cần tạo hook..." />
          <ChipGroup
            label="Mục tiêu"
            options={[
              { value: "engagement", label: "Tăng tương tác" },
              { value: "conversion", label: "Tăng chuyển đổi" },
              { value: "awareness", label: "Nhận diện thương hiệu" },
            ]}
            value={goal}
            onChange={setGoal}
          />
          <RunButton loading={loading} disabled={!content.trim()} onClick={() => run({ content, goal: goal === "engagement" ? "Tăng engagement" : goal === "conversion" ? "Tăng chuyển đổi" : "Nhận diện thương hiệu" })} loadingText="Đang sinh hook..." idleText="Sinh 10 hook" />
          {error && <ErrorBox message={error} />}
        </div>
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              <ResultBox title="10 Hook được sinh ra" dotColor="bg-primary">
                <div className="space-y-3">
                  {result.hooks.map((h, i) => (
                    <div key={i} className="rounded-xl border border-border/40 p-3 bg-card/30">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{h.formula}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">{h.hook}</p>
                      <p className="text-[11px] text-muted-foreground">{h.psychology}</p>
                    </div>
                  ))}
                </div>
              </ResultBox>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Tốt nhất cho engagement</p>
                  <p className="text-xs text-foreground">{result.best_for_engagement}</p>
                </div>
                <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Tốt nhất cho conversion</p>
                  <p className="text-xs text-foreground">{result.best_for_conversion}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground/40">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </div>
              <p className="text-xs text-muted-foreground/50 font-medium">Nhập nội dung và nhấn "Sinh 10 hook"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
