import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import type { PlanLimitsResponse } from "@/lib/plan";

export function usePlanLimits() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["plan-limits"],
    queryFn: () => api.get<PlanLimitsResponse>("/auth/me/limits"),
    enabled: !!token,
    staleTime: 30_000,
  });
}
