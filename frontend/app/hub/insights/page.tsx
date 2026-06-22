"use client";

import { useEffect, useState } from "react";
import { useMcpStore } from "@/store/mcp";
import type { MetaPage } from "@/store/mcp";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const btn = "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50";
const btn2 = "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition disabled:opacity-50";
const inp = "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50";

export default function InsightsPage() {
  const { pages, pagesLoading, insights, insightsLoading, loadPages, loadInsights } = useMcpStore();
  const [sel, setSel] = useState<MetaPage | null>(null);
  const [days, setDays] = useState(7);

  useEffect(() => { loadPages(); }, [loadPages]);
  useEffect(() => { if (pages.length && !sel) setSel(pages[0]); }, [pages, sel]);
  useEffect(() => { if (sel) loadInsights(sel.page_id, days); }, [sel, days, loadInsights]);

  if (pagesLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  if (!pages.length) return (
    <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Kết nối Facebook để xem thống kê.</p></CardContent></Card>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Insights</h1>

      <div className="flex items-center gap-4 flex-wrap">
        <select className={inp + " max-w-xs"} value={sel?.page_id ?? ""} onChange={e => setSel(pages.find(p => p.page_id === e.target.value) ?? null)}>
          {pages.map(p => <option key={p.page_id} value={p.page_id}>{p.name || p.page_id}</option>)}
        </select>
        <div className="flex gap-1">
          {[7, 14, 28].map(d => (
            <button key={d} onClick={() => setDays(d)} className={days === d ? btn : btn2}>{d} ngày</button>
          ))}
        </div>
      </div>

      {insightsLoading ? (
        <div className="grid gap-4 md:grid-cols-3">{[1,2,3].map(i => <Card key={i}><CardHeader><Skeleton className="h-10 w-20" /></CardHeader></Card>)}</div>
      ) : insights ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                </div>
                <div><CardDescription>Tiếp cận (Reach)</CardDescription><CardTitle className="text-3xl">{insights.reach.toLocaleString()}</CardTitle></div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-2 text-green-500">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div><CardDescription>Tương tác</CardDescription><CardTitle className="text-3xl">{insights.engagement.toLocaleString()}</CardTitle></div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="rounded-lg bg-purple-500/10 p-2 text-purple-500">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                </div>
                <div><CardDescription>Followers</CardDescription><CardTitle className="text-3xl">{insights.followers.toLocaleString()}</CardTitle></div>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Tỷ lệ tương tác</CardTitle></CardHeader>
            <CardContent>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Engagement Rate</span>
                <span className="text-sm font-medium">{insights.reach > 0 ? (insights.engagement / insights.reach * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all" style={{ width: `${Math.min(insights.reach > 0 ? insights.engagement / insights.reach * 100 : 0, 100)}%` }} />
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground">Không có dữ liệu insights.</p></CardContent></Card>
      )}
    </div>
  );
}
