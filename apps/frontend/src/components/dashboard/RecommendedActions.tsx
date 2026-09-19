import { Play } from "lucide-react";
import type { DashboardOverviewData } from "@/hooks/useDashboardOverview";

interface Props {
  data?: DashboardOverviewData;
}

const BAND = {
  good: "var(--cd-good)",
  warn: "var(--cd-warn)",
  risk: "var(--cd-risk)",
};

export function RecommendedActions({ data }: Props) {
  const issues = data?.allIssues ?? [];
  const repos = data?.repoData ?? [];

  const dynamicActions = issues.length > 0
    ? issues.slice(0, 3).map((issue, idx) => ({
        title: issue.issue.title,
        priorityLabel: issue.issue.severity === "critical" ? "High" : "Medium",
        impactLevel: issue.issue.severity === "critical" ? "High" : "Medium",
        effort: "Medium",
        expectedImpact: `Resolve structural risks in ${issue.repoName}`,
        fix: issue.issue.description,
        priority: `P${idx}`,
        band: issue.issue.severity === "critical" ? ("risk" as const) : ("warn" as const),
      }))
    : repos.length > 0
    ? [
        {
          title: "Optimize Architecture Boundaries",
          priorityLabel: "Medium",
          impactLevel: "Medium",
          effort: "Low",
          expectedImpact: "Ensure loose coupling between modules",
          fix: `Maintain clear separation of concerns across ${repos.map((r) => r.repo.name).slice(0, 3).join(", ")}.`,
          priority: "P1",
          band: "good" as const,
        },
        {
          title: "Module Maintainability Optimization",
          priorityLabel: "Low",
          impactLevel: "Medium",
          effort: "Low",
          expectedImpact: "Keep Cyclomatic Complexity within limits",
          fix: "Continue periodic automated code intelligence scans on repository commits.",
          priority: "P2",
          band: "good" as const,
        },
      ]
    : [
        {
          title: "Import & Analyze Repositories",
          priorityLabel: "High",
          impactLevel: "High",
          effort: "Low",
          expectedImpact: "Unlock real-time architecture intelligence",
          fix: "Connect GitHub repositories to start continuous architecture inspection and health scoring.",
          priority: "P0",
          band: "warn" as const,
        },
      ];

  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-[var(--cd-border)] bg-[var(--cd-border)] sm:grid-cols-2 lg:grid-cols-3">
      {dynamicActions.map((a, i) => (
        <div key={`${a.title}-${i}`} className="bg-[var(--cd-surface)] p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <span
              className="rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-white"
              style={{ background: BAND[a.band] }}
            >
              {a.priority}
            </span>
          </div>

          <h4 className="mb-2 text-[13px] font-semibold leading-tight text-[var(--cd-ink)]">
            {a.title}
          </h4>

          <div className="mb-2.5 flex gap-3.5">
            <span className="flex flex-col gap-0.5 text-[10.5px] text-[var(--cd-ink-faint)]">
              Priority
              <b className="text-[12px] font-semibold text-[var(--cd-ink)]">{a.priorityLabel}</b>
            </span>
            <span className="flex flex-col gap-0.5 text-[10.5px] text-[var(--cd-ink-faint)]">
              Impact
              <b className="text-[12px] font-semibold text-[var(--cd-ink)]">{a.impactLevel}</b>
            </span>
            <span className="flex flex-col gap-0.5 text-[10.5px] text-[var(--cd-ink-faint)]">
              Effort
              <b className="text-[12px] font-semibold text-[var(--cd-ink)]">{a.effort}</b>
            </span>
          </div>

          <p className="mb-2.5 text-[12px] leading-relaxed text-[var(--cd-ink-soft)]">{a.fix}</p>

          <div className="border-t border-[var(--cd-border-soft,var(--cd-border))] pt-2.5 text-[11.5px] text-[var(--cd-ink-faint)]">
            Expected impact:
            <b className="mt-0.5 block text-[12.5px] font-semibold text-[var(--cd-ink)]">
              {a.expectedImpact}
            </b>
          </div>

          <button className="mt-3 flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-[var(--cd-accent)] transition-colors hover:text-[var(--cd-accent-hover)]">
            <Play className="h-3 w-3" fill="currentColor" />
            Run fix plan
          </button>
        </div>
      ))}
    </div>
  );
}