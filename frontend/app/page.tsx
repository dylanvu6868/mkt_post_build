"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, ArrowRight, Check, Star,
  FileText, Search, Mail, LayoutTemplate, Video, ClipboardList,
  Users, Rocket, Building2, Briefcase,
  MessageSquare, Cog, CheckCircle2, Calendar, BarChart3, Globe,
} from "lucide-react";
import { ParticleNetwork } from "@/components/particle-network";

const FEATURES = [
  { icon: FileText, title: "Facebook Post", desc: "Bài viết viral với hook 3s, body storytelling, CTA chuyển đổi và hashtag tối ưu.", details: ["Hook 3 giây", "Body storytelling", "CTA chuyển đổi", "30+ hashtag"] },
  { icon: Search, title: "SEO Blog", desc: "Bài blog chuẩn SEO 1500–3000 từ với schema, heading hierarchy và từ khoá LSI.", details: ["Chuẩn E-E-A-T", "FAQ Schema", "Internal linking", "Meta tối ưu"] },
  { icon: Mail, title: "Email Marketing", desc: "Email sequence chuyển đổi cao với A/B subject, preheader và CTA tối ưu.", details: ["Subject A/B", "Preheader", "Responsive", "Compliant"] },
  { icon: LayoutTemplate, title: "Landing Page", desc: "Trang đích AIDA với benefits, testimonials, FAQ và multi-step CTA, HTML sẵn deploy.", details: ["Công thức AIDA", "Social proof", "Trust signals", "Mobile-first"] },
  { icon: Video, title: "TikTok Script", desc: "Kịch bản 15–60s với hook 3s, scene-by-scene, voiceover và CTA viral cho FYP.", details: ["Hook 3 giây", "Scene-by-scene", "Trending audio", "Caption + CTA"] },
  { icon: ClipboardList, title: "Marketing Plan", desc: "Kế hoạch chiến lược với SWOT, persona, channel strategy và KPI tracking.", details: ["SWOT", "Persona", "Channel Mix", "KPI Dashboard"] },
];

const STEPS = [
  { num: "01", title: "Mô tả ý tưởng", desc: "Chat tự nhiên bằng tiếng Việt — mô tả sản phẩm, đối tượng, tone of voice và mục tiêu.", icon: MessageSquare },
  { num: "02", title: "AI xử lý tự động", desc: "Hệ thống AI phân tích, nghiên cứu và tạo nội dung chuyên nghiệp trong 30 giây.", icon: Cog },
  { num: "03", title: "Nhận nội dung hoàn chỉnh", desc: "Nội dung chuyên nghiệp kèm AI Score. Copy 1 click, tải file, hoặc yêu cầu chỉnh sửa.", icon: CheckCircle2 },
];

const HUB_TOOLS = [
  { icon: Mail, title: "Email Marketing", desc: "Soạn template, quản lý liên hệ, gửi hàng loạt và lên lịch tự động.", tags: ["Template", "List", "Lên lịch"] },
  { icon: Search, title: "SEO Tools", desc: "Audit on-page, chấm điểm 0–100, phát hiện lỗi và gợi ý cải thiện.", tags: ["Điểm 0–100", "On-page", "Keyword"] },
  { icon: Calendar, title: "Content Calendar", desc: "Lên kế hoạch nội dung theo Kanban và lịch tháng cho cả team.", tags: ["Kanban", "Lịch tháng", "Duyệt"] },
  { icon: BarChart3, title: "Analytics", desc: "Bảng điều khiển KPI tổng hợp marketing với biểu đồ xu hướng.", tags: ["KPI", "Trend", "Activity"] },
  { icon: Globe, title: "Landing Page Builder", desc: "Tạo trang đích bằng AI, chỉnh sửa trực tiếp và publish 1 click.", tags: ["AI", "Editor", "Publish"] },
];

const PLANS = [
  { name: "Free", price: "Miễn phí", period: "", highlight: "15 lượt/ngày", features: ["4 loại nội dung", "Chat AI không giới hạn", "3 dự án · 10 file KB"] },
  { name: "Lite", price: "99K", period: "/tháng", highlight: "50 lượt/ngày", features: ["Email, SEO, Calendar", "+ Marketing Plan", "100 email/ngày"] },
  { name: "Pro", price: "219K", period: "/tháng", highlight: "200 lượt/ngày", popular: true, features: ["Hub đầy đủ (5 tools)", "Landing Page AI · Analytics", "500 email/ngày"] },
  { name: "Max", price: "469K", period: "/tháng", highlight: "Không giới hạn", features: ["Mọi thứ không giới hạn", "Hub & email unlimited", "Hỗ trợ dedicated"] },
];

