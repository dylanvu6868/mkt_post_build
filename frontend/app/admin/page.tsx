"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Analytics {
  users: { total: number; today: number; this_week: number; this_month: number };
  content: {
    total: number;
    today: number;
    this_week: number;
    avg_score: number | null;
    type_distribution: Record<string, number>;
  };
  conversations: { total: number; today: number };
  messages: number;
  projects: number;
  jobs: Record<string, number>;
  job_success_rate: number | null;
  top_users: { id: number; name: string; email: string; content_count: number }[];
  user_growth: { date: string; count: number }[];
  content_daily: { date: string; count: number; avg_score: number | null }[];
  activities: { type: string; text: string; time: string | null }[];
}

const TYPE_COLORS: Record<string, string> = {
  facebook_post: "#3b82f6",
  seo_blog: "#22c55e",
  email: "#FACC15",
  landing_page: "#a855f7",
  tiktok_script: "#ef4444",
};

const TYPE_LABELS: Record<string, string> = {
  facebook_post: "Facebook Post",
  seo_blog: "SEO Blog",
  email: "Email",
  landing_page: "Landing Page",
  tiktok_script: "TikTok Script",
};

const ACTIVITY_COLORS: Record<string, string> = {
  register: "bg-green-500",
  content: "bg-blue-500",
  error: "bg-red-500",
  system: "bg-zinc-500",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

function formatDate(iso: unknown): string {
  const d = new Date(String(iso));
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function KPICard({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; color?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", color || "bg-primary/10 text-primary")}>
            {icon}
          </div>
        </div>
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Analytics>("/admin/analytics").then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Tổng quan</h1>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalJobs = Object.values(data.jobs).reduce((a, b) => a + b, 0);
  const typeEntries = Object.entries(data.content.type_distribution);
  const pieData = typeEntries.map(([type, count]) => ({
    name: TYPE_LABELS[type] ?? type,
    value: count,
    color: TYPE_COLORS[type] ?? "#6b7280",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tổng quan</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Dữ liệu thời gian thực từ hệ thống</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Người dùng"
          value={data.users.total}
          sub={`+${data.users.today} hôm nay · +${data.users.this_week} tuần này`}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <KPICard
          label="Nội dung đã tạo"
          value={data.content.total}
          sub={`+${data.content.today} hôm nay · +${data.content.this_week} tuần này`}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>}
          color="bg-blue-500/10 text-blue-500"
        />
        <KPICard
          label="Cuộc trò chuyện"
          value={data.conversations.total}
          sub={`+${data.conversations.today} hôm nay`}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>}
          color="bg-green-500/10 text-green-500"
        />
        <KPICard
          label="Tin nhắn"
          value={data.messages}
          sub={`${data.conversations.total > 0 ? Math.round(data.messages / data.conversations.total) : 0} tin/cuộc trò chuyện`}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/></svg>}
          color="bg-violet-500/10 text-violet-500"
        />
        <KPICard
          label="Dự án"
          value={data.projects}
          sub={`${data.users.total > 0 ? (data.projects / data.users.total).toFixed(1) : 0} dự án/người dùng`}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/></svg>}
          color="bg-amber-500/10 text-amber-500"
        />
        <KPICard
          label="Điểm TB nội dung"
          value={data.content.avg_score !== null ? `${data.content.avg_score}/100` : "—"}
          sub={data.content.avg_score !== null ? (data.content.avg_score >= 80 ? "Chất lượng tốt" : "Cần cải thiện") : "Chưa có dữ liệu"}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>}
          color={data.content.avg_score !== null && data.content.avg_score >= 80 ? "bg-green-500/10 text-green-500" : "bg-zinc-500/10 text-zinc-400"}
        />
        <KPICard
          label="Tổng Jobs"
          value={totalJobs}
          sub={`${data.jobs.done || 0} thành công · ${data.jobs.error || 0} lỗi`}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>}
          color="bg-emerald-500/10 text-emerald-500"
        />
        <KPICard
          label="Tỉ lệ thành công"
          value={data.job_success_rate !== null ? `${data.job_success_rate}%` : "—"}
          sub={totalJobs > 0 ? `Trên ${totalJobs} jobs` : "Chưa có job"}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>}
          color={data.job_success_rate !== null && data.job_success_rate >= 80 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* User Growth */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px]">Người dùng mới (7 ngày)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {data.user_growth.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.user_growth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={formatDate} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }} labelFormatter={formatDate} />
                  <Bar dataKey="count" name="Người dùng mới" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Chưa có dữ liệu đăng ký trong 7 ngày qua</div>
            )}
          </CardContent>
        </Card>

        {/* Content Daily */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px]">Nội dung tạo (7 ngày)</CardTitle>
              <div className="flex gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Số lượng</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Điểm TB</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {data.content_daily.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.content_daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gContent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FACC15" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FACC15" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={formatDate} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }} labelFormatter={formatDate} />
                  <Area type="monotone" dataKey="count" name="Số lượng" stroke="#FACC15" fill="url(#gContent)" strokeWidth={2} />
                  <Area type="monotone" dataKey="avg_score" name="Điểm TB" stroke="#22c55e" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Chưa có nội dung trong 7 ngày qua</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Content Types + Activities */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Content Type Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px]">Phân bố loại nội dung</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">Chưa có nội dung</div>
            )}
          </CardContent>
        </Card>

        {/* Job Status + Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px]">Trạng thái hệ thống</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-green-500/5 border border-green-500/10 p-3 text-center">
                <p className="text-xl font-bold text-green-500">{data.jobs.done || 0}</p>
                <p className="text-[11px] text-muted-foreground">Jobs thành công</p>
              </div>
              <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-3 text-center">
                <p className="text-xl font-bold text-red-500">{data.jobs.error || 0}</p>
                <p className="text-[11px] text-muted-foreground">Jobs lỗi</p>
              </div>
            </div>

            {data.job_success_rate !== null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[12px]">
                  <span className="text-muted-foreground">Tỉ lệ thành công</span>
                  <span className="font-semibold text-foreground">{data.job_success_rate}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", data.job_success_rate >= 80 ? "bg-green-500" : data.job_success_rate >= 50 ? "bg-amber-500" : "bg-red-500")}
                    style={{ width: `${data.job_success_rate}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Tổng quan</p>
              {[
                { label: "Tổng người dùng", value: data.users.total },
                { label: "Tổng dự án", value: data.projects },
                { label: "Tổng nội dung", value: data.content.total },
                { label: "Tổng cuộc trò chuyện", value: data.conversations.total },
                { label: "Tổng tin nhắn", value: data.messages },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-[12px]">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-mono font-semibold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px]">Hoạt động gần đây</CardTitle>
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            {data.activities.length > 0 ? (
              <div className="space-y-3">
                {data.activities.map((activity, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", ACTIVITY_COLORS[activity.type] || "bg-zinc-500")} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] text-foreground leading-snug">{activity.text}</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">{timeAgo(activity.time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">Chưa có hoạt động</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Users */}
      {data.top_users.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px]">Top người dùng</CardTitle>
              <Badge variant="secondary">{data.top_users.length} người</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.top_users.map((u, i) => (
                <div key={u.id} className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">#{i + 1}</span>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{u.name}</p>
                      <p className="text-[11px] text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <span className="font-mono text-[13px] font-semibold text-foreground">{u.content_count} bài</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
