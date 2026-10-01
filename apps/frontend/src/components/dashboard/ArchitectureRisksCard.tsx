import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, ChevronRight } from "lucide-react";
import type { DashboardOverviewData } from "@/hooks/useDashboardOverview";

interface ArchitectureRisksCardProps {
  issues: DashboardOverviewData["allIssues"];
  criticalCount: number;
  warningCount: number;
  organizationId: number | string;
}

export function ArchitectureRisksCard({
  issues,
  criticalCount,
  warningCount,
  organizationId,
}: ArchitectureRisksCardProps) {
  const navigate = useNavigate();
  const hasIssues = issues && issues.length > 0;

  return (
    <div className="rounded-[12px] border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 shadow-2xs">
      <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--cd-ink)] font-heading">
            Architecture Risks
          </h3>

          <span className="rounded-full bg-[var(--cd-sunken)] px-2 py-0.5 text-[10.5px] font-mono font-medium text-[var(--cd-ink-soft)]">
            {issues.length} active
          </span>
        </div>

        <Link
          to={organizationId ? `/dashboard/organizations/${organizationId}/risks` : `/dashboard/risks`}
          className="flex items-center gap-1 text-[11.5px] font-medium text-[var(--cd-accent)] hover:underline"
        >
          <span>View all</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Severity Count Pills */}
      <div className="mt-3.5 grid grid-cols-4 gap-2 text-center">
        <div className="rounded-[8px] border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)]/40 p-2">
          <div className="text-[10px] font-semibold uppercase text-[var(--cd-ink-faint)]">
            Critical
          </div>
          <div
            className={`mt-0.5 text-base font-bold font-mono ${
              criticalCount > 0 ? "text-[var(--cd-risk)]" : "text-[var(--cd-ink)]"
            }`}
          >
            {criticalCount}
          </div>
        </div>

        <div className="rounded-[8px] border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)]/40 p-2">
          <div className="text-[10px] font-semibold uppercase text-[var(--cd-ink-faint)]">
            High
          </div>
          <div className="mt-0.5 text-base font-bold font-mono text-[var(--cd-warn)]">
            {warningCount}
          </div>
        </div>

        <div className="rounded-[8px] border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)]/40 p-2">
          <div className="text-[10px] font-semibold uppercase text-[var(--cd-ink-faint)]">
            Medium
          </div>
          <div className="mt-0.5 text-base font-bold font-mono text-[var(--cd-ink)]">
            {Math.max(0, issues.length - criticalCount - warningCount)}
          </div>
        </div>

        <div className="rounded-[8px] border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)]/40 p-2">
          <div className="text-[10px] font-semibold uppercase text-[var(--cd-ink-faint)]">
            Resolved
          </div>
          <div className="mt-0.5 text-base font-bold font-mono text-[var(--cd-good)]">
            {hasIssues ? 0 : 1}
          </div>
        </div>
      </div>

      {/* Top Risks Feed */}
      <div className="mt-4 divide-y divide-[var(--cd-border-soft)]">
        {hasIssues ? (
          issues.slice(0, 3).map((item, idx) => {
            const isCrit = item.issue.severity === "critical";
            return (
              <button
                key={`${item.issue.id}-${idx}`}
                type="button"
                onClick={() => {
                  navigate(
                    organizationId
                      ? `/dashboard/organizations/${organizationId}/risks?finding=${item.issue.id}`
                      : `/dashboard/risks?finding=${item.issue.id}`
                  );
                }}
                className="group flex w-full items-start justify-between gap-3 py-2.5 text-left transition-colors hover:bg-[var(--cd-sunken)]/40 rounded px-1.5 cursor-pointer first:pt-1 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`rounded px-1.5 py-0.2 text-[10px] font-bold uppercase ${
                        isCrit
                          ? "bg-[var(--cd-risk-bg)] text-[var(--cd-risk)]"
                          : "bg-[var(--cd-warn-bg)] text-[var(--cd-warn)]"
                      }`}
                    >
                      {item.issue.severity}
                    </span>
                    <span className="truncate text-[11px] text-[var(--cd-ink-faint)]">
                      {item.repoName}
                    </span>
                  </div>

                  <h4 className="mt-1 truncate text-[12.5px] font-semibold text-[var(--cd-ink)] group-hover:text-[var(--cd-accent)]">
                    {item.issue.title}
                  </h4>
                </div>

                <ChevronRight className="mt-2 h-4 w-4 text-[var(--cd-ink-faint)] group-hover:text-[var(--cd-accent)] transition-colors flex-shrink-0" />
              </button>
            );
          })
        ) : (
          <div className="flex items-center gap-2 py-4 text-[12px] text-[var(--cd-ink-faint)]">
            <CheckCircle2 className="h-4 w-4 text-[var(--cd-good)] flex-shrink-0" />
            <span>Zero open architectural risks detected in analyzed repositories.</span>
          </div>
        )}
      </div>
    </div>
  );
}
