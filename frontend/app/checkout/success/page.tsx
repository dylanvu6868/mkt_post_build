"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const PLAN_INFO: Record<string, { name: string; color: string }> = {
  lite: {
    name: "Lite",
    color: "text-sky-600 dark:text-sky-400",
  },
  pro: {
    name: "Pro",
    color: "text-amber-600 dark:text-amber-400",
  },
  max: {
    name: "Max",
    color: "text-violet-600 dark:text-violet-400",
  },
};

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const planId = searchParams.get("plan") || "pro";
  const cycle = searchParams.get("cycle") || "monthly";
  const transferCode = searchParams.get("code") || "";
  const plan = PLAN_INFO[planId] || PLAN_INFO.pro;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <button
            onClick={() => router.push("/pricing")}
            className="flex items-center gap-2.5 text-[17px] font-bold text-foreground tracking-tight hover:opacity-80 transition-opacity"
          >
            <img src="/logo.png" alt="Vitba.ai" className="h-6 w-auto object-contain" />
            Vitba<span className="text-primary">.ai</span>
          </button>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 pt-8">
        <div className="mb-10 flex items-center justify-center gap-2">
          {["Xác nhận gói", "Chuyển khoản", "Hoàn tất"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground transition-colors">
                {i < 2 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  3
                )}
              </div>
              <span className="hidden text-sm font-medium text-foreground sm:inline">
                {label}
              </span>
              {i < 2 && <div className="h-[2px] w-12 bg-primary" />}
            </div>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto max-w-md text-center"
        >
          <div className="rounded-3xl border border-border bg-card p-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>

            <h1 className="mb-2 text-xl font-bold text-foreground">
              Thanh toán thành công!
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Gói <strong className={plan.color}>{plan.name}</strong>{" "}
              {cycle === "yearly" ? "hàng năm" : "hàng tháng"} đã được kích hoạt cho tài khoản của bạn.
            </p>

            <div className="mb-6 rounded-xl bg-muted/50 p-4 text-sm">
              {transferCode && (
                <div className="mb-2 flex justify-between gap-4">
                  <span className="text-muted-foreground">Mã giao dịch</span>
                  <span className="font-mono font-semibold text-foreground">
                    {transferCode}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Trạng thái</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  Đã kích hoạt
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
              >
                Về Dashboard
              </button>
              <button
                onClick={() => router.push("/subscription")}
                className={cn(
                  "rounded-xl border border-border py-3 text-sm font-semibold text-foreground transition-all",
                  "hover:bg-accent"
                )}
              >
                Xem gói
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
