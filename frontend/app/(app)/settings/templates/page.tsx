"use client";

import { useEffect, useState } from "react";
import { useTemplate, useUpsertTemplate } from "@/hooks/use-template";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

const CONTENT_TYPES = [
  { value: "facebook_post", label: "Facebook Post" },
  { value: "seo_blog", label: "SEO Blog" },
  { value: "email", label: "Email" },
  { value: "landing_page", label: "Landing Page" },
  { value: "tiktok_script", label: "TikTok Script" },
];

export default function TemplatesPage() {
  const [contentType, setContentType] = useState("facebook_post");
  const [templateText, setTemplateText] = useState("");

  const { data: template, isLoading } = useTemplate(contentType);
  const upsert = useUpsertTemplate();

  useEffect(() => {
    if (template) {
      setTemplateText(template.template_text);
    } else if (!isLoading) {
      setTemplateText("");
    }
  }, [template, isLoading, contentType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsert.mutateAsync({
        content_type: contentType,
        template_text: templateText,
      });
      toast.success("Template saved successfully");
    } catch {
      toast.error("Failed to save template");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Custom Templates</h1>

      <Card>
        <CardHeader>
          <CardTitle>Configure Templates</CardTitle>
          <CardDescription>
            Define the exact structure and layout for your generated content. The AI will strictly follow this format.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="content-type">Content Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger id="content-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-text">Template Format</Label>
              <Textarea
                id="template-text"
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
                placeholder={`Example:\n[Header]\n- [Bullet Point 1]\n- [Bullet Point 2]\n\n[Call To Action]`}
                className="min-h-[300px] font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                You can use placeholders like [Title] or write free-form instructions.
              </p>
            </div>

            <Button type="submit" disabled={upsert.isPending || isLoading}>
              {upsert.isPending ? "Saving..." : "Save Template"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
