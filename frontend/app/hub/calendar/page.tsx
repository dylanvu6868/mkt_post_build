"use client";

import { useEffect, useMemo, useState } from "react";
import { useMcpStore, type ContentItem } from "@/store/mcp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Shared style constants                                              */
/* ------------------------------------------------------------------ */
const btn =
  "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50";
const btn2 =
  "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition disabled:opacity-50";
const btnDanger =
  "inline-flex items-center gap-2 rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition disabled:opacity-50";
const btnSmall =
  "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted transition disabled:opacity-50";
const inp =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["review", "archived"],
  review: ["draft", "approved", "archived"],
  approved: ["published", "archived"],
  published: ["archived"],
  archived: [],
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Nháp",
  review: "Đang duyệt",
  approved: "Đã duyệt",
  published: "Đã xuất bản",
  archived: "Lưu trữ",
};

const TYPE_LABELS: Record<string, string> = {
  blog: "Blog",
  social: "Social",
  email: "Email",
  landing: "Landing",
};

const CONTENT_TYPES = ["blog", "social", "email", "landing"];

const KANBAN_COLUMNS: { key: string; label: string }[] = [
  { key: "draft", label: "Nháp" },
  { key: "review", label: "Đang duyệt" },
  { key: "approved", label: "Đã duyệt" },
  { key: "published", label: "Đã xuất bản" },
];

function typeBadgeVariant(t: string) {
  if (t === "blog") return "default" as const;
  if (t === "social") return "secondary" as const;
  if (t === "email") return "outline" as const;
  return "secondary" as const;
}

