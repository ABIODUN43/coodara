import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  Copy,
  Check,
  GitBranch,
  Layers,
  ArrowRight,
  Code2,
  Sparkles,
  Compass,
  RotateCcw,
  ShieldAlert,
  FlaskConical,
} from "lucide-react";
import type { ArchitectureIssue, ArchitectureComponent } from "@/types/architecture";
import type { DashboardOverviewData } from "@/hooks/useDashboardOverview";
import { getArchitectureComponent } from "@/api/architecture";
import {
  parseGroundedEvidence,
  getSeverityStyle,
  formatComponentName,
  getRestrainedImpactStatement,
} from "./riskUtils";

export type ConnectedRecommendationItem = DashboardOverviewData["allRecommendations"][number];

interface RiskInspectorProps {
  finding: {
    repoName: string;
    repoId: number;
    issue: ArchitectureIssue;
  };
  orgId: string | number;
  isResolved: boolean;
  onToggleResolved: () => void;
  onClose?: () => void;
  allRecommendations?: ConnectedRecommendationItem[];
}

export const RiskInspector: React.FC<RiskInspectorProps> = ({
  finding,
  orgId,
  isResolved,
  onToggleResolved,
  onClose,
  allRecommendations = [],
}) => {
  const navigate = useNavigate();
  const { repoName, repoId, issue } = finding;
  const severityStyle = getSeverityStyle(issue.severity);
  const evidence = parseGroundedEvidence(issue);

  const [copiedPath, setCopiedPath] = useState(false);
  const [componentDetails, setComponentDetails] = useState<ArchitectureComponent | null>(null);

  // Find connected recommendation from existing recommendations data
  const connectedRec = allRecommendations.find((r) => {
    if (r.repoId !== repoId) return false;
    if (r.componentId && evidence.primaryComponent && r.componentId === evidence.primaryComponent) {
      return true;
    }
    if (r.componentName && evidence.primaryComponent && r.componentName === evidence.primaryComponent) {
      return true;
    }
    return false;
  });

  // Attempt to load component details if primary component is known
  useEffect(() => {
    let active = true;
    if (!orgId || !repoId || !evidence.primaryComponent) {
      setComponentDetails(null);
      return;
    }

    getArchitectureComponent(orgId, repoId, evidence.primaryComponent)
      .then((data) => {
        if (active) {
          setComponentDetails(data);
        }
      })
      .catch(() => {
        if (active) {
          setComponentDetails(null);
        }
      });

    return () => {
      active = false;
    };
  }, [orgId, repoId, evidence.primaryComponent]);

  const copyFilePath = () => {
    const textToCopy = evidence.filePath || evidence.primaryComponent || "";
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const getSeverityIcon = () => {
    if (isResolved) return <CheckCircle2 className="h-4 w-4 text-[var(--cd-good)]" />;
    const normalized = (issue.severity || "").toLowerCase();
    if (normalized === "critical") {
      return <AlertOctagon className="h-4 w-4 text-[var(--cd-bad)]" />;
    }
    if (normalized === "high" || normalized === "warning") {
      return <AlertTriangle className="h-4 w-4 text-[var(--cd-warn)]" />;
    }
    return <Info className="h-4 w-4 text-[var(--cd-accent)]" />;
  };

  // Safe navigation handlers
  const handleTraceInArchitecture = () => {
    const compParam = evidence.primaryComponent
      ? `&component=${encodeURIComponent(evidence.primaryComponent)}`
      : "";
    navigate(
      `/architecture?repoId=${repoId}&tab=map${compParam}`
    );
  };

  const handleInspectInCodeStudio = () => {
    const compParam = evidence.primaryComponent
      ? `&component=${encodeURIComponent(evidence.primaryComponent)}`
      : "";
    navigate(
      `/architecture?repoId=${repoId}&tab=studio${compParam}`
    );
  };

  const handleInvestigateInLab = () => {
    navigate(
      `/lab?findingId=${encodeURIComponent(issue.id)}&repoId=${encodeURIComponent(repoId)}`,
      {
        state: {
          findingId: issue.id,
          findingTitle: issue.title || issue.description,
          findingCategory: issue.type,
          severity: issue.severity,
          repoId,
          repoName,
          primaryComponent: evidence.primaryComponent,
          filePath: evidence.filePath,
        },
      }
    );
  };

  const handleAskCoodaraChat = () => {
    const prompt = `Regarding architectural finding "${issue.title || issue.description}" in repository "${repoName}"${
      evidence.primaryComponent ? ` for component ${evidence.primaryComponent}` : ""
    }: Can you explain the structural implications and suggest a safe refactoring plan?`;

    navigate(`/chat`, {
      state: {
        repoId,
        findingId: issue.id,
        prompt,
      },
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] shadow-sm">
      {/* 1. Header: Status, Severity, Dismiss */}
      <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] px-4 py-3 bg-[var(--cd-bg)]/60">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-md ${
              isResolved ? "bg-[var(--cd-good-soft)] text-[var(--cd-good)]" : severityStyle.badgeClass
            }`}
          >
            {getSeverityIcon()}
          </div>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              isResolved ? "bg-[var(--cd-sunken)] text-[var(--cd-ink-faint)]" : severityStyle.badgeClass
            }`}
          >
            {isResolved ? "RESOLVED" : severityStyle.label}
          </span>
          <span className="rounded bg-[var(--cd-sunken)] px-2 py-0.5 text-[11px] font-mono text-[var(--cd-ink-faint)] border border-[var(--cd-border-soft)]">
            {issue.status || "open"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleResolved}
            className={`cursor-pointer flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
              isResolved
                ? "border border-[var(--cd-border)] bg-[var(--cd-surface)] text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
                : "border border-[var(--cd-good)]/30 bg-[var(--cd-good-soft)] text-[var(--cd-good)] hover:bg-[var(--cd-good)] hover:text-white"
            }`}
          >
            {isResolved ? (
              <>
                <RotateCcw className="h-3 w-3" />
                <span>Reopen</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3" />
                <span>Mark Resolved</span>
              </>
            )}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1 text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)]"
              aria-label="Close inspector"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content Pane */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Section 1: Finding & Observation */}
        <div className="space-y-1.5">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
            Observation
          </div>
          <h3 className="text-[15px] font-semibold text-[var(--cd-ink)] leading-snug">
            {issue.title || issue.type.replace(/_/g, " ")}
          </h3>
          <p className="text-[12.5px] text-[var(--cd-ink-soft)] leading-relaxed bg-[var(--cd-bg)] p-3 rounded-lg border border-[var(--cd-border-soft)]">
            {issue.description}
          </p>
        </div>

        {/* Section 2: Source Location (Where it exists) */}
        <div className="space-y-2 border-t border-[var(--cd-border-soft)] pt-3">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
            Source Location
          </div>

          <div className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3 space-y-2">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="flex items-center gap-1.5 font-medium text-[var(--cd-ink-soft)]">
                <GitBranch className="h-3.5 w-3.5 text-[var(--cd-ink-faint)]" />
                <span>Repository:</span>
              </span>
              <span className="font-mono font-semibold text-[var(--cd-ink)]">{repoName}</span>
            </div>

            {evidence.primaryComponent && (
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="flex items-center gap-1.5 font-medium text-[var(--cd-ink-soft)]">
                  <Layers className="h-3.5 w-3.5 text-[var(--cd-accent)]" />
                  <span>Component:</span>
                </span>
                <span className="font-mono font-semibold text-[var(--cd-ink)] truncate max-w-[220px]">
                  {formatComponentName(evidence.primaryComponent)}
                </span>
              </div>
            )}

            {evidence.filePath && (
              <div className="flex items-center justify-between gap-2 rounded bg-[var(--cd-bg)] px-2.5 py-1.5 text-[11px] font-mono border border-[var(--cd-border-soft)]">
                <span className="truncate text-[var(--cd-ink-soft)]">{evidence.filePath}</span>
                <button
                  type="button"
                  onClick={copyFilePath}
                  className="cursor-pointer text-[var(--cd-ink-faint)] hover:text-[var(--cd-ink)] p-0.5 rounded"
                  title="Copy file path"
                >
                  {copiedPath ? (
                    <Check className="h-3.5 w-3.5 text-[var(--cd-good)]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Grounded Evidence (Why Coodara knows this) */}
        <div className="space-y-2 border-t border-[var(--cd-border-soft)] pt-3">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
              Grounded Evidence
            </span>
            <span className="rounded bg-[var(--cd-sunken)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--cd-ink-faint)]">
              AST Symbol Graph
            </span>
          </div>

          {/* Confidence Badges (Per Constraint 3: Clean labels, no fabricated probabilities) */}
          <div className="grid grid-cols-3 gap-2 text-[10.5px] font-mono text-center">
            <div className="rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] p-2">
              <div className="text-[var(--cd-ink-faint)] text-[9.5px]">STRUCTURAL</div>
              <div className="font-bold text-[var(--cd-good)] mt-0.5">HIGH</div>
            </div>
            <div className="rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] p-2">
              <div className="text-[var(--cd-ink-faint)] text-[9.5px]">EVIDENCE</div>
              <div className="font-bold text-[var(--cd-good)] mt-0.5">HIGH</div>
            </div>
            <div className="rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] p-2">
              <div className="text-[var(--cd-ink-faint)] text-[9.5px]">RUNTIME</div>
              <div className="font-semibold text-[var(--cd-ink-faint)] mt-0.5">NOT OBSERVED</div>
            </div>
          </div>

          {/* Real Cycle Path Visualization if detected */}
          {evidence.cycleNodes && evidence.cycleNodes.length > 0 && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 space-y-2">
              <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Circular Dependency Chain ({evidence.cycleNodes.length} nodes)</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {evidence.cycleNodes.map((node, i) => (
                  <React.Fragment key={i}>
                    <span className="rounded bg-[var(--cd-surface)] border border-[var(--cd-border)] px-2 py-0.5 text-[11px] font-mono text-[var(--cd-ink)] shadow-xs">
                      {formatComponentName(node)}
                    </span>
                    {i < evidence.cycleNodes!.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-rose-500 flex-shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Afferent & Efferent Coupling (Per Constraint 4: Definitions & only where present) */}
          {(evidence.afferentCoupling !== undefined || evidence.efferentCoupling !== undefined) && (
            <div className="grid grid-cols-2 gap-2">
              {evidence.afferentCoupling !== undefined && (
                <div className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--cd-ink)]">Afferent (Ca)</span>
                    <span className="font-mono text-[14px] font-bold text-emerald-600 dark:text-emerald-400">
                      {evidence.afferentCoupling}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[var(--cd-ink-faint)] leading-tight">
                    Components depending on this component
                  </p>
                </div>
              )}

              {evidence.efferentCoupling !== undefined && (
                <div className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--cd-ink)]">Efferent (Ce)</span>
                    <span className="font-mono text-[14px] font-bold text-blue-600 dark:text-blue-400">
                      {evidence.efferentCoupling}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[var(--cd-ink-faint)] leading-tight">
                    Dependencies used by this component
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Instability metrics if detected */}
          {evidence.instability && (
            <div className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] p-2.5 space-y-1.5 text-[11px]">
              <div className="font-semibold text-[var(--cd-ink)]">Instability Principle Violation</div>
              <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono">
                <div className="rounded bg-[var(--cd-bg)] p-1.5 border border-[var(--cd-border-soft)]">
                  <div className="text-[var(--cd-ink-faint)]">Source (Stable)</div>
                  <div className="font-bold text-[var(--cd-ink)] truncate">
                    {formatComponentName(evidence.instability.source)}
                  </div>
                  <div className="text-[var(--cd-good)] font-semibold mt-0.5">
                    I = {evidence.instability.sourceI.toFixed(2)}
                  </div>
                </div>
                <div className="rounded bg-[var(--cd-bg)] p-1.5 border border-[var(--cd-border-soft)]">
                  <div className="text-[var(--cd-ink-faint)]">Target (Unstable)</div>
                  <div className="font-bold text-[var(--cd-ink)] truncate">
                    {formatComponentName(evidence.instability.target)}
                  </div>
                  <div className="text-[var(--cd-warn)] font-semibold mt-0.5">
                    I = {evidence.instability.targetI.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Boundary violation if detected */}
          {evidence.boundaryViolation && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] text-amber-800 dark:text-amber-200">
              <span className="font-semibold">Boundary Violation: </span>
              <span>{evidence.boundaryViolation}</span>
            </div>
          )}

          {/* Component Graph Neighborhood (if loaded from backend API) */}
          {componentDetails && (
            <div className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] p-2.5 space-y-2 text-[11px]">
              <div className="font-semibold text-[var(--cd-ink)]">Component Neighborhood</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-[var(--cd-ink-faint)] uppercase font-mono">
                    Dependencies ({componentDetails.dependencies?.length || 0})
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {componentDetails.dependencies?.slice(0, 4).map((d) => (
                      <span
                        key={d.id}
                        className="rounded bg-[var(--cd-bg)] border border-[var(--cd-border-soft)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--cd-ink-soft)] truncate max-w-[100px]"
                      >
                        {formatComponentName(d.name)}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-[var(--cd-ink-faint)] uppercase font-mono">
                    Dependents ({componentDetails.dependents?.length || 0})
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {componentDetails.dependents?.slice(0, 4).map((d) => (
                      <span
                        key={d.id}
                        className="rounded bg-[var(--cd-bg)] border border-[var(--cd-border-soft)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--cd-ink-soft)] truncate max-w-[100px]"
                      >
                        {formatComponentName(d.name)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Architectural Significance / Impact (Strictly per Constraint 2) */}
        <div className="space-y-1.5 border-t border-[var(--cd-border-soft)] pt-3">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
            Architectural Significance
          </div>
          <p className="text-[12px] text-[var(--cd-ink-soft)] leading-relaxed bg-[var(--cd-bg)] p-3 rounded-lg border border-[var(--cd-border-soft)]">
            {getRestrainedImpactStatement(connectedRec?.action_plan)}
          </p>
        </div>

        {/* Section 5: Connected Recommendation (if available in existing data) */}
        {connectedRec && (
          <div className="space-y-1.5 border-t border-[var(--cd-border-soft)] pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
                Connected Recommendation
              </span>
              <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400">
                {connectedRec.priority} PRIORITY
              </span>
            </div>
            <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 text-[12px] text-[var(--cd-ink)] leading-relaxed space-y-2">
              <p className="font-medium">{connectedRec.recommendation}</p>
              {connectedRec.action_plan && (
                <div className="text-[11.5px] text-[var(--cd-ink-soft)] border-t border-indigo-500/10 pt-2 font-mono">
                  {connectedRec.action_plan}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section 6: Next Step Engineering Actions (Docked at bottom) */}
      <div className="border-t border-[var(--cd-border-soft)] p-3 bg-[var(--cd-bg)]/80 space-y-2">
        <button
          type="button"
          onClick={handleInvestigateInLab}
          className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-lg bg-[var(--cd-accent)] px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors shadow-xs"
        >
          <FlaskConical className="h-4 w-4" />
          <span>Investigate in Architecture Lab</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleTraceInArchitecture}
            className="cursor-pointer flex items-center justify-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-2 text-[12px] font-semibold text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors shadow-xs"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Trace in Map</span>
          </button>

          <button
            type="button"
            onClick={handleInspectInCodeStudio}
            className="cursor-pointer flex items-center justify-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-2 text-[12px] font-semibold text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors shadow-xs"
          >
            <Code2 className="h-3.5 w-3.5 text-[var(--cd-accent)]" />
            <span>Inspect in Studio</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleAskCoodaraChat}
          className="w-full cursor-pointer flex items-center justify-center gap-1.5 rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5 text-[var(--cd-accent)]" />
          <span>Ask Coodara AI Remediation Plan</span>
        </button>
      </div>
    </div>
  );
};
