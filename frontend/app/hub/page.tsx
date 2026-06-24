"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMcpStore } from "@/store/mcp";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const TOOLS = [
  {
    key: "email",
    label: "Email Marketing",
    desc: "Gửi email, mẫu, danh bạ, lên lịch",
    href: "/hub/email",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
      </svg>
    ),
    gradient: "from-primary/20 to-primary/10",
    iconBg: "bg-primary/20 text-primary",
  },
  {
    key: "calendar",
    label: "Content Calendar",
    desc: "Lên lịch nội dung, quản lý bài đăng",
    href: "/hub/calendar",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
      </svg>
    ),
    gradient: "from-primary/20 to-primary/10",
    iconBg: "bg-primary/20 text-primary",
  },
  {
    key: "seo",
    label: "SEO Tools",
    desc: "Phân tích SEO, từ khóa, điểm số",
    href: "/hub/seo",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
      </svg>
    ),
    gradient: "from-primary/20 to-primary/10",
    iconBg: "bg-primary/20 text-primary",
  },
  {
    key: "analytics",
    label: "Analytics",
    desc: "Báo cáo, biểu đồ, hoạt động gần đây",
    href: "/hub/analytics",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
      </svg>
    ),
    gradient: "from-primary/20 to-primary/10",
    iconBg: "bg-primary/20 text-primary",
  },
  {
    key: "landing",
    label: "Landing Pages",
    desc: "Tạo trang đích bằng AI, xuất bản",
    href: "/hub/landing",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
      </svg>
    ),
    gradient: "from-primary/20 to-primary/10",
    iconBg: "bg-primary/20 text-primary",
  },
];

export default function HubOverviewPage() {
  const router = useRouter();
  const { analyticsOverview, analyticsOverviewLoading, loadAnalyticsOverview } = useMcpStore();
  const { data: limitsData, isLoading: limitsLoading } = usePlanLimits();
  const allowed: string[] = limitsData?.limits.hub_tools ?? [];

  useEffect(() => { loadAnalyticsOverview(); }, [loadAnalyticsOverview]);

  const analyticsLocked = !limitsLoading && !allowed.includes("analytics");

  const stats = [
    { label: "Email đã gửi", value: analyticsOverview?.emails_sent ?? 0, icon: "📧" },
    { label: "Tỷ lệ mở", value: `${analyticsOverview?.open_rate ?? 0}%`, icon: "📬" },
    { label: "Tỷ lệ nhấp", value: `${analyticsOverview?.click_rate ?? 0}%`, icon: "🖱️" },
    { label: "Nội dung đã đăng", value: analyticsOverview?.content_published ?? 0, icon: "📝" },
    { label: "Điểm SEO TB", value: analyticsOverview?.avg_seo_score ?? 0, icon: "🔍" },
    { label: "Chiến dịch", value: analyticsOverview?.campaigns ?? 0, icon: "🎯" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">Trung tâm Marketing</span>
        </h1>
        <p className="mt-2 text-muted-foreground text-lg">Quản lý toàn bộ hoạt động marketing từ một nơi duy nhất</p>
      </div>

      {analyticsLocked && !analyticsOverviewLoading ? (
        <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/0 border-amber-500/20">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div>
              <p className="text-sm font-medium">Báo cáo tổng quan có ở gói Pro</p>
              <p className="text-xs text-muted-foreground">Nâng cấp để xem đầy đủ phân tích.</p>
            </div>
            <button onClick={() => router.push("/pricing")} className="ml-auto shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition">
              Nâng cấp
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {stats.map((s, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
                </div>
                {analyticsOverviewLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{s.value}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div>
        <h2 className="text-base font-semibold mb-5 tracking-tight">Công cụ Marketing</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {TOOLS.map((tool) => {
            const isLocked = !limitsLoading && !allowed.includes(tool.key);
            return (
              <Card key={tool.key}
                className={`group cursor-pointer hover:shadow-lg transition-all ${isLocked ? "opacity-60" : ""} bg-gradient-to-br ${tool.gradient}`}
                onClick={() => router.push(isLocked ? "/pricing" : tool.href)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tool.iconBg}`}>{tool.icon}</div>
                    {isLocked && <span className="text-[9px] font-bold text-amber-500 bg-amber-500/15 px-2 py-0.5 rounded-full uppercase">Pro</span>}
                  </div>
                  <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">{tool.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tool.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
