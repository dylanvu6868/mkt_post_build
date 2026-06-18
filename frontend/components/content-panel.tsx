"use client";

import { useChatStore } from "@/store/chat";
import { toast } from "sonner";

export function ContentPanel() {
  const { contentPanel, setContentPanel } = useChatStore();

  if (!contentPanel.visible) return null;

  const handleCopy = () => {
    if (!contentPanel.result) return;
    const text = formatResult(contentPanel.result);
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleDownload = () => {
    if (!contentPanel.result) return;
    const text = formatResult(contentPanel.result);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "marketing-content.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="flex h-screen w-96 flex-col border-l bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Generated Content</h2>
        <button
          onClick={() => setContentPanel({ visible: false })}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {contentPanel.generating && !contentPanel.result && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm font-medium">Generating content...</p>
            <p className="mt-1 text-xs text-muted-foreground">AI agents are working on your content</p>
          </div>
        )}

        {contentPanel.result && (
          <div className="space-y-4">
            {contentPanel.result.score !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Quality Score:</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {String(contentPanel.result.score)}/100
                </span>
              </div>
            )}

            <div className="rounded-lg border p-4">
              <pre className="whitespace-pre-wrap text-sm">{formatResult(contentPanel.result)}</pre>
            </div>
          </div>
        )}
      </div>

      {contentPanel.result && (
        <div className="flex gap-2 border-t p-3">
          <button onClick={handleCopy} className="flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs hover:bg-muted">
            Copy
          </button>
          <button onClick={handleDownload} className="flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs hover:bg-muted">
            Download
          </button>
          <button onClick={() => setContentPanel({ generating: false, result: null })} className="flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs hover:bg-muted">
            Regenerate
          </button>
        </div>
      )}
    </aside>
  );
}

function formatResult(result: Record<string, unknown>): string {
  if (result.final && typeof result.final === "object") {
    const final = result.final as Record<string, string>;
    const parts: string[] = [];
    if (final.hook) parts.push(final.hook);
    if (final.body) parts.push(final.body);
    if (final.cta) parts.push(final.cta);
    if (final.hashtags) parts.push(final.hashtags);
    return parts.join("\n\n");
  }
  return JSON.stringify(result, null, 2);
}
