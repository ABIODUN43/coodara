import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { listOrganizations } from "@/api/organizations";
import type { Organization } from "@/types/organization";

interface ProjectContextValue {
  organizations: Organization[];
  activeProject: Organization | null;
  setActiveProject: (org: Organization) => void;
  setActiveProjectById: (orgId: number | string) => void;
  loading: boolean;
  refetch: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

const SAVED_ORG_KEY = "coodara_active_organization_id";

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeProject, setActiveProjectState] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const orgs = await listOrganizations();
      setOrganizations(orgs);
      const savedId = localStorage.getItem(SAVED_ORG_KEY);
      const matched = savedId ? orgs.find((o) => String(o.id) === savedId) : undefined;
      setActiveProjectState((prev) => prev ?? matched ?? orgs[0] ?? null);
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
    if (org?.id) {
      localStorage.setItem(SAVED_ORG_KEY, String(org.id));
    }
    setActiveProjectState(org);
  }

  function setActiveProjectById(orgId: number | string) {
    const matched = organizations.find((o) => String(o.id) === String(orgId));
    if (matched) {
      setActiveProject(matched);
    }
  }

  return (
    <ProjectContext.Provider
      value={{
        organizations,
        activeProject,
        setActiveProject,
        setActiveProjectById,
        loading,
        refetch: load,
      }}
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