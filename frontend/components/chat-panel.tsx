"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useChatStore } from "@/store/chat";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { normalizePlan, type PlanId } from "@/lib/plan";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

const DASHBOARD_CARDS = [
  { title: "Facebook Post", desc: "Bài đăng mạng xã hội", type: "facebook_post", minPlan: "free" as PlanId },
  { title: "SEO Blog", desc: "Nội dung chuẩn SEO", type: "seo_blog", minPlan: "lite" as PlanId },
  { title: "Email Marketing", desc: "Chuỗi email tự động", type: "email", minPlan: "free" as PlanId },
  { title: "Landing Page", desc: "Trang đích chuyển đổi", type: "landing_page", minPlan: "max" as PlanId },
  { title: "TikTok Script", desc: "Kịch bản video ngắn", type: "tiktok_script", minPlan: "lite" as PlanId },
  { title: "Marketing Plan", desc: "Kế hoạch chiến lược", type: "marketing_plan", minPlan: "pro" as PlanId },
];

const PLAN_RANK: Record<PlanId, number> = { free: 0, lite: 1, pro: 2, max: 3 };

const CARD_ICONS: Record<string, JSX.Element> = {
  facebook_post: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>,
  seo_blog: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  email: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
  landing_page: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  tiktok_script: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect width="15" height="14" x="1" y="5" rx="2" ry="2"/></svg>,
  marketing_plan: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>,
};

const GUIDE_STEPS = [
  { title: "Chọn loại nội dung", desc: "Bấm vào một thẻ bên dưới để bắt đầu tạo nội dung marketing. Mỗi loại được thiết kế riêng cho từng nền tảng.", target: "cards" },
  { title: "Trò chuyện với Vitba Agents", desc: "Nhập yêu cầu vào ô chat. Vitba Agents sẽ hỏi thêm thông tin qua gợi ý ở sidebar phải, sau đó tự động tạo nội dung.", target: "chat" },
  { title: "Xem & tải kết quả", desc: "Kết quả hiển thị ngay trong chat. Bạn có thể sao chép, tải về (TXT/HTML), phóng to xem toàn bộ, hoặc yêu cầu AI làm lại.", target: "result" },
  { title: "Nâng cấp gói", desc: "Các loại nội dung nâng cao cần gói Lite/Pro/Max. Bấm vào thẻ bị khóa hoặc nút 'Nâng cấp' ở header để xem bảng giá.", target: "upgrade" },
  { title: "Cài đặt tài khoản", desc: "Vào Settings để cập nhật thông tin cá nhân, đổi mật khẩu, quản lý thương hiệu và tệp tài liệu.", target: "settings" },
];

