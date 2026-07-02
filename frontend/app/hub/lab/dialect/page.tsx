"use client";
import { useState } from "react";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, ResultBox, LabTextarea } from "@/components/lab-ui";

interface DialectVariant { region: string; adapted_content: string; key_changes: string[] }
interface DialectResult { variants: DialectVariant[]; universal_version: string; localization_tips: string[] }

const REGION_COLORS: Record<string, string> = {
  "Bắc": "bg-primary",
  "Trung": "bg-amber-500",
  "Nam": "bg-emerald-500",
};

export default function DialectPage() {
  const [content, setContent] = useLocalDraft("vitba_lab_draft_dialect_content", "");
  const { run, result, loading, error } = useLabTool<DialectResult>("/dialect");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const copy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => { setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 2000); });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Dialect Adapter" />
      <ToolHeader name="Dialect Adapter" description="Chuyển nội dung sang 3 phương ngữ Bắc/Trung/Nam + phiên bản trung lập an toàn." tag="available" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <LabTextarea label="Nội dung gốc" value={content} onChange={setContent} placeholder="Dán nội dung cần chuyển phương ngữ..." />
          <RunButton loading={loading} disabled={!content.trim()} onClick={() => run({ content })} loadingText="Đang chuyển phương ngữ..." idleText="Chuyển 3 phương ngữ" />
          {error && <ErrorBox message={error} />}
        </div>
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              {result.variants.map((v, i) => (
                <ResultBox
                  key={i}
                  title={`Miền ${v.region}`}
                  dotColor={REGION_COLORS[v.region] ?? "bg-primary"}
                  onCopy={() => copy(v.adapted_content, i)}
                  copied={copiedIdx === i}
                >
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap mb-2">{v.adapted_content}</p>
                  <div className="flex flex-wrap gap-1">
                    {v.key_changes.map((c, j) => (
                      <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/40">{c}</span>
                    ))}
                  </div>
                </ResultBox>
              ))}
              <ResultBox title="Phiên bản trung lập (an toàn toàn quốc)" dotColor="bg-primary" onCopy={() => copy(result.universal_version, 99)} copied={copiedIdx === 99}>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{result.universal_version}</p>
              </ResultBox>
              <ResultBox title="Mẹo bản địa hóa" dotColor="bg-amber-500">
                <ul className="space-y-1.5 text-sm text-foreground/90">
                  {result.localization_tips.map((t, i) => <li key={i} className="flex gap-2"><span className="text-amber-500">•</span> {t}</li>)}
                </ul>
              </ResultBox>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground/40">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <p className="text-xs text-muted-foreground/50 font-medium">Nhập nội dung để chuyển 3 phương ngữ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
