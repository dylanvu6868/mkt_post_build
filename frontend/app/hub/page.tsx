"use client";

import { useEffect } from "react";
import { useMcpStore } from "@/store/mcp";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const btnSecondary = "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition disabled:opacity-50";

function StatusDot({ on }: { on: boolean }) {
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${on ? "bg-green-500" : "bg-zinc-400"}`} />;
}

export default function HubOverviewPage() {
  const { pages, pagesLoading, emailStats, emailStatsLoading, loadPages, loadEmailStats, getMetaOAuthUrl } = useMcpStore();

  useEffect(() => { loadPages(); loadEmailStats(); }, [loadPages, loadEmailStats]);

  const handleConnect = async () => {
    try { window.location.href = await getMetaOAuthUrl(); }
    catch { alert("Không thể tạo link kết nối. Thử lại sau."); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trung tâm Marketing</h1>
        <p className="text-sm text-muted-foreground mt-1">Quản lý Facebook, Email marketing từ một nơi duy nhất.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="rounded-lg bg-blue-500/10 p-2.5 text-blue-500">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">Facebook / Instagram</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <StatusDot on={pages.length > 0} />
                {pages.length > 0 ? `${pages.length} trang đã kết nối` : "Chưa kết nối"}
              </CardDescription>
            </div>
            <button onClick={handleConnect} className={btnSecondary}>
              {pages.length > 0 ? "Kết nối lại" : "Kết nối"}
            </button>
          </CardHeader>
          {pages.length > 0 && (
            <CardContent>
              <div className="space-y-2">
                {pages.map((p) => (
                  <div key={p.page_id} className="flex items-center justify-between rounded-md border p-2.5">
                    <div>
                      <p className="text-sm font-medium">{p.name || p.page_id}</p>
                      {p.category && <p className="text-xs text-muted-foreground">{p.category}</p>}
                    </div>
                    <Badge variant="secondary">{p.followers.toLocaleString()} followers</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="rounded-lg bg-orange-500/10 p-2.5 text-orange-500">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">Email Marketing</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <StatusDot on={true} /> Resend API — sẵn sàng
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {emailStatsLoading ? (
              <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-24" /></div>
            ) : emailStats ? (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><p className="text-2xl font-bold">{emailStats.total_sent}</p><p className="text-xs text-muted-foreground">Đã gửi</p></div>
                <div><p className="text-2xl font-bold">{emailStats.open_rate}%</p><p className="text-xs text-muted-foreground">Mở</p></div>
                <div><p className="text-2xl font-bold">{emailStats.click_rate}%</p><p className="text-xs text-muted-foreground">Click</p></div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {pagesLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardHeader><Skeleton className="h-8 w-16" /></CardHeader></Card>)
        ) : (
          <>
            <Card><CardHeader><CardDescription>Trang Facebook</CardDescription><CardTitle className="text-3xl">{pages.length}</CardTitle></CardHeader></Card>
            <Card><CardHeader><CardDescription>Tổng Followers</CardDescription><CardTitle className="text-3xl">{pages.reduce((s, p) => s + p.followers, 0).toLocaleString()}</CardTitle></CardHeader></Card>
            <Card><CardHeader><CardDescription>Chiến dịch Email</CardDescription><CardTitle className="text-3xl">{emailStats?.campaigns ?? 0}</CardTitle></CardHeader></Card>
            <Card><CardHeader><CardDescription>Email đã gửi</CardDescription><CardTitle className="text-3xl">{emailStats?.total_sent ?? 0}</CardTitle></CardHeader></Card>
          </>
        )}
      </div>
    </div>
  );
}
