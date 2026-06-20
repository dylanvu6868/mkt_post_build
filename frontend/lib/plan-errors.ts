import { toast } from "sonner";
import { ApiError } from "@/services/api";

export function isPlanLimitError(status: number): boolean {
  return status === 403 || status === 429;
}

export function handleApiPlanError(
  err: unknown,
  onUpgrade?: () => void,
  fallback = "Đã xảy ra lỗi",
): boolean {
  if (err instanceof ApiError) {
    toast.error(err.message, {
      duration: isPlanLimitError(err.status) ? 7000 : 5000,
      action:
        isPlanLimitError(err.status) && onUpgrade
          ? { label: "Nâng cấp gói", onClick: onUpgrade }
          : undefined,
    });
    return true;
  }
  if (fallback) {
    toast.error(fallback);
  }
  return false;
}
