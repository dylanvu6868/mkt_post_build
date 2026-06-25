"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { api, API_BASE_URL, getToken } from "@/services/api";
import { toast } from "sonner";
import {
  LayoutTemplate,
  Eye,
  Upload,
  Save,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { btn, btnOutline, btnGhost, inp, ta } from "@/lib/ui-tokens";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface TemplateMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  colors: Record<string, string>;
  slots: string[];
}

interface BuilderContent {
  brand_name: string;
  logo_url: string;
  hero_title: string;
  hero_highlight: string;
  hero_subtitle: string;
  hero_image_url: string;
  hero_cta_text: string;
  hero_cta_link: string;
  about_title: string;
  about_text: string;
  cta_title: string;
  cta_text: string;
  cta_button_text: string;
  cta_button_link: string;
  contact_phone: string;
  contact_email: string;
  contact_address: string;
  social_facebook: string;
  social_twitter: string;
  social_instagram: string;
  social_linkedin: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  footer_copyright: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function LandingBuilder({ onSaved }: { onSaved?: () => void }) {
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [selectedTpl, setSelectedTpl] = useState<string>("");
  const [content, setContent] = useState<BuilderContent>(defaultContent());
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [title, setTitle] = useState("Untitled Landing Page");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const renderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load templates on mount
  useEffect(() => {
    api.get<TemplateMeta[]>("/mcp/landing/templates").then(setTemplates).catch(() => {
      toast.error("Không tải được danh sách template");
    });
  }, []);

  // Auto-select first template
  useEffect(() => {
    if (templates.length > 0 && !selectedTpl) {
      setSelectedTpl(templates[0].id);
      const colors = templates[0].colors;
      setContent((c) => ({
        ...c,
        primary_color: colors.primary || c.primary_color,
        secondary_color: colors.secondary || c.secondary_color,
        accent_color: colors.accent || c.accent_color,
      }));
    }
  }, [templates, selectedTpl]);

  // Debounced render
  const doRender = useCallback(async () => {
    if (!selectedTpl) return;
    setLoading(true);
    try {
      const res = await api.post<{ html: string }>("/mcp/landing/render", {
        template_id: selectedTpl,
        content,
      });
      setPreviewHtml(res.html);
    } catch {
      toast.error("Render thất bại");
    } finally {
      setLoading(false);
    }
  }, [selectedTpl, content]);

  // Debounce render on content/template change
  useEffect(() => {
    if (renderTimer.current) clearTimeout(renderTimer.current);
    renderTimer.current = setTimeout(() => doRender(), 500);
    return () => { if (renderTimer.current) clearTimeout(renderTimer.current); };
  }, [selectedTpl, content]);

  const update = (field: keyof BuilderContent, value: string) => {
    setContent((c) => ({ ...c, [field]: value }));
  };

  const uploadImage = async (
    file: File,
    field: "logo_url" | "hero_image_url",
  ) => {
    const setUploading = field === "logo_url" ? setUploadingLogo : setUploadingHero;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/mcp/landing/upload-image`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      update(field, data.url);
      toast.success("Tải ảnh thành công");
    } catch {
      toast.error("Tải ảnh thất bại");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!previewHtml) {
      toast.error("Vui lòng đợi render hoàn tất");
      return;
    }
    setSaving(true);
    try {
      await api.post("/mcp/landing/save-from-template", {
        title,
        html: previewHtml,
      });
      toast.success("Đã lưu landing page");
      onSaved?.();
    } catch {
      toast.error("Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Gallery */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4 text-primary" />
          Chọn Template
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => {
                setSelectedTpl(tpl.id);
                const c = tpl.colors;
                setContent((prev) => ({
                  ...prev,
                  primary_color: c.primary || prev.primary_color,
                  secondary_color: c.secondary || prev.secondary_color,
                  accent_color: c.accent || prev.accent_color,
                }));
              }}
              className={`rounded-xl border p-4 text-left transition-all ${
                selectedTpl === tpl.id
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50 hover:bg-accent"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="h-6 w-6 rounded-lg"
                  style={{ backgroundColor: tpl.colors.primary }}
                />
                <span className="text-sm font-semibold">{tpl.name}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
              <div className="mt-2 flex gap-1">
                {Object.values(tpl.colors).slice(0, 3).map((color, i) => (
                  <div
                    key={i}
                    className="h-3 w-3 rounded-full border border-border"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Builder: Form + Preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Form */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card/50 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Nội dung</h3>

            {/* Title */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Tên trang</label>
              <input className={inp} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {/* Brand */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Thương hiệu</p>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Tên thương hiệu</label>
                <input className={inp} value={content.brand_name} onChange={(e) => update("brand_name", e.target.value)} placeholder="Vitba.ai" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Logo</label>
                <div className="flex gap-2">
                  <input className={inp} value={content.logo_url} onChange={(e) => update("logo_url", e.target.value)} placeholder="URL hoặc tải lên" />
                  <label className={`${btnOutline} cursor-pointer whitespace-nowrap`}>
                    {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage(f, "logo_url");
                    }} />
                  </label>
                </div>
              </div>
            </div>

            {/* Hero */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Hero Section</p>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Tiêu đề chính</label>
                <input className={inp} value={content.hero_title} onChange={(e) => update("hero_title", e.target.value)} placeholder="Transform Your Marketing" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Chữ nổi bật (highlight)</label>
                <input className={inp} value={content.hero_highlight} onChange={(e) => update("hero_highlight", e.target.value)} placeholder="AI-Powered Intelligence" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Mô tả</label>
                <textarea className={ta} rows={2} value={content.hero_subtitle} onChange={(e) => update("hero_subtitle", e.target.value)} placeholder="Mô tả ngắn về sản phẩm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Ảnh Hero</label>
                <div className="flex gap-2">
                  <input className={inp} value={content.hero_image_url} onChange={(e) => update("hero_image_url", e.target.value)} placeholder="URL hoặc tải lên" />
                  <label className={`${btnOutline} cursor-pointer whitespace-nowrap`}>
                    {uploadingHero ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage(f, "hero_image_url");
                    }} />
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Nút CTA (text)</label>
                  <input className={inp} value={content.hero_cta_text} onChange={(e) => update("hero_cta_text", e.target.value)} placeholder="Get Started" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Nút CTA (link)</label>
                  <input className={inp} value={content.hero_cta_link} onChange={(e) => update("hero_cta_link", e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </div>

            {/* About */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Giới thiệu</p>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Tiêu đề</label>
                <input className={inp} value={content.about_title} onChange={(e) => update("about_title", e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Nội dung</label>
                <textarea className={ta} rows={3} value={content.about_text} onChange={(e) => update("about_text", e.target.value)} />
              </div>
            </div>

            {/* CTA Section */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">CTA cuối trang</p>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Tiêu đề</label>
                <input className={inp} value={content.cta_title} onChange={(e) => update("cta_title", e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Mô tả</label>
                <textarea className={ta} rows={2} value={content.cta_text} onChange={(e) => update("cta_text", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Nút (text)</label>
                  <input className={inp} value={content.cta_button_text} onChange={(e) => update("cta_button_text", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Nút (link)</label>
                  <input className={inp} value={content.cta_button_link} onChange={(e) => update("cta_button_link", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Liên hệ</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Điện thoại</label>
                  <input className={inp} value={content.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
                  <input className={inp} value={content.contact_email} onChange={(e) => update("contact_email", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Địa chỉ</label>
                <input className={inp} value={content.contact_address} onChange={(e) => update("contact_address", e.target.value)} />
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Màu sắc</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Primary</label>
                  <input type="color" className="h-9 w-full rounded-lg border border-border" value={content.primary_color} onChange={(e) => update("primary_color", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Secondary</label>
                  <input type="color" className="h-9 w-full rounded-lg border border-border" value={content.secondary_color} onChange={(e) => update("secondary_color", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Accent</label>
                  <input type="color" className="h-9 w-full rounded-lg border border-border" value={content.accent_color} onChange={(e) => update("accent_color", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Social */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Mạng xã hội</p>
              <div className="grid grid-cols-2 gap-2">
                <input className={inp} value={content.social_facebook} onChange={(e) => update("social_facebook", e.target.value)} placeholder="Facebook URL" />
                <input className={inp} value={content.social_twitter} onChange={(e) => update("social_twitter", e.target.value)} placeholder="Twitter/X URL" />
                <input className={inp} value={content.social_instagram} onChange={(e) => update("social_instagram", e.target.value)} placeholder="Instagram URL" />
                <input className={inp} value={content.social_linkedin} onChange={(e) => update("social_linkedin", e.target.value)} placeholder="LinkedIn URL" />
              </div>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving || !previewHtml} className={`${btn} w-full`}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu Landing Page
          </button>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Xem trước
              {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </h3>
            <button onClick={doRender} className={btnGhost}>
              <RefreshCw className="h-3.5 w-3.5" />
              Render lại
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-white" style={{ height: "600px" }}>
            {previewHtml ? (
              <iframe
                ref={iframeRef}
                srcDoc={previewHtml}
                className="h-full w-full"
                title="Landing Preview"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <LayoutTemplate className="mx-auto h-12 w-12 opacity-30" />
                  <p className="mt-2 text-sm">Chọn template và điền nội dung để xem trước</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function defaultContent(): BuilderContent {
  return {
    brand_name: "",
    logo_url: "",
    hero_title: "",
    hero_highlight: "",
    hero_subtitle: "",
    hero_image_url: "",
    hero_cta_text: "",
    hero_cta_link: "#",
    about_title: "",
    about_text: "",
    cta_title: "",
    cta_text: "",
    cta_button_text: "",
    cta_button_link: "#",
    contact_phone: "",
    contact_email: "",
    contact_address: "",
    social_facebook: "",
    social_twitter: "",
    social_instagram: "",
    social_linkedin: "",
    primary_color: "#12D393",
    secondary_color: "#D1D1D1",
    accent_color: "#02130D",
    footer_copyright: "",
  };
}
