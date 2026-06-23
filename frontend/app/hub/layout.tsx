"use client";

import { usePathname, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { useAuthStore } from "@/store/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Tong quan", href: "/hub", icon: "overview" },
  { label: "Email Marketing", href: "/hub/email", icon: "email" },
  { label: "Content Calendar", href: "/hub/calendar", icon: "calendar" },
  { label: "SEO Tools", href: "/hub/seo", icon: "seo" },
  { label: "Analytics", href: "/hub/analytics", icon: "analytics" },
  { label: "Landing Pages", href: "/hub/landing", icon: "landing" },
];

const LAB_NAV = [
  { label: "Vitba Lab", href: "/hub/lab", icon: "lab" },
];

const ICONS: Record<string, React.ReactNode> = {
  overview: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>,
  email: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
  calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>,
  seo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  analytics: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
  landing: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>,
  lab: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/></svg>,
};

export default function HubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <AuthGuard>
      <div className="flex h-screen bg-background">
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-border bg-card/50 backdrop-blur-2xl">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
            <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-[15px] font-bold text-foreground tracking-tight hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="Logo" className="h-5 w-5 object-contain" />
              Vitba.ai
            </button>
            <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-500 uppercase tracking-wider">Hub</span>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
            <p className="px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">Marketing</p>
            {NAV.map((item) => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-all",
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {ICONS[item.icon]}
                {item.label}
              </button>
            ))}

            <div className="pt-4 pb-1.5">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-purple-500/70">Độc Quyền</p>
            </div>
            {LAB_NAV.map((item) => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-all overflow-hidden",
                  pathname === item.href
                    ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                    : "text-muted-foreground hover:bg-accent hover:text-purple-400 border border-transparent"
                )}
              >
                {pathname !== item.href && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
                <span className={pathname === item.href ? "text-purple-400" : "group-hover:text-purple-400 transition-colors"}>
                  {ICONS[item.icon]}
                </span>
                <span className="relative z-10">{item.label}</span>
                <span className="relative z-10 ml-auto flex h-4 items-center rounded-full bg-purple-500/20 px-1.5 text-[9px] font-bold uppercase text-purple-400">
                  New
                </span>
              </button>
            ))}
          </nav>

          <div className="border-t border-border p-3 space-y-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex w-full items-center gap-2 rounded-[10px] border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
              Về Chat
            </button>
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-amber-950 text-[11px] font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <span className="truncate text-[12px] font-medium text-foreground">{user?.name}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <ThemeToggle />
                <button onClick={logout} className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors" title="Đăng xuất">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex flex-1 flex-col min-w-0">
          <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
