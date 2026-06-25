"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { api, API_BASE_URL, getToken } from "@/services/api";
import { toast } from "sonner";
import {
  Mail,
  Eye,
  Upload,
  Send,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { btn, btnOutline, inp, ta } from "@/lib/ui-tokens";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface EmailTemplateMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  colors: Record<string, string>;
  slots: string[];
}

interface EmailBuilderContent {
  logo_url: string;
  brand_name: string;
  hero_title: string;
  hero_subtitle: string;
  hero_body: string;
  hero_image_url: string;
  hero_cta_text: string;
  hero_cta_link: string;
  about_title: string;
  about_body: string;
  about_image_url: string;
  cta_title: string;
  cta_body: string;
  cta_button_text: string;
  cta_button_link: string;
  contact_email: string;
  contact_phone: string;
  contact_website: string;
  contact_address: string;
  social_facebook: string;
  social_twitter: string;
  social_instagram: string;
  copyright_text: string;
  primary_color: string;
  bg_color: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function MailBuilder({ onSendTest }: { onSendTest?: (html: string) => void }) {
  const [templates, setTemplates] = useState<EmailTemplateMeta[]>([]);
  const [selectedTpl, setSelectedTpl] = useState<string>("");
  const [content, setContent] = useState<EmailBuilderContent>(defaultContent());
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [subject, setSubject] = useState("");
  const renderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.get<EmailTemplateMeta[]>("/mcp/email/builder/templates").then(setTemplates).catch(() => {
      toast.error("Không tải được danh sách template email");
    });
  }, []);

  useEffect(() => {
    if (templates.length > 0 && !selectedTpl) {
      setSelectedTpl(templates[0].id);
      const colors = templates[0].colors;
      setContent((c) => ({
        ...c,
        primary_color: colors.primary || c.primary_color,
        bg_color: colors.bg || c.bg_color,
      }));
    }
  }, [templates, selectedTpl]);

  const doRender = useCallback(async () => {
    if (!selectedTpl) return;
    setLoading(true);
    try {
      const res = await api.post<{ html: string }>("/mcp/email/builder/render", {
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

  useEffect(() => {
    if (renderTimer.current) clearTimeout(renderTimer.current);
    renderTimer.current = setTimeout(() => doRender(), 500);
    return () => { if (renderTimer.current) clearTimeout(renderTimer.current); };
  }, [selectedTpl, content]);

  const update = (field: keyof EmailBuilderContent, value: string) => {
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
      const res = await fetch(`${API_BASE_URL}/mcp/email/builder/upload-image`, {
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

  const handleSendTest = async () => {
    if (!testEmail || !previewHtml) {
      toast.error("Nhập email và đợi render hoàn tất");
      return;
    }
    setSending(true);
    try {
      if (onSendTest) {
        onSendTest(previewHtml);
      } else {
        await api.post("/mcp/email/send", {
          to: [testEmail],
          subject: subject || "Test Email from Vitba",
          html: previewHtml,
        });
        toast.success(`Đã gửi test đến ${testEmail}`);
      }
    } catch {
      toast.error("Gửi thất bại");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Gallery */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          Chọn Email Template
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => {
                setSelectedTpl(tpl.id);
                const c = tpl.colors;
                setContent((prev) => ({
                  ...prev,
                  primary_color: c.primary || prev.primary_color,
                  bg_color: c.bg || prev.bg_color,
                }));
              }}
              className={`rounded-xl border p-4 text-left transition-all ${
                selectedTpl === tpl.id
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50 hover:bg-accent"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-lg" style={{ backgroundColor: tpl.colors.primary }} />
                <span className="text-sm font-semibold">{tpl.name}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Builder: Form + Preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Form */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card/50 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Nội dung Email</h3>

            {/* Subject + Test Email */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Gửi test</p>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Tiêu đề email</label>
                <input className={inp} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Tiêu đề email" />
              </div>
              <div className="flex gap-2">
                <input className={inp} value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="email@test.com" />
                <button onClick={handleSendTest} disabled={sending || !previewHtml} className={`${btn} whitespace-nowrap`}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Gửi test
                </button>
              </div>
            </div>

            {/* Brand */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Thương hiệu</p>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Tên thương hiệu</label>
                <input className={inp} value={content.brand_name} onChange={(e) => update("brand_name", e.target.value)} />
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
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Tiêu đề</label>
                <input className={inp} value={content.hero_title} onChange={(e) => update("hero_title", e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Phụ đề</label>
                <input className={inp} value={content.hero_subtitle} onChange={(e) => update("hero_subtitle", e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Nội dung</label>
                <textarea className={ta} rows={2} value={content.hero_body} onChange={(e) => update("hero_body", e.target.value)} />
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
                  <input className={inp} value={content.hero_cta_text} onChange={(e) => update("hero_cta_text", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Nút CTA (link)</label>
                  <input className={inp} value={content.hero_cta_link} onChange={(e) => update("hero_cta_link", e.target.value)} />
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
                <textarea className={ta} rows={3} value={content.about_body} onChange={(e) => update("about_body", e.target.value)} />
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">CTA cuối</p>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Tiêu đề</label>
                <input className={inp} value={content.cta_title} onChange={(e) => update("cta_title", e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Nội dung</label>
                <textarea className={ta} rows={2} value={content.cta_body} onChange={(e) => update("cta_body", e.target.value)} />
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
                <input className={inp} value={content.contact_email} onChange={(e) => update("contact_email", e.target.value)} placeholder="Email" />
                <input className={inp} value={content.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} placeholder="Điện thoại" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className={inp} value={content.contact_website} onChange={(e) => update("contact_website", e.target.value)} placeholder="Website" />
                <input className={inp} value={content.contact_address} onChange={(e) => update("contact_address", e.target.value)} placeholder="Địa chỉ" />
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Màu sắc</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Màu chính</label>
                  <input type="color" className="h-9 w-full rounded-lg border border-border" value={content.primary_color} onChange={(e) => update("primary_color", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Màu nền</label>
                  <input type="color" className="h-9 w-full rounded-lg border border-border" value={content.bg_color} onChange={(e) => update("bg_color", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Footer</p>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Copyright</label>
                <input className={inp} value={content.copyright_text} onChange={(e) => update("copyright_text", e.target.value)} placeholder="© 2026 Brand. All Rights Reserved" />
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Xem trước Email
              {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </h3>
            <button onClick={doRender} className={`${btnOutline} text-xs`}>
              <RefreshCw className="h-3.5 w-3.5" />
              Render lại
            </button>
          </div>
          <div className="overflow-y-auto rounded-xl border border-border bg-white" style={{ height: "600px" }}>
            {previewHtml ? (
              <iframe
                srcDoc={previewHtml}
                className="h-full w-full border-0"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Mail className="mx-auto h-12 w-12 opacity-30" />
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

function defaultContent(): EmailBuilderContent {
  return {
    logo_url: "",
    brand_name: "",
    hero_title: "",
    hero_subtitle: "",
    hero_body: "",
    hero_image_url: "",
    hero_cta_text: "",
    hero_cta_link: "#",
    about_title: "",
    about_body: "",
    about_image_url: "",
    cta_title: "",
    cta_body: "",
    cta_button_text: "",
    cta_button_link: "#",
    contact_email: "",
    contact_phone: "",
    contact_website: "",
    contact_address: "",
    social_facebook: "",
    social_twitter: "",
    social_instagram: "",
    copyright_text: "",
    primary_color: "#FF6B81",
    bg_color: "#EEF2F5",
  };
}
