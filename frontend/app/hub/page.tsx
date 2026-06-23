"use client";

import { useEffect } from "react";
import { useMcpStore } from "@/store/mcp";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function HubOverviewPage() {
  const { analyticsOverview, analyticsOverviewLoading, loadAnalyticsOverview } = useMcpStore();
  const { data: limitsData, isLoading: limitsLoading } = usePlanLimits();
  const allowed: string[] = limitsData?.limits.hub_tools ?? [];

  useEffect(() => { loadAnalyticsOverview(); }, [loadAnalyticsOverview]);

  const analyticsLocked = !limitsLoading && !allowed.includes("analytics");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trung tâm Marketing</h1>
        <p className="text-sm text-muted-foreground mt-1">Email, SEO, Content, Landing Pages - tất cả trong một.</p>
      </div>

      {analyticsLocked && !analyticsOverviewLoading ? (
        <Card className="p-6">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Báo cáo tổng quan chi tiết có ở gói Pro.</p>
            <p className="text-xs text-muted-foreground">Nâng cấp để xem đầy đủ phân tích.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Email đã gửi</CardDescription>
              <CardTitle className="text-3xl">
                {analyticsOverviewLoading ? <Skeleton className="h-9 w-16" /> : analyticsOverview?.emails_sent ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Tỷ lệ mở</CardDescription>
              <CardTitle className="text-3xl">
                {analyticsOverviewLoading ? <Skeleton className="h-9 w-16" /> : `${analyticsOverview?.open_rate ?? 0}%`}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Tỷ lệ nhấp</CardDescription>
              <CardTitle className="text-3xl">
                {analyticsOverviewLoading ? <Skeleton className="h-9 w-16" /> : `${analyticsOverview?.click_rate ?? 0}%`}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Nội dung đã đăng</CardDescription>
              <CardTitle className="text-3xl">
                {analyticsOverviewLoading ? <Skeleton className="h-9 w-16" /> : analyticsOverview?.content_published ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Điểm SEO trung bình</CardDescription>
              <CardTitle className="text-3xl">
                {analyticsOverviewLoading ? <Skeleton className="h-9 w-16" /> : analyticsOverview?.avg_seo_score ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Chiến dịch</CardDescription>
              <CardTitle className="text-3xl">
                {analyticsOverviewLoading ? <Skeleton className="h-9 w-16" /> : analyticsOverview?.campaigns ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}
    </div>
  );
}
