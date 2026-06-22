"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const EMOTIONS = [
  { id: "FOMO", label: "FOMO", desc: "Sợ bỏ lỡ cơ hội" },
  { id: "Khan hiếm", label: "Khan hiếm", desc: "Tạo cảm giác giới hạn, cấp bách" },
  { id: "Tò mò", label: "Tò mò", desc: "Kích thích muốn khám phá thêm" },
  { id: "Tin tưởng", label: "Tin tưởng", desc: "Xây dựng uy tín và độ tin cậy" },
  { id: "Cảm hứng", label: "Cảm hứng", desc: "Truyền động lực hành động" },
  { id: "Đau điểm", label: "Đau điểm", desc: "Chạm vào vấn đề người đọc đang gặp" },
];

interface PsychoResult {
  emotion_analysis: string;
  optimized_content: string;
  pas_breakdown: Record<string, string>;
}

export default function PsychoPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [emotion, setEmotion] = useState(EMOTIONS[0].id);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PsychoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleRun() {
    if (!content.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      const res = await fetch("/api/lab/psycho", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, target_emotion: emotion }),
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
        <span className="text-foreground font-medium">Emotion Trigger Optimizer</span>
      </div>

      <div className="border-b border-border/50 pb-5">
        <div className="flex items-start gap-2">
          <h1 className="text-lg font-semibold tracking-tight">Emotion Trigger Optimizer</h1>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mt-0.5">Khả dụng</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
          Tái cấu trúc nội dung theo khung PAS (Problem–Agitate–Solve) để kích hoạt chính xác phản ứng cảm xúc mục tiêu và tăng tỷ lệ chuyển đổi.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cảm xúc mục tiêu</label>
            <div className="space-y-1">
              {EMOTIONS.map((em) => (
                <button key={em.id} onClick={() => setEmotion(em.id)} className={`w-full flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${emotion === em.id ? "border-foreground/30 bg-foreground/5" : "border-border/50 hover:border-border hover:bg-muted/30"}`}>
                  <div className={`mt-0.5 w-3 h-3 rounded-full border-2 shrink-0 transition-all ${emotion === em.id ? "border-foreground bg-foreground" : "border-muted-foreground/40"}`} />
                  <div>
                    <p className="text-xs font-semibold leading-none mb-0.5">{em.label}</p>
                    <p className="text-[11px] text-muted-foreground">{em.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nội dung gốc</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Dán nội dung cần tối ưu cảm xúc..." className="w-full h-36 resize-none rounded-lg border border-border/50 bg-background px-3.5 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all custom-scrollbar" />
          </div>
          <button onClick={handleRun} disabled={loading || !content.trim()} className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground text-background text-sm font-medium py-2.5 hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            {loading ? <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Đang xử lý...</> : "Tối ưu cảm xúc"}
          </button>
          {error && <p className="text-xs text-red-500 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">{error}</p>}
        </div>

        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              <div className="rounded-lg border border-border/50 bg-background px-4 py-3 space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Phân tích</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{result.emotion_analysis}</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-background">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-xs font-medium">Nội dung đã tối ưu</span></div>
                  <button onClick={() => { navigator.clipboard.writeText(result.optimized_content); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">{copied ? "Đã sao chép" : "Sao chép"}</button>
                </div>
                <p className="px-4 py-4 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{result.optimized_content}</p>
              </div>
              {Object.keys(result.pas_breakdown).length > 0 && (
                <div className="rounded-lg border border-border/50 bg-background px-4 py-3 space-y-2.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Phân tích cấu trúc PAS</p>
                  {Object.entries(result.pas_breakdown).map(([key, val]) => (
                    <div key={key} className="space-y-0.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">{key}</p>
                      <p className="text-xs text-foreground/80 leading-relaxed">{val}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="h-full min-h-[320px] rounded-lg border border-dashed border-border/40 flex flex-col items-center justify-center gap-2.5 text-muted-foreground/30">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>
              <p className="text-xs">Kết quả tối ưu sẽ xuất hiện tại đây</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
