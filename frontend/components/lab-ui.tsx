"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import React from "react";
import {
  FlaskConical,
  ChevronRight,
  Loader2,
  CircleAlert,
  Check,
  Copy,
} from "lucide-react";

/* ─── Breadcrumb ─────────────────────────────────────────────── */
export function LabBreadcrumb({ tool }: { tool: string }) {
  const router = useRouter();
  return (
    <nav className="flex items-center gap-2 text-sm">
      <button
        onClick={() => router.push("/hub/lab")}
        className="lab-breadcrumb-btn"
      >
        <FlaskConical size={12} />
        Vitba Tool
      </button>
      <ChevronRight size={12} className="text-muted-foreground/30" />
      <span className="text-foreground font-medium">{tool}</span>
    </nav>
  );
}

/* ─── Tool Header ─────────────────────────────────────────────── */
export function ToolHeader({
  name,
  description,
  tag = "available",
}: {
  name: string;
  description: string;
  tag?: "available" | "beta" | "soon";
}) {
  const tagConfig = {
    available: { label: "Khả dụng", cls: "lab-tag-available" },
    beta: { label: "Beta", cls: "lab-tag-beta" },
    soon: { label: "Sắp ra mắt", cls: "lab-tag-soon" },
  }[tag];
  return (
    <div className="border-b border-border/50 pb-5">
      <div className="flex items-center gap-2.5 mb-1.5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{name}</h1>
        <span className={cn("lab-tag", tagConfig.cls)}>{tagConfig.label}</span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">{description}</p>
    </div>
  );
}

/* ─── Run Button ─────────────────────────────────────────────── */
export function RunButton({
  loading,
  disabled,
  onClick,
  loadingText,
  idleText,
  className,
}: {
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  loadingText: string;
  idleText: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn("lab-run-btn", className)}
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          <span>{loadingText}</span>
        </>
      ) : (
        <span>{idleText}</span>
      )}
    </button>
  );
}

/* ─── Textarea Input ─────────────────────────────────────────── */
export function LabTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 52,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="lab-label">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("lab-textarea", className)}
        style={{ height: rows ? `${rows * 4}px` : undefined }}
      />
    </div>
  );
}

/* ─── Input Field ─────────────────────────────────────────────── */
export function LabInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="lab-label">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="lab-input"
      />
    </div>
  );
}

/* ─── Error Box ───────────────────────────────────────────────── */
export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="lab-error-box">
      <CircleAlert size={14} className="shrink-0 mt-0.5" />
      <p>{message}</p>
    </div>
  );
}

/* ─── Empty State ─────────────────────────────────────────────── */
export function EmptyState({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="lab-empty-state">
      <div className="lab-empty-icon">{icon}</div>
      <p className="text-xs text-muted-foreground/50 font-medium">{text}</p>
    </div>
  );
}

/* ─── Result Box ──────────────────────────────────────────────── */
export function ResultBox({
  title,
  dotColor = "bg-emerald-500",
  children,
  onCopy,
  copied,
  copyLabel = "Sao chép",
  copiedLabel = "Đã sao chép",
}: {
  title: string;
  dotColor?: string;
  children: React.ReactNode;
  onCopy?: () => void;
  copied?: boolean;
  copyLabel?: string;
  copiedLabel?: string;
}) {
  return (
    <div className="lab-result-box">
      <div className="lab-result-header">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", dotColor)} />
          <span className="text-xs font-semibold text-foreground/80">{title}</span>
        </div>
        {onCopy && (
          <button onClick={onCopy} className="lab-copy-btn">
            {copied ? (
              <>
                <Check size={11} strokeWidth={2.5} />
                {copiedLabel}
              </>
            ) : (
              <>
                <Copy size={11} />
                {copyLabel}
              </>
            )}
          </button>
        )}
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

/* ─── Info Box ────────────────────────────────────────────────── */
export function InfoBox({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="lab-info-box">
      <p className="lab-section-label">{label}</p>
      {children}
    </div>
  );
}

/* ─── Section Label ───────────────────────────────────────────── */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="lab-section-label">{children}</p>;
}

/* ─── Chip / Tag Selector ─────────────────────────────────────── */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="space-y-2">
      {label && <p className="lab-label">{label}</p>}
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn("lab-chip", value === opt.value ? "lab-chip-active" : "lab-chip-idle")}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Radio Option ────────────────────────────────────────────── */
export function RadioOption({
  id,
  label,
  desc,
  selected,
  onClick,
}: {
  id: string;
  label: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      key={id}
      onClick={onClick}
      className={cn("lab-radio-btn", selected ? "lab-radio-active" : "lab-radio-idle")}
    >
      <div className={cn("lab-radio-dot", selected ? "lab-radio-dot-active" : "lab-radio-dot-idle")} />
      <div className="text-left">
        <p className="text-[13px] font-semibold leading-none mb-0.5 text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}

/* ─── Score Bar ───────────────────────────────────────────────── */
export function ScoreBar({
  score,
  max = 100,
  colorClass,
}: {
  score: number;
  max?: number;
  colorClass: string;
}) {
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-700", colorClass)}
        style={{ width: `${(score / max) * 100}%` }}
      />
    </div>
  );
}

/* ─── Status Badge ────────────────────────────────────────────── */
export function StatusBadge({
  safe,
  safeText,
  warnText,
}: {
  safe: boolean;
  safeText: string;
  warnText: string;
}) {
  return (
    <div className={cn(
      "flex items-center gap-2.5 rounded-xl border px-4 py-3",
      safe
        ? "border-emerald-500/25 bg-emerald-500/8 dark:bg-emerald-500/5"
        : "border-amber-500/25 bg-amber-500/8 dark:bg-amber-500/5"
    )}>
      <div className={cn("w-2 h-2 rounded-full shrink-0", safe ? "bg-emerald-500" : "bg-amber-500")} />
      <p className={cn("text-xs font-semibold", safe ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
        {safe ? safeText : warnText}
      </p>
    </div>
  );
}
