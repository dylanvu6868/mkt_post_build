"use client";

import { useEffect, useRef, useState } from "react";
import {
  useMcpStore,
  type LandingPageListItem,
  type LandingPageDetail,
} from "@/store/mcp";
import { API_BASE_URL, ApiError, getToken } from "@/services/api";
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
/*  Constants & Styles                                                 */
/* ------------------------------------------------------------------ */

const btn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50";
const btnOutline =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-all disabled:opacity-50";
const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-all disabled:opacity-50";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all";
const inp =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all";

const COLOR_SCHEMES = [
  { value: "blue", label: "Xanh dương", color: "#3B82F6" },
  { value: "green", label: "Xanh lá", color: "#22C55E" },
  { value: "purple", label: "Tím", color: "#8B5CF6" },
  { value: "red", label: "Đỏ", color: "#EF4444" },
  { value: "orange", label: "Cam", color: "#F97316" },
  { value: "pink", label: "Hồng", color: "#EC4899" },
  { value: "cyan", label: "Xanh ngọc", color: "#06B6D4" },
  { value: "amber", label: "Vàng", color: "#FACC15" },
  { value: "slate", label: "Xám đen", color: "#475569" },
];

const STYLES = [
  { value: "modern", label: "Hiện đại", desc: "Sạch sẽ, tối giản" },
  { value: "bold", label: "Mạnh mẽ", desc: "Chữ to, gradient" },
  { value: "elegant", label: "Sang trọng", desc: "Serif, tinh tế" },
  { value: "playful", label: "Năng động", desc: "Màu sắc, bo tròn" },
  { value: "corporate", label: "Doanh nghiệp", desc: "Chuyên nghiệp, nghiêm túc" },
];

const SECTION_OPTIONS = [
  { value: "hero", label: "Hero Banner", default: true },
  { value: "features", label: "Tính năng", default: true },
  { value: "testimonials", label: "Đánh giá khách hàng", default: false },
  { value: "pricing", label: "Bảng giá", default: false },
  { value: "faq", label: "Câu hỏi thường gặp", default: false },
  { value: "gallery", label: "Thư viện ảnh", default: false },
  { value: "team", label: "Đội ngũ", default: false },
  { value: "contact", label: "Liên hệ", default: false },
  { value: "newsletter", label: "Đăng ký nhận tin", default: true },
  { value: "cta", label: "Kêu gọi hành động", default: true },
];

