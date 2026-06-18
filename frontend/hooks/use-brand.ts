import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

interface BrandProfile {
  id: number;
  project_id: number;
  brand_name: string;
  tone: string;
  writing_style: string;
  preferred_words: string[];
  forbidden_words: string[];
}

interface BrandProfileUpsert {
  project_id: number;
  brand_name: string;
  tone: string;
  writing_style: string;
  preferred_words: string[];
  forbidden_words: string[];
}

export function useBrandProfile(projectId: number | undefined) {
  return useQuery<BrandProfile>({
    queryKey: ["brand-profile", projectId],
    queryFn: () => api.get(`/brand-profile?project_id=${projectId}`),
    enabled: !!projectId,
    retry: false,
  });
}

export function useUpsertBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BrandProfileUpsert) =>
      api.post<BrandProfile>("/brand-profile", data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["brand-profile"] }),
  });
}
