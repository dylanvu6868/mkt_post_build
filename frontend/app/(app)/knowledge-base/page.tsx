"use client";

import { useRef } from "react";
import { useProjectStore } from "@/store/project";
import { useDocuments, useUploadDocument } from "@/hooks/use-documents";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function KnowledgeBasePage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { data: documents, isLoading } = useDocuments(activeProject?.id);
  const upload = useUploadDocument();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProject) return;
    try {
      await upload.mutateAsync({ projectId: activeProject.id, file });
      toast.success("Document uploaded");
    } catch {
      toast.error("Upload failed");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Select a project first from the Projects page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
          >
            {upload.isPending ? "Uploading..." : "Upload Document"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            Upload PDF, DOCX, or TXT files for brand context
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
          {!isLoading && !documents?.length && (
            <p className="text-sm text-muted-foreground">
              No documents uploaded yet.
            </p>
          )}
          {documents && documents.length > 0 && (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <span className="text-sm">{doc.filename}</span>
                  <Badge
                    variant={doc.status === "done" ? "default" : "secondary"}
                  >
                    {doc.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
