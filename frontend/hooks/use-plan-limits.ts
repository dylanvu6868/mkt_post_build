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
    // Plan rarely changes mid-session; cache longer so the Hub gate never
    // refetches/flashes on navigation between tools.
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
}
