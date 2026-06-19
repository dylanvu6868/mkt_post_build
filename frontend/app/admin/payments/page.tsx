"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface UserRow {
  id: number;
  name: string;
  email: string;
  oauth_provider: string | null;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string | null;
  project_count: number;
}

const PLAN_TIERS = [
  { key: "lite", label: "Lite", color: "bg-zinc-500", price: "Miễn phí" },
  { key: "pro", label: "Pro", color: "bg-blue-500", price: "199.000₫/tháng" },
  { key: "max", label: "Max", color: "bg-amber-500", price: "499.000₫/tháng" },
];

export default function AdminPaymentsPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<UserRow[]>("/admin/users").then(setUsers).finally(() => setLoading(false));
  }, []);

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
  const activeUsers = users.filter((u) => !u.is_banned).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Thanh toán & Gói dịch vụ</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Quản lý gói đăng ký và doanh thu</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Tổng người dùng</p>
            <p className="text-2xl font-bold text-foreground mt-2">{totalUsers}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{activeUsers} đang hoạt động</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Gói Lite (Free)</p>
            <p className="text-2xl font-bold text-foreground mt-2">{totalUsers}</p>
            <p className="text-[11px] text-muted-foreground mt-1">100% người dùng</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Gói Pro</p>
            <p className="text-2xl font-bold text-foreground mt-2">0</p>
            <p className="text-[11px] text-muted-foreground mt-1">199.000₫/tháng</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Gói Max</p>
            <p className="text-2xl font-bold text-foreground mt-2">0</p>
            <p className="text-[11px] text-muted-foreground mt-1">499.000₫/tháng</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[15px]">Tổng quan doanh thu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[10px] border border-border p-4 text-center">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">MRR (Doanh thu hàng tháng)</p>
              <p className="text-xl font-bold text-foreground mt-1">0₫</p>
            </div>
            <div className="rounded-[10px] border border-border p-4 text-center">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Tổng doanh thu</p>
              <p className="text-xl font-bold text-foreground mt-1">0₫</p>
            </div>
            <div className="rounded-[10px] border border-border p-4 text-center">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Tỉ lệ chuyển đổi</p>
              <p className="text-xl font-bold text-foreground mt-1">0%</p>
              <p className="text-[10px] text-muted-foreground">Free → Trả phí</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Tiers */}
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
                  {tier.key === "lite" && (
                    <>
                      <p>• 5 lượt tạo/ngày</p>
                      <p>• 1 dự án</p>
                      <p>• Chatbot cơ bản</p>
                    </>
                  )}
                  {tier.key === "pro" && (
                    <>
                      <p>• 50 lượt tạo/ngày</p>
                      <p>• 10 dự án</p>
                      <p>• Tất cả loại nội dung</p>
                      <p>• RAG nâng cao</p>
                    </>
                  )}
                  {tier.key === "max" && (
                    <>
                      <p>• Không giới hạn</p>
                      <p>• Dự án không giới hạn</p>
                      <p>• API access</p>
                      <p>• Hỗ trợ ưu tiên</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Subscription List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[15px]">Danh sách người dùng</CardTitle>
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
                        {u.is_banned && <Badge className="text-[9px] px-1.5 py-0" variant="secondary">Bị khoá</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px]">Lite</Badge>
                    <span className="text-[11px] text-muted-foreground font-mono">{u.project_count} dự án</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground text-center pb-4">
        Hệ thống thanh toán sẽ kích hoạt khi tích hợp cổng thanh toán (VNPay / MoMo / Stripe).
        Hiện tại tất cả người dùng đều sử dụng gói Lite miễn phí.
      </p>
    </div>
  );
}
