"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UserRow {
  id: number;
  name: string;
  email: string;
  oauth_provider: string | null;
  is_admin: boolean;
  is_banned: boolean;
  plan: string;
  plan_expires_at: string | null;
  created_at: string | null;
  project_count: number;
}

const PLAN_TIERS = [
  { key: "lite", label: "Lite", color: "bg-zinc-500", badge: "text-zinc-500 border-zinc-500/30", price: "Miễn phí", monthly: 0 },
  { key: "pro", label: "Pro", color: "bg-blue-500", badge: "text-blue-500 border-blue-500/30", price: "89.000₫/tháng", monthly: 89000 },
  { key: "max", label: "Max", color: "bg-amber-500", badge: "text-amber-500 border-amber-500/30", price: "219.000₫/tháng", monthly: 219000 },
];

function planBadge(plan: string) {
  const tier = PLAN_TIERS.find((t) => t.key === plan) || PLAN_TIERS[0];
  return <Badge variant="outline" className={cn("text-[10px] font-semibold", tier.badge)}>{tier.label}</Badge>;
}

export default function AdminPaymentsPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPlan, setEditPlan] = useState("lite");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<UserRow[]>("/admin/users").then(setUsers).finally(() => setLoading(false));
  }, []);

  const handleSavePlan = async (userId: number) => {
    setSaving(true);
    try {
      await api.patch(`/admin/users/${userId}/plan`, { plan: editPlan });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, plan: editPlan } : u));
      toast.success(`Đã chuyển sang gói ${editPlan.toUpperCase()}`);
      setEditingId(null);
    } catch {
      toast.error("Không thể cập nhật gói");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Thanh toán & Gói dịch vụ</h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const totalUsers = users.length;
  const countByPlan = (p: string) => users.filter((u) => (u.plan || "lite") === p).length;
  const paidUsers = users.filter((u) => u.plan && u.plan !== "lite").length;
  const mrr = users.reduce((sum, u) => {
    const tier = PLAN_TIERS.find((t) => t.key === (u.plan || "lite"));
    return sum + (tier?.monthly || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Thanh toán & Gói dịch vụ</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Quản lý gói đăng ký và doanh thu · Tích hợp SePay</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Tổng người dùng</p>
            <p className="text-2xl font-bold text-foreground mt-2">{totalUsers}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{paidUsers} trả phí</p>
          </CardContent>
        </Card>
        {PLAN_TIERS.map((tier) => (
          <Card key={tier.key}>
            <CardContent className="p-5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Gói {tier.label}</p>
              <p className="text-2xl font-bold text-foreground mt-2">{countByPlan(tier.key)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{tier.price}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[15px]">Tổng quan doanh thu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[10px] border border-border p-4 text-center">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">MRR (Doanh thu hàng tháng)</p>
              <p className="text-xl font-bold text-foreground mt-1">{mrr.toLocaleString("vi-VN")}₫</p>
            </div>
            <div className="rounded-[10px] border border-border p-4 text-center">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Người dùng trả phí</p>
              <p className="text-xl font-bold text-foreground mt-1">{paidUsers}</p>
            </div>
            <div className="rounded-[10px] border border-border p-4 text-center">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Tỉ lệ chuyển đổi</p>
              <p className="text-xl font-bold text-foreground mt-1">{totalUsers > 0 ? Math.round((paidUsers / totalUsers) * 100) : 0}%</p>
              <p className="text-[10px] text-muted-foreground">Free → Trả phí</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[15px]">Bảng giá hiện tại</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {PLAN_TIERS.map((tier) => (
              <div key={tier.key} className="rounded-[10px] border border-border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", tier.color)} />
                  <span className="text-[13px] font-semibold text-foreground">{tier.label}</span>
                </div>
                <p className="text-[12px] text-muted-foreground">{tier.price}</p>
                <div className="text-[11px] text-muted-foreground space-y-1 pt-1">
                  {tier.key === "lite" && <><p>• 5 lượt tạo/ngày</p><p>• 1 dự án</p><p>• Chatbot cơ bản</p></>}
                  {tier.key === "pro" && <><p>• 50 lượt tạo/ngày</p><p>• 10 dự án</p><p>• Tất cả loại nội dung</p><p>• RAG nâng cao</p></>}
                  {tier.key === "max" && <><p>• Không giới hạn</p><p>• Dự án không giới hạn</p><p>• API access</p><p>• Hỗ trợ ưu tiên</p></>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[15px]">Quản lý gói người dùng</CardTitle>
            <Badge variant="secondary">{users.length} người</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có người dùng.</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-[10px] border border-border p-3 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
                      {u.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium text-foreground truncate">{u.name}</p>
                        {u.is_admin && <Badge className="text-[9px] px-1.5 py-0" variant="destructive">Admin</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId === u.id ? (
                      <>
                        <Select value={editPlan} onValueChange={setEditPlan}>
                          <SelectTrigger className="w-24 h-8 text-[11px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lite">Lite</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="max">Max</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="h-8 text-[11px] px-3" onClick={() => handleSavePlan(u.id)} disabled={saving}>
                          Lưu
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-[11px] px-2" onClick={() => setEditingId(null)}>
                          Huỷ
                        </Button>
                      </>
                    ) : (
                      <>
                        {planBadge(u.plan || "lite")}
                        {u.plan_expires_at && (
                          <span className="text-[10px] text-muted-foreground">
                            đến {new Date(u.plan_expires_at).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] px-2"
                          onClick={() => { setEditingId(u.id); setEditPlan(u.plan || "lite"); }}
                        >
                          Chỉnh gói
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-[14px] border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-amber-500"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          <div className="text-[12px] text-muted-foreground space-y-1">
            <p><strong className="text-foreground">Tích hợp SePay</strong>: Webhook tự động nâng gói khi nhận chuyển khoản.</p>
            <p>Endpoint: <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">POST /payments/sepay-webhook</code></p>
            <p>Cấu hình webhook URL trong SePay dashboard trỏ tới endpoint trên.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
