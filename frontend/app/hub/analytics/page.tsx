"use client";

import { useEffect, useState } from "react";
import { useMcpStore, type AnalyticsPeriod } from "@/store/mcp";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BarChart2 } from "lucide-react";
import { btn, inp } from "@/lib/ui-tokens";
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
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
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
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40"></div>
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
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40"></div>
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
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40"></div>
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
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40"></div>
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
    <div className="mx-auto max-w-6xl space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart2 className="h-8 w-8 text-primary" />
            <span className="bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">Analytics</span>
          </h1>
          <p className="mt-2 text-muted-foreground text-lg">
            Đo lường và theo dõi hiệu suất chiến dịch, email, SEO và nội dung của bạn.
          </p>
        </div>
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

      {/* ROI + UTM tools */}
      <RoiSection />
      <UtmSection />
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*  ROI Calculator Section                                             */
/* ------------------------------------------------------------------ */

function RoiSection() {
  const [adSpend, setAdSpend] = useState("");
  const [otherCosts, setOtherCosts] = useState("");
  const [revenue, setRevenue] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ roas: number; roi_pct: number; profit: number; total_cost: number; commentary?: string } | null>(null);

  const handleCalc = async () => {
    const ad = parseFloat(adSpend) || 0;
    const costs = parseFloat(otherCosts) || 0;
    const rev = parseFloat(revenue) || 0;
    if (ad <= 0 || rev <= 0) { toast.error("Nh?p s? li?u h?p l?"); return; }
    setLoading(true);
    try {
      const r = await api.post<{ roas: number; roi_pct: number; profit: number; total_cost: number; commentary?: string }>("/mcp/analytics/roi", {
        spend: ad + costs, revenue: rev, ad_spend: ad, costs: costs,
        campaign_name: campaignName, with_commentary: true,
      });
      setResult(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "L?i t�nh ROI");
    } finally { setLoading(false); }
  };

  return (
    <div>
      <h2 className="text-base font-semibold mb-4 tracking-tight flex items-center gap-2">
        <span className="bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">ROI Calculator</span>
      </h2>
      <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40 rounded-full mb-4" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">T�n chi?n d?ch</label>
              <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="VD: Summer Sale 2025" className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Chi ph� qu?ng c�o (VND)</label>
                <input type="number" value={adSpend} onChange={(e) => setAdSpend(e.target.value)} placeholder="3000000" className={inp} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Chi ph� kh�c (VND)</label>
                <input type="number" value={otherCosts} onChange={(e) => setOtherCosts(e.target.value)} placeholder="1000000" className={inp} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Doanh thu (VND)</label>
              <input type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} placeholder="15000000" className={inp} />
            </div>
            <button onClick={handleCalc} disabled={loading} className={btn + " w-full"}>
              {loading ? "�ang t�nh..." : "T�nh ROAS + ROI"}
            </button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            {result ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border/40 p-3 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">ROAS</p>
                    <p className="text-xl font-black text-primary">{result.roas}x</p>
                  </div>
                  <div className="rounded-xl border border-border/40 p-3 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">ROI</p>
                    <p className={`text-xl font-black ${result.roi_pct >= 0 ? "text-emerald-500" : "text-red-500"}`}>{result.roi_pct}%</p>
                  </div>
                  <div className="rounded-xl border border-border/40 p-3 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">L?i nhu?n</p>
                    <p className={`text-xl font-black ${result.profit >= 0 ? "text-emerald-500" : "text-red-500"}`}>{result.profit >= 0 ? "+" : ""}{result.profit.toLocaleString("vi-VN")}</p>
                  </div>
                </div>
                {result.commentary && (
                  <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5">Ph�n t�ch AI</p>
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap">{result.commentary}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <BarChart2 className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground/50">Nh?p s? li?u d? t�nh ROAS + ROI</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  UTM Builder Section                                                */
/* ------------------------------------------------------------------ */

function UtmSection() {
  const [url, setUrl] = useState("");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleBuild = async () => {
    if (!url.trim()) { toast.error("Nh?p URL"); return; }
    try {
      const r = await api.post<{ utm_url: string }>("/mcp/analytics/utm/build", {
        url, utm_source: source, utm_medium: medium, utm_campaign: campaign, utm_term: term, utm_content: content,
      });
      setResult(r.utm_url);
      setCopied(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "L?i t?o UTM");
    }
  };

  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => { setCopied(true); toast.success("�� sao ch�p!"); });
  };

  return (
    <div>
      <h2 className="text-base font-semibold mb-4 tracking-tight flex items-center gap-2">
        <span className="bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">UTM Builder</span>
      </h2>
      <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40 rounded-full mb-4" />
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">URL d�ch</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://vitba.ai/landing-page" className={inp} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">utm_source *</label>
              <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="facebook" className={inp} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">utm_medium *</label>
              <input value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="cpc" className={inp} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">utm_campaign</label>
              <input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="summer_sale" className={inp} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">utm_term</label>
              <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="marketing_tool" className={inp} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">utm_content</label>
              <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="ad_variant_a" className={inp} />
            </div>
          </div>
          <button onClick={handleBuild} className={btn + " w-full"}>T?o UTM URL</button>
          {result && (
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 flex items-center gap-2">
              <code className="text-xs text-foreground/90 flex-1 truncate">{result}</code>
              <button onClick={copy} className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] font-medium hover:bg-accent transition">
                {copied ? "�� ch�p!" : "Sao ch�p"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}