"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";

const GOLD = "#FFD54A";

const FEATURES = [
  {
    title: "Facebook Post",
    desc: "Tạo bài viết viral với hook mạnh, body hấp dẫn, CTA rõ ràng và hashtag tối ưu engagement. AI phân tích xu hướng để đề xuất format phù hợp nhất.",
    details: ["Hook thu hút 3 giây đầu", "Body storytelling", "CTA chuyển đổi", "30+ hashtag trending"],
  },
  {
    title: "SEO Blog",
    desc: "Bài blog chuẩn SEO 1500-3000 từ với meta description, FAQ schema markup, heading hierarchy và từ khóa LSI. Tối ưu cho cả Google và người đọc.",
    details: ["Chuẩn E-E-A-T", "FAQ Schema", "Internal linking", "Meta tags tối ưu"],
  },
  {
    title: "Email Marketing",
    desc: "Email sequence chuyển đổi cao với subject line A/B testing, preheader text, body copy thuyết phục và CTA button placement tối ưu.",
    details: ["Subject A/B test", "Preheader text", "Responsive layout", "Unsubscribe compliant"],
  },
  {
    title: "Landing Page",
    desc: "Trang đích tối ưu chuyển đổi với headline công thức AIDA, benefits section, testimonials, FAQ và multi-step CTA. Code HTML/CSS sẵn sàng deploy.",
    details: ["Công thức AIDA", "Social proof", "Trust signals", "Mobile-first"],
  },
  {
    title: "TikTok Script",
    desc: "Kịch bản video ngắn 15-60s với hook 3 giây đầu, script chi tiết từng cảnh, voiceover text, caption và CTA viral. Tối ưu cho thuật toán FYP.",
    details: ["Hook 3 giây", "Scene-by-scene", "Trending audio", "CTA + caption"],
  },
  {
    title: "Marketing Plan",
    desc: "Kế hoạch marketing chiến lược đầy đủ với phân tích SWOT, persona khách hàng, channel strategy, content calendar và KPI tracking.",
    details: ["SWOT Analysis", "Buyer Persona", "Channel Mix", "KPI Dashboard"],
  },
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
    desc: "Chat với Vitba Agents bằng tiếng Việt tự nhiên. Mô tả sản phẩm, đối tượng mục tiêu, tone of voice và mục tiêu marketing. Vitba Agents sẽ hỏi thêm các câu hỏi để hiểu rõ nhu cầu.",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>,
  },
  {
    num: "02", title: "Vitba Agents xử lý",
    desc: "Pipeline 5 Vitba Agents tự động kích hoạt: Planner lên chiến lược, Researcher phân tích thị trường, Copywriter viết nội dung, Reviewer chấm điểm, Formatter tối ưu định dạng.",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.27 1.27L3 12l5.8 1.9a2 2 0 0 1 1.27 1.27L12 21l1.9-5.8a2 2 0 0 1 1.27-1.27L21 12l-5.8-1.9a2 2 0 0 1-1.27-1.27L12 3Z"/></svg>,
  },
  {
    num: "03", title: "Nhận nội dung hoàn chỉnh",
    desc: "Nội dung chuyên nghiệp hiển thị ngay trong chat kèm điểm chất lượng AI Score. Copy 1 click, tải file, hoặc yêu cầu AI chỉnh sửa cho đến khi hoàn hảo.",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
  },
];

