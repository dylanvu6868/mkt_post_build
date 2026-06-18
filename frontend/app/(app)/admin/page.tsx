"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Analytics {
  users: { total: number; today: number; this_week: number; this_month: number };
  content: {
    total: number;
    avg_score: number | null;
    type_distribution: Record<string, number>;
  };
  top_users: { id: number; name: string; email: string; content_count: number }[];
  jobs: Record<string, number>;
}

const TYPE_LABELS: Record<string, string> = {
  facebook_post: "Facebook Post",
  seo_blog: "SEO Blog",
  email: "Email",
  landing_page: "Landing Page",
  tiktok_script: "TikTok Script",
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Analytics>("/admin/analytics").then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin Analytics</h1>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Analytics</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">{data.users.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>New Today</CardDescription>
            <CardTitle className="text-3xl">{data.users.today}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>This Week</CardDescription>
            <CardTitle className="text-3xl">{data.users.this_week}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>This Month</CardDescription>
            <CardTitle className="text-3xl">{data.users.this_month}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Content Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Generated</span>
              <span className="font-mono">{data.content.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Avg Score</span>
              <span className="font-mono">
                {data.content.avg_score !== null ? `${data.content.avg_score}/100` : "—"}
              </span>
            </div>
            <div className="pt-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">By Type</p>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(data.content.type_distribution).map(([type, count]) => (
                  <Badge key={type} variant="secondary">
                    {TYPE_LABELS[type] ?? type}: {count}
                  </Badge>
                ))}
                {Object.keys(data.content.type_distribution).length === 0 && (
                  <span className="text-sm text-muted-foreground">No content yet</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(data.jobs).map(([status, count]) => (
                <div key={status} className="flex justify-between">
                  <Badge
                    variant={
                      status === "done" ? "default" : status === "error" ? "destructive" : "secondary"
                    }
                  >
                    {status}
                  </Badge>
                  <span className="font-mono">{count}</span>
                </div>
              ))}
              {Object.keys(data.jobs).length === 0 && (
                <span className="text-sm text-muted-foreground">No jobs yet</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {data.top_users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Users</CardTitle>
            <CardDescription>By content generated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.top_users.map((u, i) => (
                <div key={u.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <span className="text-sm font-medium mr-2">#{i + 1}</span>
                    <span className="text-sm">{u.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{u.email}</span>
                  </div>
                  <span className="font-mono text-sm">{u.content_count} posts</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
