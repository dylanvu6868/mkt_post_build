"use client";

import { useEffect } from "react";
import { useMcpStore } from "@/store/mcp";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function HubOverviewPage() {
  const { analyticsOverview, analyticsOverviewLoading, loadAnalyticsOverview } = useMcpStore();

  useEffect(() => { loadAnalyticsOverview(); }, [loadAnalyticsOverview]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trung tâm Marketing</h1>
        <p className="text-sm text-muted-foreground mt-1">Email, SEO, Content, Landing Pages - tất cả trong một.</p>
      </div>

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
    </div>
  );
}