const STATS = [
  { v: "30s", l: "Tạo nội dung" },
  { v: "6+", l: "Loại marketing" },
  { v: "99%", l: "Tự động hóa" },
  { v: "100%", l: "Tiếng Việt" },
];

const TESTIMONIALS = [
  { name: "Minh Anh", role: "Marketing Manager", text: "Team tôi tiết kiệm 80% thời gian viết content. Bài SEO blog tốt hơn cả agency." },
  { name: "Hùng Nguyễn", role: "Founder Startup", text: "Không cần thuê copywriter nữa. Landing page convert rate tăng 3x." },
  { name: "Thu Hà", role: "Freelance Marketer", text: "Hệ thống tự động cực kỳ ấn tượng. Content được tối ưu và viết rất chuyên nghiệp." },
];

const USE_CASES = [
  { icon: Users, title: "Freelancer", desc: "Tạo content cho nhiều khách hàng nhanh hơn 10x." },
  { icon: Rocket, title: "Startup", desc: "Marketing chuyên nghiệp ngay từ ngày đầu, không cần agency." },
  { icon: Building2, title: "Doanh nghiệp SME", desc: "Tiết kiệm 80% thời gian và chi phí marketing." },
  { icon: Briefcase, title: "Marketing Agency", desc: "Scale content output 10x cho mọi khách hàng." },
];

function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return <section id={id} className={`relative mx-auto w-full max-w-7xl px-5 py-20 md:py-28 ${className}`}>{children}</section>;
}

function SectionHeader({ tag, title, sub }: { tag: string; title: string; sub?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5 }} className="mx-auto mb-14 max-w-3xl text-center">
      <span className="pill-tag mb-4"><Sparkles className="h-3.5 w-3.5" />{tag}</span>
      <h2 className="text-4xl font-extrabold leading-tight md:text-5xl">{title}</h2>
      {sub && <p className="mt-4 text-base text-muted-foreground md:text-lg">{sub}</p>}
    </motion.div>
  );
}

