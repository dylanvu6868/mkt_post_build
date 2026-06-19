"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState, Suspense } from "react";

const PLAN_INFO: Record<string, { name: string; monthlyPrice: number; color: string; features: string[] }> = {
  pro: {
    name: "Pro",
    monthlyPrice: 89000,
    color: "text-amber-600 dark:text-amber-400",
    features: ["20 bài viết/ngày", "5 Brand Voice", "50 tài liệu KB", "5 Landing Page/tháng", "Export PDF/Docx"],
  },
  max: {
    name: "Max",
    monthlyPrice: 219000,
    color: "text-violet-600 dark:text-violet-400",
    features: ["Không giới hạn bài viết", "Không giới hạn Brand Voice", "Không giới hạn KB", "Không giới hạn Landing Page", "Model AI Reasoner"],
  },
};

const BANK_INFO = {
  bankName: "Vietcombank",
  accountNumber: "1234567890",
  accountHolder: "CONG TY VITBA AI",
  branch: "Chi nhánh TP.HCM",
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const planId = searchParams.get("plan") || "pro";
  const cycle = searchParams.get("cycle") || "monthly";

  const plan = PLAN_INFO[planId];
  const [step, setStep] = useState<"review" | "transfer" | "done">("review");
  const [transferCode] = useState(() => `VB${Date.now().toString(36).toUpperCase()}`);

  if (!plan) {
    router.push("/pricing");
    return null;
  }

  if (!token) {
    router.push("/login");
    return null;
  }

  const yearlyTotal = Math.round(plan.monthlyPrice * 12 * 0.8);
  const price = cycle === "yearly" ? yearlyTotal : plan.monthlyPrice;
  const periodLabel = cycle === "yearly" ? "/ năm" : "/ tháng";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <button onClick={() => router.push("/pricing")} className="flex items-center gap-2.5 text-[17px] font-bold text-foreground tracking-tight hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Logo" className="h-6 w-6 object-contain" />
            Vitba.ai
          </button>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={() => router.push("/pricing")} className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              Quay lại
            </button>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="mx-auto max-w-4xl px-6 pt-8">
        <div className="flex items-center justify-center gap-2 mb-10">
          {["Xác nhận gói", "Chuyển khoản", "Hoàn tất"].map((label, i) => {
            const stepIndex = ["review", "transfer", "done"].indexOf(step);
            const isActive = i <= stepIndex;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {i < stepIndex ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={cn("text-sm font-medium hidden sm:inline", isActive ? "text-foreground" : "text-muted-foreground")}>
                  {label}
                </span>
                {i < 2 && (
                  <div className={cn("h-[2px] w-12", isActive && i < stepIndex ? "bg-primary" : "bg-border")} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 pb-20">
        {step === "review" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 md:grid-cols-5"
          >
            {/* Order Summary */}
            <div className="md:col-span-3 space-y-6">
              <div className="rounded-[20px] border border-border bg-card p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Xác nhận đơn hàng</h2>

                <div className="flex items-center justify-between rounded-[14px] bg-muted/50 p-4 mb-4">
                  <div>
                    <p className={cn("text-lg font-bold", plan.color)}>Gói {plan.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {cycle === "yearly" ? "Thanh toán hàng năm" : "Thanh toán hàng tháng"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">{price.toLocaleString("vi-VN")}đ</p>
                    <p className="text-sm text-muted-foreground">{periodLabel}</p>
                  </div>
                </div>

                <ul className="space-y-2">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 shrink-0"><path d="M20 6 9 17l-5-5"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[20px] border border-border bg-card p-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">Thông tin tài khoản</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tên</span>
                    <span className="font-medium text-foreground">{user?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium text-foreground">{user?.email}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Summary */}
            <div className="md:col-span-2">
              <div className="sticky top-24 rounded-[20px] border border-border bg-card p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Tóm tắt thanh toán</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gói {plan.name}</span>
                    <span className="text-foreground">{plan.monthlyPrice.toLocaleString("vi-VN")}đ/tháng</span>
                  </div>
                  {cycle === "yearly" && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Giảm giá năm (-20%)</span>
                      <span>-{Math.round(plan.monthlyPrice * 12 * 0.2).toLocaleString("vi-VN")}đ</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-3 flex justify-between font-bold">
                    <span className="text-foreground">Tổng cộng</span>
                    <span className="text-foreground">{price.toLocaleString("vi-VN")}đ</span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    try {
                      const { api } = await import("@/services/api");
                      await api.post("/payments/create-order", { plan: planId, cycle, transfer_code: transferCode });
                    } catch {}
                    setStep("transfer");
                  }}
                  className={cn(
                    "w-full mt-6 rounded-[14px] py-3 text-sm font-semibold transition-all",
                    planId === "max"
                      ? "bg-violet-600 text-white hover:bg-violet-700"
                      : "bg-primary text-primary-foreground hover:opacity-90"
                  )}
                >
                  Tiếp tục thanh toán
                </button>

                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  Bạn có thể hủy bất cứ lúc nào
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {step === "transfer" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-lg"
          >
            <div className="rounded-[20px] border border-border bg-card p-6">
              <h2 className="text-lg font-bold text-foreground mb-2">Chuyển khoản ngân hàng</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Vui lòng chuyển khoản theo thông tin bên dưới. Gói sẽ được kích hoạt trong vòng 24h sau khi xác nhận.
              </p>

              <div className="space-y-4 rounded-[14px] bg-muted/50 p-5">
                {[
                  { label: "Ngân hàng", value: BANK_INFO.bankName },
                  { label: "Số tài khoản", value: BANK_INFO.accountNumber },
                  { label: "Chủ tài khoản", value: BANK_INFO.accountHolder },
                  { label: "Chi nhánh", value: BANK_INFO.branch },
                  { label: "Số tiền", value: `${price.toLocaleString("vi-VN")}đ` },
                  { label: "Nội dung CK", value: transferCode },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{item.value}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(item.value)}
                        className="rounded-md p-1 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Sao chép"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[14px] border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Vui lòng ghi đúng nội dung chuyển khoản <strong>{transferCode}</strong> để hệ thống tự động xác nhận.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setStep("done")}
                className="w-full mt-6 rounded-[14px] bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all"
              >
                Tôi đã chuyển khoản
              </button>

              <button
                onClick={() => setStep("review")}
                className="w-full mt-2 rounded-[14px] py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              >
                Quay lại
              </button>
            </div>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto max-w-md text-center"
          >
            <div className="rounded-[24px] border border-border bg-card p-10">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M20 6 9 17l-5-5"/></svg>
              </div>

              <h2 className="text-xl font-bold text-foreground mb-2">Đã ghi nhận!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Chúng tôi đã nhận được yêu cầu nâng gói <strong className={plan.color}>{plan.name}</strong> của bạn.
                Gói sẽ được kích hoạt trong vòng 24h sau khi xác nhận chuyển khoản.
              </p>

              <div className="rounded-[14px] bg-muted/50 p-4 mb-6 text-sm">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Mã giao dịch</span>
                  <span className="font-mono font-semibold text-foreground">{transferCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trạng thái</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">Đang xử lý</span>
                </div>
              </div>

              <button
                onClick={() => router.push("/dashboard")}
                className="w-full rounded-[14px] bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all"
              >
                Về Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
