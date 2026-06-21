"use client";

import { useChatStore } from "@/store/chat";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export function SuggestionPanel() {
  const { suggestions, streaming, sendMessage, activeConversationId, messages } = useChatStore();
  const [selected, setSelected] = useState<string | null>(null);

  if (!activeConversationId) return null;

  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
  const question = lastAssistantMsg?.content
    ?.replace(/```generate\n[\s\S]*?\n```/g, "")
    ?.replace(/```suggestions\n[\s\S]*?\n```/g, "")
    ?.replace(/```(generate|suggestions)\n[\s\S]*$/, "")
    ?.trim() || "";

  const hasSuggestions = suggestions.length > 0 && !streaming;

  const handleSelect = (s: string) => {
    setSelected(s);
    setTimeout(() => {
      sendMessage(s);
      setSelected(null);
    }, 250);
  };

  return (
    <aside className="hidden lg:flex h-screen w-[320px] flex-col border-l border-border bg-card/95 backdrop-blur-xl shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4 bg-background/80">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.27 1.27L3 12l5.8 1.9a2 2 0 0 1 1.27 1.27L12 21l1.9-5.8a2 2 0 0 1 1.27-1.27L21 12l-5.8-1.9a2 2 0 0 1-1.27-1.27L12 3Z"/></svg>
        <h2 className="text-[15px] font-semibold text-foreground tracking-tight">AI Suggest</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        <AnimatePresence mode="wait">
          {hasSuggestions ? (
            <motion.div
              key="suggestions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Question from AI */}
              {question && (
                <div className="rounded-[16px] bg-primary/5 border border-primary/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[11px] font-bold text-primary/70 tracking-wider uppercase">Câu hỏi từ AI</span>
                  </div>
                  <p className="text-[14px] text-foreground leading-relaxed font-medium">{question}</p>
                </div>
              )}

              {/* Options */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-muted-foreground/60 tracking-wider uppercase px-1">Chọn một lựa chọn</span>
                {suggestions.map((s, i) => (
                  <motion.button
                    key={`${s}-${i}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSelect(s)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-[14px] px-4 py-3.5 text-left text-[14px] transition-all group border",
                      selected === s
                        ? "bg-primary/15 border-primary/30 text-primary shadow-[0_0_15px_rgba(255,213,74,0.1)]"
                        : "border-border hover:border-primary/20 hover:bg-muted/60 text-foreground"
                    )}
                  >
                    <span className={cn(
                      "flex-shrink-0 w-[20px] h-[20px] rounded-full border-2 transition-all flex items-center justify-center",
                      selected === s
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30 group-hover:border-primary/50"
                    )}>
                      {selected === s && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </span>
                    <span className="font-medium leading-snug">{s}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : streaming ? (
            <motion.div
              key="thinking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full text-center px-4"
            >
              <div className="flex gap-1.5 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <p className="text-[13px] text-muted-foreground">AI đang phân tích...</p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full text-center px-6"
            >
              <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.27 1.27L3 12l5.8 1.9a2 2 0 0 1 1.27 1.27L12 21l1.9-5.8a2 2 0 0 1 1.27-1.27L21 12l-5.8-1.9a2 2 0 0 1-1.27-1.27L12 3Z"/></svg>
              </div>
              <p className="text-[14px] font-medium text-muted-foreground/60 mb-2">Chưa có gợi ý</p>
              <p className="text-[12px] text-muted-foreground/40 leading-relaxed">Gửi tin nhắn để AI đưa ra các lựa chọn phù hợp với nội dung của bạn</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer hint */}
      <div className="border-t border-border px-5 py-3 bg-background/50">
        <p className="text-[11px] text-muted-foreground/50 text-center">Chọn lựa chọn hoặc gõ câu trả lời riêng</p>
      </div>
    </aside>
  );
}