function PanelBlock({ children, label, className = "", delay = 0 }: { children: React.ReactNode; label?: string; className?: string; delay?: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }} 
      whileInView={{ opacity: 1, y: 0 }} 
      viewport={{ once: true, margin: "-50px" }} 
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5, scale: 1.02 }}
      className={`panel-block p-3 md:p-4 hover:shadow-xl transition-all duration-300 ${className}`}
    >
      <div className="relative flex gap-3">
        <div className="flex-1">{children}</div>
        {label && (
          <div className="hidden md:flex w-10 shrink-0 items-center justify-center rounded-2xl border" style={{ background: "hsl(var(--panel-foreground) / 0.05)", borderColor: "hsl(var(--panel-foreground) / 0.1)" }}>
            <span className="rotate-180 [writing-mode:vertical-rl] text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: "hsl(var(--panel-foreground) / 0.7)" }}>
              {label}
            </span>
          </div>
        )}
      </div>
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

  const ctaClick = useCallback(() => router.push(token ? "/dashboard" : "/login"), [token, router]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Vitba.ai" className="h-6 w-auto object-contain" />
            <span className="text-lg font-extrabold tracking-tight">Vitba<span className="text-primary">.ai</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Tính năng</a>
            <a href="#pricing" className="hover:text-foreground transition">Bảng giá</a>
            <a href="/privacy" className="hover:text-foreground transition">Bảo mật</a>
            <a href="/terms" className="hover:text-foreground transition">Điều khoản</a>
          </nav>
          <div className="flex items-center gap-2">
            {token ? (
              <button onClick={() => router.push("/dashboard")} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground glow-yellow hover:opacity-90 transition">
                Dashboard
              </button>
            ) : (
              <>
                <button onClick={() => router.push("/login")} className="hidden sm:inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent transition">
                  Đăng nhập
                </button>
                <button onClick={() => router.push("/login")} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground glow-yellow hover:opacity-90 transition">
                  Dùng thử <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="animate-page-enter">
        {/* HERO */}
        <Section className="!pt-10 md:!pt-14">
          <div className="absolute inset-0 -z-10 bg-grid opacity-60" />
          <PanelBlock label="VITBA · TỐC ĐỘ · CHẤT LƯỢNG · TIẾNG VIỆT">
            <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
              <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="p-6 md:p-10">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold" style={{ background: "hsl(var(--panel-foreground) / 0.1)", color: "hsl(var(--panel-foreground))" }}>
                  <Sparkles className="h-3.5 w-3.5" /> AI-POWERED MARKETING
                </span>
                <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight md:text-6xl" style={{ color: "hsl(var(--panel-foreground))" }}>
                  Vitba<span className="opacity-70">.ai</span>
                </h1>
                <p className="mt-3 max-w-md text-[15px] font-medium" style={{ color: "hsl(var(--panel-foreground) / 0.8)" }}>
                  Nền tảng AI Marketing chuyên biệt cho người Việt — tạo nội dung chuẩn chuyên gia trong 30 giây.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <button onClick={ctaClick} className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold hover:opacity-90 transition" style={{ background: "hsl(var(--panel-foreground))", color: "hsl(var(--panel))" }}>
                    Bắt đầu miễn phí <ArrowRight className="h-4 w-4" />
                  </button>
                  <a href="#how" className="inline-flex items-center gap-2 rounded-2xl border-2 px-5 py-3 text-sm font-semibold transition" style={{ borderColor: "hsl(var(--panel-foreground) / 0.2)", background: "hsl(var(--panel-foreground) / 0.05)", color: "hsl(var(--panel-foreground))" }}>
                    Xem cách hoạt động
                  </a>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="relative p-3 md:p-4">
                <div className="surface-card overflow-hidden h-full min-h-[340px] relative flex items-center justify-center">
                  <ParticleNetwork />
                </div>
              </motion.div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.l} className="surface-card px-4 py-3 text-center">
                  <div className="text-2xl font-extrabold text-primary md:text-3xl">{s.v}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </PanelBlock>
        </Section>

        {/* FEATURES */}
        <Section id="features">
          <SectionHeader tag="Tính năng" title="6 loại nội dung, 1 nền tảng AI" sub="Từ bài Facebook viral đến kế hoạch marketing chiến lược — Nền tảng tạo nội dung chuyên nghiệp bằng tiếng Việt." />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <PanelBlock key={f.title} label={`0${i + 1}`}>
                  <div className="surface-card p-6 h-full">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground glow-yellow">
                      <Icon className="h-6 w-6" strokeWidth={2.2} />
                    </span>
                    <h3 className="mt-4 text-xl font-bold">{f.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
                    <ul className="mt-4 space-y-1.5">
                      {f.details.map((d) => (
                        <li key={d} className="flex items-center gap-2 text-xs font-medium">
                          <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} /> {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </PanelBlock>
              );
            })}
          </div>
        </Section>

        {/* VITBA LAB */}
        <Section id="hub">
          <SectionHeader tag="Vitba Lab" title="Không chỉ tạo nội dung — vận hành cả marketing" sub="5 công cụ chuyên nghiệp trong một nơi." />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {HUB_TOOLS.map((t) => {
              const Icon = t.icon;
              return (
                <PanelBlock key={t.title}>
                  <div className="surface-card p-6 h-full">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/20 text-foreground">
                        <Icon className="h-5 w-5" />
                      </span>
                      <h3 className="text-lg font-bold">{t.title}</h3>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{t.desc}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {t.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold">{tag}</span>
                      ))}
                    </div>
                  </div>
                </PanelBlock>
              );
            })}
            <PanelBlock>
              <div className="p-6 h-full flex flex-col justify-between" style={{ color: "hsl(var(--panel-foreground))" }}>
                <div>
                  <h3 className="text-xl font-extrabold">Gói Pro trở lên</h3>
                  <p className="mt-2 text-sm font-medium opacity-80">Mở khoá đầy đủ Vitba Lab. Gói Lite dùng được Email, SEO & Content Calendar.</p>
                </div>
                <button onClick={ctaClick} className="mt-5 inline-flex w-fit items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold" style={{ background: "hsl(var(--panel-foreground))", color: "hsl(var(--panel))" }}>
                  Khám phá Hub <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </PanelBlock>
          </div>
        </Section>

        {/* HOW IT WORKS */}
        <Section id="how">
          <SectionHeader tag="Quy trình" title="Đơn giản 3 bước" sub="Không cần kinh nghiệm marketing. Chỉ cần mô tả ý tưởng — AI lo phần còn lại." />
          <div className="grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <PanelBlock key={s.num} label={`BƯỚC ${s.num}`}>
                  <div className="surface-card p-7 h-full">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground glow-yellow">
                      <Icon className="h-7 w-7" strokeWidth={2} />
                    </span>
                    <div className="mt-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Bước {s.num}</div>
                    <h3 className="mt-1 text-xl font-bold">{s.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                  </div>
                </PanelBlock>
              );
            })}
          </div>
        </Section>

        {/* TESTIMONIALS */}
        <Section>
          <SectionHeader tag="Phản hồi" title="Được tin dùng bởi marketer Việt Nam" />
          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <PanelBlock key={t.name}>
                <div className="surface-card p-6">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="h-4 w-4 fill-primary text-primary" />)}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-primary font-extrabold text-primary-foreground">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                </div>
              </PanelBlock>
            ))}
          </div>
        </Section>

        {/* PRICING */}
        <Section id="pricing">
          <SectionHeader tag="Bảng giá" title="Đơn giản, minh bạch" sub="Bắt đầu miễn phí với 15 lượt/ngày. Nâng cấp để mở khoá Vitba Lab." />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => (
              <div key={p.name} className={`relative rounded-3xl p-1 ${p.popular ? "bg-primary" : "bg-transparent"}`}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-primary-foreground">
                    Phổ biến nhất
                  </div>
                )}
                <div className={`rounded-[1.4rem] p-6 h-full ${p.popular ? "bg-card" : "border border-border bg-card"}`}>
                  <h3 className="text-lg font-extrabold">{p.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-black">{p.price}</span>
                    {p.period && <span className="text-sm text-muted-foreground">{p.period}</span>}
                  </div>
                  <div className="mt-1 text-xs font-bold text-primary">{p.highlight}</div>
                  <ul className="mt-5 space-y-2.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={3} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => router.push("/pricing")} className={`mt-6 w-full rounded-2xl py-2.5 text-sm font-bold transition ${p.popular ? "bg-primary text-primary-foreground glow-yellow" : "border border-border hover:bg-accent"}`}>
                    {p.price === "Miễn phí" ? "Dùng thử ngay" : "Chọn gói này"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* USE CASES */}
        <Section>
          <SectionHeader tag="Đối tượng" title="Dành cho ai?" sub="Phù hợp với mọi quy mô — từ freelancer cá nhân đến agency hàng trăm khách hàng." />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map((u) => {
              const Icon = u.icon;
              return (
                <div key={u.title} className="rounded-3xl border border-border bg-card p-6 hover:border-primary/50 transition">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{u.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{u.desc}</p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* FINAL CTA */}
        <Section>
          <PanelBlock label="VITBA · NHANH HƠN 360X">
            <div className="p-8 md:p-14 text-center" style={{ color: "hsl(var(--panel-foreground))" }}>
              <h2 className="mx-auto max-w-3xl text-4xl font-black leading-tight md:text-6xl">
                Sẵn sàng tạo nội dung<br />nhanh hơn 360x?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm font-medium opacity-80 md:text-base">
                Đăng ký miễn phí ngay hôm nay. Không cần thẻ tín dụng. 15 lượt/ngày — đủ để trải nghiệm sức mạnh AI.
              </p>
              <button onClick={ctaClick} className="mt-7 inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-base font-extrabold hover:opacity-90 transition" style={{ background: "hsl(var(--panel-foreground))", color: "hsl(var(--panel))" }}>
                Dùng thử miễn phí <ArrowRight className="h-5 w-5" />
              </button>
              <p className="mt-4 text-xs font-medium opacity-70">Miễn phí mãi mãi với gói Free. Nâng cấp bất cứ lúc nào.</p>
            </div>
          </PanelBlock>
        </Section>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-5 py-12 md:py-16">
          <div className="grid gap-10 md:grid-cols-4">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Vitba.ai" className="h-6 w-auto object-contain" />
                <span className="text-lg font-extrabold tracking-tight">Vitba<span className="text-primary">.ai</span></span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nền tảng AI Marketing chuyên biệt cho người Việt — tạo nội dung chuẩn chuyên gia trong 30 giây.
              </p>
              <div className="text-xs text-muted-foreground">
                Founded by Vũ Hải Dương · &copy; 2026 Vitba.ai
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-bold mb-4">Sản phẩm</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition">Tính năng</a></li>
                <li><a href="#hub" className="hover:text-foreground transition">Vitba Lab</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition">Bảng giá</a></li>
                <li><a href="/pricing" className="hover:text-foreground transition">Gói Pro</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-bold mb-4">Công ty</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition">Về chúng tôi</a></li>
                <li><a href="#" className="hover:text-foreground transition">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition">Tuyển dụng</a></li>
                <li><a href="#" className="hover:text-foreground transition">Liên hệ</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-bold mb-4">Pháp lý</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/terms" className="hover:text-foreground transition">Điều khoản sử dụng</a></li>
                <li><a href="/privacy" className="hover:text-foreground transition">Chính sách bảo mật</a></li>
                <li><a href="/data-deletion" className="hover:text-foreground transition">Xóa dữ liệu</a></li>
                <li><a href="#" className="hover:text-foreground transition">Chính sách Cookie</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-border/60">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
              <div>&copy; 2026 Vitba.ai. All rights reserved.</div>
              <div className="flex items-center gap-4">
                <a href="#" className="hover:text-foreground transition">Twitter</a>
                <a href="#" className="hover:text-foreground transition">LinkedIn</a>
                <a href="#" className="hover:text-foreground transition">Facebook</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
