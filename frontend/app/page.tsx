"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: "\u{1F4F1}",
    title: "Facebook Post",
    desc: "Bài viết viral với hook, body, CTA và hashtag tối ưu engagement",
    color: "from-blue-500/20 to-blue-600/5",
    border: "border-blue-500/20",
  },
  {
    icon: "\u{1F4DD}",
    title: "SEO Blog",
    desc: "Bài blog chuẩn SEO với meta description, FAQ schema và từ khóa tối ưu",
    color: "from-green-500/20 to-green-600/5",
    border: "border-green-500/20",
  },
  {
    icon: "\u{1F4E7}",
    title: "Email Marketing",
    desc: "Email chuyển đổi cao với subject line, body copy và CTA hiệu quả",
    color: "from-orange-500/20 to-orange-600/5",
    border: "border-orange-500/20",
  },
  {
    icon: "\u{1F3AF}",
    title: "Landing Page",
    desc: "Trang đích tối ưu chuyển đổi với headline, benefits và social proof",
    color: "from-red-500/20 to-red-600/5",
    border: "border-red-500/20",
  },
  {
    icon: "\u{1F3AC}",
    title: "TikTok Script",
    desc: "Kịch bản video ngắn với hook 3 giây, script và CTA thu hút",
    color: "from-pink-500/20 to-pink-600/5",
    border: "border-pink-500/20",
  },
  {
    icon: "\u{1F4CA}",
    title: "Marketing Plan",
    desc: "Kế hoạch chiến lược với SWOT, target audience, channel & timeline",
    color: "from-violet-500/20 to-violet-600/5",
    border: "border-violet-500/20",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Mô tả ý tưởng",
    desc: "Chat với AI bằng tiếng Việt tự nhiên. Mô tả sản phẩm, đối tượng và mục tiêu marketing của bạn.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
    ),
  },
  {
    num: "02",
    title: "AI Agents xử lý",
    desc: "Đội ngũ AI Agents chuyên biệt nghiên cứu, viết nội dung, kiểm duyệt và tối ưu tự động.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.27 1.27L3 12l5.8 1.9a2 2 0 0 1 1.27 1.27L12 21l1.9-5.8a2 2 0 0 1 1.27-1.27L21 12l-5.8-1.9a2 2 0 0 1-1.27-1.27L12 3Z"/></svg>
    ),
  },
  {
    num: "03",
    title: "Nhận nội dung",
    desc: "Nội dung chuyên nghiệp hiển thị ngay trong chat. Copy, tải về hoặc chỉnh sửa theo ý bạn.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
    ),
  },
];

const PLANS_PREVIEW = [
  { id: "free", name: "Free", price: "Miễn phí", highlight: "3 lượt/ngày", color: "border-zinc-500/30" },
  { id: "lite", name: "Lite", price: "99.000đ", highlight: "15 lượt/ngày", color: "border-sky-500/30" },
  { id: "pro", name: "Pro", price: "219.000đ", highlight: "50 lượt/ngày", color: "border-yellow-500/40", popular: true },
  { id: "max", name: "Max", price: "469.000đ", highlight: "Không giới hạn", color: "border-violet-500/30" },
];

const STATS = [
  { value: "30s", label: "Thời gian tạo" },
  { value: "6+", label: "Loại nội dung" },
  { value: "5", label: "AI Agents" },
  { value: "100%", label: "Tiếng Việt" },
];

function AnimatedSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const token = useAuthStore((s) => s.token);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useAuthStore.persist.hasHydrated());
    return () => { if (unsub) unsub(); };
  }, []);

  const ctaClick = () => {
    if (hydrated && token) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ========== NAVBAR ========== */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5 text-[17px] font-bold tracking-tight">
            <img src="/logo.png" alt="Vitba.ai" className="h-6 w-6 object-contain" />
            Vitba.ai
          </div>
          <div className="hidden md:flex items-center gap-8 text-[14px] text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Tính năng</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">Cách hoạt động</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Bảng giá</a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {hydrated && token ? (
              <button onClick={() => router.push("/dashboard")} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(255,213,74,0.3)]">
                Dashboard
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => router.push("/login")} className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
                  Đăng nhập
                </button>
                <button onClick={() => router.push("/login")} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(255,213,74,0.3)]">
                  Dùng thử miễn phí
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 flex flex-col items-center text-center px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/8 rounded-full blur-[150px]" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-sky-500/5 rounded-full blur-[100px]" />
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-[13px] font-medium text-primary mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            AI-Powered Marketing Platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[64px] font-bold tracking-tight leading-[1.1] mb-6">
            Tạo nội dung marketing
            <br />
            <span className="bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent">chuyên nghiệp trong 30 giây</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            5 AI Agents chuyên biệt cùng làm việc — nghiên cứu, viết, kiểm duyệt và tối ưu nội dung marketing tiếng Việt cho doanh nghiệp của bạn.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button onClick={ctaClick} className="rounded-full bg-primary px-8 py-3.5 text-[16px] font-bold text-primary-foreground hover:opacity-90 transition-all shadow-[0_0_30px_rgba(255,213,74,0.4)] hover:shadow-[0_0_40px_rgba(255,213,74,0.5)] hover:scale-105 active:scale-95">
              Bắt đầu miễn phí
            </button>
            <a href="#how-it-works" className="flex items-center gap-2 rounded-full border border-border px-6 py-3.5 text-[15px] font-medium text-foreground hover:bg-accent transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              Xem cách hoạt động
            </a>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 max-w-3xl w-full">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-primary mb-1">{s.value}</div>
              <div className="text-[13px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ========== FEATURES ========== */}
      <section id="features" className="py-20 sm:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              6 loại nội dung, <span className="text-primary">1 nền tảng AI</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Từ bài Facebook đến kế hoạch marketing chiến lược — AI Agents xử lý tất cả bằng tiếng Việt.
            </p>
          </AnimatedSection>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <AnimatedSection key={f.title}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className={cn(
                    "rounded-[20px] border p-6 bg-gradient-to-br transition-shadow hover:shadow-xl",
                    f.color, f.border
                  )}
                >
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="text-[17px] font-bold text-foreground mb-2">{f.title}</h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">{f.desc}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how-it-works" className="py-20 sm:py-28 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Đơn giản <span className="text-primary">3 bước</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Không cần kinh nghiệm marketing. Chỉ cần mô tả — AI lo phần còn lại.
            </p>
          </AnimatedSection>

          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <AnimatedSection key={step.num}>
                <div className="relative flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-5 shadow-[0_0_20px_rgba(255,213,74,0.15)]">
                    {step.icon}
                  </div>
                  <div className="text-[11px] font-bold text-primary/60 tracking-widest uppercase mb-2">Bước {step.num}</div>
                  <h3 className="text-[18px] font-bold text-foreground mb-3">{step.title}</h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed max-w-xs">{step.desc}</p>

                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[calc(50%+50px)] w-[calc(100%-60px)] border-t-2 border-dashed border-primary/20" />
                  )}
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ========== AI AGENTS ========== */}
      <section className="py-20 sm:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Đội ngũ <span className="text-primary">AI Agents</span> chuyên biệt
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Không phải 1 chatbot đơn lẻ — mà là một pipeline hoàn chỉnh với nhiều agents phối hợp.
            </p>
          </AnimatedSection>

          <AnimatedSection>
            <div className="relative rounded-[24px] border border-border bg-card/80 p-8 sm:p-10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
              <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { name: "Planner", role: "Lên kế hoạch", icon: "\u{1F9E0}" },
                  { name: "Researcher", role: "Nghiên cứu thị trường", icon: "\u{1F50D}" },
                  { name: "Copywriter", role: "Viết nội dung", icon: "✍️" },
                  { name: "Reviewer", role: "Kiểm duyệt & chấm điểm", icon: "✅" },
                  { name: "Formatter", role: "Tối ưu định dạng", icon: "✨" },
                ].map((agent) => (
                  <motion.div
                    key={agent.name}
                    whileHover={{ scale: 1.05 }}
                    className="flex flex-col items-center text-center p-4 rounded-[16px] bg-background/60 border border-border/50 hover:border-primary/30 transition-all"
                  >
                    <div className="text-3xl mb-3">{agent.icon}</div>
                    <div className="text-[14px] font-bold text-foreground">{agent.name}</div>
                    <div className="text-[12px] text-muted-foreground mt-1">{agent.role}</div>
                  </motion.div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 mt-8 text-[13px] text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Pipeline tự động: Planner &rarr; Researcher &rarr; Copywriter &rarr; Reviewer &rarr; Formatter
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ========== PRICING PREVIEW ========== */}
      <section id="pricing" className="py-20 sm:py-28 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Bảng giá <span className="text-primary">đơn giản, minh bạch</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Bắt đầu miễn phí. Nâng cấp khi bạn cần thêm sức mạnh.
            </p>
          </AnimatedSection>

          <AnimatedSection>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-10">
              {PLANS_PREVIEW.map((plan) => (
                <motion.div
                  key={plan.id}
                  whileHover={{ y: -4 }}
                  className={cn(
                    "relative rounded-[20px] border p-6 bg-card/80 transition-all hover:shadow-xl",
                    plan.color,
                    plan.popular && "ring-2 ring-primary/40 shadow-lg scale-[1.02]"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-3 py-0.5 text-[11px] font-bold text-amber-950 shadow">
                      Phổ biến nhất
                    </div>
                  )}
                  <div className="text-[20px] font-bold text-foreground mb-1">{plan.name}</div>
                  <div className="text-2xl font-bold text-primary mb-1">{plan.price}</div>
                  <div className="text-[13px] text-muted-foreground mb-4">{plan.highlight}</div>
                  <button
                    onClick={() => router.push("/pricing")}
                    className={cn(
                      "w-full rounded-[12px] py-2.5 text-sm font-semibold transition-all",
                      plan.popular
                        ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-950 hover:from-yellow-300 hover:to-amber-400 shadow-lg"
                        : "border border-border text-foreground hover:bg-accent"
                    )}
                  >
                    Xem chi tiết
                  </button>
                </motion.div>
              ))}
            </div>
            <div className="text-center">
              <button onClick={() => router.push("/pricing")} className="text-primary text-[14px] font-medium hover:underline">
                So sánh chi tiết tất cả các gói &rarr;
              </button>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ========== USE CASES ========== */}
      <section className="py-20 sm:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Dành cho <span className="text-primary">ai?</span>
            </h2>
          </AnimatedSection>

          <AnimatedSection>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: "Freelancer", desc: "Tạo content cho nhiều khách hàng nhanh hơn", icon: "\u{1F4BB}" },
                { title: "Startup", desc: "Marketing chuyên nghiệp mà không cần thuê agency", icon: "\u{1F680}" },
                { title: "SME", desc: "Tiết kiệm 80% thời gian và chi phí marketing", icon: "\u{1F3E2}" },
                { title: "Agency", desc: "Scale content output lên 10x cho khách hàng", icon: "\u{1F310}" },
              ].map((uc) => (
                <motion.div key={uc.title} whileHover={{ y: -3 }} className="rounded-[20px] border border-border bg-card/60 p-6 text-center hover:border-primary/30 transition-all">
                  <div className="text-3xl mb-3">{uc.icon}</div>
                  <div className="text-[16px] font-bold text-foreground mb-2">{uc.title}</div>
                  <div className="text-[13px] text-muted-foreground">{uc.desc}</div>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="py-20 sm:py-28 px-6">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto text-center relative">
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-primary/10 to-primary/5 blur-3xl pointer-events-none" />
            <div className="relative rounded-[32px] border border-primary/20 bg-card/80 backdrop-blur-xl p-10 sm:p-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Sẵn sàng tạo nội dung<br /><span className="text-primary">nhanh hơn 360x?</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
                Đăng ký miễn phí. Không cần thẻ tín dụng. Bắt đầu tạo content ngay hôm nay.
              </p>
              <button onClick={ctaClick} className="rounded-full bg-primary px-10 py-4 text-[17px] font-bold text-primary-foreground hover:opacity-90 transition-all shadow-[0_0_40px_rgba(255,213,74,0.4)] hover:shadow-[0_0_50px_rgba(255,213,74,0.5)] hover:scale-105 active:scale-95">
                Dùng thử miễn phí ngay
              </button>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[15px] font-bold">
            <img src="/logo.png" alt="Vitba.ai" className="h-5 w-5 object-contain" />
            Vitba.ai
          </div>
          <div className="flex items-center gap-6 text-[13px] text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Tính năng</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Bảng giá</a>
            <button onClick={() => router.push("/login")} className="hover:text-foreground transition-colors">Đăng nhập</button>
          </div>
          <div className="text-[12px] text-muted-foreground/60">
            &copy; 2025 Vitba.ai. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none -z-10" />
    </div>
  );
}
