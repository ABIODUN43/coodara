import {
  AlertTriangle,
  Info,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Code2,
  Zap,
  Layers,
  FileCode,
  ShieldAlert,
} from "lucide-react";
import type { ArchitectureIssue } from "@/types/architecture";

function getSeverityIcon(severity?: string) {
  const s = severity?.toLowerCase();
  if (s === "critical" || s === "high") return AlertCircle;
  if (s === "warning" || s === "medium") return AlertTriangle;
  return Info;
}

function getSeverityStyle(severity?: string) {
  const s = severity?.toLowerCase();
  if (s === "critical" || s === "high") {
    return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
  }
  if (s === "warning" || s === "medium") {
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
  }
  return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800";
}

interface ArchitectureInsightsProps {
  issues?: ArchitectureIssue[];
  onSelectComponent: (componentId: string) => void;
  onNavigateToStudio?: (filePath?: string) => void;
  onSimulateImpact?: (componentId: string) => void;
}

export function ArchitectureInsights({
  issues = [],
  onSelectComponent,
  onNavigateToStudio,
  onSimulateImpact,
}: ArchitectureInsightsProps) {
  const safeIssues = Array.isArray(issues) ? issues : [];

  return (
    <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--cd-border-soft)] px-5 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--cd-accent)]" />
          <h3 className="text-[14px] font-bold text-[var(--cd-ink)]">
            Architectural Smells &amp; Boundary Violations
          </h3>
          <span className="text-[11px] text-[var(--cd-ink-faint)] hidden sm:inline">
            (AST &amp; Graph Ground Truth)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[var(--cd-sunken)] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--cd-ink-soft)]">
            {safeIssues.length} issues detected
          </span>
        </div>
      </div>

      {safeIssues.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-10 text-center text-[12.5px] text-[var(--cd-ink-faint)]">
          <Info className="mb-2 h-6 w-6 text-emerald-500" />
          <span className="font-semibold text-[var(--cd-ink)]">
            No critical architecture issues detected
          </span>
          <p className="mt-1 max-w-[320px] text-[11.5px] text-[var(--cd-ink-soft)]">
            Module dependencies and layer boundaries align with clean architecture standards.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--cd-border-soft)]">
          {safeIssues.map((issue, idx) => {
            const Icon = getSeverityIcon(issue.severity);
            const badgeClass = getSeverityStyle(issue.severity);
            const componentIds = issue.component_ids || [];
            const primaryComponent = componentIds[0] || "Unknown Module";

            // Contextual AST evidence & architectural impact
            const isCycle = issue.type === "circular_dependency" || issue.title?.toLowerCase().includes("circular") || issue.description?.toLowerCase().includes("cycle");

            const astLocation =
              issue.evidence_ids?.[0] ||
              (componentIds.length > 1 ? `${componentIds[0]} ↔ ${componentIds[1]}` : primaryComponent);

            const topologicalTrace =
              componentIds.length >= 2
                ? componentIds.join(" ➔ ")
                : `${primaryComponent} ➔ Dependent subsystems`;

            const whyItMatters =
              issue.description ||
              (isCycle
                ? "Circular dependencies tightly couple components into a pseudo-monolith. Neither component can be independently tested or refactored without cascading deadlock."
                : "High efferent coupling and unmanaged cross-module dependencies increase change failure rate and degradation risk.");

            return (
              <div
                key={issue.id || `issue-${idx}`}
                className="p-5 transition-colors hover:bg-[var(--cd-sunken)]/40"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${badgeClass}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Header line */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-[var(--cd-ink)]">
                          {issue.title || "Architectural Anomaly"}
                        </span>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}
                      >
                        {issue.severity || "info"}
                      </span>
                    </div>

                    {/* Topological Trace Callout */}
                    <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-[var(--cd-sunken)]/80 px-3 py-1.5 font-mono text-[11px] text-[var(--cd-ink)] border border-[var(--cd-border-soft)]">
                      <Layers className="h-3.5 w-3.5 text-[var(--cd-accent)] shrink-0" />
                      <span className="text-[var(--cd-ink-faint)] font-sans font-semibold">
                        Topological Trace:
                      </span>
                      <span className="truncate text-[var(--cd-ink)] font-semibold">
                        {topologicalTrace}
                      </span>
                    </div>

                    {/* AST Location citation */}
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--cd-ink-faint)]">
                      <FileCode className="h-3.5 w-3.5 text-[var(--cd-accent)]" />
                      <span>AST Source Evidence:</span>
                      <code className="rounded bg-black/5 dark:bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-[var(--cd-accent)] font-semibold">
                        {astLocation}
                      </code>
                    </div>

                    {/* Description */}
                    <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--cd-ink)]">
                      {issue.description}
                    </p>

                    {/* Why This Matters Box */}
                    <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Why This Matters (Operational &amp; Business Impact)
                      </div>
                      <p className="text-[12px] leading-relaxed text-[var(--cd-ink-soft)]">
                        {whyItMatters}
                      </p>
                    </div>

                    {/* Interactive Action Bar */}
                    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--cd-border-soft)]">
                      <div className="flex items-center gap-2">
                        {componentIds.length > 0 && componentIds[0] && (
                          <button
                            onClick={() => onSelectComponent(componentIds[0])}
                            className="cursor-pointer text-[11.5px] font-semibold text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)] flex items-center gap-1"
                          >
                            <span>Inspect graph node</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {onSimulateImpact && (
                          <button
                            onClick={() => onSimulateImpact(primaryComponent)}
                            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1 text-[11.5px] font-semibold text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors"
                          >
                            <Zap className="h-3.5 w-3.5 text-rose-500" />
                            <span>Simulate Blast Radius</span>
                          </button>
                        )}

                        {onNavigateToStudio && (
                          <button
                            onClick={() => onNavigateToStudio(issue.evidence_ids?.[0] || (primaryComponent !== "Unknown Module" ? primaryComponent : undefined))}
                            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-1 text-[11.5px] font-semibold text-white shadow-xs hover:bg-[var(--cd-accent-hover)] transition-colors"
                          >
                            <Code2 className="h-3.5 w-3.5" />
                            <span>Open in Code Studio &amp; AI Fix</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ArchitectureInsights;