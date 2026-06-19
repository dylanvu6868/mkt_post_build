"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface ContentItem {
  id: number;
  content_type: string;
  prompt: string;
  score: number | null;
  created_at: string;
  project_name: string;
  user_name: string;
  user_email: string;
}

const TYPE_LABELS: Record<string, string> = {
  facebook_post: "Facebook Post",
  seo_blog: "SEO Blog",
  email: "Email",
  landing_page: "Landing Page",
  tiktok_script: "TikTok Script",
};

export default function AdminContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchContent = (type?: string) => {
    const params = type && type !== "all" ? `?content_type=${type}` : "";
    api
      .get<ContentItem[]>(`/admin/content${params}`)
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchContent(filter);
  }, [filter]);

  const handleDelete = async (id: number) => {
    if (!confirm("Xoá nội dung này?")) return;
    try {
      await api.delete(`/admin/content/${id}`);
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Đã xoá nội dung");
    } catch {
      toast.error("Không thể xoá");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Quản lý nội dung</h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý nội dung</h1>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary">{items.length} mục</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tất cả nội dung</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không tìm thấy nội dung.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="space-y-1 flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {TYPE_LABELS[item.content_type] ?? item.content_type}
                      </Badge>
                      {item.score !== null && (
                        <span className="text-xs font-mono">{item.score}/100</span>
                      )}
                    </div>
                    <p className="text-sm truncate">{item.prompt}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.user_name} ({item.user_email}) &middot;{" "}
                      {item.project_name} &middot;{" "}
                      {new Date(item.created_at).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                  >
                    Xoá
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