function cleanContent(content: string) {
  if (!content) return "";
  let c = content
    .replace(/```generate\n[\s\S]*?\n```/g, "")
    .replace(/```suggestions\n[\s\S]*?\n```/g, "")
    .replace(/```(generate|suggestions)\n[\s\S]*$/g, "")
    .trim();
  c = c.replace(/\n+(?:[-*•]\s+.+(?:\n|$))+\s*$/, "");
  c = c.replace(/\n+(?:\d+[.)]\s+.+(?:\n|$))+\s*$/, "");
  return c;
}

function MarkdownContent({ content }: { content: string }) {
  const cleaned = cleanContent(content);
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-[15px]">{children}</p>,
        ul: ({ children }) => <ul className="mb-4 ml-6 list-disc last:mb-0 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="mb-4 ml-6 list-decimal last:mb-0 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="mb-1 text-[15px] text-muted-foreground">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <pre className="my-4 overflow-x-auto rounded-[12px] bg-muted border border-border p-4 text-[13px] text-foreground no-scrollbar shadow-inner">
                <code>{children}</code>
              </pre>
            );
          }
          return <code className="rounded-[4px] bg-primary/20 text-primary px-1.5 py-0.5 text-[13px] font-mono">{children}</code>;
        },
        pre: ({ children }) => <>{children}</>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:opacity-80 transition-opacity">
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-4 border-l-2 border-primary/50 bg-primary/5 pl-4 py-2 rounded-r-[8px] italic opacity-90">{children}</blockquote>
        ),
        h1: ({ children }) => <h1 className="mb-4 mt-6 text-2xl font-bold text-foreground">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-3 mt-6 text-xl font-bold text-foreground">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-2 mt-5 text-lg font-semibold text-foreground">{children}</h3>,
        h4: ({ children }) => <h4 className="mb-2 mt-4 text-base font-medium text-foreground">{children}</h4>,
        table: ({ children }) => (
          <div className="my-4 overflow-x-auto rounded-xl border border-border shadow-sm">
            <table className="w-full text-[13px]">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-muted/80 border-b border-border">{children}</thead>,
        tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
        tr: ({ children }) => <tr className="hover:bg-muted/40 transition-colors">{children}</tr>,
        th: ({ children }) => <th className="px-4 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">{children}</th>,
        td: ({ children }) => <td className="px-4 py-2.5 text-muted-foreground">{children}</td>,
      }}
    >
      {cleaned}
    </ReactMarkdown>
  );
}

const CONTENT_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  facebook_post: { label: "Facebook Post", icon: "📱" },
  seo_blog: { label: "SEO Blog", icon: "📝" },
  email: { label: "Email Marketing", icon: "📧" },
  landing_page: { label: "Landing Page", icon: "🎯" },
  tiktok_script: { label: "TikTok Script", icon: "🎬" },
  marketing_plan: { label: "Marketing Plan", icon: "📊" },
};

function formatResultText(result: Record<string, unknown>): string {
  if (result.error) return String(result.error);
  const content = (result.formatted_final && typeof result.formatted_final === "object")
    ? result.formatted_final as Record<string, string>
    : (result.final && typeof result.final === "object")
      ? result.final as Record<string, string>
      : null;
  if (content) {
    const parts: string[] = [];
    if (content.hook) parts.push(content.hook);
    if (content.body) parts.push(content.body);
    if (content.cta) parts.push(content.cta);
    if (content.hashtags) parts.push(content.hashtags);
    return parts.join("\n\n");
  }
  return JSON.stringify(result, null, 2);
}

function getHtmlBody(result: Record<string, unknown>): string | null {
  const content = (result.formatted_final as Record<string, string>) ?? (result.final as Record<string, string>);
  const body = content?.body;
  if (typeof body === "string" && body.trimStart().startsWith("<!DOCTYPE") || typeof body === "string" && body.trimStart().startsWith("<html")) {
    return body;
  }
  return null;
}

function LandingPagePreview({ html, onFullscreen }: { html: string; onFullscreen: () => void }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const handleCopyCode = () => {
    navigator.clipboard.writeText(html);
    toast.success("Đã sao chép mã nguồn!");
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "landing-page.html"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-[10px] border border-border p-0.5">
          <button
            onClick={() => setDevice("desktop")}
            className={cn("rounded-[8px] px-2.5 py-1 text-[11px] font-medium transition-all", device === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
            Desktop
          </button>
          <button
            onClick={() => setDevice("mobile")}
            className={cn("rounded-[8px] px-2.5 py-1 text-[11px] font-medium transition-all", device === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
            Mobile
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={handleCopyCode} className="flex items-center gap-1 rounded-[8px] border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            Code
          </button>
          <button onClick={handleDownloadHtml} className="flex items-center gap-1 rounded-[8px] border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Tải
          </button>
          <button onClick={onFullscreen} className="flex items-center gap-1 rounded-[8px] border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            Toàn màn hình
          </button>
        </div>
      </div>
      <div className={cn(
        "mx-auto rounded-[12px] border border-border overflow-hidden bg-white transition-all duration-300",
        device === "mobile" ? "w-[375px]" : "w-full"
      )}>
        <iframe
          srcDoc={html}
          sandbox="allow-scripts"
          className="w-full border-0"
          style={{ height: device === "mobile" ? "600px" : "450px" }}
          title="Landing Page Preview"
        />
      </div>
    </div>
  );
}

function LandingPageFullscreen({ html, onClose }: { html: string; onClose: () => void }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(html);
    toast.success("Đã sao chép mã nguồn!");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-6 py-3 bg-background/95 border-b border-border" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="text-primary">{CARD_ICONS.landing_page}</span>
          <span className="text-[14px] font-semibold text-foreground">Landing Page Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-[10px] border border-border p-0.5">
            <button onClick={() => setDevice("desktop")} className={cn("rounded-[8px] px-3 py-1.5 text-[12px] font-medium transition-all", device === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>Desktop</button>
            <button onClick={() => setDevice("mobile")} className={cn("rounded-[8px] px-3 py-1.5 text-[12px] font-medium transition-all", device === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>Mobile</button>
          </div>
          <button onClick={() => setShowCode(!showCode)} className={cn("rounded-[10px] border px-3 py-1.5 text-[12px] font-medium transition-all", showCode ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-accent")}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            Code
          </button>
          <button onClick={handleCopyCode} className="rounded-[10px] border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all">Copy</button>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className={cn("flex-1 flex items-start justify-center overflow-auto p-4", showCode && "w-1/2")}>
          <div className={cn(
            "rounded-[12px] border border-border overflow-hidden bg-white transition-all duration-300 h-full",
            device === "mobile" ? "w-[375px]" : "w-full"
          )}>
            <iframe srcDoc={html} sandbox="allow-scripts" className="w-full h-full border-0" title="Landing Page Preview" />
          </div>
        </div>
        {showCode && (
          <div className="w-1/2 border-l border-border overflow-auto bg-[#0d1117]">
            <pre className="p-4 text-[13px] text-green-400 font-mono whitespace-pre-wrap break-all">{html}</pre>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ExpandModal({ result, onClose }: { result: Record<string, unknown>; onClose: () => void }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-4xl max-h-[90vh] rounded-[20px] border border-primary/20 bg-background overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/10 bg-primary/5">
          <span className="text-[15px] font-semibold text-foreground">Xem toàn bộ nội dung</span>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="overflow-y-auto p-6 max-h-[calc(90vh-60px)] no-scrollbar">
          <MarkdownContent content={formatResultText(result)} />
        </div>
      </motion.div>
    </motion.div>
  );
}

function DownloadMenu({ result, onClose }: { result: Record<string, unknown>; onClose: () => void }) {
  const text = formatResultText(result);

  const downloadTxt = () => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "content.txt"; a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const downloadHtml = () => {
    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Marketing Content - Vitba.ai</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0a0a0a; color: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .slide { max-width: 800px; width: 90%; margin: 40px auto; padding: 48px; background: #111; border: 1px solid #222; border-radius: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
  .slide h1, .slide h2, .slide h3 { color: #FFD54A; margin-bottom: 16px; }
  .slide p { line-height: 1.8; margin-bottom: 16px; font-size: 16px; }
  .slide ul, .slide ol { margin-left: 24px; margin-bottom: 16px; }
  .slide li { margin-bottom: 8px; line-height: 1.6; }
  .slide strong { color: #FFD54A; }
  .badge { display: inline-block; background: #FFD54A; color: #0a0a0a; padding: 4px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 24px; }
  .footer { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #222; font-size: 12px; color: #666; }
</style>
</head>
<body>
<div class="slide">
  <span class="badge">Vitba.ai</span>
  ${text.split("\n").map(line => {
    if (line.startsWith("# ")) return `<h1>${line.slice(2)}</h1>`;
    if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
    if (line.startsWith("### ")) return `<h3>${line.slice(4)}</h3>`;
    if (line.startsWith("- ") || line.startsWith("• ")) return `<ul><li>${line.slice(2)}</li></ul>`;
    if (line.trim() === "") return "";
    return `<p>${line}</p>`;
  }).join("\n")}
  <div class="footer">Được tạo bởi Vitba.ai &mdash; AI Marketing Assistant</div>
</div>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "content-slide.html"; a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const downloadPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("Trình duyệt đã chặn popup"); return; }
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Content</title>
<style>body{font-family:'Segoe UI',sans-serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.8;color:#222}
h1,h2,h3{color:#b8860b;margin-top:24px}p{margin-bottom:12px}ul,ol{margin-left:20px}li{margin-bottom:6px}
.footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #ddd;font-size:11px;color:#999}</style>
</head><body>${text.split("\n").map(l => {
      if (l.startsWith("# ")) return `<h1>${l.slice(2)}</h1>`;
      if (l.startsWith("## ")) return `<h2>${l.slice(3)}</h2>`;
      if (l.startsWith("### ")) return `<h3>${l.slice(4)}</h3>`;
      if (l.trim() === "") return "";
      return `<p>${l}</p>`;
    }).join("")}<div class="footer">Vitba.ai — AI Marketing Assistant</div></body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="absolute bottom-full left-0 mb-2 rounded-[12px] border border-border bg-card shadow-xl overflow-hidden z-50 min-w-[160px]"
    >
      <button onClick={downloadTxt} className="flex items-center gap-2 w-full px-4 py-2.5 text-[13px] text-foreground hover:bg-muted transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        Tải TXT
      </button>
      <button onClick={downloadHtml} className="flex items-center gap-2 w-full px-4 py-2.5 text-[13px] text-foreground hover:bg-muted transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        Tải HTML Slide
      </button>
      <button onClick={downloadPdf} className="flex items-center gap-2 w-full px-4 py-2.5 text-[13px] text-foreground hover:bg-muted transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        Tải PDF
      </button>
    </motion.div>
  );
}

function GuideModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = GUIDE_STEPS[step];

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-md rounded-[20px] border border-primary/20 bg-background overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-primary/10 bg-primary/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span className="text-[15px] font-semibold text-foreground">Hướng dẫn sử dụng</span>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            {GUIDE_STEPS.map((_, i) => (
              <div key={i} className={cn("h-1.5 rounded-full flex-1 transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-[14px] font-bold">{step + 1}</span>
                <h3 className="text-[17px] font-bold text-foreground">{current.title}</h3>
              </div>
              <p className="text-[14px] text-muted-foreground leading-relaxed pl-10">{current.desc}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-background/50">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="rounded-[10px] px-4 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
          >
            ← Trước
          </button>
          <span className="text-[12px] text-muted-foreground">{step + 1}/{GUIDE_STEPS.length}</span>
          {step < GUIDE_STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="rounded-[10px] bg-primary px-4 py-2 text-[13px] font-bold text-primary-foreground hover:bg-primary/90 transition-all"
            >
              Tiếp →
            </button>
          ) : (
            <button
              onClick={onClose}
              className="rounded-[10px] bg-primary px-4 py-2 text-[13px] font-bold text-primary-foreground hover:bg-primary/90 transition-all"
            >
              Hoàn tất ✓
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function InlineResult({ result, onRedo }: {
  result: Record<string, unknown>;
  onRedo: () => void;
}) {
  const router = useRouter();
  const contentType = (result._contentType as string) || "";
  const meta = CONTENT_TYPE_LABELS[contentType] || { label: "Nội dung", icon: "✨" };
  const review = result.review as Record<string, unknown> | undefined;
  const score = review?.score as number | undefined;
  const [expanded, setExpanded] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const htmlBody = getHtmlBody(result);
  const isLandingPage = contentType === "landing_page" && htmlBody;

  const handleCopy = () => {
    navigator.clipboard.writeText(isLandingPage ? htmlBody! : formatResultText(result));
    toast.success(isLandingPage ? "Đã sao chép mã nguồn!" : "Đã sao chép!");
  };

  if (result.error) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start w-full">
        <div className="max-w-[90%] sm:max-w-[80%] rounded-[20px] border border-red-500/30 bg-red-500/10 p-5 space-y-3">
          <p className="text-sm text-red-400">{String(result.error)}</p>
          {(result.upgradeRequired as boolean) && (
            <button onClick={() => router.push("/pricing")} className="rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 text-xs font-bold text-amber-950">
              Nâng cấp gói
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start w-full">
        <div className="max-w-[90%] sm:max-w-[85%] w-full">
          <div className="rounded-[20px] border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/[0.02] overflow-hidden shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.3)]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-primary/10 bg-primary/5">
              <div className="flex items-center gap-2.5">
                <span className="text-primary">{CARD_ICONS[contentType] || <span className="text-lg">{meta.icon}</span>}</span>
                <span className="text-[14px] font-semibold text-foreground">{meta.label}</span>
              </div>
              {score !== undefined && (
                <span className="rounded-full bg-primary px-3 py-1 text-[12px] font-bold text-primary-foreground shadow-[0_0_12px_rgba(255,213,74,0.3)]">
                  {score}/100
                </span>
              )}
            </div>

            {/* Content */}
            {isLandingPage ? (
              <div className="px-4 py-4">
                <LandingPagePreview html={htmlBody!} onFullscreen={() => setExpanded(true)} />
              </div>
            ) : (
              <div className="px-5 py-4 max-h-[400px] overflow-y-auto no-scrollbar">
                <MarkdownContent content={formatResultText(result)} />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 px-5 py-3 border-t border-primary/10 bg-background/50">
              {!isLandingPage && (
                <>
                  <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-[10px] border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    Copy
                  </button>
                  <div className="relative">
                    <button onClick={() => setShowDownload(!showDownload)} className="flex items-center gap-1.5 rounded-[10px] border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                      Tải về
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <AnimatePresence>
                      {showDownload && <DownloadMenu result={result} onClose={() => setShowDownload(false)} />}
                    </AnimatePresence>
                  </div>
                  <button onClick={() => setExpanded(true)} className="flex items-center gap-1.5 rounded-[10px] border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                    Phóng to
                  </button>
                </>
              )}
              <button onClick={onRedo} className={cn("flex items-center gap-1.5 rounded-[10px] border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all", !isLandingPage && "ml-auto")}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                Làm lại
              </button>
            </div>
          </div>
        </div>
      </motion.div>
      <AnimatePresence>
        {expanded && (isLandingPage
          ? <LandingPageFullscreen html={htmlBody!} onClose={() => setExpanded(false)} />
          : <ExpandModal result={result} onClose={() => setExpanded(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

const AGENT_STEPS = [
  { key: "planner", label: "Lên kế hoạch" },
  { key: "research", label: "Nghiên cứu thị trường" },
  { key: "seo", label: "Tối ưu SEO" },
  { key: "brand", label: "Phân tích thương hiệu" },
  { key: "fusion", label: "Tổng hợp dữ liệu" },
  { key: "copywriter", label: "Viết nội dung" },
  { key: "reviewer", label: "Kiểm duyệt & Đánh giá" },
];

function GeneratingIndicator({ streamContent }: { streamContent: string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const isProcessing = streamContent.startsWith("Đang xử lý:");
  const isStreaming = !!streamContent && !isProcessing;

  const currentStep = isProcessing
    ? AGENT_STEPS.find((s) => streamContent.includes(s.label))?.key || ""
    : "";
  const currentIdx = AGENT_STEPS.findIndex((s) => s.key === currentStep);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [streamContent]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start w-full">
      <div className="max-w-[90%] sm:max-w-[85%] w-full">
        <div className="rounded-[20px] border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-primary/10">
            {isStreaming ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 animate-pulse" />
                <span className="text-[13px] font-medium text-green-600 dark:text-green-400">Kết quả đang được tạo...</span>
              </>
            ) : (
              <>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-[13px] font-medium text-primary">Vitba Agents đang làm việc...</span>
              </>
            )}
          </div>

          {/* Processing steps */}
          {isProcessing && (
            <div className="px-5 py-3 flex flex-wrap gap-2">
              {AGENT_STEPS.map((step, i) => (
                <span
                  key={step.key}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                    i < currentIdx
                      ? "bg-green-500/15 text-green-600 dark:text-green-400"
                      : i === currentIdx
                        ? "bg-primary/15 text-primary ring-1 ring-primary/30 animate-pulse"
                        : "bg-muted/50 text-muted-foreground/50"
                  )}
                >
                  {i < currentIdx ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : i === currentIdx ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  ) : null}
                  {step.label}
                </span>
              ))}
            </div>
          )}

          {/* Streaming content */}
          {isStreaming && (
            <div ref={contentRef} className="px-5 py-4 max-h-[60vh] overflow-y-auto no-scrollbar">
              <MarkdownContent content={streamContent} />
              <span className="animate-pulse inline-block ml-1 text-primary">|</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ChatPanel() {
  const {
    messages, activeConversationId, streaming, streamContent, conversations,
    sendMessage, stopStreaming, createConversation, contentPanel, setContentPanel,
  } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const userPlan = normalizePlan(user?.plan);
  const canUse = useCallback((minPlan: PlanId) => PLAN_RANK[userPlan] >= PLAN_RANK[minPlan], [userPlan]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent, contentPanel.generating, contentPanel.result]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0 && attachedImages.length === 0) || streaming) return;

    let msg = input.trim();
    const fileNames = [...attachedFiles, ...attachedImages].map(f => f.name);
    if (fileNames.length > 0) {
      const prefix = `[Đã đính kèm: ${fileNames.join(", ")}]`;
      msg = msg ? `${prefix}\n${msg}` : `${prefix}\nHãy phân tích nội dung ảnh này và cho tôi biết bạn thấy gì.`;
    }

    setInput("");
    setAttachedFiles([]);
    setAttachedImages([]);
    setImagePreviews([]);

    if (!activeConversationId) {
      await createConversation();
    }
    await sendMessage(msg);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    let convId = activeConversationId;
    if (!convId) {
      await createConversation();
      convId = useChatStore.getState().activeConversationId;
    }
    if (!convId) {
      toast.error("Không thể tạo cuộc trò chuyện");
      return;
    }

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post<{ document_id: number; status: string; conversation_id: number }>(`/chat/${convId}/upload`, formData);
        toast.info(`Đang xử lý ${file.name}...`);
        const docId = res.document_id;
        let ready = false;
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 1000));
          try {
            const s = await api.get<{ status: string }>(`/chat/${convId}/upload/${docId}/status`);
            if (s.status === "ready") { ready = true; break; }
            if (s.status === "failed") break;
          } catch { break; }
        }
        if (ready) {
          setAttachedFiles(prev => [...prev, file]);
          toast.success(`${file.name} đã sẵn sàng`);
        } else {
          toast.error(`Không thể xử lý ${file.name}`);
        }
      } catch {
        toast.error(`Không thể tải lên ${file.name}`);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    let convId = activeConversationId;
    if (!convId) {
      await createConversation();
      convId = useChatStore.getState().activeConversationId;
    }
    if (!convId) {
      toast.error("Không thể tạo cuộc trò chuyện");
      return;
    }

    for (const img of files) {
      if (img.size > 5 * 1024 * 1024) {
        toast.error(`${img.name} quá lớn (tối đa 5MB)`);
        continue;
      }
      try {
        const formData = new FormData();
        formData.append('file', img);
        await api.post(`/chat/${convId}/upload-image`, formData);
        setAttachedImages(prev => [...prev, img]);
        const previewUrl = URL.createObjectURL(img);
        setImagePreviews(prev => [...prev, previewUrl]);
        toast.success(`Đã tải lên ${img.name}`);
      } catch {
        toast.error(`Không thể tải lên ${img.name}`);
      }
    }
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeFile = (index: number, isImage: boolean) => {
    if (isImage) {
      setAttachedImages(prev => prev.filter((_, i) => i !== index));
      setImagePreviews(prev => {
        const removed = prev[index];
        if (removed) URL.revokeObjectURL(removed);
        return prev.filter((_, i) => i !== index);
      });
    } else {
      setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    }
  };


  const showInlineResult = !contentPanel.generating && contentPanel.result && !contentPanel.visible;
  const showGenerating = contentPanel.generating;

  if (!activeConversationId || messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col relative items-center justify-center p-3 sm:p-8 min-h-screen overflow-hidden bg-background">
        <button
          onClick={() => { window.dispatchEvent(new CustomEvent("toggle-sidebar")); }}
          className="absolute left-4 top-4 rounded-full p-2 hover:bg-accent md:hidden z-10 text-muted-foreground"
          aria-label="Toggle sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>

        {/* Guide button - top right */}
        <button
          onClick={() => setShowGuide(true)}
          className="absolute right-4 top-4 rounded-full p-2.5 text-primary hover:bg-primary/10 transition-colors z-10"
          aria-label="Hướng dẫn"
          title="Hướng dẫn sử dụng"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </button>

        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center opacity-60">
          <motion.div animate={{ x: [-30, 30, -30], y: [-30, 30, -30], rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="absolute w-[600px] h-[400px] rounded-full bg-primary/10 blur-[120px] mix-blend-screen" />
          <motion.div animate={{ x: [30, -30, 30], y: [30, -30, 30], rotate: [0, -15, 15, 0], scale: [1.2, 1, 1.2] }} transition={{ repeat: Infinity, duration: 25, ease: "linear" }} className="absolute w-[500px] h-[500px] rounded-full bg-[#ffb700]/10 blur-[140px] mix-blend-screen" />
        </div>

        <div className="flex flex-col items-center max-w-3xl w-full z-10 mt-[-5vh]">
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-2xl sm:text-4xl md:text-[44px] font-bold mb-2 sm:mb-3 tracking-tight text-foreground text-center px-2">
            Chào mừng trở lại, <span className="text-foreground">{user?.name || "bạn"}</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="text-muted-foreground text-[15px] sm:text-[17px] mb-6 sm:mb-8 font-medium text-center">
            Hôm nay bạn muốn thiết kế nội dung gì?
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="w-full max-w-2xl bg-card/80 backdrop-blur-2xl rounded-[18px] sm:rounded-[24px] p-1.5 sm:p-2 mb-6 sm:mb-10 relative shadow-[0_8px_32px_-12px_rgba(255,213,74,0.15)] border border-border focus-within:border-primary/50 focus-within:shadow-[0_8px_40px_-12px_rgba(255,213,74,0.3)] transition-all duration-500">
            <form onSubmit={handleSubmit} className="flex gap-1.5 sm:gap-2 w-full">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Khởi tạo chiến dịch marketing..." className="flex-1 bg-transparent border-none px-4 sm:px-6 py-3 sm:py-4 text-[15px] sm:text-[16px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-0 min-w-0" />
              <button type="submit" disabled={!input.trim()} className="rounded-[14px] sm:rounded-[16px] bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 h-[44px] w-[44px] sm:h-[52px] sm:w-[52px] flex items-center justify-center disabled:opacity-50 disabled:hover:scale-100 transition-all duration-300 mr-0.5 self-center shadow-[0_0_20px_rgba(255,213,74,0.4)] shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </form>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.5 } } }} className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4 w-full">
            {DASHBOARD_CARDS.map((item) => {
              const locked = !canUse(item.minPlan);
              return (
                <motion.button
                  variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } } }}
                  whileHover={locked ? {} : { scale: 1.02, y: -2 }}
                  whileTap={locked ? {} : { scale: 0.98 }}
                  key={item.title}
                  onClick={async () => {
                    if (locked) { router.push("/pricing"); return; }
                    if (!activeConversationId) await createConversation();
                    await sendMessage(`Tôi muốn viết ${item.title}`);
                  }}
                  className={cn(
                    "relative flex flex-col items-start gap-2 sm:gap-3 rounded-[16px] sm:rounded-[20px] border p-3.5 sm:p-5 text-left transition-all duration-300 group",
                    locked
                      ? "border-border/50 bg-card/30 opacity-60 cursor-not-allowed"
                      : "border-border bg-card/60 hover:bg-muted/80 hover:border-primary/40 hover:shadow-[inset_0_0_20px_rgba(255,213,74,0.05),0_8px_20px_-8px_rgba(0,0,0,0.1)] dark:hover:shadow-[inset_0_0_20px_rgba(255,213,74,0.05),0_8px_20px_-8px_rgba(0,0,0,0.5)]"
                  )}
                >
                  {locked && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      {item.minPlan}
                    </div>
                  )}
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full transition-colors text-primary",
                    locked ? "bg-muted/50" : "bg-primary/10 group-hover:bg-primary/20"
                  )}>
                    {CARD_ICONS[item.type]}
                  </div>
                  <div>
                    <span className={cn("block font-semibold text-[15px] transition-colors", locked ? "text-muted-foreground" : "text-foreground group-hover:text-primary")}>{item.title}</span>
                    <span className="block text-[13px] text-muted-foreground mt-1">{item.desc}</span>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.1)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none mix-blend-overlay" />

        <AnimatePresence>
          {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-w-0 bg-background">
      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-border px-3 sm:px-5 py-3 sm:py-4 bg-background/80 backdrop-blur-md z-20">
        <button onClick={() => { window.dispatchEvent(new CustomEvent("toggle-sidebar")); }} className="rounded-full p-2 hover:bg-accent md:hidden text-muted-foreground shrink-0" aria-label="Toggle sidebar">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 max-w-[55%] sm:max-w-[60%]">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
          <h2 className="truncate text-[14px] sm:text-[15px] font-semibold text-foreground">
            {conversations.find((c) => c.id === activeConversationId)?.title || "Cuộc trò chuyện mới"}
          </h2>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
          <button
            onClick={() => setShowGuide(true)}
            className="rounded-full p-1.5 sm:p-2 text-primary hover:bg-primary/10 transition-colors"
            aria-label="Hướng dẫn"
            title="Hướng dẫn sử dụng"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </button>
          <button
            onClick={() => router.push("/pricing")}
            className="hidden sm:block rounded-[10px] bg-primary/10 border border-primary/20 px-3 py-1.5 text-[12px] font-bold text-primary hover:bg-primary/20 transition-all"
          >
            Nâng cấp
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 scroll-smooth relative no-scrollbar">
        {messages.map((msg) => {
          if (msg.role === "assistant") {
            const cleaned = cleanContent(msg.content);
            if (!cleaned) return null;
          }
          return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[90%] sm:max-w-[80%] px-4 py-3 sm:px-6 sm:py-4 text-[14px] sm:text-[15px] shadow-sm overflow-hidden",
                msg.role === "user"
                  ? "bg-primary/10 text-foreground border border-primary/20 rounded-[20px] sm:rounded-[24px] rounded-tr-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                  : "bg-card text-foreground rounded-[20px] sm:rounded-[24px] rounded-tl-sm border border-border shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]"
              )}>
                {msg.role === "assistant" ? <MarkdownContent content={msg.content} /> : <span className="whitespace-pre-wrap break-words">{msg.content}</span>}
              </div>
            </motion.div>
          );
        })}

        {/* Chat streaming — only when NOT in generation mode */}
        {streaming && streamContent && !contentPanel.generating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="max-w-[90%] sm:max-w-[80%] rounded-[24px] rounded-tl-sm bg-card border border-border px-6 py-4 text-[15px] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)] overflow-hidden">
              <MarkdownContent content={streamContent} />
              <span className="animate-pulse inline-block ml-1 text-primary">|</span>
            </div>
          </motion.div>
        )}

        {streaming && !streamContent && !contentPanel.generating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="rounded-[24px] rounded-tl-sm bg-card border border-border px-6 py-4 text-[15px] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]">
              <span className="flex items-center gap-1.5 text-primary">
                <span className="animate-bounce" style={{ animationDelay: "0ms" }}>&#9679;</span>
                <span className="animate-bounce" style={{ animationDelay: "150ms" }}>&#9679;</span>
                <span className="animate-bounce" style={{ animationDelay: "300ms" }}>&#9679;</span>
              </span>
            </div>
          </motion.div>
        )}

        {/* Inline generating indicator — mutually exclusive with streaming */}
        {showGenerating && !streaming && (
          <GeneratingIndicator streamContent={contentPanel.generating ? streamContent : ""} />
        )}

        {/* Inline result — only when not generating and not streaming */}
        {showInlineResult && !streaming && contentPanel.result && (
          <InlineResult
            result={contentPanel.result}
            onRedo={() => setContentPanel({ generating: false, result: null })}
          />
        )}

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background/90 backdrop-blur-xl p-3 sm:p-6 relative z-20">
        {/* Attached files preview */}
        {(attachedFiles.length > 0 || attachedImages.length > 0) && (
          <div className="max-w-4xl mx-auto mb-3 flex flex-wrap gap-2">
            {attachedFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-[12px] text-foreground border border-border">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span className="max-w-[150px] truncate">{file.name}</span>
                <button onClick={() => removeFile(i, false)} className="text-muted-foreground hover:text-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
            {attachedImages.map((file, i) => (
              <div key={i} className="relative group">
                {imagePreviews[i] ? (
                  <img src={imagePreviews[i]} alt={file.name} className="h-14 w-14 rounded-lg object-cover border border-border" />
                ) : (
                  <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-[12px] text-foreground border border-border">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    <span className="max-w-[150px] truncate">{file.name}</span>
                  </div>
                )}
                <button onClick={() => removeFile(i, true)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="bg-card/80 backdrop-blur-xl rounded-[18px] sm:rounded-[24px] p-1 sm:p-1.5 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)] max-w-4xl mx-auto border border-border relative focus-within:border-primary/40 focus-within:shadow-[0_8px_40px_-12px_rgba(255,213,74,0.15)] transition-all duration-300">
          <form onSubmit={handleSubmit} className="flex gap-1 sm:gap-2 w-full">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming}
              className="rounded-[12px] sm:rounded-[16px] bg-muted hover:bg-accent text-muted-foreground hover:text-foreground h-[38px] w-[38px] sm:h-[46px] sm:w-[46px] flex items-center justify-center self-center disabled:opacity-50 transition-all duration-300 shrink-0"
              title="Upload tài liệu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={streaming}
              className="rounded-[12px] sm:rounded-[16px] bg-muted hover:bg-accent text-muted-foreground hover:text-foreground h-[38px] w-[38px] sm:h-[46px] sm:w-[46px] flex items-center justify-center self-center disabled:opacity-50 transition-all duration-300 shrink-0"
              title="Upload ảnh để AI phân tích"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </button>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Gửi tin nhắn..." disabled={streaming} className="flex-1 bg-transparent border-none px-3 sm:px-5 py-3 sm:py-3.5 text-[14px] sm:text-[15px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-0 disabled:opacity-50 min-w-0" />
            {streaming ? (
              <button
                type="button"
                onClick={stopStreaming}
                className="rounded-[12px] sm:rounded-[16px] bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-105 active:scale-95 h-[38px] w-[38px] sm:h-[46px] sm:w-[46px] flex items-center justify-center mr-0.5 self-center transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.3)] shrink-0"
                title="Dừng trả lời"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() && attachedImages.length === 0}
                className="rounded-[12px] sm:rounded-[16px] bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 h-[38px] w-[38px] sm:h-[46px] sm:w-[46px] flex items-center justify-center mr-0.5 self-center disabled:opacity-50 disabled:hover:scale-100 transition-all duration-300 shadow-[0_0_15px_rgba(255,213,74,0.3)] shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            )}
          </form>
        </div>


        <div className="text-center mt-2">
          <span className="text-[11px] text-foreground/30">Vitba.ai &mdash; AI Marketing Assistant</span>
        </div>
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.1)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none -z-10 mix-blend-overlay" />

      <AnimatePresence>
        {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
      </AnimatePresence>
    </div>
  );
}
