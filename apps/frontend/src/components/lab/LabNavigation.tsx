import { Activity, Database, FileCheck2, FlaskConical, Layers, Sliders } from "lucide-react";

export type LabTabId =
  | "overview"
  | "hypotheses"
  | "experiments"
  | "workloads"
  | "evidence"
  | "decisions";

interface LabNavigationProps {
  activeTab: LabTabId;
  onTabChange: (tab: LabTabId) => void;
  counts?: {
    hypotheses?: number;
    experiments?: number;
    evidence?: number;
    decisions?: number;
  };
}

export function LabNavigation({
  activeTab,
  onTabChange,
  counts,
}: LabNavigationProps) {
  const tabs = [
    {
      id: "overview" as LabTabId,
      label: "Overview",
      icon: Activity,
    },
    {
      id: "hypotheses" as LabTabId,
      label: "Hypotheses & Interventions",
      icon: Sliders,
      count: counts?.hypotheses,
    },
    {
      id: "experiments" as LabTabId,
      label: "Experiments",
      icon: Layers,
      count: counts?.experiments,
    },
    {
      id: "workloads" as LabTabId,
      label: "Workloads & Sizing",
      icon: Database,
    },
    {
      id: "evidence" as LabTabId,
      label: "Evidence Ledger",
      icon: FlaskConical,
      count: counts?.evidence,
    },
    {
      id: "decisions" as LabTabId,
      label: "Decisions (ADRs)",
      icon: FileCheck2,
      count: counts?.decisions,
    },
  ];

  return (
    <div className="border-b border-[var(--cd-border-soft)] bg-[var(--cd-bg)] px-4 sm:px-6">
      <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2" aria-label="Architecture Lab Sections">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`cursor-pointer inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "bg-[var(--cd-surface)] text-[var(--cd-accent)] font-semibold shadow-2xs border border-[var(--cd-border)]"
                  : "text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)]"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[var(--cd-accent)]" : "text-[var(--cd-ink-faint)]"}`} />
              <span>{tab.label}</span>
              {typeof tab.count === "number" && tab.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                    isActive
                      ? "bg-[var(--cd-accent)]/10 text-[var(--cd-accent)] font-semibold"
                      : "bg-[var(--cd-sunken)] text-[var(--cd-ink-faint)]"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
