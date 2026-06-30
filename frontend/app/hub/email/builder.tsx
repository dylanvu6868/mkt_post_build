"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { api, API_BASE_URL, getToken } from "@/services/api";
import { useProjectStore } from "@/store/project";
import { toast } from "sonner";
import {
  Sparkles,
  Upload,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Check,
  Type,
  Palette,
  Target,
  Send,
} from "lucide-react";
import { btn, btnOutline, inp } from "@/lib/ui-tokens";

/* ------------------------------------------------------------------ */
/*  Wizard data                                                         */
/* ------------------------------------------------------------------ */

const STEPS = ["purpose", "color", "font", "review"] as const;
type Step = (typeof STEPS)[number];

const PURPOSE_PRESETS = [
  "Email chào mừng khách mới",
  "Email khuyến mãi / giảm giá",
  "Email giới thiệu sản phẩm",
  "Email newsletter hàng tuần",
  "Email xác nhận đơn hàng",
  "Email mời sự kiện / webinar",
  "Email cảm ơn khách hàng",
  "Email re-engagement (kích hoạt lại)",
];

const COLOR_PALETTES = [
  { name: "Vitba Gold", colors: ["#FACC15", "#F59E0B", "#1C1917", "#FEF3C7"] },
  { name: "Corporate Blue", colors: ["#2563EB", "#1E40AF", "#FFFFFF", "#1E3A5F"] },
  { name: "Warm Coral", colors: ["#FF6B81", "#FF8E9E", "#EEF2F5", "#2D3436"] },
  { name: "Medical Teal", colors: ["#0D9488", "#115E59", "#F0FDFA", "#134E4A"] },
  { name: "Luxury Dark", colors: ["#1F2937", "#374151", "#F9FAFB", "#D4AF37"] },
  { name: "Sunset Orange", colors: ["#F97316", "#EA580C", "#FFF7ED", "#7C2D12"] },
  { name: "Royal Purple", colors: ["#8B5CF6", "#6D28D9", "#FAF5FF", "#3B0764"] },
  { name: "Minimal Mono", colors: ["#18181B", "#52525B", "#FFFFFF", "#27272A"] },
];

