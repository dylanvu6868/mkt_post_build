"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/store/chat";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";

function cleanContent(content: string) {
  if (!content) return "";
  let c = content
    .replace(/```generate\n[\s\S]*?\n```/g, "")
    .replace(/```suggestions\n[\s\S]*?\n```/g, "");
  
  // Hide partial blocks that are currently being streamed
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
              <pre className="my-4 overflow-x-auto rounded-[12px] bg-muted border border-border p-4 text-[13px] text-foreground custom-scrollbar shadow-inner">
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
      }}
    >
      {cleaned}
    </ReactMarkdown>
  );
}

export function ChatPanel() {
  const { messages, activeConversationId, streaming, streamContent, suggestions, sendMessage, createConversation, contentPanel, setContentPanel } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent]);

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

  if (!activeConversationId) {
    return (
      <div className="flex flex-1 flex-col relative items-center justify-center p-4 sm:p-8 min-h-screen overflow-hidden bg-background">
        {/* Mobile hamburger */}
        <button
          onClick={() => {
            const event = new CustomEvent("toggle-sidebar");
            window.dispatchEvent(event);
          }}
          className="absolute left-4 top-4 rounded-full p-2 hover:bg-accent md:hidden z-10 text-muted-foreground"
          aria-label="Toggle sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>

        {/* Smoke Effect Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center opacity-60">
          <motion.div
            animate={{ x: [-30, 30, -30], y: [-30, 30, -30], rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
            className="absolute w-[600px] h-[400px] rounded-full bg-primary/10 blur-[120px] mix-blend-screen"
          />
          <motion.div
            animate={{ x: [30, -30, 30], y: [30, -30, 30], rotate: [0, -15, 15, 0], scale: [1.2, 1, 1.2] }}
            transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
            className="absolute w-[500px] h-[500px] rounded-full bg-[#ffb700]/10 blur-[140px] mix-blend-screen"
          />
        </div>

        <div className="flex flex-col items-center max-w-3xl w-full z-10 mt-[-5vh]">
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl sm:text-[44px] font-bold mb-3 tracking-tight text-foreground text-center"
          >
            Chào mừng trở lại, <span className="text-foreground">{user?.name || "bạn"}</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-muted-foreground text-[17px] mb-8 font-medium text-center"
          >
            Hôm nay bạn muốn thiết kế nội dung gì?
          </motion.p>
          
          {/* Floating Input */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="w-full max-w-2xl bg-card/80 backdrop-blur-2xl rounded-[24px] p-2 mb-10 relative shadow-[0_8px_32px_-12px_rgba(255,213,74,0.15)] border border-border focus-within:border-primary/50 focus-within:shadow-[0_8px_40px_-12px_rgba(255,213,74,0.3)] transition-all duration-500"
          >
            <form onSubmit={handleSubmit} className="flex gap-2 w-full">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Khởi tạo chiến dịch marketing của bạn..."
                className="flex-1 bg-transparent border-none px-6 py-4 text-[16px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-0"
              />
              <button type="submit" disabled={!input.trim()} className="rounded-[16px] bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 h-[52px] w-[52px] flex items-center justify-center disabled:opacity-50 disabled:hover:scale-100 transition-all duration-300 mr-1 self-center shadow-[0_0_20px_rgba(255,213,74,0.4)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </form>
          </motion.div>

          {/* Suggestion Cards */}
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1, delayChildren: 0.5 }
              }
            }}
            className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full"
          >
            {[
              { title: "Marketing Templates", desc: "Mẫu kịch bản có sẵn", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.27 1.27L3 12l5.8 1.9a2 2 0 0 1 1.27 1.27L12 21l1.9-5.8a2 2 0 0 1 1.27-1.27L21 12l-5.8-1.9a2 2 0 0 1-1.27-1.27L12 3Z"/></svg> },
              { title: "Facebook Campaign", desc: "Bài đăng mạng xã hội", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
              { title: "SEO Blog Post", desc: "Nội dung chuẩn SEO", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg> },
              { title: "Email Marketing", desc: "Chuỗi email tự động", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg> },
              { title: "Landing Page", desc: "Trang đích chuyển đổi", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
              { title: "TikTok Script", desc: "Kịch bản video ngắn", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><line x1="12" x2="12.01" y1="18" y2="18"/></svg> },
            ].map((item) => (
              <motion.button
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
                }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                key={item.title}
                onClick={async () => {
                  await createConversation();
                  await sendMessage(`Tôi muốn viết ${item.title}`);
                }}
                className="flex flex-col items-start gap-3 rounded-[20px] border border-border bg-card/60 p-5 text-left hover:bg-muted/80 hover:border-primary/40 hover:shadow-[inset_0_0_20px_rgba(255,213,74,0.05),0_8px_20px_-8px_rgba(0,0,0,0.5)] transition-all duration-300 group"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-primary group-hover:bg-primary/10 transition-colors">
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
        
        {/* Subtle background grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.1)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none mix-blend-overlay"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-w-0 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-background/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const event = new CustomEvent("toggle-sidebar");
              window.dispatchEvent(event);
            }}
            className="rounded-full p-2 hover:bg-accent md:hidden text-muted-foreground"
            aria-label="Toggle sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div className="flex items-center gap-2 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
            <h2 className="truncate text-[15px] font-semibold text-foreground">
              {messages.length > 0 ? messages[0]?.content?.slice(0, 50) : "Cuộc trò chuyện mới"}
            </h2>
          </div>
        </div>

        {(contentPanel.result || contentPanel.generating || streamContent) && !contentPanel.visible && (
          <button
            onClick={() => setContentPanel({ visible: true })}
            className="flex items-center gap-1.5 rounded-[12px] bg-primary/10 border border-primary/20 px-4 py-2 text-[13px] font-medium text-primary hover:bg-primary/20 transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="15" x2="15" y1="3" y2="21"/></svg>
            Hiển thị kết quả
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 scroll-smooth z-10 relative custom-scrollbar">
        {messages.map((msg) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id} 
            className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div className={cn(
              "max-w-[90%] sm:max-w-[80%] px-6 py-4 text-[15px] shadow-sm",
              msg.role === "user"
                ? "bg-primary/10 text-foreground border border-primary/20 rounded-[24px] rounded-tr-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                : "bg-card text-foreground rounded-[24px] rounded-tl-sm border border-border shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]"
            )}>
              {msg.role === "assistant" ? (
                <MarkdownContent content={msg.content} />
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </motion.div>
        ))}

        {streaming && streamContent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="max-w-[90%] sm:max-w-[80%] rounded-[24px] rounded-tl-sm bg-card border border-border px-6 py-4 text-[15px] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]">
              <MarkdownContent content={streamContent} />
              <span className="animate-pulse inline-block ml-1 text-primary">|</span>
            </div>
          </motion.div>
        )}

        {streaming && !streamContent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="rounded-[24px] rounded-tl-sm bg-card border border-border px-6 py-4 text-[15px] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]">
              <span className="flex items-center gap-1.5 text-primary">
                <span className="animate-bounce" style={{ animationDelay: "0ms" }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: "150ms" }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: "300ms" }}>●</span>
              </span>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Suggestions + Input */}
      <div className="border-t border-border bg-background/90 backdrop-blur-xl p-4 sm:p-6 space-y-4 relative z-20">
        <AnimatePresence>
          {suggestions.length > 0 && !streaming && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex flex-wrap gap-2 max-w-4xl mx-auto"
            >
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-[12px] border border-primary/20 bg-primary/5 px-4 py-2 text-[13px] text-primary hover:bg-primary/10 hover:border-primary/40 transition-colors shadow-sm"
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="bg-card/80 backdrop-blur-xl rounded-[24px] p-1.5 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)] max-w-4xl mx-auto border border-border relative focus-within:border-primary/40 focus-within:shadow-[0_8px_40px_-12px_rgba(255,213,74,0.15)] transition-all duration-300">
          <form onSubmit={handleSubmit} className="flex gap-2 w-full">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Gửi tin nhắn cho AI..."
              disabled={streaming}
              className="flex-1 bg-transparent border-none px-5 py-3.5 text-[15px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-0 disabled:opacity-50"
            />
            <button type="submit" disabled={!input.trim() || streaming} className="rounded-[16px] bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 h-[46px] w-[46px] flex items-center justify-center mr-0.5 self-center disabled:opacity-50 disabled:hover:scale-100 transition-all duration-300 shadow-[0_0_15px_rgba(255,213,74,0.3)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </form>
        </div>
        <div className="text-center mt-2">
          <span className="text-[11px] text-foreground/30">Vitba.ai có thể mắc lỗi. Vui lòng kiểm tra lại các thông tin quan trọng.</span>
        </div>
      </div>
      
      {/* Subtle grid background for the chat view */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.1)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none -z-10 mix-blend-overlay"></div>
    </div>
  );
}
