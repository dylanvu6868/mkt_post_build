"use client";

import { useEffect, useState } from "react";
import {
  useMcpStore,
  type AnalyticsPeriod,
} from "@/store/mcp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  "7d": "7 ngày",
  "30d": "30 ngày",
  "90d": "90 ngày",
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function actionLabel(action: string): string {
  // Backend writes dot-notation actions like "seo.analyze", "email.template_create".
  // Extract the part after the last "." as the verb key.
  const verb = action.includes(".") ? action.slice(action.lastIndexOf(".") + 1) : action;
  const map: Record<string, string> = {
    create: "Tạo",
    update: "Cập nhật",
    delete: "Xóa",
    send: "Gửi",
    publish: "Xuất bản",
    schedule: "Lên lịch",
    cancel_schedule: "Hủy lịch",
    analyze: "Phân tích",
    status_change: "Đổi trạng thái",
    import: "Nhập",
    contacts_import: "Nhập",
    template_create: "Tạo",
    contact_create: "Tạo",
    list_create: "Tạo",
    item_create: "Tạo",
  };
  return map[verb] ?? verb.replace(/_/g, " ");
}

function resourceLabel(resource: string): string {
  const map: Record<string, string> = {
    // Full resource type keys from backend
    email_template: "Mẫu email",
    email_contact: "Liên hệ",
    email_list: "Danh sách",
    scheduled_email: "Email đã lên lịch",
    content_item: "Nội dung",
    seo_audit: "Phân tích SEO",
    landing_page: "Trang đích",
    // Short keys (kept for backward compatibility)
    email: "Email",
    campaign: "Chiến dịch",
    content: "Nội dung",
    template: "Mẫu",
    contact: "Liên hệ",
    list: "Danh sách",
  };
  return map[resource] ?? resource;
}

