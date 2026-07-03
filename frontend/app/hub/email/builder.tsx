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
  FileText,
  Settings2,
  Code,
  Eye,
  History,
} from "lucide-react";
import { btn, btnOutline, inp } from "@/lib/ui-tokens";
import { useLocalDraft } from "@/hooks/use-local-draft";

const MAIL_DRAFT_PREFIX = "vitba_mail_wizard_";
const MAIL_DRAFT_FIELDS = [
  "purpose", "customPurpose", "colorPalette", "customColor", "fontPair", "customFont",
  "brandName", "logoUrl", "targetAudience", "keyMessage", "signatureInfo", "subject",
] as const;

function clearMailWizardDraft() {
  try {
    MAIL_DRAFT_FIELDS.forEach((f) => localStorage.removeItem(MAIL_DRAFT_PREFIX + f));
  } catch {}
}

interface DraftListItem {
  id: number;
  subject: string;
  updated_at: string;
}
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/* ------------------------------------------------------------------ */
/*  Wizard data                                                         */
/* ------------------------------------------------------------------ */

const STEPS = ["purpose", "content", "color", "font", "review"] as const;
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

  const [purpose, setPurpose] = useLocalDraft(MAIL_DRAFT_PREFIX + "purpose", "");
  const [customPurpose, setCustomPurpose] = useLocalDraft(MAIL_DRAFT_PREFIX + "customPurpose", "");
  const [colorPalette, setColorPalette] = useLocalDraft(MAIL_DRAFT_PREFIX + "colorPalette", "");
  const [customColor, setCustomColor] = useLocalDraft(MAIL_DRAFT_PREFIX + "customColor", "");
  const [fontPair, setFontPair] = useLocalDraft(MAIL_DRAFT_PREFIX + "fontPair", "");
  const [customFont, setCustomFont] = useLocalDraft(MAIL_DRAFT_PREFIX + "customFont", "");
  const [brandName, setBrandName] = useLocalDraft(MAIL_DRAFT_PREFIX + "brandName", "");
  const [logoUrl, setLogoUrl] = useLocalDraft(MAIL_DRAFT_PREFIX + "logoUrl", "");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Content details
  const [targetAudience, setTargetAudience] = useLocalDraft(MAIL_DRAFT_PREFIX + "targetAudience", "");
  const [keyMessage, setKeyMessage] = useLocalDraft(MAIL_DRAFT_PREFIX + "keyMessage", "");
  const [signatureInfo, setSignatureInfo] = useLocalDraft(MAIL_DRAFT_PREFIX + "signatureInfo", "");

  const [previewHtml, setPreviewHtml] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [subject, setSubject] = useLocalDraft(MAIL_DRAFT_PREFIX + "subject", "");

  // Bản nháp DB (autosave email đang soạn)
  const [draftId, setDraftId] = useState<number | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [liveTick, setLiveTick] = useState(0);
  const [availableDrafts, setAvailableDrafts] = useState<DraftListItem[]>([]);

  // Editor State
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [aiPrompt, setAiPrompt] = useState("");
  const [modifying, setModifying] = useState(false);

  // Send Modal State
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [sendCc, setSendCc] = useState("");
  const [sendBcc, setSendBcc] = useState("");
  const [contactLists, setContactLists] = useState<{ id: number; name: string; contact_count: number }[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  // SMTP riêng đã bỏ — mọi email gửi qua hệ thống với sender cá nhân hóa
  // ({tên-viết-liền}@vitbaai.xyz) và Reply-To về email tài khoản.

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

  const getCleanEmailHtml = () =>
    (editableHtmlRef.current || previewHtml).replace(/<script id="live-edit-script">[\s\S]*?<\/script>/, "");

  const restoreDraft = async (id: number) => {
    try {
      const d = await api.get<{ id: number; subject: string; html_body: string }>(
        `/mcp/email/builder/drafts/${id}`
      );
      setPreviewHtml(d.html_body);
      setSubject(d.subject || "");
      setDraftId(d.id);
      editableHtmlRef.current = "";
      toast.success("Đã khôi phục bản nháp");
    } catch {
      toast.error("Không tải được bản nháp");
    }
  };

  const removeDraft = async (id: number) => {
    try {
      await api.delete(`/mcp/email/builder/drafts/${id}`);
      setAvailableDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch {}
  };

  // Khi vào trang: nếu có ?draft={id} thì mở lại đúng bản nháp; nếu không, tải danh sách nháp
  useEffect(() => {
    const draftParam = new URLSearchParams(window.location.search).get("draft");
    (async () => {
      try {
        if (draftParam) {
          await restoreDraft(Number(draftParam));
          return;
        }
        const list = await api.get<DraftListItem[]>("/mcp/email/builder/drafts");
        setAvailableDrafts(list);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave bản nháp DB — debounce 2.5s khi nội dung/tiêu đề/live edit thay đổi
  useEffect(() => {
    if (!draftId || !previewHtml) return;
    const t = setTimeout(async () => {
      try {
        await api.patch(`/mcp/email/builder/drafts/${draftId}`, {
          subject,
          html_body: getCleanEmailHtml(),
        });
        setLastSavedAt(new Date());
      } catch {}
    }, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewHtml, subject, liveTick, draftId]);

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
      const fullUrl = data.url.startsWith("http") ? data.url : `${API_BASE_URL}${data.url}`;
      setLogoUrl(fullUrl);
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
        target_audience: targetAudience,
        key_message: keyMessage,
        signature_info: signatureInfo,
      });
      setPreviewHtml(res.html);
      editableHtmlRef.current = ""; // Reset ref on new generation
      const autoSubject = finalPurpose.slice(0, 60);
      setSubject(autoSubject);

      // Tự động lưu bản nháp DB ngay sau khi AI tạo xong — không mất khi thoát
      try {
        const d = await api.post<{ id: number }>("/mcp/email/builder/drafts", {
          subject: autoSubject,
          html_body: res.html,
          meta: {
            purpose: finalPurpose,
            color_palette: finalColor,
            typography: finalFont,
            brand_name: brandName,
          },
        });
        setDraftId(d.id);
        setLastSavedAt(new Date());
      } catch {
        /* autosave lỗi không chặn luồng chính */
      }
    } catch {
      toast.error("Tạo thất bại, thử lại");
    } finally {
      setGenerating(false);
    }
  };

  // Tải danh sách liên hệ khi mở modal gửi
  useEffect(() => {
    if (!isSendModalOpen) return;
    api
      .get<{ id: number; name: string; contact_count: number }[]>("/mcp/email/lists")
      .then(setContactLists)
      .catch(() => {});
  }, [isSendModalOpen]);

  const handleBulkSend = async () => {
    if (!selectedListId) {
      toast.error("Vui lòng chọn danh sách liên hệ");
      return;
    }
    setBulkSending(true);
    try {
      const res = await api.post<{ sent_count: number; failed: string[] }>("/mcp/email/batch", {
        list_id: Number(selectedListId),
        subject: subject || "Email từ Vitba",
        html_template: getCleanEmailHtml(),
      });
      const failedCount = res.failed?.length ?? 0;
      toast.success(
        `Đã gửi hàng loạt: ${res.sent_count} thành công${failedCount ? `, ${failedCount} thất bại` : ""}`
      );
      setIsSendModalOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.message || "Gửi hàng loạt thất bại");
    } finally {
      setBulkSending(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail || !previewHtml) {
      toast.error("Vui lòng nhập ít nhất 1 email nhận");
      return;
    }
    setSending(true);
    
    // Parse emails
    const parseEmails = (str: string) => str.split(",").map(e => e.trim()).filter(Boolean);
    const toList = parseEmails(testEmail);
    const ccList = parseEmails(sendCc);
    const bccList = parseEmails(sendBcc);

    try {
      if (onSendTest) {
        // If it's used as a component with a custom onSendTest (legacy)
        onSendTest(editableHtmlRef.current || previewHtml);
      } else {
        await api.post("/mcp/email/send", {
          to: toList,
          cc: ccList.length > 0 ? ccList : undefined,
          bcc: bccList.length > 0 ? bccList : undefined,
          subject: subject || "Test from Vitba",
          html: (editableHtmlRef.current || previewHtml).replace(/<script id="live-edit-script">[\s\S]*?<\/script>/, ""),
        });
        toast.success(`Đã gửi email thành công!`);
        setIsSendModalOpen(false);
        // Email đã gửi xong → dọn bản nháp
        if (draftId) {
          try {
            await api.delete(`/mcp/email/builder/drafts/${draftId}`);
          } catch {}
          setDraftId(null);
        }
        clearMailWizardDraft();
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Gửi thất bại");
    } finally {
      setSending(false);
    }
  };

  const canNext = () => {
    if (step === "purpose") return purpose !== "" && (purpose !== "Other" || customPurpose.trim());
    if (step === "content") return targetAudience.trim() !== "" || keyMessage.trim() !== "" || signatureInfo.trim() !== "";
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

  const handleAiModify = async () => {
    if (!aiPrompt.trim() || !previewHtml) return;
    setModifying(true);
    try {
      const res = await api.post<{ html: string }>("/mcp/email/builder/modify", {
        current_html: editableHtmlRef.current || previewHtml,
        prompt: aiPrompt,
        project_id: useProjectStore.getState().activeProject?.id,
      });
      setPreviewHtml(res.html);
      editableHtmlRef.current = ""; // Reset ref
      setAiPrompt("");
      toast.success("Đã chỉnh sửa theo yêu cầu!");
    } catch {
      toast.error("Lỗi khi chỉnh sửa");
    } finally {
      setModifying(false);
    }
  };

  /* ---- Result view ---- */
  if (previewHtml) {
    return (
      <div className="flex h-[calc(100vh-180px)] flex-col gap-3">
        <div className="flex items-center gap-2">
          <input className={`${inp} flex-1`} placeholder="Tiêu đề email" value={subject} onChange={(e) => setSubject(e.target.value)} />
          
          <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
            <DialogTrigger asChild>
              <button className={`${btn} whitespace-nowrap`}>
                <Send className="h-4 w-4" />
                Cấu hình & Gửi
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto p-6">
              <DialogHeader>
                <DialogTitle>Gửi Email</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Recipients */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1">1. Người nhận</h3>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Gửi đến (To) *</label>
                    <input className={inp} placeholder="a@gmail.com, b@gmail.com (cách nhau dấu phẩy)" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">CC</label>
                      <input className={inp} placeholder="cc1@a.com..." value={sendCc} onChange={(e) => setSendCc(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">BCC</label>
                      <input className={inp} placeholder="bcc1@a.com..." value={sendBcc} onChange={(e) => setSendBcc(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Bulk send by contact list */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1">
                    Hoặc: Gửi hàng loạt theo danh sách liên hệ
                  </h3>
                  {contactLists.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Chưa có danh sách liên hệ nào — tạo ở tab Contacts/Lists của Vitba Mail.
                    </p>
                  ) : (
                    <select
                      className={inp}
                      value={selectedListId}
                      onChange={(e) => setSelectedListId(e.target.value)}
                    >
                      <option value="">-- Chọn danh sách liên hệ --</option>
                      {contactLists.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.contact_count} liên hệ)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Sender info — SMTP riêng đã bỏ, hệ thống tự cá nhân hóa */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">✉️ Người gửi:</span> email sẽ được gửi từ địa chỉ
                  thương hiệu riêng của bạn dạng <span className="font-mono text-foreground">tencuaban@vitbaai.xyz</span> (tự
                  tạo từ tên tài khoản). Khi người nhận bấm Trả lời, thư sẽ về đúng email đăng ký của bạn.
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button onClick={() => setIsSendModalOpen(false)} className={btnOutline}>Hủy</button>
                <button
                  onClick={handleBulkSend}
                  disabled={bulkSending || !selectedListId}
                  className={btnOutline}
                  title="Gửi cho toàn bộ danh sách liên hệ đã chọn"
                >
                  {bulkSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {bulkSending ? "Đang gửi hàng loạt..." : "Gửi hàng loạt"}
                </button>
                <button onClick={handleSendTest} disabled={sending} className={btn}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? "Đang gửi..." : "Gửi Email"}
                </button>
              </div>
            </DialogContent>
          </Dialog>
          
          <button onClick={() => { setPreviewHtml(""); setStep("purpose"); setStepIndex(0); setDraftId(null); setLiveTick(0); setLastSavedAt(null); editableHtmlRef.current = ""; }} className={btnOutline}>
            Tạo lại
          </button>
        </div>
        
        {/* Editor Tabs & Badge */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-1 rounded-md border border-border bg-card/50 p-1">
            <button
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors ${viewMode === "preview" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview (Kéo xem & Click sửa chữ)
            </button>
            <button
              onClick={() => setViewMode("code")}
              className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors ${viewMode === "code" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Code className="h-3.5 w-3.5" />
              Mã nguồn (HTML)
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            {lastSavedAt && (
              <span className="text-[11px] text-muted-foreground">
                Đã tự lưu {lastSavedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {viewMode === "preview" && (
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                Bật chế độ sửa: Click vào văn bản bất kỳ để sửa chữ
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden rounded-xl border border-border bg-white min-h-0 flex flex-col relative">
          {viewMode === "preview" ? (
            <iframe srcDoc={injectedHtml} className="h-full w-full border-0" title="Email Preview" sandbox="allow-same-origin allow-scripts" />
          ) : (
            <textarea
              className="h-full w-full resize-none bg-slate-900 p-4 font-mono text-sm text-slate-50 outline-none"
              value={previewHtml}
              onChange={(e) => setPreviewHtml(e.target.value)}
              spellCheck={false}
            />
          )}

          {/* AI Modifier Bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl">
            <div className="flex items-center gap-2 rounded-full border border-border bg-background/90 p-2 shadow-lg backdrop-blur-md">
              <Sparkles className="ml-3 h-5 w-5 text-primary" />
              <input
                className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground text-foreground"
                placeholder="Ví dụ: Đổi nút thành màu đỏ, thêm một phần chào mừng..."
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

  /* ---- Wizard split-screen ---- */
  return (
    <div className="flex h-[calc(100vh-180px)] gap-3">
      {/* Left: Questions (50%) */}
      <div className="flex w-1/2 flex-col">
        {availableDrafts.length > 0 && (
          <div className="mb-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <History className="h-3.5 w-3.5" />
              Bạn có {availableDrafts.length} bản nháp chưa hoàn tất
            </p>
            <div className="max-h-32 space-y-1 overflow-y-auto">
              {availableDrafts.slice(0, 5).map((d) => (
                <div key={d.id} className="flex items-center gap-2">
                  <button
                    onClick={() => restoreDraft(d.id)}
                    className="flex-1 truncate text-left text-xs text-foreground transition-colors hover:text-primary"
                  >
                    {d.subject || "Email nháp"} — {new Date(d.updated_at).toLocaleString("vi-VN")}
                  </button>
                  <button
                    onClick={() => removeDraft(d.id)}
                    className="shrink-0 text-[10px] text-muted-foreground transition-colors hover:text-destructive"
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
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

          {/* Step 1.5: Content Details */}
          {step === "content" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Chi tiết nội dung</h2>
              </div>
              <p className="text-sm text-muted-foreground">Giúp AI viết nội dung email đúng mục tiêu hơn.</p>
              
              <div className="space-y-1.5 pt-2">
                <label className="text-sm font-medium text-foreground">Khách hàng nhận email là ai?</label>
                <p className="text-xs text-muted-foreground mb-1">Ví dụ: Khách hàng cũ chưa mua lại, người đăng ký mới...</p>
                <input className={inp} placeholder="Đối tượng nhận..." value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
              </div>
              
              <div className="space-y-1.5 pt-2">
                <label className="text-sm font-medium text-foreground">Thông điệp cốt lõi / Khuyến mãi</label>
                <p className="text-xs text-muted-foreground mb-1">Ví dụ: Tặng mã GIAM50, ra mắt sản phẩm mới vào 20/10...</p>
                <textarea className={`${inp} min-h-[80px] resize-y`} placeholder="Điều quan trọng nhất bạn muốn nói..." value={keyMessage} onChange={(e) => setKeyMessage(e.target.value)} />
              </div>
              
              <div className="space-y-1.5 pt-2">
                <label className="text-sm font-medium text-foreground">Thông tin chữ ký</label>
                <p className="text-xs text-muted-foreground mb-1">Ví dụ: John Doe - CEO tại Vitba.ai</p>
                <input className={inp} placeholder="Tên, chức vụ, công ty..." value={signatureInfo} onChange={(e) => setSignatureInfo(e.target.value)} />
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
                {(targetAudience || keyMessage) && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Nội dung cốt lõi</p>
                    <p className="text-sm text-foreground line-clamp-2">{[targetAudience, keyMessage].filter(Boolean).join(" - ")}</p>
                  </div>
                )}
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
