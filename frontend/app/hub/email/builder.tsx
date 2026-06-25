"use client";

import { useState } from "react";
import { api, API_BASE_URL, getToken } from "@/services/api";
import { toast } from "sonner";
import {
  Sparkles,
  Upload,
  Loader2,
  Send,
  Palette,
} from "lucide-react";
import { btn, btnOutline, inp } from "@/lib/ui-tokens";

export function MailBuilder({ onSendTest }: { onSendTest?: (html: string) => void }) {
  const [prompt, setPrompt] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [subject, setSubject] = useState("");

  const [showSettings, setShowSettings] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const uploadImage = async (file: File) => {
    setUploadingLogo(true);
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
      setLogoUrl(data.url);
      toast.success("Tải logo thành công");
    } catch {
      toast.error("Tải ảnh thất bại");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Mô tả email bạn muốn tạo");
      return;
    }
    setGenerating(true);
    try {
      const res = await api.post<{ html: string }>("/mcp/email/builder/generate-custom", {
        prompt,
        brand_name: brandName,
        logo_url: logoUrl,
        primary_color: primaryColor,
        cta_text: ctaText,
      });
      setPreviewHtml(res.html);
      if (!subject) setSubject(prompt.slice(0, 60));
    } catch {
      toast.error("Tạo thất bại, thử lại");
    } finally {
      setGenerating(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail || !previewHtml) {
      toast.error("Nhập email nhận test");
      return;
    }
    setSending(true);
    try {
      if (onSendTest) {
        onSendTest(previewHtml);
      } else {
        await api.post("/mcp/email/send", {
          to: [testEmail],
          subject: subject || "Test from Vitba",
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
    <div className="flex h-[calc(100vh-200px)] flex-col gap-3">
      {/* Prompt bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none" />
          <input
            className={`${inp} pl-10 pr-3`}
            placeholder="Mô tả email bạn muốn... (vd: Email chào mừng khách hàng mới, giới thiệu sản phẩm, có mã giảm giá 20%)"
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

      {/* Collapsible settings */}
      {showSettings && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card/50 p-3">
          <input className={`${inp} w-40`} placeholder="Tên brand" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
          <div className="flex items-center gap-1">
            <input className={`${inp} w-48`} placeholder="Logo URL" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
            <label className={`${btnOutline} cursor-pointer`}>
              {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]; if (f) uploadImage(f);
              }} />
            </label>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Màu chính</label>
            <input type="color" className="h-8 w-10 rounded border border-border" value={primaryColor || "#FF6B81"} onChange={(e) => setPrimaryColor(e.target.value)} />
          </div>
          <input className={`${inp} w-32`} placeholder="Nút CTA" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
        </div>
      )}

      {/* Send bar */}
      {previewHtml && (
        <div className="flex items-center gap-2">
          <input className={`${inp} flex-1`} placeholder="Tiêu đề email" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <input className={`${inp} w-48`} placeholder="email@test.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
          <button onClick={handleSendTest} disabled={sending} className={`${btn} whitespace-nowrap`}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Gửi test
          </button>
        </div>
      )}

      {/* Preview — fills remaining viewport */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-white min-h-0">
        {previewHtml ? (
          <iframe srcDoc={previewHtml} className="h-full w-full" title="Email Preview" sandbox="allow-same-origin" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center max-w-md">
              <Sparkles className="mx-auto h-16 w-16 opacity-20 text-primary" />
              <p className="mt-4 text-lg font-medium">Vitba Mail Builder</p>
              <p className="mt-2 text-sm">Mô tả email bạn muốn tạo. AI sẽ thiết kế email HTML độc quyền, tương thích Outlook/Gmail.</p>
              <div className="mt-6 grid grid-cols-2 gap-2 text-xs text-muted-foreground/70">
                <div className="rounded-lg border border-border p-2">Table-based, responsive</div>
                <div className="rounded-lg border border-border p-2">Tương thích Outlook/Gmail</div>
                <div className="rounded-lg border border-border p-2">Gửi test trực tiếp</div>
                <div className="rounded-lg border border-border p-2">Độc quyền Vitba AI</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
