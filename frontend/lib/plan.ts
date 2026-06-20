export type PlanId = "free" | "lite" | "pro" | "max";

export interface UsageItem {
  used: number;
  max: number | null;
}

export interface PlanLimitsResponse {
  plan: PlanId;
  plan_expires_at: string | null;
  limits: {
    daily_generations: number;
    content_types: string[];
    max_projects: number;
    max_conversations: number;
    max_kb_files: number;
    max_brand_profiles: number;
    history_retention_days: number | null;
  };
  usage: {
    daily_generations: UsageItem;
    brand_profiles: UsageItem;
    kb_files: UsageItem;
    projects: UsageItem;
    conversations: UsageItem;
  };
}

export const PLAN_META: Record<
  PlanId,
  { name: string; color: string; bgColor: string; badgeBg: string; badgeColor: string }
> = {
  free: {
    name: "Free",
    color: "text-zinc-600 dark:text-zinc-400",
    bgColor: "bg-zinc-100 dark:bg-zinc-800",
    badgeBg: "bg-zinc-500/15",
    badgeColor: "text-zinc-400",
  },
  lite: {
    name: "Lite",
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-100 dark:bg-sky-900/30",
    badgeBg: "bg-sky-500/15",
    badgeColor: "text-sky-400",
  },
  pro: {
    name: "Pro",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    badgeBg: "bg-blue-500/20",
    badgeColor: "text-blue-400",
  },
  max: {
    name: "Max",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    badgeBg: "bg-yellow-500/20",
    badgeColor: "text-yellow-400",
  },
};

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  facebook_post: "Facebook Post",
  email: "Email",
  seo_blog: "SEO Blog",
  tiktok_script: "TikTok Script",
  marketing_plan: "Marketing Plan",
  landing_page: "Landing Page",
};

export const ALL_CONTENT_TYPES = [
  "facebook_post",
  "email",
  "seo_blog",
  "tiktok_script",
  "marketing_plan",
  "landing_page",
] as const;

export function normalizePlan(plan?: string | null): PlanId {
  if (plan === "lite" || plan === "pro" || plan === "max") return plan;
  return "free";
}

export function usagePercent(item: UsageItem): number {
  if (item.max === null || item.max === 0) return 0;
  return Math.min(100, (item.used / item.max) * 100);
}
