"use client";

import { useEffect, useState } from "react";
import { useMcpStore } from "@/store/mcp";
import type { MetaPage } from "@/store/mcp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const btn = "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50";
const btn2 = "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition disabled:opacity-50";
const inp = "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50";
const ta = inp + " min-h-[120px] resize-y";

export default function FacebookPage() {
  const { pages, pagesLoading, publishing, comments, commentsLoading, loadPages, publishPost, schedulePost, loadComments, replyComment, getMetaOAuthUrl } = useMcpStore();
  const [sel, setSel] = useState<MetaPage | null>(null);
  const [msg, setMsg] = useState("");
  const [img, setImg] = useState("");
  const [mode, setMode] = useState<"pub" | "sched">("pub");
  const [schedTime, setSchedTime] = useState("");
  const [postId, setPostId] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyMsg, setReplyMsg] = useState("");
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => { loadPages(); }, [loadPages]);
  useEffect(() => { if (pages.length && !sel) setSel(pages[0]); }, [pages, sel]);

  const handlePub = async () => {
    if (!sel || !msg.trim()) return;
    try {
      const r = mode === "sched" && schedTime
        ? await schedulePost(sel.page_id, msg, new Date(schedTime).toISOString())
        : await publishPost(sel.page_id, msg, img || undefined);
      setResult(`${mode === "sched" ? "Đã lên lịch" : "Đăng thành công"}! Post ID: ${r.post_id}`);
      setMsg(""); setImg("");
    } catch (e: any) { setResult(`Lỗi: ${e.message}`); }
  };

  const handleReply = async (cid: string) => {
    if (!sel || !replyMsg.trim()) return;
    try {
      await replyComment(sel.page_id, cid, replyMsg);
      setReplyTo(null); setReplyMsg("");
      if (postId) await loadComments(sel.page_id, postId);
    } catch (e: any) { alert(e.message); }
  };

  if (pagesLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  if (!pages.length) return (
    <Card><CardContent className="flex flex-col items-center gap-4 py-12">
      <div className="rounded-full bg-blue-500/10 p-4 text-blue-500">
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
      </div>
      <h3 className="text-lg font-semibold">Kết nối Facebook để bắt đầu</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md">Liên kết tài khoản Facebook để đăng bài, lên lịch, xem bình luận và phân tích.</p>
      <button onClick={async () => { try { window.location.href = await getMetaOAuthUrl(); } catch {} }} className={btn}>Kết nối Facebook</button>
    </CardContent></Card>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Facebook</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Tạo bài đăng</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <select className={inp} value={sel?.page_id ?? ""} onChange={e => setSel(pages.find(p => p.page_id === e.target.value) ?? null)}>
                {pages.map(p => <option key={p.page_id} value={p.page_id}>{p.name || p.page_id} ({p.followers.toLocaleString()})</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={() => setMode("pub")} className={mode === "pub" ? btn : btn2}>Đăng ngay</button>
                <button onClick={() => setMode("sched")} className={mode === "sched" ? btn : btn2}>Lên lịch</button>
              </div>
              {mode === "sched" && <input type="datetime-local" className={inp} value={schedTime} onChange={e => setSchedTime(e.target.value)} />}
              <textarea className={ta} placeholder="Nội dung bài đăng..." value={msg} onChange={e => setMsg(e.target.value)} />
              <input className={inp} placeholder="URL hình ảnh (tùy chọn)" value={img} onChange={e => setImg(e.target.value)} />
              <div className="flex items-center gap-3">
                <button onClick={handlePub} disabled={publishing || !msg.trim()} className={btn}>
                  {publishing ? "Đang xử lý..." : mode === "sched" ? "Lên lịch" : "Đăng bài"}
                </button>
                {result && <p className="text-sm text-muted-foreground">{result}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Bình luận</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <input className={inp} placeholder="Post ID" value={postId} onChange={e => setPostId(e.target.value)} />
                <button onClick={() => sel && postId && loadComments(sel.page_id, postId)} disabled={commentsLoading || !postId.trim()} className={btn2}>
                  {commentsLoading ? "..." : "Tải"}
                </button>
              </div>
              {comments.length > 0 && (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {comments.map(c => (
                    <div key={c.id} className="rounded-md border p-3 space-y-1">
                      <div className="flex justify-between">
                        <p className="text-xs font-medium">{c.from?.name ?? "?"}</p>
                        <p className="text-xs text-muted-foreground">{new Date(c.created_time).toLocaleString()}</p>
                      </div>
                      <p className="text-sm">{c.message}</p>
                      {replyTo === c.id ? (
                        <div className="flex gap-2 mt-1">
                          <input className={inp} placeholder="Trả lời..." value={replyMsg} onChange={e => setReplyMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && handleReply(c.id)} />
                          <button onClick={() => handleReply(c.id)} className={btn}>Gửi</button>
                          <button onClick={() => setReplyTo(null)} className={btn2}>Hủy</button>
                        </div>
                      ) : (
                        <button onClick={() => setReplyTo(c.id)} className="text-xs text-primary hover:underline">Trả lời</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader><CardTitle className="text-sm">Trang đã kết nối</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pages.map(p => (
              <button key={p.page_id} onClick={() => setSel(p)} className={`w-full text-left rounded-md border p-2.5 transition ${sel?.page_id === p.page_id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
                <p className="text-sm font-medium">{p.name || p.page_id}</p>
                <div className="flex items-center gap-2 mt-1">
                  {p.category && <Badge variant="outline" className="text-xs">{p.category}</Badge>}
                  <span className="text-xs text-muted-foreground">{p.followers.toLocaleString()} followers</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
