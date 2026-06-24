"use client";

import { useChatStore } from "@/store/chat";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";

export function SuggestionPanel() {
  const { suggestions, streaming, sendMessage, activeConversationId, messages } = useChatStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0, moved: false });

  const hasSuggestions = suggestions.length > 0 && !streaming;

  useEffect(() => {
    if (hasSuggestions) setOpen(true);
  }, [hasSuggestions, suggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y, moved: false };
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
    setPos({ x: dragRef.current.startPosX + dx, y: dragRef.current.startPosY + dy });
  }, [dragging]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
    if (!dragRef.current.moved) {
      setOpen(prev => !prev);
    }
  }, []);

  if (!activeConversationId) return null;

  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
  const question = lastAssistantMsg?.content
    ?.replace(/```generate\n[\s\S]*?\n```/g, "")
    ?.replace(/```suggestions\n[\s\S]*?\n```/g, "")
    ?.replace(/```(generate|suggestions)\n[\s\S]*$/, "")
    ?.trim() || "";

  const handleSelect = (s: string) => {
    setSelected(s);
    setTimeout(() => {
      sendMessage(s);
      setSelected(null);
      setOpen(false);
    }, 250);
  };

  const showBadge = hasSuggestions || streaming;

  return (
    <div
      ref={panelRef}
      className="fixed bottom-24 right-6 z-50"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
    >
      {/* Popup */}
      <AnimatePresence>
        {open && (hasSuggestions || streaming) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute bottom-16 right-0 w-[320px] max-h-[70vh] rounded-2xl border border-primary/20 bg-card/98 backdrop-blur-2xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.15),0_0_20px_rgba(255,213,74,0.05)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6),0_0_20px_rgba(255,213,74,0.08)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-primary/10 bg-primary/5">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Vitba" className="h-5 w-5 object-contain" />
                <span className="text-[14px] font-semibold text-foreground">Vitba Agents</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(70vh-56px)] p-4 no-scrollbar">
              {hasSuggestions ? (
                <div className="space-y-3">
                  {question && (
                    <div className="rounded-xl bg-primary/5 border border-primary/10 p-3.5">
                      <p className="text-[13px] text-foreground leading-relaxed font-medium">{question}</p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {suggestions.map((s, i) => (
                      <motion.button
                        key={`${s}-${i}`}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleSelect(s)}
                        className={cn(
                          "w-full flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-left text-[13px] transition-all group border",
                          selected === s
                            ? "bg-primary/15 border-primary/30 text-primary"
                            : "border-border hover:border-primary/20 hover:bg-muted/60 text-foreground"
                        )}
                      >
                        <span className={cn(
                          "flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 transition-all flex items-center justify-center",
                          selected === s
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30 group-hover:border-primary/50"
                        )}>
                          {selected === s && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><polyline points="20 6 9 17 4 12"/></svg>
                          )}
                        </span>
                        <span className="font-medium leading-snug">{s}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : streaming ? (
                <div className="flex items-center justify-center gap-2 py-6">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-[13px] text-muted-foreground">Đang phân tích...</p>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Draggable Button */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={cn(
          "relative w-[52px] h-[52px] rounded-full flex items-center justify-center transition-shadow duration-300 shadow-lg select-none touch-none",
          dragging ? "cursor-grabbing" : "cursor-grab",
          open
            ? "bg-primary shadow-[0_0_24px_rgba(255,213,74,0.4)]"
            : "bg-card border border-border hover:border-primary/40 hover:shadow-[0_0_20px_rgba(255,213,74,0.2)]"
        )}
      >
        <img src="/logo.png" alt="Vitba Agents" className="h-7 w-7 object-contain pointer-events-none" draggable={false} />

        {/* Badge */}
        {showBadge && !open && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 pointer-events-none">
            {streaming ? (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            ) : null}
            <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {streaming ? "..." : suggestions.length}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
