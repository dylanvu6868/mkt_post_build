"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

const GOLD = "#FFD54A";

const FEATURES = [
  { title: "Facebook Post", desc: "Bài viết viral với hook, body, CTA và hashtag tối ưu engagement" },
  { title: "SEO Blog", desc: "Bài blog chuẩn SEO với meta description, FAQ schema và từ khóa tối ưu" },
  { title: "Email Marketing", desc: "Email chuyển đổi cao với subject line, body copy và CTA hiệu quả" },
  { title: "Landing Page", desc: "Trang đích tối ưu chuyển đổi với headline, benefits và social proof" },
  { title: "TikTok Script", desc: "Kịch bản video ngắn với hook 3 giây, script và CTA thu hút" },
  { title: "Marketing Plan", desc: "Kế hoạch chiến lược với SWOT, target audience, channel & timeline" },
];

const FEATURE_ICONS = [
  <svg key="fb" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>,
  <svg key="seo" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  <svg key="email" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
  <svg key="lp" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  <svg key="tk" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect width="15" height="14" x="1" y="5" rx="2" ry="2"/></svg>,
  <svg key="mp" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>,
];

const STEPS = [
  {
    num: "01", title: "Mô tả ý tưởng",
    desc: "Chat với AI bằng tiếng Việt tự nhiên. Mô tả sản phẩm, đối tượng và mục tiêu marketing của bạn.",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>,
  },
  {
    num: "02", title: "AI Agents xử lý",
    desc: "Đội ngũ AI Agents chuyên biệt nghiên cứu, viết nội dung, kiểm duyệt và tối ưu tự động.",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.27 1.27L3 12l5.8 1.9a2 2 0 0 1 1.27 1.27L12 21l1.9-5.8a2 2 0 0 1 1.27-1.27L21 12l-5.8-1.9a2 2 0 0 1-1.27-1.27L12 3Z"/></svg>,
  },
  {
    num: "03", title: "Nhận nội dung",
    desc: "Nội dung chuyên nghiệp hiển thị ngay trong chat. Copy, tải về hoặc chỉnh sửa theo ý bạn.",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
  },
];

