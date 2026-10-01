import React from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  GitBranch,
  Layers,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import type { ArchitectureIssue } from "@/types/architecture";
import { parseGroundedEvidence, getSeverityStyle, formatComponentName } from "./riskUtils";

interface RiskRowProps {
  finding: {
    repoName: string;
    repoId: number;
    issue: ArchitectureIssue;
  };
  isSelected: boolean;
  isResolved: boolean;
  onSelect: () => void;
  onToggleResolved: (e: React.MouseEvent) => void;
}

export const RiskRow: React.FC<RiskRowProps> = ({
  finding,
  isSelected,
  isResolved,
  onSelect,
  onToggleResolved,
}) => {
  const { repoName, issue } = finding;
  const severityStyle = getSeverityStyle(issue.severity);
  const evidence = parseGroundedEvidence(issue);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  const getSeverityIcon = () => {
    if (isResolved) return <CheckCircle2 className="h-3.5 w-3.5 text-[var(--cd-good)]" />;
    const normalized = (issue.severity || "").toLowerCase();
    if (normalized === "critical") {
      return <AlertOctagon className="h-3.5 w-3.5 text-[var(--cd-bad)]" />;
    }
    if (normalized === "high" || normalized === "warning") {
      return <AlertTriangle className="h-3.5 w-3.5 text-[var(--cd-warn)]" />;
    }
    return <Info className="h-3.5 w-3.5 text-[var(--cd-accent)]" />;
  };

  const componentDisplay = evidence.primaryComponent
    ? formatComponentName(evidence.primaryComponent)
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      aria-selected={isSelected}
      aria-label={`Risk: ${issue.title || issue.description}. Severity: ${issue.severity}. Repository: ${repoName}`}
      className={`group relative flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3.5 transition-all text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--cd-accent)] ${
        isSelected
          ? "border-[var(--cd-accent)] bg-[var(--cd-surface)] shadow-sm ring-1 ring-[var(--cd-accent)]/20"
          : isResolved
          ? "border-[var(--cd-border-soft)] bg-[var(--cd-sunken)]/50 opacity-70 hover:opacity-100 hover:border-[var(--cd-border)]"
          : "border-[var(--cd-border)] bg-[var(--cd-surface)] hover:border-[var(--cd-ink-faint)] hover:shadow-xs"
      }`}
    >
      {/* Selected Indicator Bar on Left */}
      {isSelected && (
        <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[var(--cd-accent)]" />
      )}

      {/* Main Content */}
      <div className="flex items-start gap-3 min-w-0 flex-1 pl-1">
        {/* Severity Icon Container */}
        <div
          className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${
            isResolved
              ? "bg-[var(--cd-good-soft)] text-[var(--cd-good)]"
              : severityStyle.badgeClass
          }`}
        >
          {getSeverityIcon()}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Top Line: Title & Severity Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <h4
              className={`text-[13px] font-semibold tracking-tight ${
                isResolved
                  ? "line-through text-[var(--cd-ink-faint)]"
                  : "text-[var(--cd-ink)]"
              }`}
            >
              {issue.title || issue.type.replace(/_/g, " ")}
            </h4>

            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isResolved
                  ? "bg-[var(--cd-sunken)] text-[var(--cd-ink-faint)]"
                  : severityStyle.badgeClass
              }`}
            >
              {isResolved ? "RESOLVED" : severityStyle.label}
            </span>

            {/* Confidence Badge */}
            <span className="rounded bg-[var(--cd-sunken)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--cd-ink-faint)] border border-[var(--cd-border-soft)]">
              AST: HIGH
            </span>
          </div>

          {/* Description snippet */}
          <p className="text-[12px] text-[var(--cd-ink-soft)] line-clamp-2 leading-relaxed">
            {issue.description}
          </p>

          {/* Metadata tags: Repo, Component, Measured Metric */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--cd-ink-faint)] pt-0.5">
            <span className="flex items-center gap-1 font-mono">
              <GitBranch className="h-3 w-3 flex-shrink-0" />
              <span>{repoName}</span>
            </span>

            {componentDisplay && (
              <>
                <span className="text-[var(--cd-border)]">•</span>
                <span className="flex items-center gap-1 font-mono text-[var(--cd-ink-soft)] truncate max-w-[200px]">
                  <Layers className="h-3 w-3 flex-shrink-0 text-[var(--cd-accent)]" />
                  <span className="truncate">{componentDisplay}</span>
                </span>
              </>
            )}

            {/* Measured Grounded Evidence Pills (Only if real) */}
            {evidence.cycleNodes && evidence.cycleNodes.length > 0 && (
              <>
                <span className="text-[var(--cd-border)]">•</span>
                <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10.5px] font-mono font-medium text-rose-600 dark:text-rose-400">
                  {evidence.cycleNodes.length}-node cycle
                </span>
              </>
            )}

            {evidence.efferentCoupling !== undefined && (
              <>
                <span className="text-[var(--cd-border)]">•</span>
                <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10.5px] font-mono font-medium text-blue-600 dark:text-blue-400">
                  Ce: {evidence.efferentCoupling}
                </span>
              </>
            )}

            {evidence.afferentCoupling !== undefined && (
              <>
                <span className="text-[var(--cd-border)]">•</span>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10.5px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  Ca: {evidence.afferentCoupling}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 flex-shrink-0 self-center">
        <button
          type="button"
          onClick={onToggleResolved}
          className={`cursor-pointer flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
            isResolved
              ? "border border-[var(--cd-border)] bg-[var(--cd-surface)] text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
              : "border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] text-[var(--cd-ink-soft)] hover:border-[var(--cd-good)] hover:text-[var(--cd-good)] hover:bg-[var(--cd-good-soft)]"
          }`}
          title={isResolved ? "Reopen this finding" : "Mark as resolved"}
          aria-label={isResolved ? "Reopen finding" : "Mark finding resolved"}
        >
          {isResolved ? (
            <>
              <RotateCcw className="h-3 w-3" />
              <span>Reopen</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3" />
              <span>Resolve</span>
            </>
          )}
        </button>

        <ChevronRight
          className={`h-4 w-4 transition-transform ${
            isSelected
              ? "text-[var(--cd-accent)] translate-x-0.5"
              : "text-[var(--cd-ink-faint)] group-hover:text-[var(--cd-ink)]"
          }`}
        />
      </div>
    </div>
  );
};
