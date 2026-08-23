import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { listOrganizations } from "@/api/organizations";
import type { Organization } from "@/types/organization";
import { USE_MOCK_ORGANIZATIONS_DATA } from "@/dev/devFlags";
import { MOCK_ORGANIZATIONS } from "@/data/mockOrganizations";

interface ProjectContextValue {
  organizations: Organization[];
  activeProject: Organization | null;
  setActiveProject: (org: Organization) => void;
  loading: boolean;
  refetch: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeProject, setActiveProjectState] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (USE_MOCK_ORGANIZATIONS_DATA) {
      setOrganizations(MOCK_ORGANIZATIONS);
      setActiveProjectState((prev) => prev ?? MOCK_ORGANIZATIONS[0] ?? null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const orgs = await listOrganizations();
      setOrganizations(orgs);
      setActiveProjectState((prev) => prev ?? orgs[0] ?? null);
    } catch {
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function setActiveProject(org: Organization) {
    setActiveProjectState(org);
  }

  return (
    <ProjectContext.Provider
      value={{ organizations, activeProject, setActiveProject, loading, refetch: load }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within a ProjectProvider");
  return ctx;
}