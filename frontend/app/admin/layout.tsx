"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { api } from "@/services/api";

const NAV_SECTIONS = [
  {
    title: null,
    items: [
      { label: "Tổng quan", href: "/admin", icon: "dashboard" },
    ],
  },
  {
    title: "Quản lý",
    items: [
      { label: "Người dùng", href: "/admin/users", icon: "users" },
      { label: "Nội dung", href: "/admin/content", icon: "content" },
      { label: "Thanh toán", href: "/admin/payments", icon: "payments" },
    ],
  },
  {
    title: "Phân tích",
    items: [
      { label: "Analytics", href: "/admin/analytics", icon: "analytics" },
    ],
  },
  {
    title: "Hệ thống",
    items: [
      { label: "Cài đặt", href: "/admin/settings", icon: "settings" },
    ],
  },
];

const ICONS: Record<string, React.ReactNode> = {
  dashboard: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>,
  users: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  content: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  payments: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>,
  analytics: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
  settings: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [notifications, setNotifications] = useState<{ type: string; text: string; time: string | null }[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<{ activities: { type: string; text: string; time: string | null }[] }>("/admin/analytics")
      .then((d) => setNotifications(d.activities || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function timeAgo(iso: string | null): string {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Vừa xong";
    if (mins < 60) return `${mins}p trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h trước`;
    return `${Math.floor(hours / 24)}d trước`;
  }

  return (
    <AuthGuard>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-border bg-card/50 backdrop-blur-2xl">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
            <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-[15px] font-bold text-foreground tracking-tight hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="Logo" className="h-5 w-5 object-contain" />
              Vitba.ai
            </button>
            <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-500 uppercase tracking-wider">Admin</span>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar">
            {NAV_SECTIONS.map((section, si) => (
              <div key={si}>
                {section.title && (
                  <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">{section.title}</p>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => (
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
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-border p-3 space-y-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex w-full items-center gap-2 rounded-[10px] border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
              Về Dashboard
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top Bar */}
          <header className="flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-6 py-3">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                placeholder="Tìm kiếm..."
                className="w-64 rounded-[10px] border border-border bg-card/50 pl-9 pr-4 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative flex h-9 w-9 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                {notifications.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">{notifications.length}</span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-[14px] border border-border bg-card/95 backdrop-blur-xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <span className="text-[13px] font-semibold text-foreground">Thông báo</span>
                    <span className="text-[11px] text-muted-foreground">{notifications.length} mục</span>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">Không có thông báo</p>
                    ) : (
                      notifications.map((n, i) => (
                        <div key={i} className="flex gap-3 items-start px-4 py-3 border-b border-border/50 last:border-0 hover:bg-accent/50 transition-colors">
                          <div className={cn(
                            "mt-1 h-2 w-2 shrink-0 rounded-full",
                            n.type === "register" ? "bg-green-500" : n.type === "content" ? "bg-blue-500" : n.type === "error" ? "bg-red-500" : "bg-zinc-500"
                          )} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] text-foreground leading-snug">{n.text}</p>
                            <p className="text-[11px] text-muted-foreground/60 mt-0.5">{timeAgo(n.time)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
