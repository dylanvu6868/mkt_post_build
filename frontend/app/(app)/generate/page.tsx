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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const CONTENT_TYPES = [
  { value: "facebook_post", label: "Facebook Post" },
  { value: "seo_blog", label: "SEO Blog" },
  { value: "email", label: "Email" },
  { value: "landing_page", label: "Landing Page" },
  { value: "tiktok_script", label: "TikTok Script" },
];

function DraftRenderer({
  contentType,
  draft,
}: {
  contentType: string;
  draft: Record<string, unknown>;
}) {
  if (contentType === "facebook_post") {
    const d = draft as {
      hook?: string;
      body?: string;
      cta?: string;
      hashtags?: string[];
    };
    return (
      <div className="space-y-4">
        <Field label="HOOK" value={d.hook} bold />
        <Field label="BODY" value={d.body} pre />
        <Field label="CTA" value={d.cta} medium />
        {d.hashtags && (
          <div className="flex gap-1 flex-wrap">
            {d.hashtags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (contentType === "seo_blog") {
    const d = draft as {
      seo_title?: string;
      meta_description?: string;
      outline?: string[];
      blog_content?: string;
      faq?: { question: string; answer: string }[];
    };
    return (
      <div className="space-y-4">
        <Field label="SEO TITLE" value={d.seo_title} bold />
        <Field label="META DESCRIPTION" value={d.meta_description} />
        {d.outline && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              OUTLINE
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {d.outline.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        <Field label="BLOG CONTENT" value={d.blog_content} pre />
        {d.faq && d.faq.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              FAQ
            </p>
            <div className="space-y-2">
              {d.faq.map((item, i) => (
                <div key={i} className="rounded-md border p-3">
                  <p className="text-sm font-medium">{item.question}</p>
                  <p className="text-sm text-muted-foreground">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (contentType === "email") {
    const d = draft as { subject?: string; body?: string; cta?: string };
    return (
      <div className="space-y-4">
        <Field label="SUBJECT" value={d.subject} bold />
        <Field label="BODY" value={d.body} pre />
        <Field label="CTA" value={d.cta} medium />
      </div>
    );
  }

  if (contentType === "landing_page") {
    const d = draft as {
      headline?: string;
      subheadline?: string;
      benefits?: string[];
      cta?: string;
    };
    return (
      <div className="space-y-4">
        <Field label="HEADLINE" value={d.headline} bold />
        <Field label="SUBHEADLINE" value={d.subheadline} />
        {d.benefits && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              BENEFITS
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {d.benefits.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        )}
        <Field label="CTA" value={d.cta} medium />
      </div>
    );
  }

  if (contentType === "tiktok_script") {
    const d = draft as { hook?: string; script?: string; cta?: string };
    return (
      <div className="space-y-4">
        <Field label="HOOK (first 3s)" value={d.hook} bold />
        <Field label="SCRIPT" value={d.script} pre />
        <Field label="CTA" value={d.cta} medium />
      </div>
    );
  }

  return (
    <pre className="text-sm whitespace-pre-wrap">
      {JSON.stringify(draft, null, 2)}
    </pre>
  );
}

function Field({
  label,
  value,
  bold,
  medium,
  pre,
}: {
  label: string;
  value?: string;
  bold?: boolean;
  medium?: boolean;
  pre?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p
        className={
          bold
            ? "text-lg font-semibold"
            : medium
              ? "font-medium"
              : pre
                ? "whitespace-pre-wrap"
                : ""
        }
      >
        {value}
      </p>
    </div>
  );
}

export default function GeneratePage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { start, jobStatus, polling, reset } = useGenerate();

  const [brief, setBrief] = useState("");
  const [goal, setGoal] = useState("");
  const [contentType, setContentType] = useState("facebook_post");
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
        content_type: contentType,
        brief: brief.trim(),
        marketing_goal: goal.trim(),
      });
    } catch {
      toast.error("Failed to start generation");
    } finally {
      setLoading(false);
    }
  };

  const draft = jobStatus?.result?.draft as Record<string, unknown> | undefined;

  const review = jobStatus?.result?.review as
    | { score?: number; suggestions?: string[] }
    | undefined;

  const typeLabel =
    CONTENT_TYPES.find((t) => t.value === contentType)?.label ?? contentType;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Content Generator</h1>

      {!jobStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Content</CardTitle>
            <CardDescription>
              Choose a content type, describe your topic, and the AI agents will
              create it
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <Label htmlFor="content-type">Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger id="content-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((ct) => (
                      <SelectItem key={ct.value} value={ct.value}>
                        {ct.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                  if (jobStatus.status === "done" || stepIdx < currentIdx) {
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
                  Generated {typeLabel}
                  {review?.score != null && (
                    <Badge variant="secondary">
                      Score: {review.score}/100
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DraftRenderer contentType={contentType} draft={draft} />
                {review?.suggestions && review.suggestions.length > 0 && (
                  <div className="mt-4">
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
