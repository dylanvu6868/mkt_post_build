import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

export interface UserTemplate {
  id: number;
  content_type: string;
  template_text: string;
}

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: () => api.get<UserTemplate[]>("/templates"),
  });
}

export function useTemplate(contentType: string) {
  return useQuery({
    queryKey: ["templates", contentType],
    queryFn: () => api.get<UserTemplate>(`/templates/${contentType}`),
    enabled: !!contentType,
    retry: false,
  });
}

export function useUpsertTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<UserTemplate, "id">) =>
      api.post<UserTemplate>("/templates", data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({
        queryKey: ["templates", variables.content_type],
      });
    },
  });
}
