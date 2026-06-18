import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

interface HistoryItem {
  id: number;
  project_id: number;
  content_type: string;
  prompt: string;
  output: Record<string, unknown> | null;
  score: number | null;
  created_at: string;
}

export function useHistory(projectId: number | undefined) {
  return useQuery<HistoryItem[]>({
    queryKey: ["history", projectId],
    queryFn: () => api.get(`/history?project_id=${projectId}`),
    enabled: !!projectId,
  });
}

export function useDeleteHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (historyId: number) =>
      api.delete(`/history/${historyId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["history"] }),
  });
}
