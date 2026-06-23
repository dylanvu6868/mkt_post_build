"use client";

import { useEffect, useRef, useState } from "react";
import {
  useMcpStore,
  type LandingPageListItem,
  type LandingPageDetail,
} from "@/store/mcp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const btn =
  "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50";
const btnOutline =
  "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition disabled:opacity-50";
const btnDanger =
  "inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition disabled:opacity-50";
const inp =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50";
const ta = inp + " min-h-[120px] resize-y";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { token?: string } };
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

function statusBadgeVariant(
  status: LandingPageListItem["status"]
): "default" | "secondary" {
  return status === "published" ? "default" : "secondary";
}

function statusLabel(status: LandingPageListItem["status"]): string {
  return status === "published" ? "Đã xuất bản" : "Bản nháp";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/* ------------------------------------------------------------------ */
/*  Tab: Danh sách trang (Pages List)                                   */
/* ------------------------------------------------------------------ */

function PagesTab({
  onEdit,
}: {
  onEdit: (page: LandingPageListItem) => void;
}) {
  const {
    landingPages,
    landingPagesLoading,
    loadLandingPages,
    deleteLandingPage,
  } = useMcpStore();

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    loadLandingPages();
  }, [loadLandingPages]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteLandingPage(id);
      toast.success("Đã xóa trang đích");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi xóa trang";
      toast.error(msg);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Trang đích của bạn</CardTitle>
        </CardHeader>
        <CardContent>
          {landingPagesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : landingPages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có trang đích nào. Hãy tạo trang mới trong tab "Tạo trang".
            </p>
          ) : (
            <div className="divide-y">
              {landingPages.map((page) => (
                <div
                  key={page.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{page.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      /{page.slug}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {page.created_at.slice(0, 10)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <Badge variant={statusBadgeVariant(page.status)}>
                      {statusLabel(page.status)}
                    </Badge>
                    <button
                      className={btnOutline}
                      onClick={() => onEdit(page)}
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      className={btnDanger}
                      onClick={() => setConfirmDeleteId(page.id)}
                      disabled={deletingId === page.id}
                    >
                      {deletingId === page.id ? "Đang xóa..." : "Xóa"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm delete dialog */}
      <Dialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa trang đích</DialogTitle>
            <DialogDescription>
              Thao tác này không thể hoàn tác. Trang đích sẽ bị xóa vĩnh viễn.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <button
              className={btnOutline}
              onClick={() => setConfirmDeleteId(null)}
            >
              Hủy
            </button>
            <button
              className={btnDanger}
              disabled={deletingId !== null}
              onClick={() => {
                if (confirmDeleteId !== null) handleDelete(confirmDeleteId);
              }}
            >
              {deletingId !== null ? "Đang xóa..." : "Xóa trang"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Tạo trang (Create / AI Generate)                              */
/* ------------------------------------------------------------------ */

function CreateTab({
  onGenerated,
}: {
  onGenerated: (html: string) => void;
}) {
  const { generateLandingPage, landingGenerating } = useMcpStore();

  const [purpose, setPurpose] = useState("");
  const [product, setProduct] = useState("");
  const [tone, setTone] = useState("professional");
  const [cta, setCta] = useState("Đăng ký ngay");

  const handleGenerate = async () => {
    if (!purpose.trim() || !product.trim()) {
      toast.error("Vui lòng nhập mục đích và tên sản phẩm");
      return;
    }
    try {
      const result = await generateLandingPage({
        purpose: purpose.trim(),
        product: product.trim(),
        tone,
        cta: cta.trim() || "Đăng ký ngay",
      });
      toast.success("Đã tạo trang đích bằng AI!");
      onGenerated(result.html);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi tạo trang";
      if (msg.toLowerCase().includes("llm") || msg.toLowerCase().includes("provider") || msg.toLowerCase().includes("configured")) {
        toast.error("Nhà cung cấp AI chưa được cấu hình. Vui lòng kiểm tra cài đặt hệ thống.");
      } else {
        toast.error(msg);
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tạo trang đích bằng AI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Mục đích trang <span className="text-destructive">*</span>
            </label>
            <input
              className={inp}
              placeholder="Ví dụ: Thu thập email khách hàng tiềm năng cho khóa học online"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Tên sản phẩm / dịch vụ <span className="text-destructive">*</span>
            </label>
            <input
              className={inp}
              placeholder="Ví dụ: Khóa học Marketing Online"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Giọng điệu</label>
            <select
              className={inp}
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            >
              <option value="professional">Chuyên nghiệp</option>
              <option value="friendly">Thân thiện</option>
              <option value="urgent">Khẩn cấp</option>
              <option value="minimalist">Tối giản</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Lời kêu gọi hành động (CTA)
            </label>
            <input
              className={inp}
              placeholder="Ví dụ: Đăng ký ngay"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
            />
          </div>

          <button
            className={btn}
            onClick={handleGenerate}
            disabled={landingGenerating || !purpose.trim() || !product.trim()}
          >
            {landingGenerating ? "Đang tạo trang..." : "Tạo trang bằng AI"}
          </button>

          {landingGenerating && (
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            AI sẽ tạo một trang HTML hoàn chỉnh, phản hồi trên di động với phần
            hero, tính năng và nút CTA. Sau khi tạo, bạn sẽ được chuyển đến{" "}
            <strong>Trình chỉnh sửa</strong> để xem trước và lưu trang.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Trình chỉnh sửa (Editor)                                       */
/* ------------------------------------------------------------------ */

function EditorTab({
  initialPage,
  initialHtml,
}: {
  initialPage: LandingPageDetail | null;
  initialHtml: string;
}) {
  const {
    landingPages,
    loadLandingPages,
    createLandingPage,
    updateLandingPage,
    publishLandingPage,
  } = useMcpStore();

  /* Editing state */
  const [pageId, setPageId] = useState<number | null>(initialPage?.id ?? null);
  const [title, setTitle] = useState(initialPage?.title ?? "");
  const [slug, setSlug] = useState(initialPage?.slug ?? "");
  const [htmlContent, setHtmlContent] = useState(
    initialPage?.html_content ?? initialHtml
  );
  const [cssContent, setCssContent] = useState(initialPage?.css_content ?? "");
  const [status, setStatus] = useState<"draft" | "published">(
    initialPage?.status ?? "draft"
  );

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [publicSlug, setPublicSlug] = useState<string | null>(
    initialPage?.status === "published" ? initialPage.slug : null
  );

  /* Sync when initialPage or initialHtml changes (e.g. after AI generate) */
  const prevInitialHtmlRef = useRef(initialHtml);
  useEffect(() => {
    if (initialPage) {
      setPageId(initialPage.id);
      setTitle(initialPage.title);
      setSlug(initialPage.slug);
      setHtmlContent(initialPage.html_content);
      setCssContent(initialPage.css_content ?? "");
      setStatus(initialPage.status);
      setPublicSlug(
        initialPage.status === "published" ? initialPage.slug : null
      );
    } else if (initialHtml !== prevInitialHtmlRef.current) {
      setHtmlContent(initialHtml);
      prevInitialHtmlRef.current = initialHtml;
    }
  }, [initialPage, initialHtml]);

  /* Auto-derive slug from title when creating new */
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!pageId) {
      setSlug(slugify(val));
    }
  };

  /* Live preview srcDoc */
  const previewDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${cssContent}</style></head><body>${htmlContent}</body></html>`;

  /* --- Save (create or update) --- */
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề trang");
      return;
    }
    if (!slug.trim()) {
      toast.error("Vui lòng nhập đường dẫn (slug)");
      return;
    }
    setSaving(true);
    try {
      if (pageId === null) {
        const created = await createLandingPage({
          title: title.trim(),
          slug: slug.trim(),
          html_content: htmlContent,
          css_content: cssContent || undefined,
        });
        setPageId(created.id);
        await loadLandingPages();
        toast.success("Đã lưu trang đích mới!");
      } else {
        await updateLandingPage(pageId, {
          title: title.trim(),
          html_content: htmlContent,
          css_content: cssContent || undefined,
        });
        await loadLandingPages();
        toast.success("Đã lưu thay đổi!");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi lưu trang";
      if (msg.toLowerCase().includes("slug")) {
        toast.error("Đường dẫn (slug) đã tồn tại. Vui lòng chọn slug khác.");
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  /* --- Publish --- */
  const handlePublish = async () => {
    if (pageId === null) {
      toast.error("Vui lòng lưu trang trước khi xuất bản");
      return;
    }
    setPublishing(true);
    try {
      const result = await publishLandingPage(pageId);
      setStatus("published");
      setPublicSlug(result.slug);
      toast.success("Đã xuất bản trang đích!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi xuất bản";
      toast.error(msg);
    } finally {
      setPublishing(false);
    }
  };

  /* --- Export (download HTML file) --- */
  const handleExport = async () => {
    if (pageId === null) {
      toast.error("Vui lòng lưu trang trước khi tải xuống");
      return;
    }
    setExporting(true);
    try {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(
        `${API_BASE}/mcp/landing/pages/${pageId}/export`,
        { headers }
      );
      if (!res.ok) {
        throw new Error("Không thể tải xuống HTML");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug || "landing-page"}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Đã tải xuống HTML!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi tải xuống";
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  };

  /* --- Copy public link --- */
  const publicUrl = publicSlug ? `${API_BASE}/p/${publicSlug}` : null;
  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      toast.success("Đã sao chép liên kết công khai!");
    });
  };

  /* --- Load existing page selector --- */
  const [selectPageOpen, setSelectPageOpen] = useState(false);

  const handleSelectPage = async (page: LandingPageListItem) => {
    setSelectPageOpen(false);
    // Fetch full detail from store
    const { getLandingPage } = useMcpStore.getState();
    try {
      const detail = await getLandingPage(page.id);
      setPageId(detail.id);
      setTitle(detail.title);
      setSlug(detail.slug);
      setHtmlContent(detail.html_content);
      setCssContent(detail.css_content ?? "");
      setStatus(detail.status);
      setPublicSlug(detail.status === "published" ? detail.slug : null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi tải trang";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium mb-1 block">Tiêu đề trang</label>
              <input
                className={inp}
                placeholder="Tiêu đề trang đích"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-medium mb-1 block">
                Đường dẫn (slug)
              </label>
              <input
                className={inp}
                placeholder="duong-dan-trang"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={pageId !== null}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={status === "published" ? "default" : "secondary"}>
                {statusLabel(status)}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              className={btn}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
            <button
              className={btnOutline}
              onClick={handlePublish}
              disabled={publishing || pageId === null}
            >
              {publishing ? "Đang xuất bản..." : "Xuất bản"}
            </button>
            <button
              className={btnOutline}
              onClick={handleExport}
              disabled={exporting || pageId === null}
            >
              {exporting ? "Đang xuất..." : "Tải xuống HTML"}
            </button>
            <button
              className={btnOutline}
              onClick={() => {
                loadLandingPages();
                setSelectPageOpen(true);
              }}
            >
              Mở trang khác
            </button>
          </div>

          {/* Public link display */}
          {publicUrl && (
            <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-muted text-sm">
              <span className="text-muted-foreground shrink-0">Liên kết công khai:</span>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-primary underline"
              >
                {publicUrl}
              </a>
              <button
                className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleCopyLink}
              >
                Sao chép
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor + Preview split */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Code editors */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">HTML</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className={ta + " min-h-[300px] font-mono text-xs"}
                placeholder="<html>...</html>"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                spellCheck={false}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">CSS (tùy chọn)</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className={ta + " min-h-[120px] font-mono text-xs"}
                placeholder="body { ... }"
                value={cssContent}
                onChange={(e) => setCssContent(e.target.value)}
                spellCheck={false}
              />
            </CardContent>
          </Card>
        </div>

        {/* Live preview iframe */}
        <Card className="min-h-[500px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Xem trước (trực tiếp)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <iframe
              srcDoc={previewDoc}
              className="w-full h-[500px] rounded-b-lg border-0"
              sandbox="allow-scripts"
              title="Xem trước trang đích"
            />
          </CardContent>
        </Card>
      </div>

      {/* Select existing page dialog */}
      <Dialog open={selectPageOpen} onOpenChange={setSelectPageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mở trang đích</DialogTitle>
            <DialogDescription>
              Chọn một trang để chỉnh sửa trong trình soạn thảo.
            </DialogDescription>
          </DialogHeader>
          <div className="divide-y max-h-[60vh] overflow-y-auto">
            {landingPages.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Chưa có trang nào.
              </p>
            ) : (
              landingPages.map((page) => (
                <button
                  key={page.id}
                  className="w-full text-left px-3 py-3 hover:bg-muted transition"
                  onClick={() => handleSelectPage(page)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{page.title}</span>
                    <Badge variant={statusBadgeVariant(page.status)}>
                      {statusLabel(page.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">/{page.slug}</p>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("pages");

  /* State passed between Create → Editor */
  const [editorInitialHtml, setEditorInitialHtml] = useState("");
  const [editorInitialPage, setEditorInitialPage] =
    useState<LandingPageDetail | null>(null);

  /* When AI generates HTML, switch to editor with that content */
  const handleGenerated = (html: string) => {
    setEditorInitialPage(null);
    setEditorInitialHtml(html);
    setActiveTab("editor");
  };

  /* When user clicks "Chỉnh sửa" from list, load full page into editor */
  const { getLandingPage } = useMcpStore();
  const handleEditFromList = async (page: LandingPageListItem) => {
    try {
      const detail = await getLandingPage(page.id);
      setEditorInitialPage(detail);
      setEditorInitialHtml("");
      setActiveTab("editor");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi tải trang";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trang đích</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pages">Danh sách trang</TabsTrigger>
          <TabsTrigger value="create">Tạo trang</TabsTrigger>
          <TabsTrigger value="editor">Trình chỉnh sửa</TabsTrigger>
        </TabsList>

        <TabsContent value="pages">
          <PagesTab onEdit={handleEditFromList} />
        </TabsContent>

        <TabsContent value="create">
          <CreateTab onGenerated={handleGenerated} />
        </TabsContent>

        <TabsContent value="editor">
          <EditorTab
            initialPage={editorInitialPage}
            initialHtml={editorInitialHtml}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
