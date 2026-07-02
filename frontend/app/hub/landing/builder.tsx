"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { api, API_BASE_URL, getToken } from "@/services/api";
import { useProjectStore } from "@/store/project";
import { toast } from "sonner";
import {
  Sparkles,
  Upload,
  Save,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Check,
  Type,
  Palette,
  Target,
  Monitor,
  Smartphone,
  FileText,
  Code,
  Eye,
} from "lucide-react";
import { btn, btnOutline, inp } from "@/lib/ui-tokens";
import { useLocalDraft } from "@/hooks/use-local-draft";

const WIZARD_DRAFT_PREFIX = "vitba_landing_wizard_";
const WIZARD_DRAFT_FIELDS = [
  "purpose", "customPurpose", "colorPalette", "customColor", "fontPair", "customFont",
  "brandName", "logoUrl", "targetAudience", "keyFeatures", "contactInfo", "title",
] as const;

function clearWizardDraft() {
  try {
    WIZARD_DRAFT_FIELDS.forEach((f) => localStorage.removeItem(WIZARD_DRAFT_PREFIX + f));
  } catch {}
}

/* ------------------------------------------------------------------ */
/*  Wizard data                                                         */
/* ------------------------------------------------------------------ */

const STEPS = ["purpose", "content", "color", "font", "review"] as const;
type Step = (typeof STEPS)[number];

const PURPOSE_PRESETS = [
  "SaaS / AI Platform",
  "E-commerce / Bán hàng",
  "Khóa học / Đào tạo",
  "Agency / Dịch vụ",
  "Sự kiện / Hội nghị",
  "Portfolio / Cá nhân",
  "Restaurant / F&B",
  "Y tế / Phòng khám",
];

const COLOR_PALETTES = [
  { name: "Midnight Indigo", colors: ["#6366F1", "#1E1B4B", "#F8FAFC", "#0F172A"] },
  { name: "Vitba Gold", colors: ["#FACC15", "#F59E0B", "#1C1917", "#FEF3C7"] },
  { name: "Cyberpunk Neon", colors: ["#EC4899", "#06B6D4", "#0A0A0A", "#F0F0F0"] },
  { name: "Ocean Blue", colors: ["#2563EB", "#0EA5E9", "#FFFFFF", "#1E3A5F"] },
  { name: "Forest Green", colors: ["#22C55E", "#15803D", "#F0FDF4", "#14532D"] },
  { name: "Sunset Orange", colors: ["#F97316", "#EF4444", "#FFF7ED", "#7C2D12"] },
  { name: "Royal Purple", colors: ["#8B5CF6", "#6D28D9", "#FAF5FF", "#3B0764"] },
  { name: "Minimal Mono", colors: ["#18181B", "#71717A", "#FFFFFF", "#09090B"] },
];

