"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function StudyPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initiate chat on first load
    if (messages.length === 0 && !isLoading) {
      sendMessage("", true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (text: string, isInitial: boolean = false) => {
    if (!isInitial && !text.trim()) return;

    const newMessages = isInitial ? [] : [...messages, { role: "user", content: text } as Message];
    if (!isInitial) {
      setMessages(newMessages);
      setInput("");
      setSuggestions([]);
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/study/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let aiContent = "";
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.type === "token") {
                aiContent += data.content;
                setMessages([...newMessages, { role: "assistant", content: aiContent }]);
              } else if (data.type === "suggestions") {
                setSuggestions(data.suggestions);
              }
            } catch (e) {
              // ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const MarkdownContent = ({ content }: { content: string }) => {
    // Clean up suggestion blocks if any
    let cleaned = content.replace(/```suggestions\n[\s\S]*?\n```/g, "");
    cleaned = cleaned.replace(/```suggestions\n[\s\S]*$/g, "").trim();

    return (
      <div className="text-foreground">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-[15px]">{children}</p>,
            ul: ({ children }) => <ul className="mb-4 ml-6 list-disc last:mb-0 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="mb-4 ml-6 list-decimal last:mb-0 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="mb-1 text-[15px]">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
            code: ({ children, className }) => {
              const isBlock = className?.includes("language-");
              if (isBlock) {
                return (
                  <pre className="my-4 overflow-x-auto rounded-xl bg-muted border border-border p-4 text-[13px] text-foreground no-scrollbar shadow-inner">
                    <code>{children}</code>
                  </pre>
                );
              }
              return <code className="rounded bg-primary/20 text-primary px-1.5 py-0.5 text-[13px] font-mono">{children}</code>;
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
            td: ({ children }) => <td className="px-4 py-2.5 border-t border-border/50">{children}</td>,
          }}
        >
          {cleaned}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-80px)] flex flex-col bg-background border border-border/50 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/hub")}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold">Vitba Study</h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-purple-500/10 text-purple-500 border border-purple-500/20">
                Độc quyền
              </span>
            </div>
            <p className="text-xs text-muted-foreground">AI Mentor & Giảng viên Marketing</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted/40 border border-border/50 rounded-tl-sm"
              }`}
            >
              {msg.role === "user" ? (
                <p className="text-[15px] whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <MarkdownContent content={msg.content} />
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted/40 border border-border/50 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0.2s" }} />
              <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border/50 bg-background">
        {suggestions.length > 0 && !isLoading && (
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s)}
                className="px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-[13px] hover:bg-primary/10 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="relative flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập câu hỏi hoặc chọn gợi ý bên trên..."
            className="w-full max-h-32 min-h-[52px] resize-none rounded-xl border border-border/50 bg-muted/20 px-4 py-3.5 text-[15px] text-foreground focus:outline-none focus:border-primary/50 focus:bg-background custom-scrollbar"
            rows={1}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="h-[52px] w-[52px] shrink-0 flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-center text-[11px] text-muted-foreground mt-3">
          Vitba Study có thể mắc lỗi. Vui lòng kiểm tra lại các thông tin quan trọng.
        </p>
      </div>
    </div>
  );
}
