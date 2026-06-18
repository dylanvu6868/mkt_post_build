"use client";

import { useProjectStore } from "@/store/project";
import { useHistory } from "@/hooks/use-history";
import { useProjects } from "@/hooks/use-projects";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const TYPE_LABELS: Record<string, string> = {
  facebook_post: "Facebook Post",
  seo_blog: "SEO Blog",
  email: "Email",
  landing_page: "Landing Page",
  tiktok_script: "TikTok Script",
};

export default function DashboardPage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: history, isLoading: historyLoading } = useHistory(activeProject?.id);
  const isLoading = projectsLoading || historyLoading;

  const typeCounts: Record<string, number> = {};
  let totalScore = 0;
  let scoredCount = 0;
  for (const item of history ?? []) {
    typeCounts[item.content_type] = (typeCounts[item.content_type] ?? 0) + 1;
    if (item.score != null) {
      totalScore += item.score;
      scoredCount++;
    }
  }
  const avgScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardDescription>Total Projects</CardDescription>
                <CardTitle className="text-3xl">{projects?.length ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Active Project</CardDescription>
                <CardTitle className="text-lg truncate">
                  {activeProject?.name ?? "None selected"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Generated Content</CardDescription>
                <CardTitle className="text-3xl">{history?.length ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Avg. Score</CardDescription>
                <CardTitle className="text-3xl">
                  {avgScore !== null ? `${avgScore}/100` : "—"}
                </CardTitle>
              </CardHeader>
            </Card>
          </>
        )}
      </div>

      {Object.keys(typeCounts).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Content by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(typeCounts).map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-sm px-3 py-1">
                  {TYPE_LABELS[type] ?? type}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeProject && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest generations for {activeProject.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!history?.length ? (
              <p className="text-sm text-muted-foreground">
                No content generated yet. Go to Generate to create your first
                post.
              </p>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.prompt}</p>
                      <p className="text-xs text-muted-foreground">
                        {TYPE_LABELS[item.content_type] ?? item.content_type}{" "}
                        &middot;{" "}
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {item.score !== null && (
                      <span className="text-sm font-mono">
                        {item.score}/100
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
