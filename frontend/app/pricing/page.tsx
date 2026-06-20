"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { normalizePlan } from "@/lib/plan";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";

const PLANS = [
  {
    id: "lite",
    name: "Lite",
    price: "Miễn phí",
    priceValue: 0,
    description: "Cá nhân trải nghiệm",
    badge: null,
    features: [
      { text: "3 lượt tạo / ngày", included: true },
      { text: "1 Brand Voice", included: true },
      { text: "3 tài liệu KB", included: true },
      { text: "Facebook Post, Email", included: true },
      { text: "1 dự án", included: true },
      { text: "10 cuộc trò chuyện", included: true },
      { text: "Landing Page", included: false },
    ],
    cta: "Gói hiện tại",
    gradient: "from-zinc-500/10 to-zinc-600/5",
    borderColor: "border-border",
    iconBg: "bg-zinc-100 dark:bg-zinc-800",
  },
  {
    id: "pro",
    name: "Pro",
    price: "89.000đ",
    priceValue: 89000,
    description: "Freelancer & team nhỏ",
    badge: "Phổ biến nhất",
    features: [
      { text: "30 lượt tạo / ngày", included: true },
      { text: "3 Brand Voice", included: true },
      { text: "30 tài liệu KB", included: true },
      { text: "SEO Blog, TikTok Script", included: true },
      { text: "Lịch sử 90 ngày", included: true },
      { text: "5 dự án", included: true },
      { text: "100 cuộc trò chuyện", included: true },
    ],
    cta: "Nâng cấp Pro",
    gradient: "from-yellow-500/15 to-amber-500/10",
    borderColor: "border-yellow-500/40",
    iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  {
    id: "max",
    name: "Max",
    price: "219.000đ",
    priceValue: 219000,
    description: "Doanh nghiệp & agency",
    badge: "Mạnh nhất",
    features: [
      { text: "Không giới hạn lượt tạo", included: true },
      { text: "Không giới hạn Brand Voice", included: true },
      { text: "Không giới hạn KB", included: true },
      { text: "Tất cả loại nội dung + Landing Page", included: true },
      { text: "Lịch sử vĩnh viễn", included: true },
      { text: "Không giới hạn LP", included: true },
      { text: "Model AI Reasoner", included: true },
    ],
    cta: "Nâng cấp Max",
    gradient: "from-violet-500/15 to-purple-500/10",
    borderColor: "border-violet-500/40",
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const currentPlan = normalizePlan(user?.plan);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const getPlanCta = (planId: string) => {
    if (planId === currentPlan) return "Gói hiện tại";
    const order = { lite: 0, pro: 1, max: 2 };
    if ((order[planId as keyof typeof order] ?? 0) > (order[currentPlan] ?? 0)) {
      return planId === "pro" ? "Nâng cấp Pro" : "Nâng cấp Max";
    }
    return "Chọn gói";
  };

  const isPlanDisabled = (planId: string) => planId === currentPlan || planId === "lite";

  const handleSelectPlan = (planId: string) => {
    if (planId === "lite") return;
    if (!token) {
      router.push("/login");
      return;
    }
    router.push(`/checkout?plan=${planId}&cycle=${billingCycle}`);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <button onClick={() => router.push(token ? "/dashboard" : "/")} className="flex items-center gap-2.5 text-[17px] font-bold text-foreground tracking-tight hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Logo" className="h-6 w-6 object-contain" />
            Vitba.ai
          </button>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {token ? (
              <button onClick={() => router.push("/dashboard")} className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors">
                Dashboard
              </button>
            ) : (
              <button onClick={() => router.push("/login")} className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content — fills remaining space, no scroll */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Title + Toggle */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Chọn gói phù hợp với bạn
          </h1>
          <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                billingCycle === "monthly"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Hàng tháng
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-all flex items-center gap-1.5",
                billingCycle === "yearly"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Hàng năm
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                billingCycle === "yearly"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-green-500/10 text-green-600 dark:text-green-400"
              )}>
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-5 md:grid-cols-3 w-full max-w-5xl">
          {PLANS.map((plan, i) => {
            const yearlyPrice = Math.round(plan.priceValue * 12 * 0.8);
            const displayPrice = billingCycle === "yearly" && plan.priceValue > 0
              ? `${Math.round(yearlyPrice / 12).toLocaleString("vi-VN")}đ`
              : plan.price;
            const displayPeriod = plan.priceValue > 0 ? "/tháng" : "";

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className={cn(
                  "relative flex flex-col rounded-[20px] border p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5",
                  plan.borderColor,
                  `bg-gradient-to-br ${plan.gradient}`,
                  plan.id === "pro" && "ring-2 ring-yellow-500/30 shadow-lg scale-[1.02]"
                )}
              >
                {plan.badge && (
                  <div className={cn(
                    "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[11px] font-bold shadow-lg",
                    plan.id === "pro"
                      ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-950"
                      : "bg-violet-600 text-white"
                  )}>
                    {plan.badge}
                  </div>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-[12px]", plan.iconBg)}>
                    {plan.id === "lite" && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 dark:text-zinc-400"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                    )}
                    {plan.id === "pro" && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600 dark:text-yellow-400"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                    )}
                    {plan.id === "max" && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-600 dark:text-violet-400"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground leading-tight">{plan.name}</h3>
                    <p className="text-[12px] text-muted-foreground">{plan.description}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">{displayPrice}</span>
                    {displayPeriod && (
                      <span className="text-xs text-muted-foreground">{displayPeriod}</span>
                    )}
                  </div>
                  {billingCycle === "yearly" && plan.priceValue > 0 && (
                    <p className="text-[11px] text-green-600 dark:text-green-400">
                      {yearlyPrice.toLocaleString("vi-VN")}đ / năm
                    </p>
                  )}
                </div>

                <ul className="mb-4 flex-1 space-y-1.5">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-[13px]">
                      {f.included ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-green-500"><path d="M20 6 9 17l-5-5"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground/30"><path d="M5 12h14"/></svg>
                      )}
                      <span className={cn(f.included ? "text-foreground" : "text-muted-foreground/50")}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isPlanDisabled(plan.id)}
                  className={cn(
                    "w-full rounded-[14px] py-2.5 text-sm font-semibold transition-all duration-200",
                    isPlanDisabled(plan.id)
                      ? "border border-border text-muted-foreground cursor-default"
                      : plan.id === "pro"
                        ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-950 hover:from-yellow-300 hover:to-amber-400 shadow-lg shadow-yellow-500/20"
                        : "bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-600/20"
                  )}
                >
                  {getPlanCta(plan.id)}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
