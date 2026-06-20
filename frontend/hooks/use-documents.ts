import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

interface Document {
  id: number;
  project_id: number;
  filename: string;
  status: string;
  created_at: string;
}

export function useDocuments(projectId: number | undefined) {
  return useQuery<Document[]>({
    queryKey: ["documents", projectId],
    queryFn: () => api.get(`/documents?project_id=${projectId}`),
    enabled: !!projectId,
    refetchInterval: 5000,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, file }: { projectId: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post<Document>(
        `/documents/upload?project_id=${projectId}`,
        formData,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["plan-limits"] });
    },
  });
}
