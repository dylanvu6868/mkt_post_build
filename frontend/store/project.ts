import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Project {
  id: number;
  name: string;
  created_at: string;
}

interface ProjectState {
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      activeProject: null,
      setActiveProject: (project) => set({ activeProject: project }),
    }),
    { name: "project-storage" },
  ),
);
