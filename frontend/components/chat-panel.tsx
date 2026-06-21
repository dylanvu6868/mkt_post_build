"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/store/chat";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
        pre: ({ children }) => <>{children}</>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:opacity-80 transition-opacity">
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-4 border-l-2 border-primary/50 bg-primary/5 pl-4 py-2 rounded-r-[8px] italic opacity-90">{children}</blockquote>
        ),
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

const CONTENT_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  facebook_post: { label: "Facebook Post", icon: "\u{1F4F1}" },
  seo_blog: { label: "SEO Blog", icon: "\u{1F4DD}" },
  email: { label: "Email Marketing", icon: "\u{1F4E7}" },
  landing_page: { label: "Landing Page", icon: "\u{1F3AF}" },
  tiktok_script: { label: "TikTok Script", icon: "\u{1F3AC}" },
  marketing_plan: { label: "Marketing Plan", icon: "\u{1F4CA}" },
};

function formatResultText(result: Record<string, unknown>): string {
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

function InlineResult({ result, onExpand, onRedo }: {
  result: Record<string, unknown>;
  onExpand: () => void;
  onRedo: () => void;
}) {
  const router = useRouter();
  const contentType = (result._contentType as string) || "";
  const meta = CONTENT_TYPE_LABELS[contentType] || { label: "Nội dung", icon: "✨" };
  const review = result.review as Record<string, unknown> | undefined;
  const score = review?.score as number | undefined;

  const handleCopy = () => {
    navigator.clipboard.writeText(formatResultText(result));
    toast.success("Đã sao chép!");
  };

  const handleDownload = () => {
    const text = formatResultText(result);
    const isHtml = text.trim().toLowerCase().startsWith("<!doctype html>") || text.trim().toLowerCase().startsWith("<html");
    const blob = new Blob([text], { type: isHtml ? "text/html" : "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = isHtml ? "landing-page.html" : "content.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (result.error) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start w-full">
        <div className="max-w-[90%] sm:max-w-[80%] rounded-[20px] border border-red-500/30 bg-red-500/10 p-5 space-y-3">
          <p className="text-sm text-red-400">{String(result.error)}</p>
          {(result.upgradeRequired as boolean) && (
            <button onClick={() => router.push("/pricing")} className="rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 text-xs font-bold text-amber-950">
              Nâng cấp gói
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start w-full">
      <div className="max-w-[90%] sm:max-w-[85%] w-full">
        <div className="rounded-[20px] border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/[0.02] overflow-hidden shadow-[0_4px_24px_-8px_rgba(0,0,0,0.3)]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-primary/10 bg-primary/5">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">{meta.icon}</span>
              <span className="text-[14px] font-semibold text-foreground">{meta.label}</span>
            </div>
            {score !== undefined && (
              <span className="rounded-full bg-primary px-3 py-1 text-[12px] font-bold text-primary-foreground shadow-[0_0_12px_rgba(255,213,74,0.3)]">
                {score}/100
              </span>
            )}
          </div>

          {/* Content */}
          <div className="px-5 py-4 max-h-[400px] overflow-y-auto no-scrollbar">
            <MarkdownContent content={formatResultText(result)} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 px-5 py-3 border-t border-primary/10 bg-background/50">
            <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-[10px] border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              Copy
            </button>
            <button onClick={handleDownload} className="flex items-center gap-1.5 rounded-[10px] border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              Tải về
            </button>
            <button onClick={onExpand} className="flex items-center gap-1.5 rounded-[10px] border border-primary/20 bg-primary/10 px-3 py-1.5 text-[12px] font-medium text-primary hover:bg-primary/20 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/></svg>
              Xem chi tiết
            </button>
            <button onClick={onRedo} className="flex items-center gap-1.5 rounded-[10px] border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all ml-auto">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Làm lại
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function GeneratingIndicator({ streamContent }: { streamContent: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start w-full">
      <div className="max-w-[90%] sm:max-w-[85%] w-full">
        <div className="rounded-[20px] border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-primary/10">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-[13px] font-medium text-primary">AI Agents đang làm việc...</span>
          </div>
          {streamContent && (
            <div className="px-5 py-4 max-h-[300px] overflow-y-auto no-scrollbar">
              <MarkdownContent content={streamContent} />
              <span className="animate-pulse inline-block ml-1 text-primary">|</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function InteractiveOptions({ suggestions, onSelect }: { suggestions: string[]; onSelect: (s: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (s: string) => {
    setSelected(s);
    setTimeout(() => {
      onSelect(s);
      setSelected(null);
    }, 200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex justify-start w-full"
    >
      <div className="max-w-[90%] sm:max-w-[70%]">
        <div className="rounded-[20px] border border-border bg-card/80 backdrop-blur-xl p-2 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.3)] space-y-1">
          {suggestions.map((s, i) => (
            <motion.button
              key={i}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(s)}
              className={cn(
                "w-full flex items-center gap-3 rounded-[14px] px-4 py-3 text-left text-[14px] transition-all group",
                selected === s
                  ? "bg-primary/15 border border-primary/30 text-primary"
                  : "hover:bg-muted/80 text-foreground border border-transparent"
              )}
            >
              <span className={cn(
                "flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 transition-all flex items-center justify-center",
                selected === s
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/30 group-hover:border-primary/50"
              )}>
                {selected === s && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </span>
              <span className="font-medium">{s}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function ChatPanel() {
  const {
    messages, activeConversationId, streaming, streamContent, suggestions,
    sendMessage, createConversation, contentPanel, setContentPanel
  } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent, contentPanel.generating, contentPanel.result]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || streaming) return;
    const msg = input.trim();
    setInput("");
    if (!activeConversationId) {
      await createConversation();
    }
    await sendMessage(msg);
  };

  const showInlineResult = !contentPanel.generating && contentPanel.result && !contentPanel.visible;
  const showGenerating = contentPanel.generating;

  if (!activeConversationId) {
    return (
      <div className="flex flex-1 flex-col relative items-center justify-center p-4 sm:p-8 min-h-screen overflow-hidden bg-background">
        <button
          onClick={() => { window.dispatchEvent(new CustomEvent("toggle-sidebar")); }}
          className="absolute left-4 top-4 rounded-full p-2 hover:bg-accent md:hidden z-10 text-muted-foreground"
          aria-label="Toggle sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>

        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center opacity-60">
          <motion.div animate={{ x: [-30, 30, -30], y: [-30, 30, -30], rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="absolute w-[600px] h-[400px] rounded-full bg-primary/10 blur-[120px] mix-blend-screen" />
          <motion.div animate={{ x: [30, -30, 30], y: [30, -30, 30], rotate: [0, -15, 15, 0], scale: [1.2, 1, 1.2] }} transition={{ repeat: Infinity, duration: 25, ease: "linear" }} className="absolute w-[500px] h-[500px] rounded-full bg-[#ffb700]/10 blur-[140px] mix-blend-screen" />
        </div>

        <div className="flex flex-col items-center max-w-3xl w-full z-10 mt-[-5vh]">
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-4xl sm:text-[44px] font-bold mb-3 tracking-tight text-foreground text-center">
            Chào mừng trở lại, <span className="text-foreground">{user?.name || "bạn"}</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="text-muted-foreground text-[17px] mb-8 font-medium text-center">
            Hôm nay bạn muốn thiết kế nội dung gì?
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="w-full max-w-2xl bg-card/80 backdrop-blur-2xl rounded-[24px] p-2 mb-10 relative shadow-[0_8px_32px_-12px_rgba(255,213,74,0.15)] border border-border focus-within:border-primary/50 focus-within:shadow-[0_8px_40px_-12px_rgba(255,213,74,0.3)] transition-all duration-500">
            <form onSubmit={handleSubmit} className="flex gap-2 w-full">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Khởi tạo chiến dịch marketing của bạn..." className="flex-1 bg-transparent border-none px-6 py-4 text-[16px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-0" />
              <button type="submit" disabled={!input.trim()} className="rounded-[16px] bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 h-[52px] w-[52px] flex items-center justify-center disabled:opacity-50 disabled:hover:scale-100 transition-all duration-300 mr-1 self-center shadow-[0_0_20px_rgba(255,213,74,0.4)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </form>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.5 } } }} className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
            {[
              { title: "Facebook Post", desc: "Bài đăng mạng xã hội", icon: "\u{1F4F1}" },
              { title: "SEO Blog", desc: "Nội dung chuẩn SEO", icon: "\u{1F4DD}" },
              { title: "Email Marketing", desc: "Chuỗi email tự động", icon: "\u{1F4E7}" },
              { title: "Landing Page", desc: "Trang đích chuyển đổi", icon: "\u{1F3AF}" },
              { title: "TikTok Script", desc: "Kịch bản video ngắn", icon: "\u{1F3AC}" },
              { title: "Marketing Plan", desc: "Kế hoạch chiến lược", icon: "\u{1F4CA}" },
            ].map((item) => (
              <motion.button
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } } }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                key={item.title}
                onClick={async () => { await createConversation(); await sendMessage(`Tôi muốn viết ${item.title}`); }}
                className="flex flex-col items-start gap-3 rounded-[20px] border border-border bg-card/60 p-5 text-left hover:bg-muted/80 hover:border-primary/40 hover:shadow-[inset_0_0_20px_rgba(255,213,74,0.05),0_8px_20px_-8px_rgba(0,0,0,0.5)] transition-all duration-300 group"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-xl group-hover:bg-primary/10 transition-colors">
                  {item.icon}
                </div>
                <div>
                  <span className="block font-semibold text-[15px] text-foreground group-hover:text-primary transition-colors">{item.title}</span>
                  <span className="block text-[13px] text-muted-foreground mt-1">{item.desc}</span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.1)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none mix-blend-overlay" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-w-0 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-background/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => { window.dispatchEvent(new CustomEvent("toggle-sidebar")); }} className="rounded-full p-2 hover:bg-accent md:hidden text-muted-foreground" aria-label="Toggle sidebar">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div className="flex items-center gap-2 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
            <h2 className="truncate text-[15px] font-semibold text-foreground">
              {messages.length > 0 ? messages[0]?.content?.slice(0, 50) : "Cuộc trò chuyện mới"}
            </h2>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth z-10 relative no-scrollbar">
        {messages.map((msg) => (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[90%] sm:max-w-[80%] px-6 py-4 text-[15px] shadow-sm",
              msg.role === "user"
                ? "bg-primary/10 text-foreground border border-primary/20 rounded-[24px] rounded-tr-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                : "bg-card text-foreground rounded-[24px] rounded-tl-sm border border-border shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]"
            )}>
              {msg.role === "assistant" ? <MarkdownContent content={msg.content} /> : <span className="whitespace-pre-wrap">{msg.content}</span>}
            </div>
          </motion.div>
        ))}

        {/* Chat streaming */}
        {streaming && streamContent && !contentPanel.generating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="max-w-[90%] sm:max-w-[80%] rounded-[24px] rounded-tl-sm bg-card border border-border px-6 py-4 text-[15px] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]">
              <MarkdownContent content={streamContent} />
              <span className="animate-pulse inline-block ml-1 text-primary">|</span>
            </div>
          </motion.div>
        )}

        {streaming && !streamContent && !contentPanel.generating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="rounded-[24px] rounded-tl-sm bg-card border border-border px-6 py-4 text-[15px] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]">
              <span className="flex items-center gap-1.5 text-primary">
                <span className="animate-bounce" style={{ animationDelay: "0ms" }}>&#9679;</span>
                <span className="animate-bounce" style={{ animationDelay: "150ms" }}>&#9679;</span>
                <span className="animate-bounce" style={{ animationDelay: "300ms" }}>&#9679;</span>
              </span>
            </div>
          </motion.div>
        )}

        {/* Inline generating indicator */}
        {showGenerating && (
          <GeneratingIndicator streamContent={contentPanel.generating ? streamContent : ""} />
        )}

        {/* Inline result */}
        {showInlineResult && contentPanel.result && (
          <InlineResult
            result={contentPanel.result}
            onExpand={() => setContentPanel({ visible: true })}
            onRedo={() => setContentPanel({ generating: false, result: null })}
          />
        )}

        {/* Interactive suggestion options */}
        <AnimatePresence>
          {suggestions.length > 0 && !streaming && !showGenerating && (
            <InteractiveOptions suggestions={suggestions} onSelect={sendMessage} />
          )}
        </AnimatePresence>

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background/90 backdrop-blur-xl p-4 sm:p-6 relative z-20">
        <div className="bg-card/80 backdrop-blur-xl rounded-[24px] p-1.5 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)] max-w-4xl mx-auto border border-border relative focus-within:border-primary/40 focus-within:shadow-[0_8px_40px_-12px_rgba(255,213,74,0.15)] transition-all duration-300">
          <form onSubmit={handleSubmit} className="flex gap-2 w-full">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Gửi tin nhắn cho AI..." disabled={streaming} className="flex-1 bg-transparent border-none px-5 py-3.5 text-[15px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-0 disabled:opacity-50" />
            <button type="submit" disabled={!input.trim() || streaming} className="rounded-[16px] bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 h-[46px] w-[46px] flex items-center justify-center mr-0.5 self-center disabled:opacity-50 disabled:hover:scale-100 transition-all duration-300 shadow-[0_0_15px_rgba(255,213,74,0.3)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </form>
        </div>
        <div className="text-center mt-2">
          <span className="text-[11px] text-foreground/30">Vitba.ai &mdash; AI Marketing Assistant</span>
        </div>
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.1)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none -z-10 mix-blend-overlay" />
    </div>
  );
}
