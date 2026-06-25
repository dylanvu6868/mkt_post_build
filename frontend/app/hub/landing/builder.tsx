"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { api, API_BASE_URL, getToken } from "@/services/api";
import { toast } from "sonner";
import {
  Sparkles,
  Upload,
  Save,
  Loader2,
  Send,
  Image as ImageIcon,
  Palette,
} from "lucide-react";
import { btn, btnOutline, inp } from "@/lib/ui-tokens";

export function LandingBuilder({ onSaved }: { onSaved?: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("Untitled Landing Page");

  // Compact settings (collapsible)
  const [showSettings, setShowSettings] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);

  const uploadImage = async (
    file: File,
    setter: (v: string) => void,
    setUploading: (v: boolean) => void,
  ) => {
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
      setter(data.url);
      toast.success("Tải ảnh thành công");
    } catch {
      toast.error("Tải ảnh thất bại");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Mô tả landing page bạn muốn tạo");
      return;
    }
    setGenerating(true);
    try {
      const res = await api.post<{ html: string }>("/mcp/landing/generate-custom", {
        prompt,
        brand_name: brandName,
        logo_url: logoUrl,
        hero_image_url: heroImageUrl,
        primary_color: primaryColor,
        cta_text: ctaText,
        cta_link: ctaLink,
      });
      setPreviewHtml(res.html);
      if (!title || title === "Untitled Landing Page") {
        setTitle(prompt.slice(0, 50));
      }
    } catch {
      toast.error("Tạo thất bại, thử lại");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!previewHtml) return;
    setSaving(true);
    try {
      await api.post("/mcp/landing/save-from-template", { title, html: previewHtml });
      toast.success("Đã lưu landing page");
      onSaved?.();
    } catch {
      toast.error("Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col gap-3">
      {/* Prompt bar — top, no scroll */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none" />
          <input
            className={`${inp} pl-10 pr-3`}
            placeholder="Mô tả landing page bạn muốn... (vd: Trang bán khóa học tiếng Anh trực tuyến, có bảng giá, testimonial, form đăng ký)"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleGenerate(); }}
          />
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className={`${btnOutline} whitespace-nowrap`}>
          <Palette className="h-4 w-4" />
          {showSettings ? "Ẩn" : "Tùy chọn"}
        </button>
        <button onClick={handleGenerate} disabled={generating} className={`${btn} whitespace-nowrap`}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Tạo
        </button>
      </div>

      {/* Collapsible settings row */}
      {showSettings && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card/50 p-3">
          <input className={`${inp} w-40`} placeholder="Tên brand" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
          <div className="flex items-center gap-1">
            <input className={`${inp} w-48`} placeholder="Logo URL" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
            <label className={`${btnOutline} cursor-pointer`}>
              {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]; if (f) uploadImage(f, setLogoUrl, setUploadingLogo);
              }} />
            </label>
          </div>
          <div className="flex items-center gap-1">
            <input className={`${inp} w-48`} placeholder="Ảnh Hero URL" value={heroImageUrl} onChange={(e) => setHeroImageUrl(e.target.value)} />
            <label className={`${btnOutline} cursor-pointer`}>
              {uploadingHero ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]; if (f) uploadImage(f, setHeroImageUrl, setUploadingHero);
              }} />
            </label>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Màu chính</label>
            <input type="color" className="h-8 w-10 rounded border border-border" value={primaryColor || "#FFD700"} onChange={(e) => setPrimaryColor(e.target.value)} />
          </div>
          <input className={`${inp} w-32`} placeholder="Nút CTA" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
          <input className={`${inp} w-40`} placeholder="Link CTA" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} />
        </div>
      )}

      {/* Action bar */}
      {previewHtml && (
        <div className="flex items-center gap-2">
          <input className={`${inp} flex-1`} placeholder="Tên trang" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button onClick={handleSave} disabled={saving} className={`${btn} whitespace-nowrap`}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu
          </button>
        </div>
      )}

      {/* Preview — fills remaining viewport */}
      <div className="flex-1 overflow-hidden rounded-xl border border-border bg-white min-h-0">
        {previewHtml ? (
          <iframe srcDoc={previewHtml} className="h-full w-full" title="Landing Preview" sandbox="allow-same-origin" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center max-w-md">
              <Sparkles className="mx-auto h-16 w-16 opacity-20 text-primary" />
              <p className="mt-4 text-lg font-medium">Vitba Landing Page Builder</p>
              <p className="mt-2 text-sm">Mô tả landing page bạn muốn tạo ở ô trên. AI sẽ thiết kế độc quyền theo ý bạn.</p>
              <div className="mt-6 grid grid-cols-2 gap-2 text-xs text-muted-foreground/70">
                <div className="rounded-lg border border-border p-2">Tự chọn màu sắc, logo, ảnh</div>
                <div className="rounded-lg border border-border p-2">Responsive, Tailwind CSS</div>
                <div className="rounded-lg border border-border p-2">Deploy Vercel 1 click</div>
                <div className="rounded-lg border border-border p-2">Độc quyền Vitba AI</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