const FONT_PAIRS = [
  { name: "Space Grotesk + DM Sans", title: "Space Grotesk", body: "DM Sans", sample: "Aa" },
  { name: "Inter + Inter", title: "Inter", body: "Inter", sample: "Aa" },
  { name: "Plus Jakarta + Plus Jakarta", title: "Plus Jakarta Sans", body: "Plus Jakarta Sans", sample: "Aa" },
  { name: "Instrument Serif + Work Sans", title: "Instrument Serif", body: "Work Sans", sample: "Aa" },
  { name: "Playfair Display + Lato", title: "Playfair Display", body: "Lato", sample: "Aa" },
  { name: "Montserrat + Open Sans", title: "Montserrat", body: "Open Sans", sample: "Aa" },
  { name: "Bebas Neue + Roboto", title: "Bebas Neue", body: "Roboto", sample: "Aa" },
  { name: "Cormorant + Mulish", title: "Cormorant Garamond", body: "Mulish", sample: "Aa" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function LandingBuilder({ onSaved }: { onSaved?: () => void }) {
  const [step, setStep] = useState<Step>("purpose");
  const [stepIndex, setStepIndex] = useState(0);

  // Answers (autosave localStorage — khôi phục nếu thoát giữa chừng)
  const [purpose, setPurpose] = useLocalDraft(WIZARD_DRAFT_PREFIX + "purpose", "");
  const [customPurpose, setCustomPurpose] = useLocalDraft(WIZARD_DRAFT_PREFIX + "customPurpose", "");
  const [colorPalette, setColorPalette] = useLocalDraft(WIZARD_DRAFT_PREFIX + "colorPalette", "");
  const [customColor, setCustomColor] = useLocalDraft(WIZARD_DRAFT_PREFIX + "customColor", "");
  const [fontPair, setFontPair] = useLocalDraft(WIZARD_DRAFT_PREFIX + "fontPair", "");
  const [customFont, setCustomFont] = useLocalDraft(WIZARD_DRAFT_PREFIX + "customFont", "");
  const [brandName, setBrandName] = useLocalDraft(WIZARD_DRAFT_PREFIX + "brandName", "");
  const [logoUrl, setLogoUrl] = useLocalDraft(WIZARD_DRAFT_PREFIX + "logoUrl", "");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Content details
  const [targetAudience, setTargetAudience] = useLocalDraft(WIZARD_DRAFT_PREFIX + "targetAudience", "");
  const [keyFeatures, setKeyFeatures] = useLocalDraft(WIZARD_DRAFT_PREFIX + "keyFeatures", "");
  const [contactInfo, setContactInfo] = useLocalDraft(WIZARD_DRAFT_PREFIX + "contactInfo", "");

  // Generation
  const [previewHtml, setPreviewHtml] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useLocalDraft(WIZARD_DRAFT_PREFIX + "title", "");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  // Bản nháp DB (autosave sau khi AI generate)
  const [savedPageId, setSavedPageId] = useState<number | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [liveTick, setLiveTick] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  const editableHtmlRef = useRef("");

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "html_update") {
        editableHtmlRef.current = e.data.html;
        setLiveTick((t) => t + 1);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const getCleanHtml = () => {
    const finalHtml = editableHtmlRef.current || previewHtml;
    return finalHtml.replace(/<script id="live-edit-script">[\s\S]*?<\/script>/, "");
  };

  // Autosave chỉnh sửa trực tiếp (live edit) vào bản nháp DB — debounce 3s
  useEffect(() => {
    if (!savedPageId || liveTick === 0) return;
    const t = setTimeout(async () => {
      try {
        await api.patch(`/mcp/landing/pages/${savedPageId}`, { html_content: getCleanHtml() });
        setLastSavedAt(new Date());
      } catch {}
    }, 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveTick, savedPageId]);

  const injectedHtml = useMemo(() => {
    if (!previewHtml) return "";
    const script = `
      <script id="live-edit-script">
        document.body.contentEditable = 'true';
        document.body.addEventListener('input', function() {
          window.parent.postMessage({ type: 'html_update', html: document.documentElement.outerHTML }, '*');
        });
        document.body.addEventListener('click', function(e) {
          if (e.target.closest('a')) {
            e.preventDefault();
          }
        });
      </script>
    `;
    return previewHtml.replace('</body>', script + '</body>');
  }, [previewHtml]);

  const stepNum = STEPS.indexOf(step);

  const uploadLogo = async (file: File) => {
    setUploadingLogo(true);
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
      const fullUrl = data.url.startsWith("http") ? data.url : `${API_BASE_URL}${data.url}`;
      setLogoUrl(fullUrl);
      toast.success("Tải logo thành công");
    } catch {
      toast.error("Tải logo thất bại");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const finalPurpose = purpose === "Other" ? customPurpose : purpose;
    const finalColor = colorPalette === "custom" ? customColor : colorPalette;
    const finalFont = fontPair === "custom" ? customFont : fontPair;

    if (!finalPurpose || !finalColor || !finalFont) {
      toast.error("Vui lòng trả lời đủ các câu hỏi");
      setGenerating(false);
      return;
    }

    try {
      const res = await api.post<{ html: string }>("/mcp/landing/onboard", {
        purpose: finalPurpose,
        color_palette: finalColor,
        typography: finalFont,
        brand_name: brandName,
        logo_url: logoUrl,
        project_id: useProjectStore.getState().activeProject?.id,
        target_audience: targetAudience,
        key_features: keyFeatures,
        contact_info: contactInfo,
      });
      setPreviewHtml(res.html);
      editableHtmlRef.current = ""; // Reset ref on new generation
      const autoTitle = finalPurpose.slice(0, 50);
      setTitle(autoTitle);

      // Tự động lưu bản nháp vào DB ngay sau khi AI tạo xong — không mất khi thoát
      try {
        const created = await api.post<{ id: number }>("/mcp/landing/save-from-template", {
          title: autoTitle || "Bản nháp Landing",
          slug: `draft-${Date.now()}`,
          html: res.html,
        });
        setSavedPageId(created.id);
        setLastSavedAt(new Date());
        toast.success("Đã tự lưu bản nháp — xem lại ở tab Danh sách");
      } catch {
        /* autosave lỗi không chặn luồng chính */
      }
    } catch {
      toast.error("Tạo thất bại, thử lại");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    const finalHtml = editableHtmlRef.current || previewHtml;
    if (!finalHtml) return;
    setSaving(true);
    // Remove the injected script before saving
    const cleanHtml = getCleanHtml();
    try {
      if (savedPageId) {
        await api.patch(`/mcp/landing/pages/${savedPageId}`, { title, html_content: cleanHtml });
      } else {
        const created = await api.post<{ id: number }>("/mcp/landing/save-from-template", { title, html: cleanHtml });
        setSavedPageId(created.id);
      }
      setLastSavedAt(new Date());
      clearWizardDraft();
      toast.success("Đã lưu landing page");
      onSaved?.();
    } catch {
      toast.error("Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  // Xuất bản 1 chạm: lưu (nếu chưa) rồi publish thành web tĩnh public ngay
  const handlePublishNow = async () => {
    const finalHtml = editableHtmlRef.current || previewHtml;
    if (!finalHtml) return;
    setPublishing(true);
    try {
      let pageId = savedPageId;
      const cleanHtml = getCleanHtml();
      if (pageId) {
        await api.patch(`/mcp/landing/pages/${pageId}`, { title: title || "Landing Page", html_content: cleanHtml });
      } else {
        const created = await api.post<{ id: number }>("/mcp/landing/save-from-template", {
          title: title || "Landing Page",
          html: cleanHtml,
        });
        pageId = created.id;
        setSavedPageId(created.id);
      }
      const res = await api.patch<{ slug: string; public_url?: string }>(`/mcp/landing/pages/${pageId}/publish`, {});
      const url = res.public_url && res.public_url.startsWith("http")
        ? res.public_url
        : `${API_BASE_URL}/p/${res.slug}`;
      setPublishedUrl(url);
      setLastSavedAt(new Date());
      clearWizardDraft();
      try { await navigator.clipboard.writeText(url); } catch {}
      toast.success("Đã xuất bản! Link web đã được copy vào clipboard");
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Xuất bản thất bại");
    } finally {
      setPublishing(false);
    }
  };

  // Editor state (đồng bộ với Mail Builder)
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [aiPrompt, setAiPrompt] = useState("");
  const [modifying, setModifying] = useState(false);

  const handleAiModify = async () => {
    if (!aiPrompt.trim() || !previewHtml) return;
    setModifying(true);
    try {
      const res = await api.post<{ html: string }>("/mcp/landing/modify", {
        current_html: getCleanHtml(),
        prompt: aiPrompt,
      });
      setPreviewHtml(res.html);
      editableHtmlRef.current = "";
      setAiPrompt("");
      setLiveTick((t) => t + 1); // trigger autosave bản nháp
      toast.success("Đã chỉnh sửa theo yêu cầu!");
    } catch {
      toast.error("Lỗi khi chỉnh sửa");
    } finally {
      setModifying(false);
    }
  };

  const canNext = () => {
    if (step === "purpose") return purpose !== "" && (purpose !== "Other" || customPurpose.trim());
    if (step === "content") return targetAudience.trim() !== "" || keyFeatures.trim() !== "" || contactInfo.trim() !== "";
    if (step === "color") return colorPalette !== "" && (colorPalette !== "custom" || customColor.trim());
    if (step === "font") return fontPair !== "" && (fontPair !== "custom" || customFont.trim());
    return true;
  };

  const next = () => {
    const nextIdx = stepIndex + 1;
    if (nextIdx < STEPS.length) {
      setStepIndex(nextIdx);
      setStep(STEPS[nextIdx]);
    }
  };

  const prev = () => {
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) {
      setStepIndex(prevIdx);
      setStep(STEPS[prevIdx]);
    }
  };

  const skipAll = () => {
    setStep("review");
    setStepIndex(4);
  };

  /* ---- If generated, show result view ---- */
  if (previewHtml) {
    return (
      <div className="flex h-[calc(100vh-180px)] flex-col gap-3">
        {/* Top bar */}
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card/50 px-3 py-2">
          <input className={`${inp} flex-1`} placeholder="Tên trang" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="flex rounded-lg border border-border p-0.5">
            <button
              onClick={() => setPreviewMode("desktop")}
              className={`flex h-7 w-8 items-center justify-center rounded ${previewMode === "desktop" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPreviewMode("mobile")}
              className={`flex h-7 w-8 items-center justify-center rounded ${previewMode === "mobile" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>
          {lastSavedAt && (
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">
              Đã tự lưu {lastSavedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button onClick={() => { setPreviewHtml(""); setStep("purpose"); setStepIndex(0); setSavedPageId(null); setLiveTick(0); editableHtmlRef.current = ""; }} className={btnOutline}>
            Tạo lại
          </button>
          <button onClick={handleSave} disabled={saving} className={`${btnOutline} whitespace-nowrap`}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu trang
          </button>
          <button onClick={handlePublishNow} disabled={publishing} className={`${btn} whitespace-nowrap`}>
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {publishing ? "Đang xuất bản..." : "Xuất bản ngay"}
          </button>
        </div>
        {publishedUrl && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span className="font-medium text-primary">🌐 Web đã live:</span>
            <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-primary underline">
              {publishedUrl}
            </a>
            <button
              onClick={() => { navigator.clipboard.writeText(publishedUrl); toast.success("Đã copy link"); }}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
            >
              Copy
            </button>
          </div>
        )}

        {/* Editor tabs & live-edit badge (đồng bộ với Mail Builder) */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-1 rounded-md border border-border bg-card/50 p-1">
            <button
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors ${viewMode === "preview" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview (Click sửa chữ)
            </button>
            <button
              onClick={() => setViewMode("code")}
              className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors ${viewMode === "code" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Code className="h-3.5 w-3.5" />
              Mã nguồn (HTML)
            </button>
          </div>
          {viewMode === "preview" && (
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              Bật chế độ sửa: Click vào văn bản bất kỳ để sửa chữ
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="relative flex-1 overflow-hidden rounded-xl border border-border bg-white min-h-0 flex flex-col">
          {viewMode === "preview" ? (
            <iframe
              srcDoc={injectedHtml}
              className="h-full w-full border-0"
              style={{ maxWidth: previewMode === "mobile" ? "390px" : "100%", margin: "0 auto", display: "block" }}
              title="Landing Preview"
              sandbox="allow-same-origin allow-scripts"
            />
          ) : (
            <textarea
              className="h-full w-full resize-none bg-slate-900 p-4 font-mono text-sm text-slate-50 outline-none"
              value={previewHtml}
              onChange={(e) => { setPreviewHtml(e.target.value); editableHtmlRef.current = ""; setLiveTick((t) => t + 1); }}
              spellCheck={false}
            />
          )}

          {/* AI Modifier Bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl">
            <div className="flex items-center gap-2 rounded-full border border-border bg-background/90 p-2 shadow-lg backdrop-blur-md">
              <Sparkles className="ml-3 h-5 w-5 text-primary" />
              <input
                className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground text-foreground"
                placeholder="Ví dụ: Đổi nền thành màu tối, thêm phần FAQ ở cuối trang..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAiModify();
                  }
                }}
              />
              <button
                onClick={handleAiModify}
                disabled={modifying || !aiPrompt.trim()}
                className="flex h-8 items-center justify-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                {modifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sửa bằng AI"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Onboarding wizard — split screen ---- */
  return (
    <div className="flex h-[calc(100vh-180px)] gap-3">
      {/* Left: Question panel (50%) */}
      <div className="flex w-1/2 flex-col">
        {/* Step indicator */}
        <div className="mb-3 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all ${i <= stepNum ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>

        {/* Question card */}
        <div className="flex flex-1 flex-col rounded-xl border border-border bg-card/50 p-6 min-h-0 overflow-y-auto">
          {/* Step 1: Purpose */}
          {step === "purpose" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Trang này dùng để làm gì?</h2>
              </div>
              <p className="text-sm text-muted-foreground">Chọn loại landing page hoặc tự mô tả</p>
              <div className="grid grid-cols-2 gap-2">
                {PURPOSE_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPurpose(p)}
                    className={`rounded-xl border p-3 text-left text-sm font-medium transition-all ${
                      purpose === p
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50 hover:bg-accent"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPurpose("Other")}
                  className={`rounded-xl border p-3 text-left text-sm font-medium transition-all ${
                    purpose === "Other"
                      ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  }`}
                >
                  Khác (tự mô tả)
                </button>
              </div>
              {purpose === "Other" && (
                <input
                  className={inp}
                  placeholder="Mô tả mục đích trang của bạn..."
                  value={customPurpose}
                  onChange={(e) => setCustomPurpose(e.target.value)}
                />
              )}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-medium text-muted-foreground">Tên brand (tùy chọn)</label>
                <input className={inp} placeholder="Vitba.ai" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Logo (tùy chọn)</label>
                <div className="flex gap-2">
                  <input className={`${inp} flex-1`} placeholder="URL hoặc tải lên" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
                  <label className={`${btnOutline} cursor-pointer whitespace-nowrap`}>
                    {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0]; if (f) uploadLogo(f);
                    }} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 1.5: Content Details */}
          {step === "content" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Chi tiết nội dung</h2>
              </div>
              <p className="text-sm text-muted-foreground">Giúp AI viết nội dung sát với thực tế doanh nghiệp của bạn hơn.</p>
              
              <div className="space-y-1.5 pt-2">
                <label className="text-sm font-medium text-foreground">Đối tượng khách hàng mục tiêu</label>
                <p className="text-xs text-muted-foreground mb-1">Ví dụ: Học sinh cấp 3, mẹ bỉm sữa, dân văn phòng...</p>
                <input className={inp} placeholder="Ai sẽ mua sản phẩm này?" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
              </div>
              
              <div className="space-y-1.5 pt-2">
                <label className="text-sm font-medium text-foreground">Tính năng nổi bật / Lợi ích</label>
                <p className="text-xs text-muted-foreground mb-1">Ví dụ: Giá rẻ nhất thị trường, giao hàng 2h, bảo hành 5 năm...</p>
                <textarea className={`${inp} min-h-[80px] resize-y`} placeholder="Liệt kê 2-3 điểm mạnh nhất của bạn..." value={keyFeatures} onChange={(e) => setKeyFeatures(e.target.value)} />
              </div>
              
              <div className="space-y-1.5 pt-2">
                <label className="text-sm font-medium text-foreground">Thông tin liên hệ</label>
                <p className="text-xs text-muted-foreground mb-1">Ví dụ: Hotline 19001560, 123 Đường A, Quận B, TP. HCM</p>
                <input className={inp} placeholder="Số điện thoại, địa chỉ (nếu có)..." value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 2: Color */}
          {step === "color" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Chọn bảng màu</h2>
              </div>
              <p className="text-sm text-muted-foreground">Bảng màu quyết định tone cả trang</p>
              <div className="grid grid-cols-2 gap-3">
                {COLOR_PALETTES.map((cp) => (
                  <button
                    key={cp.name}
                    onClick={() => setColorPalette(cp.name + ": " + cp.colors.join(", "))}
                    className={`rounded-xl border p-3 transition-all ${
                      colorPalette.startsWith(cp.name)
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="mb-2 flex gap-1">
                      {cp.colors.map((c, i) => (
                        <div key={i} className="h-8 flex-1 rounded-lg" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <p className="text-xs font-semibold text-foreground">{cp.name}</p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setColorPalette("custom")}
                className={`w-full rounded-xl border p-3 text-sm font-medium transition-all ${
                  colorPalette === "custom" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"
                }`}
              >
                Tự mô tả màu (vd: "Cyberpunk neon tone", "Màu xanh navy + gold luxury")
              </button>
              {colorPalette === "custom" && (
                <input className={inp} placeholder="Mô tả tone màu bạn muốn..." value={customColor} onChange={(e) => setCustomColor(e.target.value)} />
              )}
            </div>
          )}

          {/* Step 3: Font */}
          {step === "font" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Type className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Chọn cặp font chữ</h2>
              </div>
              <p className="text-sm text-muted-foreground">Font tiêu đề + font nội dung</p>
              <div className="grid grid-cols-2 gap-3">
                {FONT_PAIRS.map((fp) => (
                  <button
                    key={fp.name}
                    onClick={() => setFontPair(fp.name)}
                    className={`rounded-xl border p-4 transition-all ${
                      fontPair === fp.name
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="mb-2 flex items-end gap-2">
                      <span className="text-3xl font-bold leading-none" style={{ fontFamily: fp.title }}>{fp.sample}</span>
                      <span className="text-lg leading-none text-muted-foreground" style={{ fontFamily: fp.body }}>{fp.sample}</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground">{fp.title}</p>
                    <p className="text-xs text-muted-foreground">{fp.body}</p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setFontPair("custom")}
                className={`w-full rounded-xl border p-3 text-sm font-medium transition-all ${
                  fontPair === "custom" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"
                }`}
              >
                Tự mô tả font (vd: "Serif sang trọng + sans-serif sạch")
              </button>
              {fontPair === "custom" && (
                <input className={inp} placeholder="Mô tả cặp font bạn muốn..." value={customFont} onChange={(e) => setCustomFont(e.target.value)} />
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === "review" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Xem lại câu trả lời</h2>
              </div>
              <div className="space-y-3 rounded-xl border border-border p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Mục đích</p>
                  <p className="text-sm text-foreground">{purpose === "Other" ? customPurpose : purpose || "(chưa chọn)"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Bảng màu</p>
                  <p className="text-sm text-foreground">{colorPalette === "custom" ? customColor : colorPalette || "(chưa chọn)"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Cặp font</p>
                  <p className="text-sm text-foreground">{fontPair === "custom" ? customFont : fontPair || "(chưa chọn)"}</p>
                </div>
                {(targetAudience || keyFeatures) && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Khách hàng & Tính năng</p>
                    <p className="text-sm text-foreground line-clamp-2">{[targetAudience, keyFeatures].filter(Boolean).join(" - ")}</p>
                  </div>
                )}
                {brandName && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Brand</p>
                    <p className="text-sm text-foreground">{brandName}</p>
                  </div>
                )}
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className={`${btn} w-full text-base`}
              >
                {generating ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> AI đang thiết kế...</>
                ) : (
                  <><Sparkles className="h-5 w-5" /> Tạo Landing Page</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Nav bar */}
        <div className="mt-3 flex items-center justify-between">
          <button onClick={prev} disabled={stepIndex === 0} className={`${btnOutline} disabled:opacity-30`}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={skipAll} className="text-xs text-muted-foreground hover:text-foreground">
            Bỏ qua hết
          </button>
          {step === "review" ? (
            <button onClick={handleGenerate} disabled={generating || !canNext()} className={btn}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Submit
            </button>
          ) : (
            <button onClick={next} disabled={!canNext()} className={btn}>
              Next <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right: Live preview (50%) */}
      <div className="flex w-1/2 flex-col rounded-xl border border-border bg-muted/30 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex gap-2 text-xs">
            <span className="rounded-lg bg-primary/10 px-2 py-1 font-medium text-primary">Preview</span>
            <span className="rounded-lg px-2 py-1 text-muted-foreground">Code</span>
          </div>
          <span className="text-xs text-muted-foreground">Homepage</span>
        </div>
        <div className="flex flex-1 items-center justify-center bg-white min-h-0">
          {generating ? (
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-sm font-medium text-foreground">AI đang thiết kế landing page...</p>
              <p className="mt-1 text-xs text-muted-foreground">Đọc câu trả lời, chọn layout, viết nội dung</p>
            </div>
          ) : (
            <div className="text-center max-w-sm">
              <Sparkles className="mx-auto h-16 w-16 opacity-20 text-primary" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">Landing page sẽ hiển thị ở đây</p>
              <p className="mt-2 text-sm text-muted-foreground/70">
                Trả lời các câu hỏi bên trái, AI sẽ thiết kế độc quyền theo ý bạn
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
