"use client";

import { useState } from "react";
import { api } from "@/services/api";
import { ThumbsUp, ThumbsDown, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function FeedbackButtons({ messageId }: { messageId: number }) {
  const [submitted, setSubmitted] = useState<"up" | "down" | null>(null);
  const [loading, setLoading] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");

  const handleSubmit = async (rating: "up" | "down") => {
    if (submitted) return;
    setLoading(true);
    try {
      await api.post("/api/feedback", { rating, message_id: messageId });
      setSubmitted(rating);
      if (rating === "down") setShowComment(true);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!comment.trim() || !submitted) return;
    setLoading(true);
    try {
      // Re-submit with comment (upsert not implemented — this is a second entry)
      await api.post("/api/feedback", {
        rating: submitted,
        message_id: messageId,
        comment: comment.trim(),
        category: "quality",
      });
      setShowComment(false);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (submitted && !showComment) {
    return (
      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
        <Check className="h-3 w-3 text-emerald-500" />
        Cảm ơn phản hồi của bạn
      </div>
    );
  }

  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleSubmit("up")}
          disabled={loading || !!submitted}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-lg transition-all",
            submitted === "up"
              ? "bg-emerald-500/15 text-emerald-500"
              : "text-muted-foreground/40 hover:bg-accent hover:text-emerald-500"
          )}
          title="Hữu ích"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => handleSubmit("down")}
          disabled={loading || !!submitted}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-lg transition-all",
            submitted === "down"
              ? "bg-red-500/15 text-red-500"
              : "text-muted-foreground/40 hover:bg-accent hover:text-red-500"
          )}
          title="Không hữu ích"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>
      {showComment && (
        <div className="mt-1.5 flex gap-1.5">
          <input
            className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-[11px] text-foreground focus:border-primary focus:outline-none"
            placeholder="Cho chúng tôi biết vấn đề..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmitComment(); }}
          />
          <button
            onClick={handleSubmitComment}
            disabled={loading || !comment.trim()}
            className="rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/20"
          >
            Gửi
          </button>
        </div>
      )}
    </div>
  );
}