/* ------------------------------------------------------------------ */
/*  Overview Strip                                                      */
/* ------------------------------------------------------------------ */
function OverviewStrip() {
  const { calendarOverview, loadCalendarOverview } = useMcpStore();

  useEffect(() => { loadCalendarOverview(); }, [loadCalendarOverview]);

  if (!calendarOverview) return null;

  return (
    <div className="flex gap-3 flex-wrap">
      <div className="rounded-lg border px-3 py-2 text-sm">
        <span className="text-muted-foreground">Tổng: </span>
        <span className="font-medium">{calendarOverview.total}</span>
      </div>
      {Object.entries(calendarOverview.by_status).map(([status, count]) => (
        <div key={status} className="rounded-lg border px-3 py-2 text-sm">
          <span className="text-muted-foreground">{STATUS_LABELS[status] ?? status}: </span>
          <span className="font-medium">{count}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick Create Dialog                                                 */
/* ------------------------------------------------------------------ */
function QuickCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const { createCalendarItem } = useMcpStore();
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState("blog");
  const [scheduledDate, setScheduledDate] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setContentType("blog");
    setScheduledDate("");
    setTags("");
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  const handleCreate = async () => {
    if (!title) return;
    setSubmitting(true);
    try {
      await createCalendarItem({
        title,
        content_type: contentType,
        scheduled_date: scheduledDate || undefined,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      });
      toast.success("Đã tạo nội dung!");
      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi tạo nội dung";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo nội dung mới</DialogTitle>
          <DialogDescription>Điền thông tin nội dung cho lịch.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <input className={inp} placeholder="Tiêu đề *" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div>
            <label className="text-sm font-medium mb-1 block">Loại nội dung</label>
            <select className={inp} value={contentType} onChange={(e) => setContentType(e.target.value)}>
              {CONTENT_TYPES.map((ct) => (
                <option key={ct} value={ct}>{TYPE_LABELS[ct] ?? ct}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Ngày lên lịch</label>
            <input type="date" className={inp} value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
          </div>
          <input className={inp} placeholder="Tags (phân cách bằng dấu phẩy)" value={tags} onChange={(e) => setTags(e.target.value)} />
          <button className={btn} onClick={handleCreate} disabled={submitting || !title}>
            {submitting ? "Đang tạo..." : "Tạo"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Kanban Card                                                         */
/* ------------------------------------------------------------------ */
function KanbanCard({ item, onRefresh }: { item: ContentItem; onRefresh: () => void }) {
  const { updateCalendarItemStatus, deleteCalendarItem } = useMcpStore();
  const transitions = VALID_TRANSITIONS[item.status] ?? [];

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateCalendarItemStatus(item.id, newStatus);
      toast.success(`Đã chuyển sang "${STATUS_LABELS[newStatus] ?? newStatus}"`);
      onRefresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi chuyển trạng thái";
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCalendarItem(item.id);
      toast.success("Đã xóa nội dung!");
      onRefresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi xóa";
      toast.error(msg);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2 shadow-sm">
      <p className="text-sm font-medium leading-tight">{item.title}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant={typeBadgeVariant(item.content_type)}>{TYPE_LABELS[item.content_type] ?? item.content_type}</Badge>
        {item.scheduled_date && (
          <span className="text-xs text-muted-foreground">{item.scheduled_date}</span>
        )}
      </div>
      {item.tags && item.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {item.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        {transitions.length > 0 && (
          <select
            className="rounded border bg-background px-1.5 py-0.5 text-xs outline-none"
            value=""
            onChange={(e) => { if (e.target.value) handleStatusChange(e.target.value); }}
          >
            <option value="">Chuyển...</option>
            {transitions.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
            ))}
          </select>
        )}
        <button className={btnDanger} onClick={handleDelete}>Xóa</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Kanban View                                                         */
/* ------------------------------------------------------------------ */
function KanbanView({ items, loading, onRefresh }: { items: ContentItem[]; loading: boolean; onRefresh: () => void }) {
  const archivedItems = items.filter((i) => i.status === "archived");

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KANBAN_COLUMNS.map((col) => (
          <div key={col.key} className="space-y-2">
            <Skeleton className="h-6 w-24" />
            {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KANBAN_COLUMNS.map((col) => {
          const colItems = items.filter((i) => i.status === col.key);
          return (
            <div key={col.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <Badge variant="secondary" className="text-xs">{colItems.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[60px] rounded-lg bg-muted/30 p-2">
                {colItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Trống</p>
                ) : (
                  colItems.map((item) => <KanbanCard key={item.id} item={item} onRefresh={onRefresh} />)
                )}
              </div>
            </div>
          );
        })}
      </div>

      {archivedItems.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Lưu trữ ({archivedItems.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {archivedItems.map((item) => (
              <KanbanCard key={item.id} item={item} onRefresh={onRefresh} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Calendar View                                                       */
/* ------------------------------------------------------------------ */
function CalendarView({
  items,
  loading,
  month: currentMonth,
  onMonthChange,
}: {
  items: ContentItem[];
  loading: boolean;
  month: string;
  onMonthChange: (month: string) => void;
}) {
  const [year, month] = currentMonth.split("-").map(Number);

  const navigate = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  /* Build calendar grid */
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDow = firstDay.getDay(); // 0=Sun
    const totalDays = lastDay.getDate();

    const days: { date: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Leading blanks
    for (let i = 0; i < startDow; i++) {
      const d = new Date(year, month - 1, -startDow + i + 1);
      days.push({
        date: d.toISOString().slice(0, 10),
        dayNum: d.getDate(),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ date: dateStr, dayNum: d, isCurrentMonth: true });
    }

    // Trailing blanks to fill last week
    while (days.length % 7 !== 0) {
      const d = new Date(year, month, days.length - startDow - totalDays + 1);
      days.push({
        date: d.toISOString().slice(0, 10),
        dayNum: d.getDate(),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  /* Group items by date */
  const itemsByDate = useMemo(() => {
    const map = new Map<string, ContentItem[]>();
    for (const item of items) {
      if (!item.scheduled_date) continue;
      const dateKey = item.scheduled_date.slice(0, 10);
      const arr = map.get(dateKey) ?? [];
      arr.push(item);
      map.set(dateKey, arr);
    }
    return map;
  }, [items]);

  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="flex items-center gap-3">
        <button className={btnSmall} onClick={() => navigate(-1)}>&larr; Trước</button>
        <span className="text-sm font-semibold capitalize">{monthLabel}</span>
        <button className={btnSmall} onClick={() => navigate(1)}>Sau &rarr;</button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 min-w-[700px]">
            {/* Day headers */}
            {dayNames.map((d) => (
              <div key={d} className="border-b px-1 py-1 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
            {/* Day cells */}
            {calendarDays.map((day) => {
              const dayItems = itemsByDate.get(day.date) ?? [];
              return (
                <div
                  key={day.date}
                  className={`border p-1 min-h-[80px] ${day.isCurrentMonth ? "bg-background" : "bg-muted/20"}`}
                >
                  <div className={`text-xs mb-1 ${day.isCurrentMonth ? "font-medium" : "text-muted-foreground"}`}>
                    {day.dayNum}
                  </div>
                  <div className="space-y-0.5">
                    {dayItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded px-1 py-0.5 text-[10px] leading-tight truncate bg-primary/10 text-primary cursor-default"
                        title={`${item.title} (${STATUS_LABELS[item.status] ?? item.status})`}
                      >
                        <Badge variant={typeBadgeVariant(item.content_type)} className="text-[8px] px-1 py-0 mr-0.5">
                          {TYPE_LABELS[item.content_type]?.[0] ?? item.content_type[0]?.toUpperCase()}
                        </Badge>
                        {item.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */
export default function CalendarPage() {
  const { calendarItems, calendarLoading, loadCalendarItems, loadCalendarOverview } = useMcpStore();
  const [view, setView] = useState<"kanban" | "calendar">("kanban");
  const [createOpen, setCreateOpen] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const reload = () => {
    loadCalendarItems({
      content_type: filterType || undefined,
      status: filterStatus || undefined,
      ...(view === "calendar" ? { month: currentMonth } : {}),
    });
    loadCalendarOverview();
  };

  useEffect(() => { reload(); }, [view, filterType, filterStatus, currentMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Lịch nội dung</h1>
        <button className={btn} onClick={() => setCreateOpen(true)}>Tạo nội dung</button>
      </div>

      {/* Overview strip */}
      <OverviewStrip />

      {/* Filter bar + view toggle */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <select className={inp + " max-w-[180px]"} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Tất cả loại</option>
              {CONTENT_TYPES.map((ct) => (
                <option key={ct} value={ct}>{TYPE_LABELS[ct] ?? ct}</option>
              ))}
            </select>
            <select className={inp + " max-w-[180px]"} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <div className="ml-auto flex gap-2">
              <button className={view === "kanban" ? btn : btn2} onClick={() => setView("kanban")}>Kanban</button>
              <button className={view === "calendar" ? btn : btn2} onClick={() => setView("calendar")}>Lịch</button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Views */}
      <Card>
        <CardHeader>
          <CardTitle>{view === "kanban" ? "Bảng Kanban" : "Lịch tháng"}</CardTitle>
        </CardHeader>
        <CardContent>
          {view === "kanban" ? (
            <KanbanView items={calendarItems} loading={calendarLoading} onRefresh={reload} />
          ) : (
            <CalendarView items={calendarItems} loading={calendarLoading} month={currentMonth} onMonthChange={setCurrentMonth} />
          )}
        </CardContent>
      </Card>

      {/* Quick create dialog */}
      <QuickCreateDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={reload} />
    </div>
  );
}
