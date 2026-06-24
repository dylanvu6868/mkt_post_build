import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Check, Star, Zap } from "lucide-react";

const PLANS = [
  { name: "Free", price: "Miễn phí", period: "", highlight: "15 lượt/ngày", features: ["4 loại nội dung", "Chat AI không giới hạn", "3 dự án · 10 file KB"] },
  { name: "Lite", price: "99K", period: "/tháng", highlight: "50 lượt/ngày", features: ["Email, SEO, Calendar", "+ Marketing Plan", "100 email/ngày"] },
  { name: "Pro", price: "219K", period: "/tháng", highlight: "200 lượt/ngày", popular: true, features: ["Hub đầy đủ (5 tools)", "Landing Page AI · Analytics", "500 email/ngày"] },
  { name: "Max", price: "469K", period: "/tháng", highlight: "Không giới hạn", features: ["Mọi thứ không giới hạn", "Hub & email unlimited", "Hỗ trợ dedicated"] },
];

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="animate-page-enter mx-auto w-full max-w-7xl px-5 py-16 md:py-24">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <span className="pill-tag mb-4 inline-flex items-center gap-1"><Star className="h-3.5 w-3.5" /> Bảng giá</span>
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">Đơn giản, minh bạch</h1>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">Bắt đầu miễn phí với 15 lượt/ngày và chat AI không giới hạn. Nâng cấp để mở khoá Marketing Hub.</p>
        </div>
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
                <button className={`mt-6 w-full rounded-2xl py-2.5 text-sm font-bold transition ${p.popular ? "bg-primary text-primary-foreground glow-yellow" : "border border-border hover:bg-accent"}`}>
                  {p.price === "Miễn phí" ? "Dùng thử ngay" : "Chọn gói này"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-10 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="font-extrabold">Vitba<span className="text-primary">.ai</span></span>
          </div>
          <div className="text-xs text-muted-foreground">Founded by Vũ Hải Dương · © 2026 Vitba.ai</div>
        </div>
      </footer>
    </div>
  );
}
