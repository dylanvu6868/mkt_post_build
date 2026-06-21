"use client";

import { useChatStore } from "@/store/chat";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCallback, useState, useRef } from "react";

function cleanContent(content: string) {
  if (!content) return "";
  let c = content
    .replace(/```generate\n[\s\S]*?\n```/g, "")
    .replace(/```suggestions\n[\s\S]*?\n```/g, "");
  c = c.replace(/```(generate|suggestions)\n[\s\S]*$/, "");
  return c.trim();
}

function MarkdownContent({ content }: { content: string }) {
  const cleaned = cleanContent(content);
  if (!cleaned) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-[15px] text-muted-foreground">{children}</p>,
        ul: ({ children }) => <ul className="mb-4 ml-6 list-disc last:mb-0 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="mb-4 ml-6 list-decimal last:mb-0 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="mb-1 text-[15px] text-muted-foreground">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <pre className="my-4 overflow-x-auto rounded-[12px] bg-muted border border-border p-4 text-[13px] text-foreground no-scrollbar shadow-inner">
                <code>{children}</code>
              </pre>
            );
          }
          return <code className="rounded-[4px] bg-primary/20 text-primary px-1.5 py-0.5 text-[13px] font-mono">{children}</code>;
        },
        h1: ({ children }) => <h1 className="mb-4 mt-6 text-2xl font-bold text-foreground">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-3 mt-6 text-xl font-bold text-foreground">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-2 mt-5 text-lg font-semibold text-foreground">{children}</h3>,
        h4: ({ children }) => <h4 className="mb-2 mt-4 text-base font-medium text-foreground">{children}</h4>,
        table: ({ children }) => (
          <div className="my-4 overflow-x-auto rounded-xl border border-border shadow-sm">
            <table className="w-full text-[13px]">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-muted/80 border-b border-border">{children}</thead>,
        tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
        tr: ({ children }) => <tr className="hover:bg-muted/40 transition-colors">{children}</tr>,
        th: ({ children }) => <th className="px-4 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">{children}</th>,
        td: ({ children }) => <td className="px-4 py-2.5 text-muted-foreground">{children}</td>,
      }}
    >
      {cleaned}
    </ReactMarkdown>
  );
}

export function ContentPanel() {
  const { contentPanel, setContentPanel, streamContent, contentPanelWidth, setContentPanelWidth } = useChatStore();
  const router = useRouter();
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = contentPanelWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth - (e.clientX - startX);
      if (newWidth >= 300 && newWidth <= 700) {
        setContentPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [contentPanelWidth, setContentPanelWidth]);

  if (!contentPanel.visible) return null;

  const handleCopy = () => {
    if (!contentPanel.result) return;
    const text = formatResult(contentPanel.result);
    navigator.clipboard.writeText(text);
    toast.success("Đã sao chép vào khay nhớ tạm");
  };

  const handleDownload = () => {
    if (!contentPanel.result) return;
    const text = formatResult(contentPanel.result);
    
    const isHtml = text.trim().toLowerCase().startsWith("<!doctype html>") || text.trim().toLowerCase().startsWith("<html");
    const mimeType = isHtml ? "text/html" : "text/plain";
    const extension = isHtml ? ".html" : ".txt";
    const filename = isHtml ? "landing-page" : "marketing-content";

    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside
      ref={panelRef}
      className="flex h-screen flex-col border-l border-border bg-card/95 backdrop-blur-3xl z-[100] shadow-2xl fixed right-0 top-0"
      style={{ width: contentPanelWidth }}
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-background/80">
        <h2 className="text-[15px] font-semibold text-foreground tracking-tight">Kết quả Nội dung</h2>
        <button
          onClick={() => setContentPanel({ visible: false })}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar">
        {contentPanel.generating && !contentPanel.result && (
          <div className="flex flex-col items-start justify-start h-full">
            <div className="w-full">
              <MarkdownContent content={streamContent || "Đang kết nối AI Agents..."} />
              <span className="animate-pulse inline-block ml-1 text-primary">|</span>
            </div>
          </div>
        )}

        {contentPanel.result && (
          <div className="space-y-6">
            {contentPanel.result.error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 space-y-4">
                <p className="text-sm text-red-300 leading-relaxed">{String(contentPanel.result.error)}</p>
                {(contentPanel.result.upgradeRequired as boolean) && (
                  <button
                    onClick={() => router.push("/pricing")}
                    className="rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 text-xs font-bold text-amber-950 hover:from-yellow-300 hover:to-amber-400 transition-all"
                  >
                    Nâng cấp gói
                  </button>
                )}
              </div>
            ) : (
              <>
            {contentPanel.result.score !== undefined && (
              <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl p-4 shadow-[inset_0_0_20px_rgba(255,213,74,0.05)]">
                <span className="text-[13px] text-muted-foreground font-medium">Điểm đánh giá chất lượng (AI Score):</span>
                <span className="rounded-full bg-primary px-3 py-1 text-[13px] font-bold text-primary-foreground shadow-[0_0_15px_rgba(255,213,74,0.4)]">
                  {String(contentPanel.result.score)}/100
                </span>
              </div>
            )}

            <div className="text-foreground">
              <MarkdownContent content={formatResult(contentPanel.result)} />
            </div>
              </>
            )}
          </div>
        )}
      </div>

      {contentPanel.result && !contentPanel.result.error && (
        <div className="flex gap-3 border-t border-border p-4 sm:p-6 bg-gradient-to-t from-background to-transparent">
          <button onClick={handleCopy} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-muted px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-accent hover:border-border transition-all hover:scale-[1.02] active:scale-[0.98]">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            Copy
          </button>
          <button onClick={handleDownload} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-muted px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-accent hover:border-border transition-all hover:scale-[1.02] active:scale-[0.98]">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Tải về
          </button>
          <button onClick={() => setContentPanel({ generating: false, result: null })} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-[13px] font-medium text-primary hover:bg-primary/20 hover:border-primary/50 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Làm lại
          </button>
        </div>
      )}

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 transition-colors z-10",
          isResizing && "bg-primary/30"
        )}
      />
    </aside>
  );
}

function formatResult(result: Record<string, unknown>): string {
  if (result.error) return String(result.error);
  const content = (result.formatted_final && typeof result.formatted_final === "object")
    ? result.formatted_final as Record<string, string>
    : (result.final && typeof result.final === "object")
      ? result.final as Record<string, string>
      : null;
  if (content) {
    const parts: string[] = [];
    if (content.hook) parts.push(content.hook);
    if (content.body) parts.push(content.body);
    if (content.cta) parts.push(content.cta);
    if (content.hashtags) parts.push(content.hashtags);
    return parts.join("\n\n");
  }
  return JSON.stringify(result, null, 2);
}