const AGENTS = [
  { name: "Planner", role: "Lên kế hoạch", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
  { name: "Researcher", role: "Nghiên cứu thị trường", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg> },
  { name: "Copywriter", role: "Viết nội dung", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg> },
  { name: "Reviewer", role: "Kiểm duyệt & chấm điểm", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> },
  { name: "Formatter", role: "Tối ưu định dạng", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.27 1.27L3 12l5.8 1.9a2 2 0 0 1 1.27 1.27L12 21l1.9-5.8a2 2 0 0 1 1.27-1.27L21 12l-5.8-1.9a2 2 0 0 1-1.27-1.27L12 3Z"/></svg> },
];

const PLANS_PREVIEW = [
  { name: "Free", price: "Miễn phí", highlight: "3 lượt/ngày" },
  { name: "Lite", price: "99.000đ", highlight: "15 lượt/ngày" },
  { name: "Pro", price: "219.000đ", highlight: "50 lượt/ngày", popular: true },
  { name: "Max", price: "469.000đ", highlight: "Không giới hạn" },
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
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, ease: "easeOut" }} className={className}>
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

  const ctaClick = () => router.push(hydrated && token ? "/dashboard" : "/login");

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* ========== NAVBAR ========== */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5 text-[17px] font-bold tracking-tight text-white">
            <img src="/logo.png" alt="Vitba.ai" className="h-6 w-6 object-contain" />
            Vitba.ai
          </div>
          <div className="hidden md:flex items-center gap-8 text-[14px] text-white/60">
            <a href="#features" className="hover:text-[#FFD54A] transition-colors">Tính năng</a>
            <a href="#how-it-works" className="hover:text-[#FFD54A] transition-colors">Cách hoạt động</a>
            <a href="#pricing" className="hover:text-[#FFD54A] transition-colors">Bảng giá</a>
          </div>
          <div className="flex items-center gap-2">
            {hydrated && token ? (
              <button onClick={() => router.push("/dashboard")} className="rounded-full bg-[#FFD54A] px-5 py-2 text-sm font-bold text-[#0a0a0a] hover:bg-[#ffe07a] transition-colors shadow-[0_0_20px_rgba(255,213,74,0.3)]">
                Dashboard
              </button>
            ) : (
              <>
                <button onClick={() => router.push("/login")} className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors">
                  Đăng nhập
                </button>
                <button onClick={() => router.push("/login")} className="rounded-full bg-[#FFD54A] px-5 py-2 text-sm font-bold text-[#0a0a0a] hover:bg-[#ffe07a] transition-colors shadow-[0_0_20px_rgba(255,213,74,0.3)]">
                  Dùng thử miễn phí
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 flex flex-col items-center text-center px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[#FFD54A]/8 rounded-full blur-[160px]" />
          <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#FFD54A]/5 rounded-full blur-[120px]" />
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD54A]/30 bg-[#FFD54A]/10 px-4 py-1.5 text-[13px] font-medium text-[#FFD54A] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#FFD54A] animate-pulse" />
            AI-Powered Marketing Platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[64px] font-bold tracking-tight leading-[1.1] mb-6 text-white">
            Tạo nội dung marketing
            <br />
            <span className="bg-gradient-to-r from-[#FFD54A] via-[#ffb700] to-[#FFD54A] bg-clip-text text-transparent">chuyên nghiệp trong 30 giây</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            5 AI Agents chuyên biệt cùng làm việc — nghiên cứu, viết, kiểm duyệt và tối ưu nội dung marketing tiếng Việt cho doanh nghiệp của bạn.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button onClick={ctaClick} className="rounded-full bg-[#FFD54A] px-8 py-3.5 text-[16px] font-bold text-[#0a0a0a] hover:bg-[#ffe07a] transition-all shadow-[0_0_30px_rgba(255,213,74,0.4)] hover:shadow-[0_0_40px_rgba(255,213,74,0.5)] hover:scale-105 active:scale-95">
              Bắt đầu miễn phí
            </button>
            <a href="#how-it-works" className="flex items-center gap-2 rounded-full border border-white/20 px-6 py-3.5 text-[15px] font-medium text-white hover:bg-white/10 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD54A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              Xem cách hoạt động
            </a>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 max-w-3xl w-full">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-[#FFD54A] mb-1">{s.value}</div>
              <div className="text-[13px] text-white/50">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ========== FEATURES ========== */}
      <section id="features" className="py-20 sm:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white">
              6 loại nội dung, <span className="text-[#FFD54A]">1 nền tảng AI</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              Từ bài Facebook đến kế hoạch marketing chiến lược — AI Agents xử lý tất cả bằng tiếng Việt.
            </p>
          </AnimatedSection>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <AnimatedSection key={f.title}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="rounded-[20px] border border-[#FFD54A]/15 bg-[#FFD54A]/[0.03] p-6 hover:border-[#FFD54A]/30 hover:bg-[#FFD54A]/[0.06] transition-all hover:shadow-[0_8px_30px_-12px_rgba(255,213,74,0.15)]"
                >
                  <div className="w-12 h-12 rounded-[14px] bg-[#FFD54A]/10 border border-[#FFD54A]/20 flex items-center justify-center mb-4">
                    {FEATURE_ICONS[i]}
                  </div>
                  <h3 className="text-[17px] font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-[14px] text-white/50 leading-relaxed">{f.desc}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how-it-works" className="py-20 sm:py-28 px-6 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white">
              Đơn giản <span className="text-[#FFD54A]">3 bước</span>
            </h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              Không cần kinh nghiệm marketing. Chỉ cần mô tả — AI lo phần còn lại.
            </p>
          </AnimatedSection>

          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <AnimatedSection key={step.num}>
                <div className="relative flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-[#FFD54A]/10 border border-[#FFD54A]/20 flex items-center justify-center mb-5 shadow-[0_0_25px_rgba(255,213,74,0.15)]">
                    {step.icon}
                  </div>
                  <div className="text-[11px] font-bold text-[#FFD54A]/60 tracking-widest uppercase mb-2">Bước {step.num}</div>
                  <h3 className="text-[18px] font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-[14px] text-white/50 leading-relaxed max-w-xs">{step.desc}</p>
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[calc(50%+50px)] w-[calc(100%-60px)] border-t-2 border-dashed border-[#FFD54A]/20" />
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
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white">
              Đội ngũ <span className="text-[#FFD54A]">AI Agents</span> chuyên biệt
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              Không phải 1 chatbot đơn lẻ — mà là một pipeline hoàn chỉnh với nhiều agents phối hợp.
            </p>
          </AnimatedSection>

          <AnimatedSection>
            <div className="relative rounded-[24px] border border-[#FFD54A]/15 bg-[#FFD54A]/[0.02] p-8 sm:p-10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FFD54A]/5 to-transparent pointer-events-none" />
              <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                {AGENTS.map((agent) => (
                  <motion.div
                    key={agent.name}
                    whileHover={{ scale: 1.05 }}
                    className="flex flex-col items-center text-center p-4 rounded-[16px] bg-[#0a0a0a]/60 border border-white/10 hover:border-[#FFD54A]/30 transition-all"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#FFD54A]/10 flex items-center justify-center mb-3">
                      {agent.icon}
                    </div>
                    <div className="text-[14px] font-bold text-white">{agent.name}</div>
                    <div className="text-[12px] text-white/40 mt-1">{agent.role}</div>
                  </motion.div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 mt-8 text-[13px] text-white/40">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD54A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Pipeline tự động: Planner &rarr; Researcher &rarr; Copywriter &rarr; Reviewer &rarr; Formatter
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ========== PRICING ========== */}
      <section id="pricing" className="py-20 sm:py-28 px-6 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white">
              Bảng giá <span className="text-[#FFD54A]">đơn giản, minh bạch</span>
            </h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              Bắt đầu miễn phí. Nâng cấp khi bạn cần thêm sức mạnh.
            </p>
          </AnimatedSection>

          <AnimatedSection>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-10">
              {PLANS_PREVIEW.map((plan) => (
                <motion.div
                  key={plan.name}
                  whileHover={{ y: -4 }}
                  className={`relative rounded-[20px] border p-6 transition-all hover:shadow-xl ${
                    plan.popular
                      ? "border-[#FFD54A]/40 bg-[#FFD54A]/[0.06] ring-2 ring-[#FFD54A]/30 shadow-lg scale-[1.02]"
                      : "border-white/10 bg-white/[0.02] hover:border-[#FFD54A]/20"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#FFD54A] px-3 py-0.5 text-[11px] font-bold text-[#0a0a0a] shadow-[0_0_15px_rgba(255,213,74,0.4)]">
                      Phổ biến nhất
                    </div>
                  )}
                  <div className="text-[20px] font-bold text-white mb-1">{plan.name}</div>
                  <div className="text-2xl font-bold text-[#FFD54A] mb-1">{plan.price}</div>
                  <div className="text-[13px] text-white/40 mb-4">{plan.highlight}</div>
                  <button
                    onClick={() => router.push("/pricing")}
                    className={`w-full rounded-[12px] py-2.5 text-sm font-semibold transition-all ${
                      plan.popular
                        ? "bg-[#FFD54A] text-[#0a0a0a] hover:bg-[#ffe07a] shadow-lg shadow-[#FFD54A]/20"
                        : "border border-white/20 text-white hover:bg-white/10"
                    }`}
                  >
                    Xem chi tiết
                  </button>
                </motion.div>
              ))}
            </div>
            <div className="text-center">
              <button onClick={() => router.push("/pricing")} className="text-[#FFD54A] text-[14px] font-medium hover:underline">
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
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white">
              Dành cho <span className="text-[#FFD54A]">ai?</span>
            </h2>
          </AnimatedSection>

          <AnimatedSection>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: "Freelancer", desc: "Tạo content cho nhiều khách hàng nhanh hơn", icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFD54A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg> },
                { title: "Startup", desc: "Marketing chuyên nghiệp mà không cần thuê agency", icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFD54A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg> },
                { title: "SME", desc: "Tiết kiệm 80% thời gian và chi phí marketing", icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFD54A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/></svg> },
                { title: "Agency", desc: "Scale content output lên 10x cho khách hàng", icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFD54A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg> },
              ].map((uc) => (
                <motion.div key={uc.title} whileHover={{ y: -3 }} className="rounded-[20px] border border-white/10 bg-white/[0.02] p-6 text-center hover:border-[#FFD54A]/30 hover:bg-[#FFD54A]/[0.03] transition-all">
                  <div className="w-12 h-12 rounded-full bg-[#FFD54A]/10 flex items-center justify-center mx-auto mb-3">
                    {uc.icon}
                  </div>
                  <div className="text-[16px] font-bold text-white mb-2">{uc.title}</div>
                  <div className="text-[13px] text-white/50">{uc.desc}</div>
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
            <div className="absolute inset-0 rounded-[32px] bg-[#FFD54A]/10 blur-3xl pointer-events-none" />
            <div className="relative rounded-[32px] border border-[#FFD54A]/20 bg-[#0a0a0a]/80 backdrop-blur-xl p-10 sm:p-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white">
                Sẵn sàng tạo nội dung<br /><span className="text-[#FFD54A]">nhanh hơn 360x?</span>
              </h2>
              <p className="text-white/50 text-lg mb-8 max-w-lg mx-auto">
                Đăng ký miễn phí. Không cần thẻ tín dụng. Bắt đầu tạo content ngay hôm nay.
              </p>
              <button onClick={ctaClick} className="rounded-full bg-[#FFD54A] px-10 py-4 text-[17px] font-bold text-[#0a0a0a] hover:bg-[#ffe07a] transition-all shadow-[0_0_40px_rgba(255,213,74,0.4)] hover:shadow-[0_0_50px_rgba(255,213,74,0.5)] hover:scale-105 active:scale-95">
                Dùng thử miễn phí ngay
              </button>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="border-t border-white/10 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[15px] font-bold text-white">
          </div>
          <div className="flex items-center gap-6 text-[13px] text-white/40">
            <a href="#features" className="hover:text-[#FFD54A] transition-colors">Fouded by Vu Hai Duong</a>
          </div>
          <div className="text-[12px] text-white/30">
            &copy; 2026 Vitba.ai. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,213,74,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,213,74,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none -z-10" />
    </div>
  );
}
