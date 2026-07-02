"use client";

import { useState } from "react";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, LabTextarea, ChipGroup } from "@/components/lab-ui";


const VOICES = [
  { id: "Gen Z", label: "Gen Z", desc: "Ngôn ngữ GenZ, từ lóng hiện đại, năng động" },
  { id: "Chuyên gia tài chính", label: "Chuyên gia", desc: "Thuật ngữ chuyên môn, trang trọng, hàm lượng thông tin cao" },
  { id: "Mẹ bỉm sữa", label: "Phụ huynh", desc: "Gần gũi, an toàn, quan tâm, chăm sóc gia đình" },
  { id: "Giọng Hà Nội thanh lịch", label: "Hà Nội", desc: "Tao nhã, chuẩn mực, truyền thống miền Bắc" },
  { id: "Giọng miền Nam bình dân", label: "Miền Nam", desc: "Thân thiện, cởi mở, thẳng thắn, đời thường" },
  { id: "Influencer lifestyle", label: "Lifestyle", desc: "Cảm hứng, aesthetic, trải nghiệm, aspirational" },
];

interface PersonaResult {
  adapted_content: string;
  key_changes: string[];
}

export default function PersonaPage() {
  const [content, setContent] = useLocalDraft("vitba_lab_draft_persona_content", "");
  const [voice, setVoice] = useLocalDraft("vitba_lab_draft_persona_voice", VOICES[0].id);
  const [copied, setCopied] = useState(false);
  const { run, result, loading, error } = useLabTool<PersonaResult>("/persona");

  const activeVoice = VOICES.find((v) => v.id === voice)!;

  async function handleRun() {
    if (!content.trim()) return;
    await run({ content, persona: voice });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb header */}
      <LabBreadcrumb tool="Voice & Tone Adapter" />


      {/* Tool header */}
      <ToolHeader name="Voice & Tone Adapter" description="Chuyển đổi giọng viết sang 6 phân khúc đối tượng khác nhau trong một thao tác. Giữ nguyên thông điệp, thay toàn bộ văn phong và ngữ điệu." tag="available" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Input panel */}
        <div className="lg:col-span-2 space-y-5">
          {/* Voice selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Giọng điệu mục tiêu
            </label>
            <div className="space-y-1">
              {VOICES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVoice(v.id)}
                  className={`w-full flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${voice === v.id
                      ? "border-foreground/30 bg-foreground/5"
                      : "border-border/50 hover:border-border hover:bg-muted/30"
                    }`}
                >
                  <div className={`mt-0.5 w-3 h-3 rounded-full border-2 shrink-0 transition-all ${voice === v.id ? "border-foreground bg-foreground" : "border-muted-foreground/40"}`} />
                  <div>
                    <p className="text-xs font-semibold leading-none mb-0.5">{v.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{v.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Input textarea */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Nội dung gốc
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Dán nội dung cần chuyển đổi giọng điệu vào đây..."
              className="w-full h-40 resize-none rounded-lg border border-border/50 bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all custom-scrollbar"
            />
          </div>

          <button
            onClick={handleRun}
            disabled={loading || !content.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground text-background text-sm font-medium py-2.5 hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Đang xử lý...
              </>
            ) : (
              <>Chuyển đổi sang giọng {activeVoice.label}</>
            )}
          </button>

          {error && (
            <p className="text-xs text-red-500 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">{error}</p>
          )}
        </div>

        {/* Right: Output panel */}
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              <div className="rounded-lg border border-border/50 bg-background">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium">Giọng {activeVoice.label}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result.adapted_content);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copied ? (
                      <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>Đã sao chép</>
                    ) : (
                      <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>Sao chép</>
                    )}
                  </button>
                </div>
                <div className="px-4 py-4">
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{result.adapted_content}</p>
                </div>
              </div>

              {result.key_changes.length > 0 && (
                <div className="rounded-lg border border-border/50 bg-background px-4 py-3 space-y-2.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Thay đổi được áp dụng</p>
                  <div className="space-y-1.5">
                    {result.key_changes.map((change, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
                        <p className="text-xs text-muted-foreground leading-relaxed">{change}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full min-h-[320px] rounded-lg border border-dashed border-border/40 flex flex-col items-center justify-center gap-2.5 text-muted-foreground/30">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <p className="text-xs">Nội dung đã chuyển đổi sẽ xuất hiện tại đây</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
