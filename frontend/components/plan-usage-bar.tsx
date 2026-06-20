"use client";

import { cn } from "@/lib/utils";
import type { UsageItem } from "@/lib/plan";
import { usagePercent } from "@/lib/plan";

export function PlanUsageBar({
  label,
  item,
  className,
}: {
  label: string;
  item?: UsageItem;
  className?: string;
}) {
  if (!item) return null;
  const pct = usagePercent(item);
  const atLimit = item.max !== null && item.used >= item.max;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-semibold", atLimit ? "text-red-400" : "text-foreground")}>
          {item.used}
          {item.max !== null ? ` / ${item.max}` : " / ∞"}
        </span>
      </div>
      {item.max !== null && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-green-500",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function PlanUpgradeBanner({
  message,
  onUpgrade,
}: {
  message: string;
  onUpgrade: () => void;
}) {
  return (
    <div className="rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-amber-500/5 p-4">
      <p className="text-sm text-foreground mb-3">{message}</p>
      <button
        type="button"
        onClick={onUpgrade}
        className="rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 text-xs font-bold text-amber-950 hover:from-yellow-300 hover:to-amber-400 transition-all"
      >
        Nâng cấp gói
      </button>
    </div>
  );
}
