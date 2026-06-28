"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { useAuthStore } from "@/store/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import {
  Lock,
  LayoutDashboard,
  Mail,
  Calendar,
  Search,
  ChartColumnIncreasing,
  LayoutGrid,
  FlaskConical,
  BookOpen,
  FileText,
  Frame,
  ArrowLeft,
  LogOut,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { FacebookIcon } from "@/components/brand-icons";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type IconComp = LucideIcon | ((props: { size?: number; className?: string }) => JSX.Element);

const NAV = [
  { label: "Tổng quan", href: "/hub", icon: "overview", toolKey: null },
  { label: "Meta Publisher", href: "/hub/meta", icon: "meta", toolKey: "meta" },
  { label: "Content Calendar", href: "/hub/calendar", icon: "calendar", toolKey: "calendar" },
  { label: "Vitba SEO", href: "/hub/seo", icon: "seo", toolKey: "seo" },
  { label: "Analytics", href: "/hub/analytics", icon: "analytics", toolKey: "analytics" },
];

const LAB_NAV = [
  { label: "Vitba Tool", href: "/hub/lab", icon: "lab" },
  { label: "Vitba Mail", href: "/hub/email", icon: "email" },
  { label: "Vitba Landing Page", href: "/hub/landing", icon: "landing" },
  { label: "Vitba Frame", href: "/hub/frame", icon: "frame" },
  { label: "Vitba Study", href: "/hub/study", icon: "study" },
  { label: "Vitba Report", href: "/hub/report", icon: "report" },
];

const PATHNAME_TO_TOOL: Record<string, string> = {
  "/hub/meta": "meta",
  "/hub/email": "email",
  "/hub/calendar": "calendar",
  "/hub/seo": "seo",
  "/hub/analytics": "analytics",
  "/hub/landing": "landing",
};

const ICONS: Record<string, IconComp> = {
  overview: LayoutDashboard,
  meta: FacebookIcon,
  email: Mail,
  calendar: Calendar,
  seo: Search,
  analytics: ChartColumnIncreasing,
  landing: LayoutGrid,
  lab: FlaskConical,
  study: BookOpen,
  report: FileText,
  frame: Frame,
};

function UpgradeGate({ tool }: { tool: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="flex flex-col items-center gap-4 pt-8 pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
            <Lock className="h-6 w-6 text-amber-400" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-lg">Công cụ này chưa có trong gói của bạn.</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Gói Lite: Email, SEO, Content Calendar. Gói Pro: toàn bộ Hub.
            </CardDescription>
          </div>
          <Button
            onClick={() => router.push("/pricing")}
            className="mt-2 bg-amber-500 hover:bg-amber-600 text-white"
          >
            Xem các gói
          </Button>
        </CardHeader>
      </Card>
    </div>
  );
}

export default function HubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [collapsed, setCollapsed] = useState(false);

  const { data: limitsData, isLoading: limitsLoading } = usePlanLimits();
  const allowed: string[] = limitsData?.limits.hub_tools ?? [];

  const currentTool = PATHNAME_TO_TOOL[pathname] ?? null;
  const currentToolLocked =
    currentTool !== null && !limitsLoading && !allowed.includes(currentTool);

  return (
    <AuthGuard>
      <div className="flex h-screen bg-background">
        <aside className={cn(
          "flex shrink-0 flex-col border-r border-border bg-card/50 backdrop-blur-2xl transition-all duration-300",
          collapsed ? "w-[64px]" : "w-[240px]"
        )}>
          <div className={cn(
            "flex items-center border-b border-border transition-all duration-300",
            collapsed ? "justify-center px-2 py-4" : "gap-2.5 px-5 py-4"
          )}>
            <button onClick={() => router.push("/dashboard")} className={cn(
              "flex items-center font-bold text-foreground tracking-tight hover:opacity-80 transition-opacity",
              collapsed ? "justify-center" : "gap-2 text-[15px]"
            )}>
              <img src="/logo.png" alt="Vitba.ai" className="h-6 w-auto object-contain" />
              {!collapsed && (<>Vitba<span className="text-primary">.ai</span></>)}
            </button>
            {!collapsed && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider">Hub</span>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
            {!collapsed && <p className="px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">Marketing</p>}
            {NAV.map((item) => {
              const isLocked =
                item.toolKey !== null &&
                !limitsLoading &&
                !allowed.includes(item.toolKey);

              return (
                <button
                  key={item.href}
                  title={collapsed ? item.label : undefined}
                  onClick={() => {
                    if (isLocked) {
                      router.push("/pricing");
                    } else {
                      router.push(item.href);
                    }
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all",
                    collapsed ? "justify-center px-2" : "",
                    isLocked
                      ? "opacity-50 text-muted-foreground hover:bg-accent hover:opacity-70"
                      : pathname === item.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {(() => { const Icon = ICONS[item.icon]; return <Icon size={16} />; })()}
                  {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                  {!collapsed && isLocked && (
                    <>
                      <Lock size={12} className="shrink-0" />
                      <span className="ml-1 text-[9px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full">
                        Pro
                      </span>
                    </>
                  )}
                </button>
              );
            })}

            {!collapsed && (
              <div className="pt-4 pb-1.5">
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-primary/70">Độc Quyền</p>
              </div>
            )}
            {LAB_NAV.map((item) => (
              <button
                key={item.href}
                title={collapsed ? item.label : undefined}
                onClick={() => router.push(item.href)}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all overflow-hidden",
                  collapsed ? "justify-center px-2" : "",
                  pathname === item.href
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-accent hover:text-primary border border-transparent"
                )}
              >
                {!collapsed && pathname !== item.href && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
                <span className={pathname === item.href ? "text-primary" : "group-hover:text-primary transition-colors"}>
                  {(() => { const Icon = ICONS[item.icon]; return <Icon size={16} />; })()}
                </span>
                {!collapsed && <span className="relative z-10">{item.label}</span>}
                {!collapsed && (
                  <span className="relative z-10 ml-auto flex h-4 items-center rounded-full bg-primary/20 px-1.5 text-[9px] font-bold uppercase text-primary">
                    New
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="border-t border-border p-3 space-y-2">
            <button
              onClick={() => setCollapsed((v) => !v)}
              title={collapsed ? "Mở rộng" : "Thu gọn"}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all",
                collapsed ? "justify-center border border-border" : "border border-border"
              )}
            >
              {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /> Thu gọn</>}
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              title="Về Chat"
              className={cn(
                "flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all",
                collapsed ? "justify-center px-2" : ""
              )}
            >
              <ArrowLeft size={14} />
              {!collapsed && <>Về Chat</>}
            </button>
            <div className={cn(
              "flex items-center",
              collapsed ? "flex-col gap-2" : "justify-between px-1"
            )}>
              <div className={cn(
                "flex items-center min-w-0",
                collapsed ? "flex-col gap-1" : "gap-2"
              )}>
                <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-amber-950 text-[11px] font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                {!collapsed && <span className="truncate text-[12px] font-medium text-foreground">{user?.name}</span>}
              </div>
              <div className={cn(
                "flex items-center",
                collapsed ? "flex-col gap-1" : "gap-0.5"
              )}>
                <ThemeToggle />
                <button onClick={logout} className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors" title="Đăng xuất">
                  <LogOut size={13} />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex flex-1 flex-col min-w-0">
          <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {currentToolLocked ? <UpgradeGate tool={currentTool} /> : children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
