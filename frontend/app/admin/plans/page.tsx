"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PLANS = ["free", "lite", "pro", "max"] as const;
type PlanId = (typeof PLANS)[number];

const PLAN_COLORS: Record<PlanId, string> = {
  free: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  lite: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  pro: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  max: "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

const PLAN_BAR_COLORS: Record<PlanId, string> = {
  free: "bg-zinc-500",
  lite: "bg-sky-500",
  pro: "bg-amber-500",
  max: "bg-violet-500",
};

interface PlanStats {
  distribution: Record<string, number>;
  expired_subscriptions: number;
}

interface AdminUser {
  id: number;
  name: string;
  email: string;
  plan: string;
  plan_expires_at: string | null;
  is_admin: boolean;
  is_banned: boolean;
}

export default function AdminPlansPage() {
  const [stats, setStats] = useState<PlanStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Bulk action state
  const [bulkPlan, setBulkPlan] = useState<PlanId>("lite");
  const [bulkDays, setBulkDays] = useState("7");
  const [bulkMode, setBulkMode] = useState<"all" | "selected">("all");
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Individual plan change
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [editPlan, setEditPlan] = useState<PlanId>("free");
  const [editDays, setEditDays] = useState("");

  const refresh = async () => {
    const [s, u] = await Promise.all([
      api.get<PlanStats>("/admin/plan-stats"),
      api.get<AdminUser[]>("/admin/users"),
    ]);
    setStats(s);
    setUsers(u);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const totalUsers = stats ? Object.values(stats.distribution).reduce((a, b) => a + b, 0) : 0;

  const handleBulkApply = async () => {
    if (!confirm(
      bulkMode === "all"
        ? `Chuyển TẤT CẢ người dùng sang gói ${bulkPlan.toUpperCase()}${bulkDays ? ` (dùng thử ${bulkDays} ngày)` : ""}?`
        : `Chuyển ${selectedUsers.size} người dùng đã chọn sang gói ${bulkPlan.toUpperCase()}${bulkDays ? ` (dùng thử ${bulkDays} ngày)` : ""}?`
    )) return;

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        plan: bulkPlan,
        exclude_admins: true,
      };
      if (bulkDays && bulkPlan !== "free") body.trial_days = parseInt(bulkDays);
      if (bulkMode === "selected") body.user_ids = Array.from(selectedUsers);

      const res = await api.post<{ updated: number; plan: string; expires_at: string | null }>("/admin/bulk-plan", body);
      toast.success(`Đã cập nhật ${res.updated} người dùng sang gói ${res.plan.toUpperCase()}`);
      setSelectedUsers(new Set());
      await refresh();
    } catch {
      toast.error("Không thể cập nhật hàng loạt");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetExpired = async () => {
    if (!confirm("Đặt lại tất cả tài khoản hết hạn về gói Free?")) return;
    setSubmitting(true);
    try {
      const res = await api.post<{ reset: number }>("/admin/bulk-reset-expired", {});
      toast.success(`Đã đặt lại ${res.reset} tài khoản hết hạn`);
      await refresh();
    } catch {
      toast.error("Không thể đặt lại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleIndividualPlan = async (userId: number) => {
    try {
      const body: Record<string, unknown> = { plan: editPlan };
      if (editPlan !== "free" && editDays) {
        const d = new Date();
        d.setDate(d.getDate() + parseInt(editDays));
        body.expires_at = d.toISOString();
      }
      await api.patch(`/admin/users/${userId}/plan`, body);
      toast.success("Đã cập nhật gói");
      setEditingUser(null);
      await refresh();
    } catch {
      toast.error("Không thể cập nhật");
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const nonAdmin = users.filter((u) => !u.is_admin);
    if (selectedUsers.size === nonAdmin.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(nonAdmin.map((u) => u.id)));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Quản lý gói dịch vụ</h1>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Quản lý gói dịch vụ</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Quản lý gói, dùng thử và phân phối người dùng</p>
      </div>

      {/* Plan Distribution */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {PLANS.map((p) => {
          const count = stats?.distribution[p] || 0;
          const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
          return (
            <Card key={p}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={cn("text-[11px] font-bold uppercase", PLAN_COLORS[p])}>{p}</Badge>
                  <span className="text-[12px] text-muted-foreground">{pct}%</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{count}</p>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", PLAN_BAR_COLORS[p])} style={{ width: `${pct}%` }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium text-muted-foreground">Hết hạn</span>
              {(stats?.expired_subscriptions ?? 0) > 0 && (
                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            <p className="text-2xl font-bold text-red-500">{stats?.expired_subscriptions ?? 0}</p>
            {(stats?.expired_subscriptions ?? 0) > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full text-[11px] text-red-400 border-red-500/20 hover:bg-red-500/10"
                onClick={handleResetExpired}
                disabled={submitting}
              >
                Đặt lại về Free
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px] flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Cập nhật gói hàng loạt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Target */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Đối tượng</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setBulkMode("all")}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-[13px] font-medium transition-all",
                    bulkMode === "all" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setBulkMode("selected")}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-[13px] font-medium transition-all",
                    bulkMode === "selected" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  Đã chọn ({selectedUsers.size})
                </button>
              </div>
            </div>

            {/* Plan */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Gói dịch vụ</label>
              <select
                value={bulkPlan}
                onChange={(e) => setBulkPlan(e.target.value as PlanId)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>{p.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* Trial Days */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Thời gian dùng thử (ngày)</label>
              <input
                type="number"
                min="0"
                value={bulkDays}
                onChange={(e) => setBulkDays(e.target.value)}
                placeholder="Vĩnh viễn nếu để trống"
                disabled={bulkPlan === "free"}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
              />
            </div>

            {/* Apply */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">&nbsp;</label>
              <Button
                onClick={handleBulkApply}
                disabled={submitting || (bulkMode === "selected" && selectedUsers.size === 0)}
                className="w-full"
              >
                {submitting ? "Đang xử lý..." : "Áp dụng"}
              </Button>
            </div>
          </div>

          {bulkPlan === "free" && (
            <p className="text-[12px] text-amber-400 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Chuyển về Free sẽ xóa thời hạn dùng thử
            </p>
          )}
        </CardContent>
      </Card>

      {/* User List with Selection & Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[15px]">Người dùng ({users.length})</CardTitle>
            <div className="flex items-center gap-2">
              {bulkMode === "selected" && (
                <Button variant="outline" size="sm" onClick={selectAll} className="text-[12px]">
                  {selectedUsers.size === users.filter((u) => !u.is_admin).length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map((u) => {
              const isExpired = u.plan_expires_at && new Date(u.plan_expires_at) < new Date();
              const isEditing = editingUser === u.id;

              return (
                <div
                  key={u.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 transition-all",
                    selectedUsers.has(u.id) ? "border-primary/40 bg-primary/5" : "border-border hover:bg-accent/50"
                  )}
                >
                  {/* Checkbox */}
                  {bulkMode === "selected" && !u.is_admin && (
                    <button
                      onClick={() => toggleSelect(u.id)}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all",
                        selectedUsers.has(u.id)
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30 hover:border-primary/50"
                      )}
                    >
                      {selectedUsers.has(u.id) && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </button>
                  )}

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-foreground truncate">{u.name}</span>
                      {u.is_admin && <Badge className="text-[10px]">Admin</Badge>}
                      {u.is_banned && <Badge variant="destructive" className="text-[10px]">Banned</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                  </div>

                  {/* Plan badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={cn("text-[11px] font-bold uppercase", PLAN_COLORS[(u.plan || "free") as PlanId] || PLAN_COLORS.free)}>
                      {u.plan || "free"}
                    </Badge>
                    {u.plan_expires_at && (
                      <span className={cn("text-[11px]", isExpired ? "text-red-400" : "text-muted-foreground")}>
                        {isExpired ? "Hết hạn" : `→ ${new Date(u.plan_expires_at).toLocaleDateString("vi-VN")}`}
                      </span>
                    )}

                    {/* Edit button */}
                    {!u.is_admin && !isEditing && (
                      <button
                        onClick={() => { setEditingUser(u.id); setEditPlan((u.plan || "free") as PlanId); setEditDays(""); }}
                        className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                        title="Chỉnh gói"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      </button>
                    )}
                  </div>

                  {/* Inline edit */}
                  {isEditing && (
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={editPlan}
                        onChange={(e) => setEditPlan(e.target.value as PlanId)}
                        className="rounded-lg border border-border bg-card px-2 py-1 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      >
                        {PLANS.map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                      </select>
                      {editPlan !== "free" && (
                        <input
                          type="number"
                          min="1"
                          value={editDays}
                          onChange={(e) => setEditDays(e.target.value)}
                          placeholder="Ngày"
                          className="w-16 rounded-lg border border-border bg-card px-2 py-1 text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      )}
                      <Button size="sm" onClick={() => handleIndividualPlan(u.id)} className="h-7 text-[11px]">Lưu</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingUser(null)} className="h-7 text-[11px]">Hủy</Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <h3 className="text-[14px] font-semibold text-foreground mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              Khuyến mãi nhanh
            </h3>
            <p className="text-[12px] text-muted-foreground mb-3">Tặng tất cả người dùng Free dùng thử gói Pro trong 3 ngày</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-[12px]"
              disabled={submitting}
              onClick={async () => {
                if (!confirm("Tặng tất cả user Free dùng thử Pro 3 ngày?")) return;
                setSubmitting(true);
                try {
                  const freeIds = users.filter((u) => (u.plan || "free") === "free" && !u.is_admin).map((u) => u.id);
                  if (freeIds.length === 0) { toast.info("Không có user Free"); return; }
                  const res = await api.post<{ updated: number }>("/admin/bulk-plan", { plan: "pro", trial_days: 3, user_ids: freeIds });
                  toast.success(`Đã tặng ${res.updated} user dùng thử Pro`);
                  await refresh();
                } catch { toast.error("Lỗi"); } finally { setSubmitting(false); }
              }}
            >
              Tặng Pro 3 ngày
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="text-[14px] font-semibold text-foreground mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              Xuất danh sách
            </h3>
            <p className="text-[12px] text-muted-foreground mb-3">Tải danh sách người dùng và gói dịch vụ dạng CSV</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-[12px]"
              onClick={() => {
                const csv = ["Tên,Email,Gói,Hết hạn,Trạng thái"]
                  .concat(users.map((u) => `"${u.name}","${u.email}",${u.plan || "free"},${u.plan_expires_at || ""},${u.is_banned ? "Banned" : "Active"}`))
                  .join("\n");
                const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = "users-plans.csv"; a.click();
                URL.revokeObjectURL(url);
                toast.success("Đã tải file CSV");
              }}
            >
              Tải CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="text-[14px] font-semibold text-foreground mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Dọn hết hạn
            </h3>
            <p className="text-[12px] text-muted-foreground mb-3">Đặt lại tất cả tài khoản đã hết hạn về gói Free</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-[12px] text-red-400 border-red-500/20 hover:bg-red-500/10"
              disabled={submitting || (stats?.expired_subscriptions ?? 0) === 0}
              onClick={handleResetExpired}
            >
              Reset {stats?.expired_subscriptions ?? 0} tài khoản
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
