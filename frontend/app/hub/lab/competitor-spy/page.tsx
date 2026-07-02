"use client";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, ResultBox, LabTextarea, LabInput } from "@/components/lab-ui";

interface CompetitorInsight { metric: string; observation: string; vitba_recommendation: string }
interface CompetitorSpyResult {
  content_strategy: string;
  posting_frequency: string;
  tone_and_voice: string;
  top_frameworks: string[];
  weaknesses: string[];
  insights: CompetitorInsight[];
  action_plan: string;
}

export default function CompetitorSpyPage() {
  const [info, setInfo] = useLocalDraft("vitba_lab_draft_competitor-spy_info", "");
  const [niche, setNiche] = useLocalDraft("vitba_lab_draft_competitor-spy_niche", "");
  const { run, result, loading, error } = useLabTool<CompetitorSpyResult>("/competitor-spy");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Competitor Spy" />
      <ToolHeader name="Competitor Spy" description="Bóc tách chiến lược content, tần suất, giọng văn, framework của đối thủ cạnh tranh." tag="available" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <LabInput label="Ngành nghề" value={niche} onChange={setNiche} placeholder="VD: F&B, SaaS, Thời trang..." />
          <LabTextarea label="Thông tin đối thủ (URL, bài đăng, mô tả)" value={info} onChange={setInfo} placeholder="Dán link profile đối thủ hoặc nội dung bài đăng mẫu..." />
          <RunButton loading={loading} disabled={!info.trim() || !niche.trim()} onClick={() => run({ competitor_info: info, niche })} loadingText="Đang do thám..." idleText="Phân tích đối thủ" />
          {error && <ErrorBox message={error} />}
        </div>
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              <ResultBox title="Chiến lược nội dung" dotColor="bg-primary">
                <p className="text-sm text-foreground/90">{result.content_strategy}</p>
              </ResultBox>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/40 p-3 bg-card/30">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Tần suất đăng</p>
                  <p className="text-xs text-foreground">{result.posting_frequency}</p>
                </div>
                <div className="rounded-xl border border-border/40 p-3 bg-card/30">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Giọng văn</p>
                  <p className="text-xs text-foreground">{result.tone_and_voice}</p>
                </div>
              </div>
              <ResultBox title="Framework hay dùng" dotColor="bg-primary">
                <div className="flex flex-wrap gap-2">
                  {result.top_frameworks.map((f, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{f}</span>)}
                </div>
              </ResultBox>
              <ResultBox title="Điểm yếu khai thác" dotColor="bg-red-500">
                <ul className="space-y-1.5 text-sm text-foreground/90">
                  {result.weaknesses.map((w, i) => <li key={i} className="flex gap-2"><span className="text-red-500">•</span> {w}</li>)}
                </ul>
              </ResultBox>
              <ResultBox title="Kế hoạch vượt mặt" dotColor="bg-emerald-500">
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{result.action_plan}</p>
              </ResultBox>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground/40">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </div>
              <p className="text-xs text-muted-foreground/50 font-medium">Nhập thông tin đối thủ để phân tích</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
