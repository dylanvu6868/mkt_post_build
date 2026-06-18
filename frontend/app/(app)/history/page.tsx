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

  const getDraft = (item: HistoryItem) =>
    item.output?.draft as
      | { hook?: string; body?: string; cta?: string; hashtags?: string[] }
      | undefined;

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
                  {item.content_type} &middot;{" "}
                  {new Date(item.created_at).toLocaleDateString()}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {item.score !== null && (
                  <Badge variant="secondary">{item.score}/10</Badge>
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
          {selected && getDraft(selected) && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  HOOK
                </p>
                <p className="text-lg font-semibold">
                  {getDraft(selected)?.hook}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  BODY
                </p>
                <p className="whitespace-pre-wrap">
                  {getDraft(selected)?.body}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  CTA
                </p>
                <p className="font-medium">{getDraft(selected)?.cta}</p>
              </div>
              {getDraft(selected)?.hashtags && (
                <div className="flex gap-1 flex-wrap">
                  {getDraft(selected)!.hashtags!.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
