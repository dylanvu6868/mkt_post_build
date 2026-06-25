"use client";
import { useState } from "react";
import { useLabTool } from "@/hooks/use-lab-tool";
import { LabBreadcrumb, ToolHeader, RunButton, ErrorBox, LabTextarea, ChipGroup } from "@/components/lab-ui";


const STYLES = ["Cinematic dark aesthetic", "Bright lifestyle editorial", "Minimalist luxury", "Vibrant street photography", "Moody film noir"];
interface Scene { scene_number: number; description: string; camera_angle: string; lighting: string; midjourney_prompt: string; }
interface CinematicResult { title: string; scenes: Scene[]; style_guide: string; }

export default function CinematicPage() {const [content, setContent] = useState("");
  const [style, setStyle] = useState(STYLES[0]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const { run, result, loading, error } = useLabTool<CinematicResult>("/cinematic");

  async function handleRun() {
    if (!content.trim()) return;
    await run({ content, style });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LabBreadcrumb tool="Visual Prompt Director" />
      <ToolHeader name="Visual Prompt Director" description="Chuyển đổi nội dung văn bản thành storyboard phân cảnh với góc máy, ánh sáng và Midjourney prompt sẵn sàng sử dụng." tag="available" />


      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phong cách hình ảnh</label>
          <div className="flex flex-wrap gap-2">
            {STYLES.map(s => <button key={s} onClick={() => setStyle(s)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${style === s ? "border-foreground/30 bg-foreground/5 text-foreground" : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"}`}>{s}</button>)}
          </div>
        </div>
        <LabTextarea label="Nội dung" value={content} onChange={setContent} placeholder="Nhập nội dung..." />
        <RunButton loading={loading} disabled={!content.trim()} onClick={handleRun} loadingText="Vitba Tool" idleText="Chạy" className="w-full" />
        {error && <ErrorBox message={error} />}
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
