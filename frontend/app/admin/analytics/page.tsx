"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Analytics {
  users: { total: number; today: number; this_week: number; this_month: number };
  content: {
    total: number; today: number; this_week: number;
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

function formatDate(iso: unknown): string {
  const d = new Date(String(iso));
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Analytics>("/admin/analytics").then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Phân tích & Báo cáo</h1>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalJobs = Object.values(data.jobs).reduce((a, b) => a + b, 0);
  const pieData = Object.entries(data.content.type_distribution).map(([type, count]) => ({
    name: TYPE_LABELS[type] ?? type,
    value: count,
    color: TYPE_COLORS[type] ?? "#6b7280",
  }));

  const userGrowthTotal = data.user_growth.reduce((a, b) => a + b.count, 0);
  const contentDailyTotal = data.content_daily.reduce((a, b) => a + b.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Phân tích & Báo cáo</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Thống kê chi tiết hoạt động hệ thống</p>
      </div>

      {/* Summary Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Người dùng", value: data.users.total, sub: `+${data.users.this_week} tuần này` },
          { label: "Nội dung", value: data.content.total, sub: `+${data.content.this_week} tuần này` },
          { label: "Cuộc trò chuyện", value: data.conversations.total, sub: `+${data.conversations.today} hôm nay` },
          { label: "Tin nhắn", value: data.messages, sub: `${data.conversations.total > 0 ? Math.round(data.messages / data.conversations.total) : 0} tin/hội thoại` },
          { label: "Dự án", value: data.projects, sub: `${data.users.total > 0 ? (data.projects / data.users.total).toFixed(1) : 0}/người` },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{item.label}</p>
              <p className="text-xl font-bold text-foreground mt-1">{item.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{item.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Growth + Content Trend */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px]">Tăng trưởng người dùng (7 ngày)</CardTitle>
              <Badge variant="secondary">+{userGrowthTotal} mới</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {data.user_growth.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.user_growth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={formatDate} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }} labelFormatter={formatDate} />
                  <Bar dataKey="count" name="Người dùng mới" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">Chưa có dữ liệu</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px]">Nội dung tạo (7 ngày)</CardTitle>
              <Badge variant="secondary">+{contentDailyTotal} bài</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {data.content_daily.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.content_daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gAnalyticsContent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FACC15" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FACC15" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={formatDate} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }} labelFormatter={formatDate} />
                  <Area type="monotone" dataKey="count" name="Số bài" stroke="#FACC15" fill="url(#gAnalyticsContent)" strokeWidth={2} />
                  <Area type="monotone" dataKey="avg_score" name="Điểm TB" stroke="#22c55e" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">Chưa có dữ liệu</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Content Type Distribution + Job Performance */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px]">Phân bố loại nội dung</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 flex-1">
                  {pieData.map((item) => {
                    const total = pieData.reduce((a, b) => a + b.value, 0);
                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center justify-between text-[12px]">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                            <span className="text-foreground">{item.name}</span>
                          </div>
                          <span className="font-mono font-semibold text-foreground">{item.value} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ background: item.color, width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">Chưa có nội dung</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px]">Hiệu suất hệ thống</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border p-3 text-center">
                <p className="text-lg font-bold text-foreground">{totalJobs}</p>
                <p className="text-[10px] text-muted-foreground">Tổng Jobs</p>
              </div>
              <div className="rounded-xl bg-green-500/5 border border-green-500/10 p-3 text-center">
                <p className="text-lg font-bold text-green-500">{data.jobs.done || 0}</p>
                <p className="text-[10px] text-muted-foreground">Thành công</p>
              </div>
              <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-3 text-center">
                <p className="text-lg font-bold text-red-500">{data.jobs.error || 0}</p>
                <p className="text-[10px] text-muted-foreground">Thất bại</p>
              </div>
            </div>

            {data.job_success_rate !== null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[12px]">
                  <span className="text-muted-foreground">Tỉ lệ thành công</span>
                  <span className="font-semibold text-foreground">{data.job_success_rate}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${data.job_success_rate >= 80 ? "bg-green-500" : data.job_success_rate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${data.job_success_rate}%` }}
                  />
                </div>
              </div>
            )}

            {data.content.avg_score !== null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[12px]">
                  <span className="text-muted-foreground">Điểm chất lượng TB</span>
                  <span className="font-semibold text-foreground">{data.content.avg_score}/100</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${data.content.avg_score >= 80 ? "bg-green-500" : data.content.avg_score >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${data.content.avg_score}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Tỉ lệ hoạt động</p>
              {[
                { label: "Người dùng hôm nay", value: data.users.today, total: data.users.total },
                { label: "Nội dung hôm nay", value: data.content.today, total: data.content.total },
                { label: "Hội thoại hôm nay", value: data.conversations.today, total: data.conversations.total },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-[12px]">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-mono text-foreground">{item.value} / {item.total}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Users */}
      {data.top_users.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px]">Top người dùng tích cực</CardTitle>
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
