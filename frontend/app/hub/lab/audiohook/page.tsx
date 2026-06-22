"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const BPM_PRESETS = [{ label: "Slow · 80", val: 80 }, { label: "Chill · 100", val: 100 }, { label: "Pop · 120", val: 120 }, { label: "Upbeat · 140", val: 140 }, { label: "Fast · 160", val: 160 }];
interface Segment { segment: string; syllable_count: number; ssml_tags: string; delivery_tip: string; }
interface AudioResult { total_duration_estimate: string; bpm_match_advice: string; audio_script: string; segments: Segment[]; }

export default function AudioHookPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [bpm, setBpm] = useState(120);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AudioResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleRun() {
    if (!content.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      const res = await fetch("/api/lab/audiohook", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, music_bpm: bpm }),
      });
      if (!res.ok) throw new Error("Yêu cầu thất bại. Vui lòng thử lại.");
      setResult(await res.json());
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Có lỗi xảy ra."); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => router.push("/hub/lab")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/></svg>
          Vitba Lab
        </button>
        <span className="text-border">/</span>
        <span className="text-foreground font-medium">Voiceover Script Optimizer</span>
      </div>
      <div className="border-b border-border/50 pb-5">
        <div className="flex items-start gap-2">
          <h1 className="text-lg font-semibold tracking-tight">Voiceover Script Optimizer</h1>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mt-0.5">Khả dụng</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">Đồng bộ kịch bản đọc với nhịp BPM của nhạc nền, chèn SSML markup và xuất kịch bản hoàn chỉnh sẵn sàng cho ElevenLabs hoặc Azure TTS.</p>
      </div>

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
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kịch bản cần tối ưu</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Dán kịch bản text cần đọc lồng tiếng cho Reels hoặc TikTok..." className="w-full h-52 resize-none rounded-lg border border-border/50 bg-background px-3.5 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all custom-scrollbar" />
          </div>
          <button onClick={handleRun} disabled={loading || !content.trim()} className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground text-background text-sm font-medium py-2.5 hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            {loading ? <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Đang đồng bộ âm thanh...</> : `Tối ưu cho ${bpm} BPM`}
          </button>
          {error && <p className="text-xs text-red-500 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">{error}</p>}
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
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              <p className="text-xs">Kịch bản SSML sẽ xuất hiện tại đây</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
