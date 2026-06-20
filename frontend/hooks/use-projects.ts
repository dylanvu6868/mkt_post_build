import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

interface Project {
  id: number;
  name: string;
  created_at: string;
}

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => api.get("/projects"),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.post<Project>("/projects", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["plan-limits"] });
    },
  });
}
