"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const STYLES = ["Cinematic dark aesthetic", "Bright lifestyle editorial", "Minimalist luxury", "Vibrant street photography", "Moody film noir"];
interface Scene { scene_number: number; description: string; camera_angle: string; lighting: string; midjourney_prompt: string; }
interface CinematicResult { title: string; scenes: Scene[]; style_guide: string; }

export default function CinematicPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [style, setStyle] = useState(STYLES[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CinematicResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  async function handleRun() {
    if (!content.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      const res = await fetch("/api/lab/cinematic", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, style }),
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
        <span className="text-foreground font-medium">Visual Prompt Director</span>
      </div>
      <div className="border-b border-border/50 pb-5">
        <div className="flex items-start gap-2">
          <h1 className="text-lg font-semibold tracking-tight">Visual Prompt Director</h1>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mt-0.5">Khả dụng</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">Chuyển đổi nội dung văn bản thành storyboard phân cảnh với góc máy, ánh sáng và Midjourney prompt sẵn sàng sử dụng.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phong cách hình ảnh</label>
          <div className="flex flex-wrap gap-2">
            {STYLES.map(s => <button key={s} onClick={() => setStyle(s)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${style === s ? "border-foreground/30 bg-foreground/5 text-foreground" : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"}`}>{s}</button>)}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nội dung cần chuyển đổi</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Mô tả ý tưởng, sản phẩm hoặc cảm xúc bạn muốn truyền tải qua hình ảnh..." className="w-full h-32 resize-none rounded-lg border border-border/50 bg-background px-3.5 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all custom-scrollbar" />
        </div>
        <button onClick={handleRun} disabled={loading || !content.trim()} className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground text-background text-sm font-medium py-2.5 hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          {loading ? <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Đang tạo storyboard...</> : "Tạo Storyboard"}
        </button>
        {error && <p className="text-xs text-red-500 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">{error}</p>}
      </div>

      {result && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{result.title}</p>
            <p className="text-xs text-muted-foreground italic">{result.style_guide}</p>
          </div>
          {result.scenes.map((scene, i) => (
            <div key={i} className="rounded-lg border border-border/50 bg-background">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                <span className="text-xs font-semibold">Cảnh {scene.scene_number}</span>
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <span>{scene.camera_angle}</span>
                  <span>{scene.lighting}</span>
                </div>
              </div>
              <div className="px-4 py-3 space-y-3">
                <p className="text-sm text-foreground/80">{scene.description}</p>
                <div className="rounded-md border border-border/40 bg-muted/20 px-3 py-2.5 relative">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Midjourney Prompt</p>
                  <p className="text-[11px] font-mono text-foreground/70 leading-relaxed pr-14">{scene.midjourney_prompt}</p>
                  <button onClick={() => { navigator.clipboard.writeText(scene.midjourney_prompt); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 2000); }} className="absolute top-2.5 right-2.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">{copiedIdx === i ? "Đã copy" : "Copy"}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