const FONT_PAIRS = [
  { name: "Inter + Inter", title: "Inter", body: "Inter", sample: "Aa" },
  { name: "Poppins + Open Sans", title: "Poppins", body: "Open Sans", sample: "Aa" },
  { name: "Montserrat + Lato", title: "Montserrat", body: "Lato", sample: "Aa" },
  { name: "Playfair + Source Sans", title: "Playfair Display", body: "Source Sans 3", sample: "Aa" },
  { name: "Ubuntu + Ubuntu", title: "Ubuntu", body: "Ubuntu", sample: "Aa" },
  { name: "DM Sans + DM Sans", title: "DM Sans", body: "DM Sans", sample: "Aa" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function MailBuilder({ onSendTest }: { onSendTest?: (html: string) => void }) {
  const [step, setStep] = useState<Step>("purpose");
  const [stepIndex, setStepIndex] = useState(0);

  const [purpose, setPurpose] = useState("");
  const [customPurpose, setCustomPurpose] = useState("");
  const [colorPalette, setColorPalette] = useState("");
  const [customColor, setCustomColor] = useState("");
  const [fontPair, setFontPair] = useState("");
  const [customFont, setCustomFont] = useState("");
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [previewHtml, setPreviewHtml] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [subject, setSubject] = useState("");

  const editableHtmlRef = useRef("");

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "html_update") {
        editableHtmlRef.current = e.data.html;
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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
      const res = await api.post<{ html: string }>("/mcp/email/builder/onboard", {
        purpose: finalPurpose,
        color_palette: finalColor,
        typography: finalFont,
        brand_name: brandName,
        logo_url: logoUrl,
        project_id: useProjectStore.getState().activeProject?.id,
      });
      setPreviewHtml(res.html);
      editableHtmlRef.current = ""; // Reset ref on new generation
      setSubject(finalPurpose.slice(0, 60));
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
        onSendTest(editableHtmlRef.current || previewHtml);
      } else {
        await api.post("/mcp/email/send", {
          to: [testEmail],
          subject: subject || "Test from Vitba",
          html: (editableHtmlRef.current || previewHtml).replace(/<script id="live-edit-script">[\s\S]*?<\/script>/, ""),
        });
        toast.success(`Đã gửi test đến ${testEmail}`);
      }
    } catch {
      toast.error("Gửi thất bại");
    } finally {
      setSending(false);
    }
  };

  const canNext = () => {
    if (step === "purpose") return purpose !== "" && (purpose !== "Other" || customPurpose.trim());
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
    setStepIndex(3);
  };

  /* ---- Result view ---- */
  if (previewHtml) {
    return (
      <div className="flex h-[calc(100vh-180px)] flex-col gap-3">
        <div className="flex items-center gap-2">
          <input className={`${inp} flex-1`} placeholder="Tiêu đề email" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <input className={`${inp} w-48`} placeholder="email@test.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
          <button onClick={handleSendTest} disabled={sending} className={`${btn} whitespace-nowrap`}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Gửi test
          </button>
          <button onClick={() => { setPreviewHtml(""); setStep("purpose"); setStepIndex(0); }} className={btnOutline}>
            Tạo lại
          </button>
        </div>
        <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-white min-h-0">
          <iframe srcDoc={injectedHtml} className="h-full w-full border-0" title="Email Preview" sandbox="allow-same-origin allow-scripts" />
        </div>
      </div>
    );
  }

  /* ---- Wizard split-screen ---- */
  return (
    <div className="flex h-[calc(100vh-180px)] gap-3">
      {/* Left: Questions (50%) */}
      <div className="flex w-1/2 flex-col">
        <div className="mb-3 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${i <= stepNum ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>

        <div className="flex flex-1 flex-col rounded-xl border border-border bg-card/50 p-6 min-h-0 overflow-y-auto">
          {step === "purpose" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Email này dùng để gì?</h2>
              </div>
              <p className="text-sm text-muted-foreground">Chọn loại email hoặc tự mô tả</p>
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
                    purpose === "Other" ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50 hover:bg-accent"
                  }`}
                >
                  Khác (tự mô tả)
                </button>
              </div>
              {purpose === "Other" && (
                <input className={inp} placeholder="Mô tả mục đích email..." value={customPurpose} onChange={(e) => setCustomPurpose(e.target.value)} />
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

          {step === "color" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Chọn bảng màu</h2>
              </div>
              <p className="text-sm text-muted-foreground">Tone màu cho toàn bộ email</p>
              <div className="grid grid-cols-2 gap-3">
                {COLOR_PALETTES.map((cp) => (
                  <button
                    key={cp.name}
                    onClick={() => setColorPalette(cp.name + ": " + cp.colors.join(", "))}
                    className={`rounded-xl border p-3 transition-all ${
                      colorPalette.startsWith(cp.name) ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
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
                Tự mô tả màu
              </button>
              {colorPalette === "custom" && (
                <input className={inp} placeholder="Mô tả tone màu..." value={customColor} onChange={(e) => setCustomColor(e.target.value)} />
              )}
            </div>
          )}

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
                      fontPair === fp.name ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border hover:border-primary/50"
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
                Tự mô tả font
              </button>
              {fontPair === "custom" && (
                <input className={inp} placeholder="Mô tả cặp font..." value={customFont} onChange={(e) => setCustomFont(e.target.value)} />
              )}
            </div>
          )}

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
                {brandName && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Brand</p>
                    <p className="text-sm text-foreground">{brandName}</p>
                  </div>
                )}
              </div>
              <button onClick={handleGenerate} disabled={generating} className={`${btn} w-full text-base`}>
                {generating ? <><Loader2 className="h-5 w-5 animate-spin" /> AI đang thiết kế...</> : <><Sparkles className="h-5 w-5" /> Tạo Email</>}
              </button>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button onClick={prev} disabled={stepIndex === 0} className={`${btnOutline} disabled:opacity-30`}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={skipAll} className="text-xs text-muted-foreground hover:text-foreground">Bỏ qua hết</button>
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

      {/* Right: Preview (50%) */}
      <div className="flex w-1/2 flex-col rounded-xl border border-border bg-muted/30 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex gap-2 text-xs">
            <span className="rounded-lg bg-primary/10 px-2 py-1 font-medium text-primary">Preview</span>
            <span className="rounded-lg px-2 py-1 text-muted-foreground">Code</span>
          </div>
          <span className="text-xs text-muted-foreground">Email</span>
        </div>
        <div className="flex flex-1 items-center justify-center bg-white min-h-0 overflow-y-auto">
          {generating ? (
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-sm font-medium text-foreground">AI đang thiết kế email...</p>
              <p className="mt-1 text-xs text-muted-foreground">Chọn layout, viết nội dung, tối ưu chuyển đổi</p>
            </div>
          ) : (
            <div className="text-center max-w-sm">
              <Sparkles className="mx-auto h-16 w-16 opacity-20 text-primary" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">Email sẽ hiển thị ở đây</p>
              <p className="mt-2 text-sm text-muted-foreground/70">
                Trả lời câu hỏi bên trái, AI sẽ tạo email HTML độc quyền, tương thích Outlook/Gmail
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
