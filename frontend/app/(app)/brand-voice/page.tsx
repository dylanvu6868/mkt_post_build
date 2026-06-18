"use client";

import { useEffect, useState } from "react";
import { useProjectStore } from "@/store/project";
import { useBrandProfile, useUpsertBrand } from "@/hooks/use-brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function BrandVoicePage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { data: profile, isLoading } = useBrandProfile(activeProject?.id);
  const upsert = useUpsertBrand();

  const [brandName, setBrandName] = useState("");
  const [tone, setTone] = useState("");
  const [writingStyle, setWritingStyle] = useState("");
  const [preferredWords, setPreferredWords] = useState("");
  const [forbiddenWords, setForbiddenWords] = useState("");

  useEffect(() => {
    if (profile) {
      setBrandName(profile.brand_name);
      setTone(profile.tone);
      setWritingStyle(profile.writing_style);
      setPreferredWords(profile.preferred_words.join(", "));
      setForbiddenWords(profile.forbidden_words.join(", "));
    }
  }, [profile]);

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Brand Voice</h1>
        <p className="text-muted-foreground">
          Select a project first from the Projects page.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsert.mutateAsync({
        project_id: activeProject.id,
        brand_name: brandName,
        tone,
        writing_style: writingStyle,
        preferred_words: preferredWords
          .split(",")
          .map((w) => w.trim())
          .filter(Boolean),
        forbidden_words: forbiddenWords
          .split(",")
          .map((w) => w.trim())
          .filter(Boolean),
      });
      toast.success("Brand voice saved");
    } catch {
      toast.error("Failed to save brand voice");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Brand Voice</h1>

      <Card>
        <CardHeader>
          <CardTitle>Configure Brand Profile</CardTitle>
          <CardDescription>
            Define your brand's tone and style for generated content
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <Label htmlFor="brand-name">Brand Name</Label>
                <Input
                  id="brand-name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. EcoBottle"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Input
                  id="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="e.g. friendly, professional, bold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="style">Writing Style</Label>
                <Input
                  id="style"
                  value={writingStyle}
                  onChange={(e) => setWritingStyle(e.target.value)}
                  placeholder="e.g. conversational, formal, casual"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferred">
                  Preferred Words (comma-separated)
                </Label>
                <Input
                  id="preferred"
                  value={preferredWords}
                  onChange={(e) => setPreferredWords(e.target.value)}
                  placeholder="e.g. sustainable, premium, innovative"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="forbidden">
                  Forbidden Words (comma-separated)
                </Label>
                <Input
                  id="forbidden"
                  value={forbiddenWords}
                  onChange={(e) => setForbiddenWords(e.target.value)}
                  placeholder="e.g. cheap, basic, generic"
                />
              </div>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? "Saving..." : "Save Brand Voice"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
