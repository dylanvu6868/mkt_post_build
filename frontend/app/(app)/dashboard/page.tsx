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

export default function DashboardPage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { data: projects } = useProjects();
  const { data: history } = useHistory(activeProject?.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
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
      </div>

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
                No content generated yet. Go to Generate to create your first post.
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
                        {item.content_type} &middot;{" "}
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {item.score !== null && (
                      <span className="text-sm font-mono">
                        {item.score}/10
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