const AGENTS = [
  { name: "Planner", role: "Lên chiến lược & kế hoạch", desc: "Phân tích brief, xác định mục tiêu, đề xuất approach tối ưu", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
  { name: "Researcher", role: "Nghiên cứu thị trường & đối thủ", desc: "Phân tích trend, keyword, audience insight", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg> },
  { name: "Copywriter", role: "Viết nội dung chuyên nghiệp", desc: "Sáng tạo copy theo tone & style phù hợp", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg> },
  { name: "Reviewer", role: "Kiểm duyệt & chấm điểm", desc: "Đánh giá AI Score, gợi ý cải thiện", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> },
  { name: "Formatter", role: "Tối ưu định dạng & SEO", desc: "Format chuẩn platform, schema markup", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.27 1.27L3 12l5.8 1.9a2 2 0 0 1 1.27 1.27L12 21l1.9-5.8a2 2 0 0 1 1.27-1.27L21 12l-5.8-1.9a2 2 0 0 1-1.27-1.27L12 3Z"/></svg> },
];

const PLANS_PREVIEW = [
  {
    name: "Free", price: "Miễn phí", period: "",
    highlight: "15 lượt/ngày",
    features: ["4 loại nội dung", "Chat AI không giới hạn", "3 dự án · 10 file KB"],
  },
  {
    name: "Lite", price: "99.000đ", period: "/tháng",
    highlight: "50 lượt/ngày",
    features: ["Marketing Hub: Email, SEO, Calendar", "+ Marketing Plan", "Gửi 100 email/ngày"],
  },
  {
    name: "Pro", price: "219.000đ", period: "/tháng",
    highlight: "200 lượt/ngày", popular: true,
    features: ["Marketing Hub đầy đủ (5 công cụ)", "Landing Page AI · Analytics", "Gửi 500 email/ngày"],
  },
  {
    name: "Max", price: "469.000đ", period: "/tháng",
    highlight: "Không giới hạn",
    features: ["Mọi thứ không giới hạn", "Hub & email không giới hạn", "Hỗ trợ riêng (dedicated)"],
  },
];

const HUB_TOOLS = [
  {
    title: "Email Marketing",
    desc: "Soạn template, quản lý danh sách liên hệ, gửi hàng loạt và lên lịch chiến dịch email tự động. Theo dõi tỷ lệ mở, click theo thời gian thực.",
    tags: ["Template", "Danh bạ & List", "Gửi theo lịch"],
  },
  {
    title: "SEO Tools",
    desc: "Phân tích on-page SEO cho URL bất kỳ: chấm điểm 0-100, phát hiện lỗi title/meta/heading/alt, gợi ý cải thiện và phân tích mật độ từ khóa.",
    tags: ["Điểm SEO 0-100", "Audit on-page", "Mật độ từ khóa"],
  },
  {
    title: "Content Calendar",
    desc: "Lên kế hoạch nội dung theo Kanban và lịch tháng. Quản lý quy trình duyệt Nháp → Review → Duyệt → Xuất bản cho cả team.",
    tags: ["Kanban", "Lịch tháng", "Quy trình duyệt"],
  },
  {
    title: "Analytics",
    desc: "Bảng điều khiển tổng hợp toàn bộ hoạt động marketing: email, nội dung, SEO trên cùng một nơi với biểu đồ xu hướng và dòng hoạt động.",
    tags: ["KPI tổng hợp", "Biểu đồ xu hướng", "Hoạt động gần đây"],
  },
  {
    title: "Landing Page Builder",
    desc: "Tạo trang đích bằng AI từ mô tả ngắn, chỉnh sửa trực tiếp, publish và phục vụ ngay tại vitba.ai/p/{slug} — không cần deploy.",
    tags: ["AI tạo trang", "Editor trực tiếp", "Publish 1-click"],
  },
];

const HUB_TOOL_ICONS = [
  <svg key="h-email" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
  <svg key="h-seo" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  <svg key="h-cal" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>,
  <svg key="h-an" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
  <svg key="h-lp" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>,
];

const STATS = [
  { value: "30s", label: "Thời gian tạo nội dung" },
  { value: "6+", label: "Loại nội dung marketing" },
  { value: "5", label: "Vitba Agents chuyên biệt" },
  { value: "100%", label: "Hỗ trợ tiếng Việt" },
];

const TESTIMONIALS = [
  { name: "Minh Anh", role: "Marketing Manager", text: "Vitba.ai giúp team tôi tiết kiệm 80% thời gian viết content. Chất lượng bài SEO blog tốt hơn cả agency." },
  { name: "Hùng Nguyễn", role: "Founder Startup", text: "Từ khi dùng Vitba.ai, tôi không cần thuê copywriter nữa. Landing page convert rate tăng 3x." },
  { name: "Thu Hà", role: "Freelance Marketer", text: "Pipeline 5 Vitba Agents thực sự ấn tượng. Nội dung được review và tối ưu tự động, chuyên nghiệp hơn nhiều." },
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

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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
            <button onClick={() => scrollTo("features")} className="hover:text-[#FFD54A] transition-colors cursor-pointer">Tính năng</button>
            <button onClick={() => scrollTo("hub")} className="hover:text-[#FFD54A] transition-colors cursor-pointer">Marketing Hub</button>
            <button onClick={() => scrollTo("how-it-works")} className="hover:text-[#FFD54A] transition-colors cursor-pointer">Cách hoạt động</button>
            <button onClick={() => scrollTo("agents")} className="hover:text-[#FFD54A] transition-colors cursor-pointer">Vitba Agents</button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-[#FFD54A] transition-colors cursor-pointer">Bảng giá</button>
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
            5 Vitba Agents chuyên biệt cùng làm việc — nghiên cứu thị trường, viết nội dung, kiểm duyệt chất lượng và tối ưu SEO. Tất cả bằng tiếng Việt, chỉ trong 30 giây.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button onClick={ctaClick} className="rounded-full bg-[#FFD54A] px-8 py-3.5 text-[16px] font-bold text-[#0a0a0a] hover:bg-[#ffe07a] transition-all shadow-[0_0_30px_rgba(255,213,74,0.4)] hover:shadow-[0_0_40px_rgba(255,213,74,0.5)] hover:scale-105 active:scale-95">
              Bắt đầu miễn phí — Không cần thẻ
            </button>
            <button onClick={() => scrollTo("how-it-works")} className="flex items-center gap-2 rounded-full border border-white/20 px-6 py-3.5 text-[15px] font-medium text-white hover:bg-white/10 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD54A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              Xem cách hoạt động
            </button>
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
      <section id="features" className="py-20 sm:py-28 px-6 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD54A]/20 bg-[#FFD54A]/5 px-4 py-1.5 text-[12px] font-bold text-[#FFD54A]/70 tracking-widest uppercase mb-4">
              Tính năng
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white">
              6 loại nội dung, <span className="text-[#FFD54A]">1 nền tảng AI</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              Từ bài Facebook viral đến kế hoạch marketing chiến lược — Vitba Agents tạo nội dung chuyên nghiệp bằng tiếng Việt cho mọi kênh.
            </p>
          </AnimatedSection>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <AnimatedSection key={f.title}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="rounded-[24px] border border-[#FFD54A]/10 bg-[#FFD54A]/[0.02] p-7 hover:border-[#FFD54A]/25 hover:bg-[#FFD54A]/[0.05] transition-all duration-300 hover:shadow-[0_8px_32px_-12px_rgba(255,213,74,0.12)] h-full flex flex-col"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#FFD54A]/8 border border-[#FFD54A]/15 flex items-center justify-center mb-4">
                    {FEATURE_ICONS[i]}
                  </div>
                  <h3 className="text-[17px] font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-[14px] text-white/50 leading-relaxed mb-4 flex-1">{f.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {f.details.map((d) => (
                      <span key={d} className="text-[11px] font-medium text-[#FFD54A]/70 bg-[#FFD54A]/10 rounded-full px-2.5 py-1 border border-[#FFD54A]/15">
                        {d}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ========== MARKETING HUB ========== */}
      <section id="hub" className="py-20 sm:py-28 px-6 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD54A]/20 bg-[#FFD54A]/5 px-4 py-1.5 text-[12px] font-bold text-[#FFD54A]/70 tracking-widest uppercase mb-4">
              Marketing Hub
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white">
              Không chỉ tạo nội dung — <span className="text-[#FFD54A]">vận hành cả marketing</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              5 công cụ chuyên nghiệp trong một nơi: gửi email, tối ưu SEO, lên lịch nội dung, đo lường hiệu quả và dựng landing page bằng AI.
            </p>
          </AnimatedSection>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {HUB_TOOLS.map((t, i) => (
              <AnimatedSection key={t.title}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="rounded-[24px] border border-[#FFD54A]/10 bg-[#FFD54A]/[0.02] p-7 hover:border-[#FFD54A]/25 hover:bg-[#FFD54A]/[0.05] transition-all duration-300 hover:shadow-[0_8px_32px_-12px_rgba(255,213,74,0.12)] h-full flex flex-col"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#FFD54A]/8 border border-[#FFD54A]/15 flex items-center justify-center mb-4">
                    {HUB_TOOL_ICONS[i]}
                  </div>
                  <h3 className="text-[17px] font-bold text-white mb-2">{t.title}</h3>
                  <p className="text-[14px] text-white/50 leading-relaxed mb-4 flex-1">{t.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {t.tags.map((d) => (
                      <span key={d} className="text-[11px] font-medium text-[#FFD54A]/70 bg-[#FFD54A]/10 rounded-full px-2.5 py-1 border border-[#FFD54A]/15">
                        {d}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </AnimatedSection>
            ))}
            <AnimatedSection>
              <div className="rounded-[24px] border border-[#FFD54A]/15 bg-gradient-to-br from-[#FFD54A]/[0.06] to-transparent p-7 h-full flex flex-col justify-center text-center">
                <div className="text-[13px] font-bold text-[#FFD54A]/80 uppercase tracking-wider mb-2">Gói Pro trở lên</div>
                <p className="text-[14px] text-white/60 leading-relaxed mb-5">
                  Mở khóa đầy đủ Marketing Hub. Gói Lite dùng được Email, SEO &amp; Content Calendar.
                </p>
                <button onClick={ctaClick} className="rounded-full bg-[#FFD54A] px-6 py-2.5 text-sm font-bold text-[#0a0a0a] hover:bg-[#ffe07a] transition-colors mx-auto">
                  Khám phá Hub
                </button>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how-it-works" className="py-20 sm:py-28 px-6 bg-white/[0.02] scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD54A]/20 bg-[#FFD54A]/5 px-4 py-1.5 text-[12px] font-bold text-[#FFD54A]/70 tracking-widest uppercase mb-4">
              Quy trình
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white">
              Đơn giản <span className="text-[#FFD54A]">3 bước</span>
            </h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              Không cần kinh nghiệm marketing. Không cần biết viết content. Chỉ cần mô tả ý tưởng — AI lo phần còn lại.
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
                  <p className="text-[14px] text-white/50 leading-relaxed max-w-sm">{step.desc}</p>
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[calc(50%+50px)] w-[calc(100%-60px)] border-t-2 border-dashed border-[#FFD54A]/20" />
                  )}
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ========== VITBA AGENTS ========== */}
      <section id="agents" className="py-20 sm:py-28 px-6 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD54A]/20 bg-[#FFD54A]/5 px-4 py-1.5 text-[12px] font-bold text-[#FFD54A]/70 tracking-widest uppercase mb-4">
              Công nghệ
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white">
              Đội ngũ <span className="text-[#FFD54A]">5 Vitba Agents</span> chuyên biệt
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              Không phải 1 chatbot đơn lẻ — mà là một pipeline hoàn chỉnh với 5 agents phối hợp, mỗi agent đảm nhận một vai trò chuyên môn riêng biệt.
            </p>
          </AnimatedSection>

          <AnimatedSection>
            <div className="relative rounded-[32px] border border-[#FFD54A]/10 bg-[#FFD54A]/[0.02] p-8 sm:p-10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FFD54A]/5 to-transparent pointer-events-none" />
              <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                {AGENTS.map((agent) => (
                  <motion.div
                    key={agent.name}
                    whileHover={{ scale: 1.05 }}
                    className="flex flex-col items-center text-center p-5 rounded-[20px] bg-[#0a0a0a]/60 border border-white/8 hover:border-[#FFD54A]/25 transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#FFD54A]/10 flex items-center justify-center mb-3">
                      {agent.icon}
                    </div>
                    <div className="text-[14px] font-bold text-white mb-1">{agent.name}</div>
                    <div className="text-[12px] text-[#FFD54A]/60 font-medium mb-2">{agent.role}</div>
                    <div className="text-[11px] text-white/35 leading-relaxed">{agent.desc}</div>
                  </motion.div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 mt-8 text-[13px] text-white/40">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD54A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Pipeline tự động ~30 giây: Planner &rarr; Researcher &rarr; Copywriter &rarr; Reviewer &rarr; Formatter
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section className="py-20 sm:py-28 px-6 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD54A]/20 bg-[#FFD54A]/5 px-4 py-1.5 text-[12px] font-bold text-[#FFD54A]/70 tracking-widest uppercase mb-4">
              Phản hồi
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white">
              Được tin dùng bởi <span className="text-[#FFD54A]">marketer Việt Nam</span>
            </h2>
          </AnimatedSection>

          <AnimatedSection>
            <div className="grid gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className="rounded-[24px] border border-white/8 bg-white/[0.02] p-7 hover:border-[#FFD54A]/20 transition-all duration-300">
                  <div className="flex gap-1 mb-4">
                    {[1,2,3,4,5].map((s) => (
                      <svg key={s} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#FFD54A" stroke="#FFD54A" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    ))}
                  </div>
                  <p className="text-[14px] text-white/60 leading-relaxed mb-4 italic">&ldquo;{t.text}&rdquo;</p>
                  <div>
                    <div className="text-[14px] font-bold text-white">{t.name}</div>
                    <div className="text-[12px] text-white/40">{t.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ========== PRICING ========== */}
      <section id="pricing" className="py-20 sm:py-28 px-6 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD54A]/20 bg-[#FFD54A]/5 px-4 py-1.5 text-[12px] font-bold text-[#FFD54A]/70 tracking-widest uppercase mb-4">
              Bảng giá
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white">
              Bảng giá <span className="text-[#FFD54A]">đơn giản, minh bạch</span>
            </h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              Bắt đầu miễn phí với 15 lượt mỗi ngày và chat AI không giới hạn. Nâng cấp để mở khóa Marketing Hub.
            </p>
          </AnimatedSection>

          <AnimatedSection>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-10">
              {PLANS_PREVIEW.map((plan) => (
                <motion.div
                  key={plan.name}
                  whileHover={{ y: -4 }}
                  className={`relative rounded-[24px] border p-7 transition-all duration-300 flex flex-col ${
                    plan.popular
                      ? "border-[#FFD54A]/30 bg-[#FFD54A]/[0.05] ring-2 ring-[#FFD54A]/20 shadow-[0_8px_32px_-8px_rgba(255,213,74,0.15)] scale-[1.02]"
                      : "border-white/8 bg-white/[0.02] hover:border-[#FFD54A]/20 hover:shadow-[0_4px_24px_-8px_rgba(255,213,74,0.08)]"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#FFD54A] px-3 py-0.5 text-[11px] font-bold text-[#0a0a0a] shadow-[0_0_15px_rgba(255,213,74,0.4)]">
                      Phổ biến nhất
                    </div>
                  )}
                  <div className="text-[15px] font-bold text-white/60 mb-1">{plan.name}</div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-bold text-[#FFD54A]">{plan.price}</span>
                    {plan.period && <span className="text-[13px] text-white/30">{plan.period}</span>}
                  </div>
                  <div className="text-[13px] text-white/40 mb-4 pb-4 border-b border-white/10">{plan.highlight}</div>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[13px] text-white/50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFD54A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0"><path d="M20 6 9 17l-5-5"/></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => router.push("/pricing")}
                    className={`w-full rounded-[12px] py-2.5 text-sm font-semibold transition-all ${
                      plan.popular
                        ? "bg-[#FFD54A] text-[#0a0a0a] hover:bg-[#ffe07a] shadow-lg shadow-[#FFD54A]/20"
                        : "border border-white/20 text-white hover:bg-white/10"
                    }`}
                  >
                    {plan.price === "Miễn phí" ? "Dùng thử ngay" : "Chọn gói này"}
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
      <section className="py-20 sm:py-28 px-6 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD54A]/20 bg-[#FFD54A]/5 px-4 py-1.5 text-[12px] font-bold text-[#FFD54A]/70 tracking-widest uppercase mb-4">
              Đối tượng
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white">
              Dành cho <span className="text-[#FFD54A]">ai?</span>
            </h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              Vitba.ai phù hợp với mọi quy mô — từ freelancer cá nhân đến agency hàng trăm khách hàng.
            </p>
          </AnimatedSection>

          <AnimatedSection>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: "Freelancer", desc: "Tạo content cho nhiều khách hàng nhanh hơn 10x. Tiết kiệm thời gian, tăng số lượng dự án.", icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFD54A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg> },
                { title: "Startup", desc: "Marketing chuyên nghiệp ngay từ ngày đầu mà không cần thuê agency hay team đắt đỏ.", icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFD54A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg> },
                { title: "Doanh nghiệp SME", desc: "Tiết kiệm 80% thời gian và chi phí marketing. Content nhất quán trên mọi kênh.", icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFD54A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/></svg> },
                { title: "Marketing Agency", desc: "Scale content output lên 10x cho tất cả khách hàng. Giảm chi phí, tăng margin.", icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFD54A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg> },
              ].map((uc) => (
                <motion.div key={uc.title} whileHover={{ y: -3 }} className="rounded-[24px] border border-white/8 bg-white/[0.02] p-7 text-center hover:border-[#FFD54A]/25 hover:bg-[#FFD54A]/[0.03] transition-all duration-300">
                  <div className="w-14 h-14 rounded-full bg-[#FFD54A]/10 flex items-center justify-center mx-auto mb-4">
                    {uc.icon}
                  </div>
                  <div className="text-[16px] font-bold text-white mb-2">{uc.title}</div>
                  <div className="text-[13px] text-white/50 leading-relaxed">{uc.desc}</div>
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
            <div className="absolute inset-0 rounded-[40px] bg-[#FFD54A]/8 blur-3xl pointer-events-none" />
            <div className="relative rounded-[40px] border border-[#FFD54A]/15 bg-[#0a0a0a]/80 backdrop-blur-xl p-12 sm:p-20">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white">
                Sẵn sàng tạo nội dung<br /><span className="text-[#FFD54A]">nhanh hơn 360x?</span>
              </h2>
              <p className="text-white/50 text-lg mb-8 max-w-lg mx-auto">
                Đăng ký miễn phí ngay hôm nay. Không cần thẻ tín dụng. 15 lượt tạo content mỗi ngày — đủ để bạn trải nghiệm sức mạnh AI.
              </p>
              <button onClick={ctaClick} className="rounded-full bg-[#FFD54A] px-10 py-4 text-[17px] font-bold text-[#0a0a0a] hover:bg-[#ffe07a] transition-all shadow-[0_0_40px_rgba(255,213,74,0.4)] hover:shadow-[0_0_50px_rgba(255,213,74,0.5)] hover:scale-105 active:scale-95">
                Dùng thử miễn phí ngay
              </button>
              <p className="text-[12px] text-white/30 mt-4">Miễn phí mãi mãi với gói Free. Nâng cấp bất cứ lúc nào.</p>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="border-t border-white/10 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-6 text-[13px] text-white/40">
          </div>
          <div className="text-[14px] text-white/50 font-medium">
            Founded by Vũ Hải Dương
          </div>
          <div className="text-[12px] text-white/30">
            &copy; 2026 Vitba.ai. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,213,74,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,213,74,0.015)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none -z-10" />
    </div>
  );
}
