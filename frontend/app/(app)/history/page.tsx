"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/project";
import { useHistory, useDeleteHistory } from "@/hooks/use-history";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface HistoryItem {
  id: number;
  project_id: number;
  content_type: string;
  prompt: string;
  output: Record<string, unknown> | null;
  score: number | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  facebook_post: "Facebook Post",
  seo_blog: "SEO Blog",
  email: "Email",
  landing_page: "Landing Page",
  tiktok_script: "TikTok Script",
};

function DraftViewer({
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
        <ViewField label="HOOK" value={d.hook} bold />
        <ViewField label="BODY" value={d.body} pre />
        <ViewField label="CTA" value={d.cta} />
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
        <ViewField label="SEO TITLE" value={d.seo_title} bold />
        <ViewField label="META DESCRIPTION" value={d.meta_description} />
        {d.outline && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">OUTLINE</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {d.outline.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        <ViewField label="BLOG CONTENT" value={d.blog_content} pre />
        {d.faq && d.faq.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">FAQ</p>
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
        <ViewField label="SUBJECT" value={d.subject} bold />
        <ViewField label="BODY" value={d.body} pre />
        <ViewField label="CTA" value={d.cta} />
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
        <ViewField label="HEADLINE" value={d.headline} bold />
        <ViewField label="SUBHEADLINE" value={d.subheadline} />
        {d.benefits && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">BENEFITS</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {d.benefits.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        )}
        <ViewField label="CTA" value={d.cta} />
      </div>
    );
  }

  if (contentType === "tiktok_script") {
    const d = draft as { hook?: string; script?: string; cta?: string };
    return (
      <div className="space-y-4">
        <ViewField label="HOOK (first 3s)" value={d.hook} bold />
        <ViewField label="SCRIPT" value={d.script} pre />
        <ViewField label="CTA" value={d.cta} />
      </div>
    );
  }

  return (
    <pre className="text-sm whitespace-pre-wrap">
      {JSON.stringify(draft, null, 2)}
    </pre>
  );
}

function formatDraftAsText(
  contentType: string,
  draft: Record<string, unknown>,
): string {
  if (contentType === "facebook_post") {
    const d = draft as { hook?: string; body?: string; cta?: string; hashtags?: string[] };
    return [d.hook, "", d.body, "", d.cta, "", d.hashtags?.join(" ")].filter(Boolean).join("\n");
  }
  if (contentType === "seo_blog") {
    const d = draft as { seo_title?: string; meta_description?: string; blog_content?: string; faq?: { question: string; answer: string }[] };
    const faqText = d.faq?.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n") ?? "";
    return [d.seo_title, d.meta_description, "", d.blog_content, "", faqText].filter(Boolean).join("\n");
  }
  if (contentType === "email") {
    const d = draft as { subject?: string; body?: string; cta?: string };
    return [`Subject: ${d.subject}`, "", d.body, "", d.cta].filter(Boolean).join("\n");
  }
  if (contentType === "landing_page") {
    const d = draft as { headline?: string; subheadline?: string; benefits?: string[]; cta?: string };
    return [d.headline, d.subheadline, "", d.benefits?.map((b) => `• ${b}`).join("\n"), "", d.cta].filter(Boolean).join("\n");
  }
  if (contentType === "tiktok_script") {
    const d = draft as { hook?: string; script?: string; cta?: string };
    return [`[HOOK] ${d.hook}`, "", d.script, "", `[CTA] ${d.cta}`].filter(Boolean).join("\n");
  }
  return JSON.stringify(draft, null, 2);
}

function ViewField({
  label,
  value,
  bold,
  pre,
}: {
  label: string;
  value?: string;
  bold?: boolean;
  pre?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p
        className={
          bold ? "text-lg font-semibold" : pre ? "whitespace-pre-wrap" : ""
        }
      >
        {value}
      </p>
    </div>
  );
}

export default function HistoryPage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { data: history, isLoading } = useHistory(activeProject?.id);
  const deleteHistory = useDeleteHistory();
  const [selected, setSelected] = useState<HistoryItem | null>(null);

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-muted-foreground">
          Select a project first from the Projects page.
        </p>
      </div>
    );
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteHistory.mutateAsync(id);
      setSelected(null);
      toast.success("History item deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">History</h1>

      {isLoading && (
        <p className="text-muted-foreground">Loading history...</p>
      )}

      {!isLoading && !history?.length && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No content generated yet. Go to Generate to create your first post.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {history?.map((item) => (
          <Card key={item.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">{item.prompt}</CardTitle>
                <CardDescription>
                  {TYPE_LABELS[item.content_type] ?? item.content_type}{" "}
                  &middot;{" "}
                  {new Date(item.created_at).toLocaleDateString()}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {item.score !== null && (
                  <Badge variant="secondary">{item.score}/100</Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected(item)}
                >
                  View
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  disabled={deleteHistory.isPending}
                >
                  Delete
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.prompt}</DialogTitle>
          </DialogHeader>
          {selected?.output?.draft != null && (
            <>
              <DraftViewer
                contentType={selected.content_type}
                draft={selected.output.draft as Record<string, unknown>}
              />
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      formatDraftAsText(
                        selected.content_type,
                        selected.output!.draft as Record<string, unknown>,
                      ),
                    );
                    toast.success("Copied to clipboard");
                  }}
                >
                  Copy
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
