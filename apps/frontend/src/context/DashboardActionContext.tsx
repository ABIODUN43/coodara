import {
  createContext,
  useContext,
  useEffect,
  useState,
  type DependencyList,
  type ReactNode,
} from "react";

export type DashboardActionVariant = "solid" | "outline";

export interface DashboardAction {
  label: string;
  onClick: () => void;
  icon?: React.ElementType;
  // "solid" (default) = blue filled button, matches the default "Import
  // repository" style. "outline" = white/bordered button, per the request
  // for Invite Member to look distinct from the default action.
  variant?: DashboardActionVariant;
}

interface DashboardActionContextValue {
  action: DashboardAction | null;
  setAction: (action: DashboardAction | null) => void;
}

const DashboardActionContext = createContext<DashboardActionContextValue | undefined>(
  undefined
);

export function DashboardActionProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<DashboardAction | null>(null);
  return (
    <DashboardActionContext.Provider value={{ action, setAction }}>
      {children}
    </DashboardActionContext.Provider>
  );
}

export function useDashboardActionContext() {
  const ctx = useContext(DashboardActionContext);
  if (!ctx) {
    throw new Error(
      "useDashboardActionContext must be used within a DashboardActionProvider"
    );
  }
  return ctx;
}

/**
 * Call from any dashboard page while it's mounted to override TopNavbar's
 * primary action button. Automatically clears itself on unmount, so
 * navigating away restores the default "Import repository" button —
 * pages that don't call this (Dashboard overview, Repositories, Analysis,
 * Architecture, etc.) need zero changes.
 */
export function useDashboardAction(
  action: DashboardAction | null,
  deps: DependencyList = []
) {
  const { setAction } = useDashboardActionContext();
  useEffect(() => {
    setAction(action);
    return () => setAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}