const TEMPLATES = [
  { value: "travel-blog", label: "Blog Du lịch", desc: "Hero lớn, grid điểm đến, bài viết", preview: "🌍" },
  { value: "saas-landing", label: "SaaS / Ứng dụng", desc: "Hero + demo, tính năng, bảng giá", preview: "🚀" },
  { value: "portfolio", label: "Portfolio", desc: "Giới thiệu, dự án, kỹ năng", preview: "🎨" },
  { value: "ecommerce", label: "E-commerce", desc: "Sản phẩm nổi bật, ưu đãi", preview: "🛒" },
  { value: "event", label: "Sự kiện", desc: "Countdown, lịch trình, đăng ký", preview: "🎉" },
  { value: "restaurant", label: "Nhà hàng", desc: "Menu, đặt bàn, hình ảnh", preview: "🍽️" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusBadgeVariant(status: LandingPageListItem["status"]): "default" | "secondary" {
  return status === "published" ? "default" : "secondary";
}

function statusLabel(status: LandingPageListItem["status"]): string {
  return status === "published" ? "Đã xuất bản" : "Bản nháp";
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

/* ------------------------------------------------------------------ */
/*  Image Upload Field                                                 */
/* ------------------------------------------------------------------ */

function ImageField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <input
        className={inp}
        placeholder={placeholder || "Nhập URL hình ảnh..."}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <div className="relative mt-2 h-20 w-32 rounded-lg border border-border overflow-hidden bg-muted">
          <img src={value} alt="Preview" className="h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <button type="button" onClick={() => onChange("")}
            className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white text-xs hover:bg-black/80 transition">
            ×
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Fullscreen Preview Dialog                                          */
/* ------------------------------------------------------------------ */

function FullscreenPreview({ open, onClose, srcDoc }: {
  open: boolean; onClose: () => void; srcDoc: string;
}) {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const widths = { desktop: "100%", tablet: "768px", mobile: "375px" };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <DialogHeader className="p-0 space-y-0">
            <DialogTitle className="text-base">Xem trước trang</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {(["desktop", "tablet", "mobile"] as const).map((d) => (
              <button key={d} onClick={() => setDevice(d)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  device === d ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}>
                {d === "desktop" && <svg className="inline mr-1.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>}
                {d === "tablet" && <svg className="inline mr-1.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 18h.01"/></svg>}
                {d === "mobile" && <svg className="inline mr-1.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>}
                {d === "desktop" ? "Desktop" : d === "tablet" ? "Tablet" : "Mobile"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-4">
          <iframe srcDoc={srcDoc}
            className="bg-white rounded-lg shadow-xl border transition-all duration-300"
            style={{ width: widths[device], maxWidth: "100%", height: device === "desktop" ? "100%" : "90%", minHeight: "600px" }}
            sandbox="allow-scripts" title="Xem trước toàn màn hình" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Danh sách trang                                               */
/* ------------------------------------------------------------------ */

function PagesTab({ onEdit }: { onEdit: (page: LandingPageListItem) => void }) {
  const { landingPages, landingPagesLoading, loadLandingPages, deleteLandingPage } = useMcpStore();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => { loadLandingPages(); }, [loadLandingPages]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteLandingPage(id);
      toast.success("Đã xóa trang đích");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Lỗi xóa trang");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      {landingPagesLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : landingPages.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            </div>
            <p className="text-sm font-medium mb-1">Chưa có trang đích nào</p>
            <p className="text-xs text-muted-foreground">Chuyển sang tab &quot;Tạo trang&quot; để bắt đầu</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {landingPages.map((page) => (
            <Card key={page.id} className="group hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer" onClick={() => onEdit(page)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                  </div>
                  <Badge variant={statusBadgeVariant(page.status)} className="text-[11px]">{statusLabel(page.status)}</Badge>
                </div>
                <h3 className="font-semibold text-sm truncate mb-1 group-hover:text-primary transition-colors">{page.title}</h3>
                <p className="text-xs text-muted-foreground truncate mb-3">/{page.slug}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{page.created_at.slice(0, 10)}</span>
                  <div className="flex gap-1.5">
                    <button className="rounded-lg px-2.5 py-1 text-xs font-medium border border-border hover:bg-accent transition"
                      onClick={(e) => { e.stopPropagation(); onEdit(page); }}>Sửa</button>
                    <button className="rounded-lg px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition"
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(page.id); }}
                      disabled={deletingId === page.id}>
                      {deletingId === page.id ? "..." : "Xóa"}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={confirmDeleteId !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa trang đích</DialogTitle>
            <DialogDescription>Thao tác này không thể hoàn tác.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <button className={btnOutline} onClick={() => setConfirmDeleteId(null)}>Hủy</button>
            <button className={btnDanger} disabled={deletingId !== null}
              onClick={() => { if (confirmDeleteId !== null) handleDelete(confirmDeleteId); }}>
              {deletingId !== null ? "Đang xóa..." : "Xóa trang"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Tạo trang (AI Generate)                                       */
/* ------------------------------------------------------------------ */

function CreateTab({ onGenerated }: { onGenerated: (html: string) => void }) {
  const { generateLandingPage, landingGenerating } = useMcpStore();

  const [purpose, setPurpose] = useState("");
  const [product, setProduct] = useState("");
  const [tone, setTone] = useState("professional");
  const [cta, setCta] = useState("Đăng ký ngay");
  const [colorScheme, setColorScheme] = useState("blue");
  const [style, setStyle] = useState("modern");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [sections, setSections] = useState<string[]>(
    SECTION_OPTIONS.filter((s) => s.default).map((s) => s.value)
  );
  const [heroImage, setHeroImage] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [additionalImages, setAdditionalImages] = useState<string[]>([""]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleSection = (val: string) => {
    setSections((prev) => prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]);
  };

  const handleGenerate = async () => {
    if (!purpose.trim() || !product.trim()) {
      toast.error("Vui lòng nhập mục đích và tên sản phẩm");
      return;
    }
    try {
      const imgs = additionalImages.filter((u) => u.trim());
      const result = await generateLandingPage({
        purpose: purpose.trim(),
        product: product.trim(),
        tone,
        cta: cta.trim() || "Đăng ký ngay",
        color_scheme: colorScheme,
        style,
        sections,
        hero_image_url: heroImage.trim() || undefined,
        logo_url: logoUrl.trim() || undefined,
        additional_images: imgs.length ? imgs : undefined,
        template: selectedTemplate || undefined,
      });
      toast.success("Đã tạo trang đích bằng AI!");
      onGenerated(result.html);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 503) {
        toast.error("Nhà cung cấp AI chưa được cấu hình.");
      } else {
        toast.error(e instanceof Error ? e.message : "Lỗi tạo trang");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
          Chọn mẫu giao diện
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {TEMPLATES.map((t) => (
            <button key={t.value}
              onClick={() => setSelectedTemplate(selectedTemplate === t.value ? null : t.value)}
              className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all hover:shadow-md ${
                selectedTemplate === t.value ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/30"
              }`}>
              <span className="text-2xl">{t.preview}</span>
              <span className="text-xs font-semibold text-center leading-tight">{t.label}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{t.desc}</span>
              {selectedTemplate === t.value && (
                <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Form */}
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Mục đích trang <span className="text-destructive">*</span></label>
              <input className={inp} placeholder="VD: Thu thập email cho khóa học online" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tên sản phẩm / dịch vụ <span className="text-destructive">*</span></label>
              <input className={inp} placeholder="VD: Khóa học Marketing Online" value={product} onChange={(e) => setProduct(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Giọng điệu</label>
              <select className={inp} value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="professional">Chuyên nghiệp</option>
                <option value="friendly">Thân thiện</option>
                <option value="urgent">Khẩn cấp</option>
                <option value="minimalist">Tối giản</option>
                <option value="luxurious">Sang trọng</option>
                <option value="fun">Vui nhộn</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Lời kêu gọi (CTA)</label>
              <input className={inp} placeholder="Đăng ký ngay" value={cta} onChange={(e) => setCta(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Phong cách</label>
              <select className={inp} value={style} onChange={(e) => setStyle(e.target.value)}>
                {STYLES.map((s) => <option key={s.value} value={s.value}>{s.label} — {s.desc}</option>)}
              </select>
            </div>
          </div>

          {/* Color Scheme */}
          <div>
            <label className="text-sm font-medium mb-2 block">Bảng màu</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_SCHEMES.map((c) => (
                <button key={c.value} onClick={() => setColorScheme(c.value)}
                  className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-xs font-medium transition-all ${
                    colorScheme === c.value ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"
                  }`}>
                  <span className="h-4 w-4 rounded-full shrink-0 ring-1 ring-black/10" style={{ backgroundColor: c.color }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div>
            <label className="text-sm font-medium mb-2 block">Các phần nội dung</label>
            <div className="flex flex-wrap gap-2">
              {SECTION_OPTIONS.map((s) => (
                <button key={s.value} onClick={() => toggleSection(s.value)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all ${
                    sections.includes(s.value)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}>
                  {sections.includes(s.value) && <svg className="inline mr-1" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>}
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced: Images */}
          <div>
            <button onClick={() => setShowAdvanced(!showAdvanced)} className={`${btnGhost} text-xs`}>
              {showAdvanced ? "▾" : "▸"} Hình ảnh & tuỳ chỉnh nâng cao
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-4 rounded-xl border border-border p-4 bg-muted/30">
                <div className="grid gap-4 sm:grid-cols-2">
                  <ImageField label="Logo" value={logoUrl} onChange={setLogoUrl} placeholder="URL logo thương hiệu..." />
                  <ImageField label="Hình ảnh Hero" value={heroImage} onChange={setHeroImage} placeholder="URL ảnh hero banner..." />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Hình ảnh bổ sung</label>
                  <div className="space-y-2">
                    {additionalImages.map((img, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input className={inp} placeholder={`URL hình ảnh ${idx + 1}...`} value={img}
                          onChange={(e) => { const copy = [...additionalImages]; copy[idx] = e.target.value; setAdditionalImages(copy); }} />
                        {additionalImages.length > 1 && (
                          <button onClick={() => setAdditionalImages(additionalImages.filter((_, i) => i !== idx))}
                            className="shrink-0 rounded-xl border border-border px-3 text-muted-foreground hover:text-destructive hover:border-destructive/30 transition">×</button>
                        )}
                      </div>
                    ))}
                    {additionalImages.length < 5 && (
                      <button onClick={() => setAdditionalImages([...additionalImages, ""])} className={`${btnGhost} text-xs`}>+ Thêm hình ảnh</button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="pt-2">
            <button className={`${btn} w-full sm:w-auto px-8 py-3 text-base`} onClick={handleGenerate}
              disabled={landingGenerating || !purpose.trim() || !product.trim()}>
              {landingGenerating ? (
                <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Đang tạo trang...</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> Tạo trang bằng AI</>
              )}
            </button>
          </div>

          {landingGenerating && (
            <div className="space-y-3 pt-2 rounded-xl border border-border p-4 bg-muted/30">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg className="animate-spin h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                AI đang thiết kế trang của bạn...
              </div>
              <Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-32 w-full" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Trình chỉnh sửa (Editor)                                     */
/* ------------------------------------------------------------------ */

function EditorTab({ initialPage, initialHtml }: {
  initialPage: LandingPageDetail | null; initialHtml: string;
}) {
  const { landingPages, loadLandingPages, createLandingPage, updateLandingPage, publishLandingPage } = useMcpStore();

  const [pageId, setPageId] = useState<number | null>(initialPage?.id ?? null);
  const [title, setTitle] = useState(initialPage?.title ?? "");
  const [slug, setSlug] = useState(initialPage?.slug ?? "");
  const [htmlContent, setHtmlContent] = useState(initialPage?.html_content ?? initialHtml);
  const [cssContent, setCssContent] = useState(initialPage?.css_content ?? "");
  const [status, setStatus] = useState<"draft" | "published">(initialPage?.status ?? "draft");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [publicSlug, setPublicSlug] = useState<string | null>(initialPage?.status === "published" ? initialPage.slug : null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [codeTab, setCodeTab] = useState<"html" | "css">("html");

  const prevInitialHtmlRef = useRef(initialHtml);
  useEffect(() => {
    if (initialPage) {
      setPageId(initialPage.id);
      setTitle(initialPage.title);
      setSlug(initialPage.slug);
      setHtmlContent(initialPage.html_content);
      setCssContent(initialPage.css_content ?? "");
      setStatus(initialPage.status);
      setPublicSlug(initialPage.status === "published" ? initialPage.slug : null);
    } else if (initialHtml !== prevInitialHtmlRef.current) {
      setHtmlContent(initialHtml);
      prevInitialHtmlRef.current = initialHtml;
    }
  }, [initialPage, initialHtml]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!pageId) setSlug(slugify(val));
  };

  const previewDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${cssContent}</style></head><body>${htmlContent}</body></html>`;

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Vui lòng nhập tiêu đề trang"); return; }
    if (!slug.trim()) { toast.error("Vui lòng nhập đường dẫn (slug)"); return; }
    setSaving(true);
    try {
      if (pageId === null) {
        const created = await createLandingPage({ title: title.trim(), slug: slug.trim(), html_content: htmlContent, css_content: cssContent });
        setPageId(created.id);
        await loadLandingPages();
        toast.success("Đã lưu trang đích mới!");
      } else {
        await updateLandingPage(pageId, { title: title.trim(), html_content: htmlContent, css_content: cssContent });
        await loadLandingPages();
        toast.success("Đã lưu thay đổi!");
      }
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 400) toast.error("Slug đã tồn tại.");
      else toast.error(e instanceof Error ? e.message : "Lỗi lưu trang");
    } finally { setSaving(false); }
  };

  const handlePublish = async () => {
    if (pageId === null) { toast.error("Vui lòng lưu trang trước"); return; }
    setPublishing(true);
    try {
      const result = await publishLandingPage(pageId);
      setStatus("published");
      setPublicSlug(result.slug);
      toast.success("Đã xuất bản trang đích!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Lỗi xuất bản");
    } finally { setPublishing(false); }
  };

  const handleExport = async () => {
    if (pageId === null) { toast.error("Vui lòng lưu trang trước"); return; }
    setExporting(true);
    try {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/mcp/landing/pages/${pageId}/export`, { headers });
      if (!res.ok) throw new Error("Không thể tải xuống");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug || "landing-page"}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Đã tải xuống HTML!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Lỗi tải xuống");
    } finally { setExporting(false); }
  };

  const publicUrl = publicSlug ? `${API_BASE_URL}/p/${publicSlug}` : null;
  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => toast.success("Đã sao chép liên kết!"));
  };

  const [selectPageOpen, setSelectPageOpen] = useState(false);
  const handleSelectPage = async (page: LandingPageListItem) => {
    setSelectPageOpen(false);
    try {
      const detail = await useMcpStore.getState().getLandingPage(page.id);
      setPageId(detail.id); setTitle(detail.title); setSlug(detail.slug);
      setHtmlContent(detail.html_content); setCssContent(detail.css_content ?? "");
      setStatus(detail.status); setPublicSlug(detail.status === "published" ? detail.slug : null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Lỗi tải trang");
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium mb-1 block text-muted-foreground">Tiêu đề trang</label>
              <input className={inp} placeholder="Tiêu đề trang đích" value={title} onChange={(e) => handleTitleChange(e.target.value)} />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-medium mb-1 block text-muted-foreground">Đường dẫn (slug)</label>
              <input className={inp} placeholder="duong-dan-trang" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={pageId !== null} />
            </div>
            <Badge variant={status === "published" ? "default" : "secondary"} className="mb-1">{statusLabel(status)}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button className={btn} onClick={handleSave} disabled={saving}>
              {saving ? <><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Đang lưu...</> : "Lưu"}
            </button>
            <button className={btnOutline} onClick={handlePublish} disabled={publishing || pageId === null}>
              {publishing ? "Đang xuất bản..." : "Xuất bản"}
            </button>
            <button className={btnOutline} onClick={handleExport} disabled={exporting || pageId === null}>
              {exporting ? "Đang xuất..." : "Tải HTML"}
            </button>
            <button className={btnOutline} onClick={() => { loadLandingPages(); setSelectPageOpen(true); }}>Mở trang khác</button>
            <div className="ml-auto">
              <button className={btnGhost} onClick={() => setFullscreenOpen(true)} title="Phóng to xem trước">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
                Phóng to
              </button>
            </div>
          </div>

          {publicUrl && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-green-500/5 border border-green-500/20 text-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600 shrink-0"><path d="M20 6 9 17l-5-5"/></svg>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="truncate text-primary underline text-xs">{publicUrl}</a>
              <button className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] font-medium hover:bg-accent transition" onClick={handleCopyLink}>Sao chép</button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor + Preview split */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="overflow-hidden">
          <div className="flex items-center border-b border-border">
            {(["html", "css"] as const).map((t) => (
              <button key={t} onClick={() => setCodeTab(t)}
                className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 ${
                  codeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <CardContent className="p-0">
            <textarea
              className="w-full min-h-[500px] resize-y font-mono text-xs p-4 bg-background outline-none border-0"
              placeholder={codeTab === "html" ? "<html>...</html>" : "body { ... }"}
              value={codeTab === "html" ? htmlContent : cssContent}
              onChange={(e) => codeTab === "html" ? setHtmlContent(e.target.value) : setCssContent(e.target.value)}
              spellCheck={false}
            />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <span className="text-sm font-medium">Xem trước</span>
            <button onClick={() => setFullscreenOpen(true)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
              Phóng to
            </button>
          </div>
          <CardContent className="p-0">
            <iframe srcDoc={previewDoc} className="w-full h-[500px] border-0" sandbox="allow-scripts" title="Xem trước trang đích" />
          </CardContent>
        </Card>
      </div>

      <FullscreenPreview open={fullscreenOpen} onClose={() => setFullscreenOpen(false)} srcDoc={previewDoc} />

      <Dialog open={selectPageOpen} onOpenChange={setSelectPageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mở trang đích</DialogTitle>
            <DialogDescription>Chọn trang để chỉnh sửa.</DialogDescription>
          </DialogHeader>
          <div className="divide-y max-h-[60vh] overflow-y-auto">
            {landingPages.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Chưa có trang nào.</p>
            ) : landingPages.map((page) => (
              <button key={page.id} className="w-full text-left px-3 py-3 hover:bg-accent transition rounded-lg" onClick={() => handleSelectPage(page)}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{page.title}</span>
                  <Badge variant={statusBadgeVariant(page.status)}>{statusLabel(page.status)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">/{page.slug}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("pages");
  const [editorInitialHtml, setEditorInitialHtml] = useState("");
  const [editorInitialPage, setEditorInitialPage] = useState<LandingPageDetail | null>(null);

  const handleGenerated = (html: string) => {
    setEditorInitialPage(null);
    setEditorInitialHtml(html);
    setActiveTab("editor");
  };

  const { getLandingPage } = useMcpStore();
  const handleEditFromList = async (page: LandingPageListItem) => {
    try {
      const detail = await getLandingPage(page.id);
      setEditorInitialPage(detail);
      setEditorInitialHtml("");
      setActiveTab("editor");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Lỗi tải trang");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Landing Pages</h1>
        <p className="text-sm text-muted-foreground mt-1">Tạo trang đích chuyên nghiệp bằng AI trong vài giây</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="pages" className="gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
            Danh sách
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            Tạo trang
          </TabsTrigger>
          <TabsTrigger value="editor" className="gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            Trình chỉnh sửa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="mt-4"><PagesTab onEdit={handleEditFromList} /></TabsContent>
        <TabsContent value="create" className="mt-4"><CreateTab onGenerated={handleGenerated} /></TabsContent>
        <TabsContent value="editor" className="mt-4"><EditorTab initialPage={editorInitialPage} initialHtml={editorInitialHtml} /></TabsContent>
      </Tabs>
    </div>
  );
}
