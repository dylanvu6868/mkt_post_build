"use client";
import { useState } from "react";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { useLabTool } from "@/hooks/use-lab-tool";
import { useLabHistoryRestore } from "@/hooks/use-lab-history-restore";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, LabTextarea, ChipGroup } from "@/components/lab-ui";


const BPM_PRESETS = [{ label: "Slow · 80", val: 80 }, { label: "Chill · 100", val: 100 }, { label: "Pop · 120", val: 120 }, { label: "Upbeat · 140", val: 140 }, { label: "Fast · 160", val: 160 }];
interface Segment { segment: string; syllable_count: number; ssml_tags: string; delivery_tip: string; }
interface AudioResult { total_duration_estimate: string; bpm_match_advice: string; audio_script: string; segments: Segment[]; }

export default function AudioHookPage() {const [content, setContent] = useLocalDraft("vitba_lab_draft_audiohook_content", "");
  const [bpm, setBpm] = useLocalDraft("vitba_lab_draft_audiohook_bpm", 120);
  const [copied, setCopied] = useState(false);
  const { run, result, setResult, loading, error } = useLabTool<AudioResult>("/audiohook");

  // Mở lại kết quả đã lưu từ trang Lịch sử (?hist={id})
  useLabHistoryRestore((item) => {
    const inp = item.input_data as Record<string, string> | null;
    if (inp) {
      if (inp.content !== undefined) setContent(String(inp.content));
      if (inp.music_bpm !== undefined) setBpm(Number(inp.music_bpm));
    }
    if (item.output_data) setResult(item.output_data as unknown as AudioResult);
  });

  async function handleRun() {
    if (!content.trim()) return;
    await run({ content, music_bpm: bpm });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Voiceover Script Optimizer" />
      <ToolHeader name="Voiceover Script Optimizer" description="Đồng bộ kịch bản đọc với nhịp BPM của nhạc nền, chèn SSML markup và xuất kịch bản hoàn chỉnh sẵn sàng cho ElevenLabs hoặc Azure TTS." tag="available" />


      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">BPM nhạc nền</label>
        <div className="flex items-center gap-6">
          <div className="flex gap-1.5">
            {BPM_PRESETS.map(p => <button key={p.val} onClick={() => setBpm(p.val)} className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-all ${bpm === p.val ? "border-foreground/30 bg-foreground/5 text-foreground" : "border-border/50 text-muted-foreground hover:border-border"}`}>{p.label}</button>)}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <input type="range" min={60} max={200} value={bpm} onChange={e => setBpm(Number(e.target.value))} className="w-20 accent-foreground" />
            <span className="text-sm font-semibold tabular-nums w-16">{bpm} BPM</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <LabTextarea label="Nội dung" value={content} onChange={setContent} placeholder="Nhập nội dung..." />
          <RunButton loading={loading} disabled={!content.trim()} onClick={handleRun} loadingText="Vitba Tool" idleText="Chạy" className="w-full" />
          {error && <ErrorBox message={error} />}
          {result && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/50 bg-background px-3 py-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Thời lượng</p>
                <p className="text-sm font-semibold">{result.total_duration_estimate}</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-background px-3 py-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Nhạc nền</p>
                <p className="text-xs text-foreground/80 leading-tight">{result.bpm_match_advice}</p>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              <div className="rounded-lg border border-border/50 bg-background">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-xs font-medium">Kịch bản SSML hoàn chỉnh</span></div>
                  <button onClick={() => { navigator.clipboard.writeText(result.audio_script); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">{copied ? "Đã sao chép" : "Sao chép cho ElevenLabs"}</button>
                </div>
                <pre className="px-4 py-4 text-[11px] font-mono text-foreground/80 leading-relaxed whitespace-pre-wrap overflow-auto custom-scrollbar">{result.audio_script}</pre>
              </div>
              <div className="rounded-lg border border-border/50 bg-background px-4 py-3 space-y-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Phân tích từng đoạn</p>
                {result.segments.map((seg, i) => (
                  <div key={i} className="grid grid-cols-3 gap-3 pb-3 border-b border-border/30 last:pb-0 last:border-0">
                    <div className="col-span-1"><p className="text-[9px] text-muted-foreground uppercase mb-0.5">Đoạn</p><p className="text-xs text-foreground/80 leading-snug">{seg.segment}</p></div>
                    <div><p className="text-[9px] text-muted-foreground uppercase mb-0.5">Âm tiết</p><p className="text-xs font-semibold tabular-nums">{seg.syllable_count}</p></div>
                    <div><p className="text-[9px] text-muted-foreground uppercase mb-0.5">Diễn đạt</p><p className="text-xs text-muted-foreground leading-snug">{seg.delivery_tip}</p></div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-full min-h-[320px] rounded-lg border border-dashed border-border/40 flex flex-col items-center justify-center gap-2.5 text-muted-foreground/30">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
              <p className="text-xs">Kịch bản SSML sẽ xuất hiện tại đây</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
