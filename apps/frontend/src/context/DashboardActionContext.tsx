import {
  createContext,
  useContext,
  useEffect,
  useState,
  type DependencyList,
  type ElementType,
  type ReactNode,
} from "react";

export type DashboardActionVariant = "solid" | "outline";

export interface DashboardAction {
  label: string;
  onClick: () => void;
  icon?: ElementType;
  variant?: DashboardActionVariant;
}

interface DashboardActionContextValue {
  action: DashboardAction | null;
  setAction: (action: DashboardAction | null) => void;

  isRepositoryImportOpen: boolean;
  openRepositoryImport: () => void;
  closeRepositoryImport: () => void;

  repositoryImportVersion: number;
  notifyRepositoryImported: () => void;
}

const DashboardActionContext =
  createContext<DashboardActionContextValue | undefined>(
    undefined,
  );

export function DashboardActionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [action, setAction] =
    useState<DashboardAction | null>(null);

  const [isRepositoryImportOpen, setIsRepositoryImportOpen] =
    useState(false);

  const [repositoryImportVersion, setRepositoryImportVersion] =
    useState(0);

  function openRepositoryImport() {
    setIsRepositoryImportOpen(true);
  }

  function closeRepositoryImport() {
    setIsRepositoryImportOpen(false);
  }

  function notifyRepositoryImported() {
    setRepositoryImportVersion((version) => version + 1);
  }

  return (
    <DashboardActionContext.Provider
      value={{
        action,
        setAction,

        isRepositoryImportOpen,
        openRepositoryImport,
        closeRepositoryImport,

        repositoryImportVersion,
        notifyRepositoryImported,
      }}
    >
      {children}
    </DashboardActionContext.Provider>
  );
}

export function useDashboardActionContext() {
  const context = useContext(DashboardActionContext);

  if (!context) {
    throw new Error(
      "useDashboardActionContext must be used within a DashboardActionProvider",
    );
  }

  return context;
}

/**
 * Registers a page-specific primary action in the dashboard navbar.
 *
 * When the page unmounts, the action is automatically cleared and
 * TopNavbar returns to the default "Import repository" action.
 */
export function useDashboardAction(
  action: DashboardAction | null,
  deps: DependencyList = [],
) {
  const { setAction } = useDashboardActionContext();

  useEffect(() => {
    setAction(action);

    return () => {
      setAction(null);
    };

    // The caller controls when the action should be refreshed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}