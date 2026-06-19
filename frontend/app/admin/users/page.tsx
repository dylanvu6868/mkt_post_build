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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  oauth_provider: string | null;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
  project_count: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    api.get<AdminUser[]>("/admin/users").then(setUsers).finally(() => setLoading(false));
  };

  useEffect(fetchUsers, []);

  const handleBan = async (userId: number) => {
    try {
      await api.patch(`/admin/users/${userId}/ban`);
      fetchUsers();
      toast.success("Đã cập nhật trạng thái");
    } catch {
      toast.error("Không thể cập nhật");
    }
  };

  const handleDelete = async (userId: number, email: string) => {
    if (!confirm(`Xoá người dùng ${email}? Không thể hoàn tác.`)) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      fetchUsers();
      toast.success("Đã xoá người dùng");
    } catch {
      toast.error("Không thể xoá");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
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
        <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
        <Badge variant="secondary">{users.length} người dùng</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tất cả người dùng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{u.name}</span>
                    {u.is_admin && <Badge>Admin</Badge>}
                    {u.is_banned && <Badge variant="destructive">Banned</Badge>}
                    {u.oauth_provider && (
                      <Badge variant="outline">{u.oauth_provider}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {u.email} &middot; {u.project_count} dự án &middot;{" "}
                    {new Date(u.created_at).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                {!u.is_admin && (
                  <div className="flex gap-2">
                    <Button
                      variant={u.is_banned ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleBan(u.id)}
                    >
                      {u.is_banned ? "Bỏ cấm" : "Cấm"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(u.id, u.email)}
                    >
                      Xoá
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
