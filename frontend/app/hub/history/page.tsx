"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  History,
  FlaskConical,
  FileText,
  LayoutGrid,
  Mail,
  Search,
  ExternalLink,
  Loader2,
  type LucideIcon,
} from "lucide-react";

interface UnifiedHistoryItem {
  id: string;
  source: string;
  tool: string;
  title: string;
  snippet: string;
  status: string;
  created_at: string;
  route: string;
}

const SOURCE_FILTERS: { value: string | null; label: string }[] = [
  { value: null, label: "Tất cả" },
  { value: "landing", label: "Landing" },
  { value: "email", label: "Email" },
  { value: "lab", label: "Lab & Report" },
  { value: "seo", label: "SEO" },
  { value: "content", label: "Content" },
];

const SOURCE_ICONS: Record<string, LucideIcon> = {
  lab: FlaskConical,
  content: FileText,
  landing: LayoutGrid,
  email: Mail,
  seo: Search,
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Bản nháp",
  published: "Đã xuất bản",
  template: "Template",
  done: "Hoàn tất",
};

function statusBadgeClass(status: string) {
  if (status === "draft") return "bg-amber-500/10 text-amber-500";
  if (status === "published") return "bg-emerald-500/10 text-emerald-500";
  return "bg-primary/10 text-primary";
}

export default function HubHistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<UnifiedHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api
      .get<UnifiedHistoryItem[]>("/history/unified")
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (filter) list = list.filter((i) => i.source === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.snippet.toLowerCase().includes(q) ||
          i.tool.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, filter, query]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
          <History className="h-8 w-8 text-primary" />
          Lịch sử của tôi
        </h1>
        <p className="mt-2 text-muted-foreground">
          Mọi thứ bạn đã tạo với Vitba — landing page, email, báo cáo, ảnh, nội dung — ở một nơi duy nhất.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {SOURCE_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
              filter === f.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
        <input
          className="ml-auto w-56 rounded-xl border border-border bg-background px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
          placeholder="Tìm trong lịch sử..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Đang tải lịch sử...
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <History className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              {items.length === 0
                ? "Chưa có hoạt động nào. Hãy thử tạo một Landing Page hoặc Email!"
                : "Không tìm thấy kết quả phù hợp."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const Icon = SOURCE_ICONS[item.source] ?? FileText;
            return (
              <Card key={item.id} className="group transition-all hover:border-primary/30">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(item.status)}`}
                      >
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.tool}
                      {item.snippet ? ` — ${item.snippet}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                    <button
                      onClick={() => router.push(item.route)}
                      className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-0 transition-all hover:border-primary/40 hover:text-primary group-hover:opacity-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Mở lại
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
