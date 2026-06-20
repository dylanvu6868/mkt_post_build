"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import { normalizePlan, PLAN_META, usagePercent, CONTENT_TYPE_LABELS } from "@/lib/plan";

const USAGE_LABELS = [
  { key: "daily_generations" as const, label: "Bài viết hôm nay" },
  { key: "brand_profiles" as const, label: "Brand Voice profiles" },
  { key: "kb_files" as const, label: "Tài liệu Knowledge Base" },
  { key: "projects" as const, label: "Dự án" },
  { key: "conversations" as const, label: "Cuộc trò chuyện" },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const { data, isLoading } = usePlanLimits();
  const currentPlan = normalizePlan(data?.plan);
  const plan = PLAN_META[currentPlan];

  const contentTypes = data?.limits.content_types ?? [];

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
              {data?.plan_expires_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Hết hạn: {new Date(data.plan_expires_at).toLocaleDateString("vi-VN")}
                </p>
              )}
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

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Đang tải...</p>
          ) : (
            <div className="space-y-4">
              {USAGE_LABELS.map(({ key, label }) => {
                const item = data?.usage[key];
                if (!item) return null;
                const pct = usagePercent(item);
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="text-sm font-semibold text-foreground">
                        {item.used}
                        {item.max !== null ? ` / ${item.max}` : ""}
                        {item.max === null && (
                          <span className="text-muted-foreground font-normal ml-1">(không giới hạn)</span>
                        )}
                      </span>
                    </div>
                    {item.max !== null && (
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-green-500"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-[20px] border border-border bg-card p-6">
          <h3 className="text-sm font-bold text-foreground mb-3">Loại nội dung được phép</h3>
          {contentTypes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {contentTypes.map((ct) => (
                <span
                  key={ct}
                  className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium"
                >
                  {CONTENT_TYPE_LABELS[ct] ?? ct.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Đang tải...</p>
          )}
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
          <h3 className="text-sm font-bold text-foreground mb-3">Lịch sử nội dung</h3>
          <p className="text-sm text-muted-foreground">
            {data?.limits.history_retention_days === null
              ? "Gói Max: lưu lịch sử không giới hạn thời gian."
              : `Gói hiện tại lưu lịch sử ${data?.limits.history_retention_days ?? 30} ngày gần nhất.`}
          </p>
        </div>

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
