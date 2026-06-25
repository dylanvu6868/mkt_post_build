/**
 * UI Tokens — single source of truth for shared Tailwind class strings.
 *
 * Quy tắc:
 * - Ưu tiên dùng <Button variant="...">, <Input>, <Textarea> từ components/ui.
 * - Tokens dưới đây dành cho trường hợp cần className trực tiếp (dialog custom,
 *   nút icon nhỏ, danger button với kích thước đặc biệt).
 * - KHÔNG redefine trong từng page — import từ đây.
 */

export const btn =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:brightness-110 hover:-translate-y-px active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_24px_-4px_hsl(var(--primary)/0.5)]";

export const btnOutline =
  "inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-border bg-background px-6 py-2.5 text-sm font-semibold hover:bg-accent hover:text-accent-foreground hover:border-primary/30 hover:-translate-y-px shadow-sm disabled:pointer-events-none disabled:opacity-50";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all disabled:opacity-50";

export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-all disabled:opacity-50";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition disabled:opacity-50";

export const btnSmall =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition disabled:opacity-50";

export const inp =
  "flex h-10 w-full rounded-xl border border-input bg-background/50 px-4 py-2.5 text-sm shadow-sm transition-all duration-200 placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-primary/50 hover:border-border/80 hover:bg-background/80 disabled:cursor-not-allowed disabled:opacity-50";

export const ta =
  "flex min-h-[120px] w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm shadow-sm transition-all duration-200 placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-primary/50 hover:border-border/80 hover:bg-background/80 disabled:cursor-not-allowed disabled:opacity-50 resize-y";

export const label =
  "text-xs font-semibold text-foreground/70 uppercase tracking-wider";

export const sectionLabel =
  "text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest";

export const cardPad = "p-6";

export const pageWrap = "mx-auto max-w-6xl space-y-8 pb-12";

export const pageHeaderTitle =
  "text-3xl font-bold tracking-tight text-foreground";

export const pageHeaderSubtitle = "mt-2 text-muted-foreground text-base";

export const pageEnter =
  "animate-in fade-in slide-in-from-bottom-4 duration-500";

export const brandGradientText =
  "bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text";
