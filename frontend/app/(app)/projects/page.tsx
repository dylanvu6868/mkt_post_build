"use client";

import { useState } from "react";
import { useProjects, useCreateProject } from "@/hooks/use-projects";
import { useProjectStore } from "@/store/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const { activeProject, setActiveProject } = useProjectStore();
  const [name, setName] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const project = await createProject.mutateAsync(name.trim());
      setActiveProject(project);
      setName("");
      toast.success("Project created");
    } catch {
      toast.error("Failed to create project");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Projects</h1>

      <Card>
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-2">
            <Input
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="max-w-sm"
            />
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? "Creating..." : "Create"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <p className="text-muted-foreground">Loading projects...</p>
        )}
        {projects?.map((project) => (
          <Card
            key={project.id}
            className={
              activeProject?.id === project.id ? "border-primary" : ""
            }
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">{project.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {new Date(project.created_at).toLocaleDateString()}
                </p>
              </div>
              {activeProject?.id === project.id ? (
                <Badge>Active</Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveProject(project)}
                >
                  Select
                </Button>
              )}
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
