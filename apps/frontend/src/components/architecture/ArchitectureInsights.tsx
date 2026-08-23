import { AlertTriangle, Info, AlertCircle } from "lucide-react";
import type { ArchitectureIssue, ArchitectureIssueSeverity } from "@/types/architecture";

const SEVERITY_ICON: Record<ArchitectureIssueSeverity, typeof AlertCircle> = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const SEVERITY_CLASS: Record<ArchitectureIssueSeverity, string> = {
  critical: "bg-[var(--cd-risk-bg)] text-[var(--cd-risk)]",
  warning: "bg-[var(--cd-warn-bg)] text-[var(--cd-warn)]",
  info: "bg-[var(--cd-accent-soft)] text-[var(--cd-accent)]",
};

interface ArchitectureInsightsProps {
  issues: ArchitectureIssue[];
  onSelectComponent: (componentId: string) => void;
}

export function ArchitectureInsights({
  issues,
  onSelectComponent,
}: ArchitectureInsightsProps) {
  return (
    <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
      <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] px-4 py-3.5">
        <h3 className="text-[12.5px] font-semibold text-[var(--cd-ink)]">Architecture Insights</h3>
        <span className="font-mono text-[11px] text-[var(--cd-ink-faint)]">{issues.length} issues</span>
      </div>

      {issues.length === 0 ? (
        <div className="px-5 py-8 text-center text-[12.5px] text-[var(--cd-ink-faint)]">
          No issues detected.
        </div>
      ) : (
        issues.map((issue) => {
          const Icon = SEVERITY_ICON[issue.severity];
          return (
            <div
              key={issue.id}
              className="flex gap-3 border-b border-[var(--cd-border-soft)] px-4 py-3.5 last:border-b-0"
            >
              <span
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${SEVERITY_CLASS[issue.severity]}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-[var(--cd-ink)]">
                    {issue.title}
                  </span>
                  <span
                    className={`rounded-[5px] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${SEVERITY_CLASS[issue.severity]}`}
                  >
                    {issue.severity}
                  </span>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--cd-ink-soft)]">
                  {issue.description}
                </p>
                {issue.component_ids[0] && (
                  <button
                    onClick={() => onSelectComponent(issue.component_ids[0])}
                    className="mt-2 cursor-pointer text-[11.5px] font-semibold text-[var(--cd-accent)] hover:underline"
                  >
                    View component
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}