"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/project";
import { useGenerate } from "@/hooks/use-generate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const AGENT_STEPS = [
  "planner",
  "research",
  "seo",
  "brand",
  "fusion",
  "copywriter",
  "reviewer",
];

export default function GeneratePage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { start, jobStatus, polling, reset } = useGenerate();

  const [brief, setBrief] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Content Generator</h1>
        <p className="text-muted-foreground">
          Select a project first from the Projects page.
        </p>
      </div>
    );
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brief.trim()) return;
    setLoading(true);
    try {
      await start({
        project_id: activeProject.id,
        content_type: "facebook_post",
        brief: brief.trim(),
        marketing_goal: goal.trim(),
      });
    } catch {
      toast.error("Failed to start generation");
    } finally {
      setLoading(false);
    }
  };

  const draft = jobStatus?.result?.draft as
    | { hook?: string; body?: string; cta?: string; hashtags?: string[] }
    | undefined;

  const review = jobStatus?.result?.review as
    | { score?: number; suggestions?: string[]; final_version?: Record<string, unknown> }
    | undefined;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Content Generator</h1>

      {!jobStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Facebook Post</CardTitle>
            <CardDescription>
              Describe your topic and the AI agents will create content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <Label htmlFor="brief">Topic / Brief</Label>
                <Textarea
                  id="brief"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="e.g. eco-friendly water bottles for active lifestyles"
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal">Marketing Goal (optional)</Label>
                <Input
                  id="goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. awareness, engagement, conversion"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Starting..." : "Generate"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {jobStatus && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Agent Pipeline
                <Badge
                  variant={
                    jobStatus.status === "done"
                      ? "default"
                      : jobStatus.status === "error"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {jobStatus.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {AGENT_STEPS.map((step) => {
                  const currentIdx = AGENT_STEPS.indexOf(
                    jobStatus.current_step ?? "",
                  );
                  const stepIdx = AGENT_STEPS.indexOf(step);
                  let variant: "default" | "secondary" | "outline" = "outline";
                  if (
                    jobStatus.status === "done" ||
                    stepIdx < currentIdx
                  ) {
                    variant = "default";
                  } else if (stepIdx === currentIdx) {
                    variant = "secondary";
                  }
                  return (
                    <Badge key={step} variant={variant}>
                      {step}
                    </Badge>
                  );
                })}
              </div>
              {polling && (
                <p className="mt-3 text-sm text-muted-foreground animate-pulse">
                  Processing...
                </p>
              )}
              {jobStatus.status === "error" && (
                <p className="mt-3 text-sm text-destructive">
                  Error: {jobStatus.error}
                </p>
              )}
            </CardContent>
          </Card>

          {jobStatus.status === "done" && draft && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Generated Post
                  {review?.score != null && (
                    <Badge variant="secondary">
                      Score: {review.score}/10
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    HOOK
                  </p>
                  <p className="text-lg font-semibold">{draft.hook}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    BODY
                  </p>
                  <p className="whitespace-pre-wrap">{draft.body}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    CTA
                  </p>
                  <p className="font-medium">{draft.cta}</p>
                </div>
                {draft.hashtags && (
                  <div className="flex gap-1 flex-wrap">
                    {draft.hashtags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                {review?.suggestions && review.suggestions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      REVIEWER SUGGESTIONS
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {review.suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {(jobStatus.status === "done" || jobStatus.status === "error") && (
            <Button
              variant="outline"
              onClick={() => {
                reset();
                setBrief("");
                setGoal("");
              }}
            >
              Generate Another
            </Button>
          )}
        </>
      )}
    </div>
  );
}
