import { createContext, useContext, useState, type ReactNode } from "react";

export interface Project {
  id: string;
  name: string;
  members: number;
  repositories: number;
}

export const projects: Project[] = [
  { id: "acme", name: "Acme Engineering", members: 4, repositories: 12 },
  { id: "nova", name: "Nova Systems", members: 7, repositories: 9 },
  { id: "northwind", name: "Northwind Labs", members: 3, repositories: 5 },
  { id: "orbit", name: "Orbit Health", members: 6, repositories: 14 },
];

interface ProjectContextValue {
  activeProject: Project;
  setActiveProject: (project: Project) => void;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [activeProject, setActiveProject] = useState(projects[0]);
  return (
    <ProjectContext.Provider value={{ activeProject, setActiveProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within a ProjectProvider");
  return ctx;
}