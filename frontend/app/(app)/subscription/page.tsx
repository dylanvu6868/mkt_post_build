"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const PLAN_DETAILS: Record<string, { name: string; color: string; bgColor: string; limits: { label: string; current: number; max: number | null }[] }> = {
  lite: {
    name: "Lite",
    color: "text-zinc-600 dark:text-zinc-400",
    bgColor: "bg-zinc-100 dark:bg-zinc-800",
    limits: [
      { label: "Bài viết hôm nay", current: 1, max: 3 },
      { label: "Brand Voice profiles", current: 1, max: 1 },
      { label: "Tài liệu Knowledge Base", current: 2, max: 5 },
    ],
  },
  pro: {
    name: "Pro",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    limits: [
      { label: "Bài viết hôm nay", current: 5, max: 20 },
      { label: "Brand Voice profiles", current: 2, max: 5 },
      { label: "Tài liệu Knowledge Base", current: 10, max: 50 },
      { label: "Landing Page tháng này", current: 1, max: 5 },
    ],
  },
  max: {
    name: "Max",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    limits: [
      { label: "Bài viết hôm nay", current: 12, max: null },
      { label: "Brand Voice profiles", current: 8, max: null },
      { label: "Tài liệu Knowledge Base", current: 25, max: null },
      { label: "Landing Page tháng này", current: 3, max: null },
    ],
  },
};

export default function SubscriptionPage() {
  const router = useRouter();
  const currentPlan: string = "lite";
  const plan = PLAN_DETAILS[currentPlan];

  return (
    <div className="flex h-full items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg space-y-6"
      >
        <div className="rounded-[20px] border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm text-muted-foreground">Gói hiện tại</p>
              <h2 className={cn("text-2xl font-bold", plan.color)}>{plan.name}</h2>
            </div>
            <div className={cn("flex h-12 w-12 items-center justify-center rounded-[16px]", plan.bgColor)}>
              {currentPlan === "lite" && (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={plan.color}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              )}
              {currentPlan === "pro" && (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={plan.color}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              )}
              {currentPlan === "max" && (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={plan.color}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {plan.limits.map((limit, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-muted-foreground">{limit.label}</span>
                  <span className="text-sm font-semibold text-foreground">
                    {limit.current}{limit.max !== null ? ` / ${limit.max}` : ""}
                    {limit.max === null && <span className="text-muted-foreground font-normal ml-1">(unlimited)</span>}
                  </span>
                </div>
                {limit.max !== null && (
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        limit.current / limit.max > 0.8 ? "bg-red-500"
                          : limit.current / limit.max > 0.5 ? "bg-amber-500"
                          : "bg-green-500"
                      )}
                      style={{ width: `${Math.min(100, (limit.current / limit.max) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {currentPlan !== "max" && (
          <div className="rounded-[20px] border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-6">
            <h3 className="text-sm font-bold text-foreground mb-1">Cần nhiều hơn?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Nâng gói để mở khóa thêm tính năng và tăng giới hạn sử dụng.
            </p>
            <button
              onClick={() => router.push("/pricing")}
              className="rounded-[14px] bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all"
            >
              Xem các gói
            </button>
          </div>
        )}

        <div className="rounded-[20px] border border-border bg-card p-6">
          <h3 className="text-sm font-bold text-foreground mb-3">Lịch sử thanh toán</h3>
          <p className="text-sm text-muted-foreground py-6 text-center">
            Chưa có giao dịch nào
          </p>
        </div>
      </motion.div>
    </div>
  );
}