/* ------------------------------------------------------------------ */
/*  Period Selector                                                     */
/* ------------------------------------------------------------------ */
function PeriodSelector({
  value,
  onChange,
}: {
  value: AnalyticsPeriod;
  onChange: (p: AnalyticsPeriod) => void;
}) {
  const periods: AnalyticsPeriod[] = ["7d", "30d", "90d"];
  return (
    <div className="flex gap-1 rounded-lg border p-1 w-fit">
      {periods.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1 rounded-md text-sm font-medium transition ${
            value === p
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  KPI Card                                                            */
/* ------------------------------------------------------------------ */
function KpiCard({
  label,
  value,
  loading,
  suffix,
  colorClass,
}: {
  label: string;
  value: string | number;
  loading: boolean;
  suffix?: string;
  colorClass?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <>
            <p className={`text-3xl font-bold ${colorClass ?? ""}`}>
              {value}
              {suffix && <span className="text-lg font-normal ml-1">{suffix}</span>}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Overview Section                                                    */
/* ------------------------------------------------------------------ */
function OverviewSection() {
  const { analyticsOverview, analyticsOverviewLoading, loadAnalyticsOverview } = useMcpStore();

  useEffect(() => {
    loadAnalyticsOverview().catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : "Lỗi tải tổng quan";
      toast.error(msg);
    });
  }, [loadAnalyticsOverview]);

  const ov = analyticsOverview;
  const loading = analyticsOverviewLoading;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Tổng quan</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Chiến dịch" value={ov?.campaigns ?? 0} loading={loading} />
        <KpiCard label="Email đã gửi" value={ov?.emails_sent ?? 0} loading={loading} />
        <KpiCard label="Tỷ lệ mở" value={`${ov?.open_rate ?? 0}%`} loading={loading} />
        <KpiCard label="Tỷ lệ nhấp" value={`${ov?.click_rate ?? 0}%`} loading={loading} />
        <KpiCard label="Nội dung đã đăng" value={ov?.content_published ?? 0} loading={loading} />
        <KpiCard
          label="Điểm SEO trung bình"
          value={ov?.avg_seo_score ?? 0}
          loading={loading}
          suffix="/ 100"
          colorClass={ov ? scoreColor(ov.avg_seo_score) : undefined}
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Email Analytics Section                                             */
/* ------------------------------------------------------------------ */
function EmailSection({ period }: { period: AnalyticsPeriod }) {
  const { emailAnalytics, emailAnalyticsLoading, loadEmailAnalytics } = useMcpStore();

  useEffect(() => {
    loadEmailAnalytics(period).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : "Lỗi tải phân tích email";
      toast.error(msg);
    });
  }, [period, loadEmailAnalytics]);

  const ea = emailAnalytics;
  const loading = emailAnalyticsLoading;

  const chartData = ea
    ? [
        { name: "Đã gửi", value: ea.total_sent },
        { name: "Đã mở", value: ea.total_opened },
        { name: "Đã nhấp", value: ea.total_clicked },
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phân tích Email</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">Chiến dịch</p>
            {loading ? <Skeleton className="h-6 w-10 mx-auto mt-1" /> : <p className="text-lg font-semibold">{ea?.campaigns ?? 0}</p>}
          </div>
          <div className="rounded-lg border px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">Đã gửi</p>
            {loading ? <Skeleton className="h-6 w-10 mx-auto mt-1" /> : <p className="text-lg font-semibold">{ea?.total_sent ?? 0}</p>}
          </div>
          <div className="rounded-lg border px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">Tỷ lệ mở</p>
            {loading ? <Skeleton className="h-6 w-10 mx-auto mt-1" /> : <p className="text-lg font-semibold">{ea?.open_rate ?? 0}%</p>}
          </div>
          <div className="rounded-lg border px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">Tỷ lệ nhấp</p>
            {loading ? <Skeleton className="h-6 w-10 mx-auto mt-1" /> : <p className="text-lg font-semibold">{ea?.click_rate ?? 0}%</p>}
          </div>
        </div>

        {/* Bar chart */}
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" name="Số lượng" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Không có dữ liệu cho kỳ này.</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Content Analytics Section                                           */
/* ------------------------------------------------------------------ */
function ContentSection({ period }: { period: AnalyticsPeriod }) {
  const { contentAnalytics, contentAnalyticsLoading, loadContentAnalytics } = useMcpStore();

  useEffect(() => {
    loadContentAnalytics(period).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : "Lỗi tải phân tích nội dung";
      toast.error(msg);
    });
  }, [period, loadContentAnalytics]);

  const ca = contentAnalytics;
  const loading = contentAnalyticsLoading;

  const byTypeData = ca
    ? Object.entries(ca.by_type).map(([name, value]) => ({ name, value }))
    : [];

  const byStatusData = ca
    ? Object.entries(ca.by_status).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Phân tích Nội dung
          {ca && (
            <Badge variant="secondary" className="ml-2 font-normal">
              {ca.total} mục
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <>
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </>
        ) : ca ? (
          <>
            {/* By type */}
            <div>
              <p className="text-sm font-medium mb-2">Theo loại nội dung</p>
              {byTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={byTypeData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Số mục" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">Không có dữ liệu.</p>
              )}
            </div>

            {/* By status */}
            <div>
              <p className="text-sm font-medium mb-2">Theo trạng thái</p>
              {byStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={byStatusData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Số mục" fill="hsl(var(--chart-2, #10b981))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">Không có dữ liệu.</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Không có dữ liệu cho kỳ này.</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  SEO Analytics Section                                               */
/* ------------------------------------------------------------------ */
function SeoSection({ period }: { period: AnalyticsPeriod }) {
  const { seoAnalytics, seoAnalyticsLoading, loadSeoAnalytics } = useMcpStore();

  useEffect(() => {
    loadSeoAnalytics(period).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : "Lỗi tải phân tích SEO";
      toast.error(msg);
    });
  }, [period, loadSeoAnalytics]);

  const sa = seoAnalytics;
  const loading = seoAnalyticsLoading;

  const issuesData = sa?.top_issues.map((issue) => ({
    name: issue.message.length > 40 ? issue.message.slice(0, 37) + "…" : issue.message,
    fullName: issue.message,
    value: issue.count,
  })) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phân tích SEO</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">Số lần kiểm tra</p>
            {loading ? <Skeleton className="h-6 w-10 mx-auto mt-1" /> : <p className="text-lg font-semibold">{sa?.audits ?? 0}</p>}
          </div>
          <div className="rounded-lg border px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">Điểm SEO trung bình</p>
            {loading ? (
              <Skeleton className="h-6 w-10 mx-auto mt-1" />
            ) : (
              <p className={`text-lg font-semibold ${sa ? scoreColor(sa.avg_score) : ""}`}>
                {sa?.avg_score ?? 0}
              </p>
            )}
          </div>
        </div>

        {/* Top issues bar chart */}
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : issuesData.length > 0 ? (
          <div>
            <p className="text-sm font-medium mb-2">Vấn đề phổ biến nhất</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={issuesData}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [value, "Số lần"]}
                  labelFormatter={(_label, payload) =>
                    payload?.[0]?.payload?.fullName ?? _label
                  }
                />
                <Bar dataKey="value" name="Số lần" fill="hsl(var(--destructive, #ef4444))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            {sa ? "Không có vấn đề nào trong kỳ này." : "Không có dữ liệu cho kỳ này."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Activity Feed Section                                               */
/* ------------------------------------------------------------------ */
function ActivitySection() {
  const { activity, activityLoading, loadActivity } = useMcpStore();

  useEffect(() => {
    loadActivity(50).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : "Lỗi tải hoạt động";
      toast.error(msg);
    });
  }, [loadActivity]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hoạt động gần đây</CardTitle>
      </CardHeader>
      <CardContent>
        {activityLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có hoạt động nào.</p>
        ) : (
          <ol className="space-y-0" aria-label="Hoạt động gần đây">
            {activity.map((item, idx) => (
              <li key={item.id} className="flex gap-3">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1 shrink-0" />
                  {idx < activity.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-1" />
                  )}
                </div>
                {/* Content */}
                <div className="pb-4 flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{actionLabel(item.action)}</span>
                    {" "}
                    <span className="text-muted-foreground">
                      {resourceLabel(item.resource_type)}
                      {item.resource_id != null ? ` #${item.resource_id}` : ""}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDateTime(item.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */
export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Phân tích & Báo cáo</h1>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Overview KPIs (always all-time totals) */}
      <OverviewSection />

      {/* Period-scoped charts in a 2-column grid on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EmailSection period={period} />
        <SeoSection period={period} />
      </div>

      <ContentSection period={period} />

      <ActivitySection />
    </div>
  );
}
