"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  RefreshCw,
  Send,
  CalendarClock,
  MessageSquare,
  BarChart3,
  Trash2,
  Users,
  TrendingUp,
  Eye,
  Share2,
  Mail,
} from "lucide-react";
import { FacebookIcon } from "@/components/brand-icons";
import { btn, btnOutline, btnGhost, btnDanger, inp, ta } from "@/lib/ui-tokens";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MetaPage {
  id: string;
  name: string;
  category?: string;
  picture_url?: string;
  followers_count?: number;
}

interface MetaStatus {
  connected: boolean;
  provider_user_id?: string;
  pages?: MetaPage[];
}

interface Comment {
  id: string;
  from?: { name?: string; id?: string };
  message: string;
  created_time: string;
  like_count?: number;
}

interface InsightsData {
  page_id: string;
  range: string;
  reach: number;
  engagement: number;
  followers: number;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MetaHubPage() {
  const [status, setStatus] = useState<MetaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pages");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<MetaStatus>("/mcp/meta/status");
      setStatus(data);
    } catch (e) {
      if (e instanceof ApiError && e.status !== 403) toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected")) toast.success("Đã kết nối Meta thành công!");
    if (params.get("error")) toast.error("Kết nối Meta thất bại. Vui lòng thử lại.");
  }, [loadStatus]);

  const handleConnect = async () => {
    try {
      const data = await api.get<{ authorize_url: string; state: string }>("/mcp/meta/connect");
      // Open Facebook OAuth in same tab; the callback will redirect back here.
      // NOTE: the state must carry user id — the backend builds it. For MVP we
      // append user id to state on the frontend so the callback can identify the user.
      window.location.href = data.authorize_url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không lấy được URL kết nối");
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.post("/mcp/meta/disconnect");
      setStatus({ connected: false });
      toast.success("Đã ngắt kết nối Meta");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi ngắt kết nối");
    }
  };

  const handleSyncPages = async () => {
    try {
      await api.post("/mcp/meta/sync-pages");
      await loadStatus();
      toast.success("Đã đồng bộ trang");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi đồng bộ trang");
    }
  };

  const connected = status?.connected ?? false;
  const pages = status?.pages ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-border/50 pb-5">
        <div className="flex items-center gap-2.5 mb-1.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Meta Publisher</h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
            Beta
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
          Đăng bài, lên lịch, trả lời bình luận và xem thống kê Facebook Page — trực tiếp từ Vitba.
        </p>
      </div>

      {/* Connect card */}
      <Card>
        <CardContent className="flex items-center gap-4 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary shrink-0">
            <FacebookIcon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            {loading ? (
              <Skeleton className="h-5 w-40" />
            ) : connected ? (
              <>
                <p className="text-sm font-medium text-foreground">Đã kết nối Facebook</p>
                <p className="text-xs text-muted-foreground">{pages.length} trang đang quản lý</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">Chưa kết nối Meta</p>
                <p className="text-xs text-muted-foreground">Kết nối tài khoản Facebook để đăng bài lên Fanpage</p>
              </>
            )}
          </div>
          {connected ? (
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleSyncPages} className={btnGhost + " text-xs"}>
                <RefreshCw size={13} /> Đồng bộ
              </button>
              <button onClick={handleDisconnect} className={btnDanger + " text-xs"}>
                <Trash2 size={13} /> Ngắt kết nối
              </button>
            </div>
          ) : (
            <button onClick={handleConnect} className={btn + " text-xs"}>
              <FacebookIcon size={14} /> Kết nối Facebook
            </button>
          )}
        </CardContent>
      </Card>

      {connected && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40 rounded-full mb-4" />
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pages" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <Users size={14} /> Trang
            </TabsTrigger>
            <TabsTrigger value="post" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <Send size={14} /> Đăng bài
            </TabsTrigger>
            <TabsTrigger value="crosspost" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <Share2 size={14} /> Cross-Post
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <MessageSquare size={14} /> Bình luận
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <BarChart3 size={14} /> Thống kê
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pages" className="mt-4">
            <PagesTab pages={pages} onSync={handleSyncPages} />
          </TabsContent>
          <TabsContent value="post" className="mt-4">
            <PostTab pages={pages} />
          </TabsContent>
          <TabsContent value="crosspost" className="mt-4">
            <CrossPostTab pages={pages} />
          </TabsContent>
          <TabsContent value="comments" className="mt-4">
            <CommentsTab />
          </TabsContent>
          <TabsContent value="insights" className="mt-4">
            <InsightsTab pages={pages} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pages Tab                                                          */
/* ------------------------------------------------------------------ */

function PagesTab({ pages, onSync }: { pages: MetaPage[]; onSync: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Trang Facebook của bạn</h2>
        <button onClick={onSync} className={btnGhost + " text-xs"}>
          <RefreshCw size={13} /> Làm mới
        </button>
      </div>
      {pages.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Chưa có trang nào. Hãy đồng bộ lại.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {pages.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center gap-3 py-4">
                {p.picture_url ? (
                  <img src={p.picture_url} alt={p.name} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <FacebookIcon size={18} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category ?? "Fanpage"}</p>
                </div>
                {p.followers_count != null && (
                  <span className="text-xs font-semibold text-muted-foreground shrink-0">
                    {p.followers_count.toLocaleString("vi-VN")} followers
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Post Tab                                                           */
/* ------------------------------------------------------------------ */

function PostTab({ pages }: { pages: MetaPage[] }) {
  const [pageId, setPageId] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [scheduleTime, setScheduleTime] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (pages.length > 0 && !pageId) setPageId(pages[0].id);
  }, [pages, pageId]);

  const handleSend = async () => {
    if (!pageId || !content.trim()) return;
    setSending(true);
    setResult(null);
    try {
      if (mode === "schedule") {
        if (!scheduleTime) {
          toast.error("Vui lòng chọn thời gian đăng");
          setSending(false);
          return;
        }
        const iso = new Date(scheduleTime).toISOString();
        const r = await api.post<{ post_id?: string; scheduled_for?: string; error?: string }>(
          "/mcp/meta/schedule",
          { page_id: pageId, content, publish_time: iso },
        );
        if (r.error) throw new Error(r.error);
        setResult(`Đã lên lịch đăng lúc ${new Date(iso).toLocaleString("vi-VN")}`);
        toast.success("Đã lên lịch bài đăng");
      } else {
        const r = await api.post<{ post_id?: string; error?: string }>("/mcp/meta/post", {
          page_id: pageId,
          content,
          image_url: imageUrl || undefined,
        });
        if (r.error) throw new Error(r.error);
        setResult(`Đã đăng bài (ID: ${r.post_id})`);
        toast.success("Đã đăng bài lên Facebook");
      }
      setContent("");
      setImageUrl("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi đăng bài");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trang đăng</label>
          <select value={pageId} onChange={(e) => setPageId(e.target.value)} className={inp}>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nội dung bài viết</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nhập nội dung bài đăng..."
            className={ta + " h-48"}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">URL hình ảnh (tuỳ chọn)</label>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className={inp} />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setMode("now")}
            className={mode === "now" ? btn + " text-xs" : btnOutline + " text-xs"}
          >
            <Send size={13} /> Đăng ngay
          </button>
          <button
            onClick={() => setMode("schedule")}
            className={mode === "schedule" ? btn + " text-xs" : btnOutline + " text-xs"}
          >
            <CalendarClock size={13} /> Lên lịch
          </button>
        </div>

        {mode === "schedule" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Thời gian đăng (giờ Việt Nam)</label>
            <input
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className={inp}
            />
          </div>
        )}

        <button onClick={handleSend} disabled={sending || !content.trim()} className={btn + " w-full"}>
          {sending ? "Đang gửi..." : mode === "schedule" ? "Lên lịch bài đăng" : "Đăng bài ngay"}
        </button>

        {result && (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {result}
          </div>
        )}
      </div>

      <div className="lg:col-span-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Xem trước</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border/50 bg-background p-4">
              {imageUrl && (
                <img src={imageUrl} alt="preview" className="w-full rounded-lg mb-3 max-h-48 object-cover" />
              )}
              <p className="text-sm text-foreground whitespace-pre-wrap">{content || "Nội dung bài viết sẽ hiển thị ở đây..."}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Cross-Post Tab — publish to Meta + Email simultaneously           */
/* ------------------------------------------------------------------ */

function CrossPostTab({ pages }: { pages: MetaPage[] }) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [sendEmail, setSendEmail] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const togglePage = (id: string) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (!content.trim()) return;
    if (selectedPages.size === 0 && !sendEmail) {
      toast.error("Chọn ít nhất một nền tảng");
      return;
    }
    if (sendEmail && (!emailRecipients.trim() || !emailSubject.trim())) {
      toast.error("Nhập người nhận và tiêu đề email");
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const recipients = emailRecipients.split(",").map((e) => e.trim()).filter(Boolean);
      const r = await api.post<{
        meta?: Array<{ post_id?: string; error?: string }>;
        email?: { email_id?: string };
        errors?: Array<{ platform: string; error: string }>;
      }>("/mcp/meta/cross-post", {
        content,
        meta_page_ids: Array.from(selectedPages),
        email_recipients: sendEmail ? recipients : [],
        email_subject: sendEmail ? emailSubject : undefined,
        image_url: imageUrl || undefined,
      });
      const metaOk = (r.meta ?? []).filter((m) => !m.error).length;
      const metaFail = (r.meta ?? []).filter((m) => m.error).length;
      const emailOk = r.email?.email_id ? 1 : 0;
      const errors = r.errors ?? [];
      const parts: string[] = [];
      if (metaOk) parts.push(`${metaOk} bài Facebook`);
      if (emailOk) parts.push(`email gửi thành công`);
      if (metaFail || errors.length) parts.push(`${metaFail + errors.length} lỗi`);
      setResult(parts.length ? `Kết quả: ${parts.join(", ")}` : "Không có nền tảng nào được chọn.");
      if (metaOk || emailOk) toast.success("Cross-post thành công!");
      if (metaFail || errors.length) toast.error(`${metaFail + errors.length} nền tảng lỗi`);
      if (metaOk || emailOk) {
        setContent("");
        setImageUrl("");
        setEmailRecipients("");
        setEmailSubject("");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi cross-post");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nội dung</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nhập nội dung — sẽ đăng lên tất cả nền tảng đã chọn..."
            className={ta + " h-40"}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">URL hình ảnh (tuỳ chọn)</label>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className={inp} />
        </div>

        {/* Platform selection */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nền tảng đăng</label>

          {pages.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Facebook Pages</p>
              <div className="flex flex-wrap gap-2">
                {pages.map((p) => {
                  const active = selectedPages.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePage(p.id)}
                      className={
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border " +
                        (active
                          ? "bg-primary/10 text-primary border-primary/25"
                          : "bg-muted/50 text-muted-foreground border-border/40 hover:bg-muted hover:text-foreground")
                      }
                    >
                      <FacebookIcon size={12} /> {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Email</p>
            <button
              onClick={() => setSendEmail(!sendEmail)}
              className={
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border " +
                (sendEmail
                  ? "bg-primary/10 text-primary border-primary/25"
                  : "bg-muted/50 text-muted-foreground border-border/40 hover:bg-muted hover:text-foreground")
              }
            >
              <Mail size={12} /> {sendEmail ? "Đã chọn" : "Chọn Email"}
            </button>
            {sendEmail && (
              <div className="space-y-2 pt-1">
                <input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Tiêu đề email"
                  className={inp}
                />
                <input
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  className={inp}
                />
              </div>
            )}
          </div>
        </div>

        <button onClick={handleSend} disabled={sending || !content.trim()} className={btn + " w-full"}>
          <Share2 size={15} /> {sending ? "Đang gửi..." : "Cross-Post ngay"}
        </button>

        {result && (
          <div className="rounded-xl border border-primary/25 bg-primary/8 px-4 py-3 text-xs font-medium text-primary">
            {result}
          </div>
        )}
      </div>

      <div className="lg:col-span-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Xem trước</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border/50 bg-background p-4">
              {imageUrl && (
                <img src={imageUrl} alt="preview" className="w-full rounded-lg mb-3 max-h-40 object-cover" />
              )}
              <p className="text-sm text-foreground whitespace-pre-wrap">{content || "Nội dung sẽ hiển thị ở đây..."}</p>
            </div>
            <div className="mt-3 space-y-1.5">
              {selectedPages.size > 0 && (
                <p className="text-[11px] text-muted-foreground">{selectedPages.size} Facebook page sẽ đăng</p>
              )}
              {sendEmail && <p className="text-[11px] text-muted-foreground">Email sẽ gửi đến người nhận</p>}
              {selectedPages.size === 0 && !sendEmail && (
                <p className="text-[11px] text-muted-foreground">Chưa chọn nền tảng nào</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Comments Tab                                                       */
/* ------------------------------------------------------------------ */

function CommentsTab() {
  const [postId, setPostId] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const loadComments = async () => {
    if (!postId.trim()) return;
    setLoading(true);
    try {
      const r = await api.get<{ comments: Comment[]; error?: string }>(`/mcp/meta/comments/${encodeURIComponent(postId)}`);
      if (r.error) throw new Error(r.error);
      setComments(r.comments ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi tải bình luận");
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (commentId: string) => {
    const msg = replyText[commentId]?.trim();
    if (!msg) return;
    try {
      const r = await api.post<{ reply_id?: string; error?: string }>("/mcp/meta/reply", {
        comment_id: commentId,
        message: msg,
      });
      if (r.error) throw new Error(r.error);
      toast.success("Đã trả lời bình luận");
      setReplyText({ ...replyText, [commentId]: "" });
      loadComments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi trả lời");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={postId}
          onChange={(e) => setPostId(e.target.value)}
          placeholder="Post ID (vd: 123456_789012)"
          className={inp + " flex-1"}
        />
        <button onClick={loadComments} disabled={loading} className={btn + " text-xs"}>
          <Eye size={13} /> {loading ? "Đang tải..." : "Xem bình luận"}
        </button>
      </div>

      {comments.length === 0 && !loading && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Nhập Post ID và nhấn xem bình luận.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {comments.map((c) => (
          <Card key={c.id}>
            <CardContent className="py-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">
                  {(c.from?.name ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-foreground">{c.from?.name ?? "Người dùng"}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(c.created_time).toLocaleString("vi-VN")}
                    </span>
                    {c.like_count ? <span className="text-[10px] text-muted-foreground">({c.like_count} like)</span> : null}
                  </div>
                  <p className="text-sm text-foreground/90 mb-2">{c.message}</p>
                  <div className="flex gap-2">
                    <input
                      value={replyText[c.id] ?? ""}
                      onChange={(e) => setReplyText({ ...replyText, [c.id]: e.target.value })}
                      placeholder="Viết trả lời..."
                      className={inp + " flex-1 text-xs py-1.5"}
                    />
                    <button onClick={() => handleReply(c.id)} className={btn + " text-xs py-1.5"}>
                      <Send size={12} /> Trả lời
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Insights Tab                                                       */
/* ------------------------------------------------------------------ */

function InsightsTab({ pages }: { pages: MetaPage[] }) {
  const [pageId, setPageId] = useState("");
  const [range, setRange] = useState("30d");
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pages.length > 0 && !pageId) setPageId(pages[0].id);
  }, [pages, pageId]);

  const loadInsights = async () => {
    if (!pageId) return;
    setLoading(true);
    try {
      const r = await api.get<InsightsData & { error?: string }>(
        `/mcp/meta/insights/${encodeURIComponent(pageId)}?range=${range}`,
      );
      if (r.error) throw new Error(r.error);
      setData(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi tải thống kê");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pageId) loadInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, range]);

  const stats = data
    ? [
        { label: "Lượt tiếp cận", value: data.reach.toLocaleString("vi-VN"), icon: TrendingUp },
        { label: "Tương tác", value: data.engagement.toLocaleString("vi-VN"), icon: MessageSquare },
        { label: "Người theo dõi", value: data.followers.toLocaleString("vi-VN"), icon: Users },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trang</label>
          <select value={pageId} onChange={(e) => setPageId(e.target.value)} className={inp}>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Khoảng thời gian</label>
          <select value={range} onChange={(e) => setRange(e.target.value)} className={inp}>
            <option value="7d">7 ngày</option>
            <option value="30d">30 ngày</option>
            <option value="90d">90 ngày</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : data ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {stats.map((s, i) => {
            const StatIcon = s.icon;
            return (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <StatIcon size={16} className="text-primary" />
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
                  </div>
                  <p className="text-2xl font-bold">{s.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Chọn trang để xem thống kê.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
