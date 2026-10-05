import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  Play,
  Plus,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import type {
  CostScenario,
  EconomicEvaluationRequest,
  EconomicEvaluationResponse,
  Experiment,
  Hypothesis,
  PricingSnapshot,
  ResourceProfile,
  WorkloadProfile,
} from "@/types/lab";
import { ExperimentStatusBadge } from "./LabBadges";
import { ArchitecturalEconomicsPanel } from "./ArchitecturalEconomicsPanel";

interface ExperimentWorkspaceProps {
  experiments: Experiment[];
  hypotheses: Hypothesis[];
  selectedExperiment: Experiment | null;
  onSelectExperiment: (e: Experiment) => void;
  onOpenNewExperiment: () => void;
  onExecuteExperiment?: (experimentId: number, runId?: number) => Promise<unknown>;
  onCancelExperiment?: (experimentId: number, runId: number) => Promise<unknown>;
  onRecordDecision?: (experiment: Experiment, defaultRationale?: string) => void;
  resourceProfiles?: ResourceProfile[];
  workloadProfiles?: WorkloadProfile[];
  pricingSnapshots?: PricingSnapshot[];
  costScenarios?: CostScenario[];
  onEvaluateEconomicScenario?: (payload: EconomicEvaluationRequest) => Promise<EconomicEvaluationResponse>;
}

export function ExperimentWorkspace({
  experiments,
  hypotheses,
  selectedExperiment,
  onSelectExperiment,
  onOpenNewExperiment,
  onExecuteExperiment,
  onCancelExperiment,
  onRecordDecision,
  resourceProfiles = [],
  workloadProfiles = [],
  pricingSnapshots = [],
  costScenarios = [],
  onEvaluateEconomicScenario,
}: ExperimentWorkspaceProps) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const filteredExperiments = experiments.filter((exp) => {
    if (filterStatus !== "ALL" && exp.status !== filterStatus) return false;
    return true;
  });

  const activeExp = selectedExperiment || experiments[0] || null;
  const parentHypothesis = hypotheses.find((h) => activeExp && h.id === activeExp.hypothesis_id);
  const latestRun = activeExp?.runs && activeExp.runs.length > 0
    ? activeExp.runs[activeExp.runs.length - 1]
    : null;

  const resultData = latestRun?.result_data;
  const metricsBefore = resultData?.metrics_before;
  const metricsAfter = resultData?.metrics_after;
  const diffs = resultData?.differences;
  const isCompleted = activeExp?.status === "COMPLETED" && !!resultData;
  const isRunning = activeExp?.status === "RUNNING" || isExecuting;
  const isFailed = activeExp?.status === "FAILED";
  const isCancelled = activeExp?.status === "CANCELLED";

  const handleExecute = async () => {
    if (!activeExp || !onExecuteExperiment) return;
    setIsExecuting(true);
    setExecutionError(null);
    try {
      const isRunPending = latestRun?.status === "PENDING";
      const runIdToExecute = isRunPending ? latestRun?.id : undefined;
      await onExecuteExperiment(activeExp.id, runIdToExecute);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error)?.message ||
        "Execution failed";
      setExecutionError(msg);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancel = async () => {
    if (!activeExp || !latestRun || !onCancelExperiment) return;
    try {
      await onCancelExperiment(activeExp.id, latestRun.id);
    } catch (err: unknown) {
      console.error("Cancel failed:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center rounded-md bg-[var(--cd-accent)]/10 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-[var(--cd-accent)]">
              Level 1 &mdash; Structural Pre-Flight
            </span>
          </div>
          <h2 className="text-lg font-bold text-[var(--cd-ink)]">
            Structural Pre-Flight Simulation
          </h2>
          <p className="text-xs text-[var(--cd-ink-soft)] mt-0.5">
            Evaluate predicted structural consequences against the current architecture graph before making code changes.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewExperiment}
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors shadow-xs self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Experiment</span>
        </button>
      </div>

      {experiments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--cd-border)] bg-[var(--cd-surface)]/50 p-12 text-center">
          <Layers className="h-10 w-10 text-[var(--cd-accent)]/60 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[var(--cd-ink)]">No Experiments Defined</h3>
          <p className="mt-1 text-xs text-[var(--cd-ink-soft)] max-w-sm mx-auto">
            Create an experiment under an active hypothesis to evaluate baseline and proposed variant metrics.
          </p>
          <button
            type="button"
            onClick={onOpenNewExperiment}
            className="mt-4 cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Define First Experiment</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Experiments List (4 Cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--cd-ink)]">
                Configured Experiments ({filteredExperiments.length})
              </span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2 py-1 text-xs text-[var(--cd-ink)]"
              >
                <option value="ALL">All States</option>
                <option value="READY">Ready</option>
                <option value="DRAFT">Draft</option>
                <option value="RUNNING">Running</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredExperiments.map((exp) => {
                const isSelected = activeExp?.id === exp.id;
                return (
                  <div
                    key={exp.id}
                    onClick={() => onSelectExperiment(exp)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      isSelected
                        ? "border-[var(--cd-accent)] bg-[var(--cd-surface)] shadow-2xs ring-1 ring-[var(--cd-accent)]/20"
                        : "border-[var(--cd-border)] bg-[var(--cd-surface)] hover:border-[var(--cd-border-strong,var(--cd-border))]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-[var(--cd-ink)] line-clamp-1">
                        {exp.name}
                      </h4>
                      <ExperimentStatusBadge status={exp.status} />
                    </div>

                    {exp.description && (
                      <p className="mt-1 text-xs text-[var(--cd-ink-soft)] line-clamp-2">
                        {exp.description}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--cd-ink-faint)] pt-2 border-t border-[var(--cd-border-soft)]">
                      <span>{exp.runs?.length || 0} evaluation runs</span>
                      <span>{new Date(exp.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Experiment Inspection, Execution & Comparison (8 Cols) */}
          <div className="lg:col-span-8">
            {activeExp && (
              <div className="rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 space-y-6 shadow-2xs">
                {/* Header & Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--cd-border-soft)] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-[var(--cd-ink-faint)]">
                        EXPERIMENT #{activeExp.id}
                      </span>
                      <ExperimentStatusBadge status={activeExp.status} />
                    </div>
                    <h3 className="text-base font-bold text-[var(--cd-ink)] mt-1">
                      {activeExp.name}
                    </h3>
                    {parentHypothesis && (
                      <p className="text-xs text-[var(--cd-ink-soft)] mt-0.5">
                        Linked Hypothesis:{" "}
                        <span className="font-semibold text-[var(--cd-ink)]">
                          {parentHypothesis.title}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Execution Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isRunning ? (
                      <>
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-1.5 text-xs font-semibold text-white opacity-80 cursor-wait"
                        >
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Evaluating...</span>
                        </button>
                        {onCancelExperiment && latestRun && (
                          <button
                            type="button"
                            onClick={handleCancel}
                            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-500/20 transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </>
                    ) : isCompleted ? (
                      <>
                        {onExecuteExperiment && (
                          <button
                            type="button"
                            onClick={handleExecute}
                            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--cd-ink)] hover:bg-[var(--cd-bg)] transition-colors"
                          >
                            <Play className="h-3.5 w-3.5" />
                            <span>Re-run</span>
                          </button>
                        )}
                        {onRecordDecision && (
                          <button
                            type="button"
                            onClick={() => onRecordDecision(activeExp)}
                            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors shadow-xs"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Record Decision</span>
                          </button>
                        )}
                      </>
                    ) : (
                      onExecuteExperiment && (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            onClick={handleExecute}
                            aria-label="Run Experiment — Level 1 Structural Simulation"
                            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors shadow-xs"
                          >
                            <Play className="h-3.5 w-3.5" />
                            <span>Run Simulation</span>
                          </button>
                          <span className="text-[10px] text-[var(--cd-ink-faint)] italic">
                            Deterministic simulation &bull; No code modified
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Execution Error Banner if any */}
                {(executionError || (isFailed && latestRun?.error)) && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
                    <ShieldAlert className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Evaluation Error: </span>
                      <span>{executionError || latestRun?.error || "Unknown execution error."}</span>
                    </div>
                  </div>
                )}

                {/* Status Notice */}
                {isRunning ? (
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 flex items-center gap-3 text-xs text-blue-900 dark:text-blue-200">
                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
                    <div>
                      <span className="font-semibold">Structural simulation in progress</span>
                      <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                        Deterministic topological evaluation is running against the architecture graph.
                      </p>
                    </div>
                  </div>
                ) : isCancelled ? (
                  <div className="rounded-xl border border-neutral-500/20 bg-neutral-500/5 p-4 flex items-center gap-2.5 text-xs text-[var(--cd-ink-soft)]">
                    <XCircle className="h-4 w-4 text-neutral-500" />
                    <span>Simulation cancelled by user. Click Re-run to evaluate again.</span>
                  </div>
                ) : !isCompleted ? (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-1.5 text-xs text-amber-800 dark:text-amber-200">
                    <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-100">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Status: Not evaluated</span>
                    </div>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                      Click <span className="font-semibold">Run Simulation</span> above to evaluate predicted structural consequences,
                      coupling changes, and boundary crossings against the baseline architecture model.
                    </p>
                    <p className="text-[10px] text-[var(--cd-ink-faint)] italic">
                      * This runs a Level 1 deterministic structural simulation against the architecture model. No repository code is modified.
                    </p>
                  </div>
                ) : null}

                {/* References Card: Baseline vs Proposed */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--cd-ink)]">
                    Structural Pre-Flight References
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Baseline */}
                    <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] p-4 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--cd-ink)]">
                        <Clock className="h-4 w-4 text-[var(--cd-ink-faint)]" />
                        <span>Baseline Architecture Model</span>
                      </div>
                      <div className="font-mono text-xs text-[var(--cd-ink-soft)] bg-[var(--cd-surface)] p-2.5 rounded-lg border border-[var(--cd-border)] break-all">
                        {JSON.stringify(resultData?.baseline_reference || activeExp.baseline_reference, null, 2)}
                      </div>
                    </div>

                    {/* Proposed */}
                    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                        <Sparkles className="h-4 w-4 text-indigo-500" />
                        <span>Proposed Structural Mutation</span>
                      </div>
                      <div className="font-mono text-xs text-[var(--cd-ink)] bg-[var(--cd-surface)] p-2.5 rounded-lg border border-indigo-500/20 break-all">
                        {JSON.stringify(resultData?.proposed_reference || activeExp.proposed_reference, null, 2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* COMPLETED: Structured Results Comparison Table */}
                {isCompleted && metricsBefore && metricsAfter && diffs && (
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--cd-border-soft)] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-[var(--cd-ink)]">
                            Predicted Structural Consequences
                          </span>
                          <span className="text-[11px] text-[var(--cd-ink-faint)] font-medium">
                            Deterministic Structural Comparison
                          </span>
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold uppercase font-mono tracking-wider ${
                            diffs.boundary_crossings === 0 && (diffs.issues_count || 0) <= 0
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : diffs.boundary_crossings > 0
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                          }`}>
                            {diffs.boundary_crossings === 0 && (diffs.issues_count || 0) <= 0
                              ? "STRUCTURALLY PROMISING"
                              : diffs.boundary_crossings > 0
                              ? "STRUCTURAL RISK DETECTED"
                              : "STRUCTURAL TRADE-OFF"}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--cd-ink-soft)] mt-0.5">
                          Model-derived topological comparison. Non-empirical prediction &mdash; requires Level 2 code experimentation for empirical verification.
                        </p>
                      </div>
                      <span className="text-[10px] text-[var(--cd-ink-faint)] font-mono self-start sm:self-auto">
                        Duration: {resultData.duration_seconds ?? 0}s | Pure In-Memory Analysis
                      </span>
                    </div>

                    <div className="rounded-xl border border-[var(--cd-border)] overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--cd-border)] bg-[var(--cd-bg)] text-[var(--cd-ink-soft)]">
                            <th className="py-2.5 px-4 font-semibold">Architectural Metric</th>
                            <th className="py-2.5 px-4 font-semibold">Baseline Architecture</th>
                            <th className="py-2.5 px-4 font-semibold">Proposed Structural Model</th>
                            <th className="py-2.5 px-4 font-semibold">Predicted Delta (Proposed &minus; Baseline)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--cd-border-soft)] font-mono">
                          <tr>
                            <td className="py-2.5 px-4 font-sans text-[var(--cd-ink)] font-medium">Components</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)]">{metricsBefore.components ?? "—"}</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)]">{metricsAfter.components ?? "—"}</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)] font-semibold">
                              {(diffs.components || 0) > 0 ? `+${diffs.components}` : (diffs.components ?? 0)}
                            </td>
                          </tr>

                          <tr>
                            <td className="py-2.5 px-4 font-sans text-[var(--cd-ink)] font-medium">Dependencies</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)]">{metricsBefore.dependencies ?? "—"}</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)]">{metricsAfter.dependencies ?? "—"}</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)] font-semibold">
                              {(diffs.dependencies || 0) > 0 ? `+${diffs.dependencies}` : (diffs.dependencies ?? 0)}
                            </td>
                          </tr>

                          <tr>
                            <td className="py-2.5 px-4 font-sans text-[var(--cd-ink)] font-medium">Efferent Coupling (Ce)</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)]">{metricsBefore.efferent_coupling ?? "—"}</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)]">{metricsAfter.efferent_coupling ?? "—"}</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)] font-semibold">
                              {(diffs.efferent_coupling || 0) > 0 ? `+${diffs.efferent_coupling}` : (diffs.efferent_coupling ?? 0)}
                            </td>
                          </tr>

                          <tr>
                            <td className="py-2.5 px-4 font-sans text-[var(--cd-ink)] font-medium">Instability Index (I)</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)]">{metricsBefore.instability ?? "—"}</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)]">{metricsAfter.instability ?? "—"}</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)] font-semibold">
                              {(diffs.instability || 0) > 0 ? `+${diffs.instability}` : (diffs.instability ?? 0)}
                            </td>
                          </tr>

                          <tr>
                            <td className="py-2.5 px-4 font-sans text-[var(--cd-ink)] font-medium">Boundary Violations / Crossings</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)]">{metricsBefore.boundary_crossings ?? 0}</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)]">{metricsAfter.boundary_crossings ?? 0}</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)] font-semibold">
                              {(diffs.boundary_crossings || 0) > 0 ? `+${diffs.boundary_crossings}` : (diffs.boundary_crossings ?? 0)}
                            </td>
                          </tr>

                          <tr>
                            <td className="py-2.5 px-4 font-sans text-[var(--cd-ink)] font-medium">Architecture Issues Detected</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)]">{metricsBefore.issues_count ?? "—"}</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)]">{metricsAfter.issues_count ?? "—"}</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)] font-semibold">
                              {(diffs.issues_count || 0) > 0 ? `+${diffs.issues_count}` : (diffs.issues_count ?? 0)}
                            </td>
                          </tr>

                          <tr>
                            <td className="py-2.5 px-4 font-sans text-[var(--cd-ink)] font-medium">Maintainability Score</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)]">{metricsBefore.maintainability ?? "—"}</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)]">{metricsAfter.maintainability ?? "—"}</td>
                            <td className="py-2.5 px-4 text-[var(--cd-ink)] font-semibold">
                              {(diffs.maintainability || 0) > 0 ? `+${diffs.maintainability}` : (diffs.maintainability ?? 0)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[11px] text-[var(--cd-ink-faint)] italic">
                      Delta convention: &Delta; = Proposed &minus; Baseline. Structural metrics are model predictions derived from topological simulation. No source code has been modified or compiled.
                    </p>

                    {/* Direct Impacts Card */}
                    {resultData.direct_impacts && resultData.direct_impacts.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--cd-ink)]">
                          Directly Impacted Components ({resultData.direct_impacts.length})
                        </span>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {resultData.direct_impacts.map((d, idx) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] p-3 text-xs flex items-start justify-between gap-3"
                            >
                              <div>
                                <span className="font-semibold text-[var(--cd-ink)] font-mono">{d.name}</span>
                                <span className="text-[10px] text-[var(--cd-ink-faint)] ml-2">({d.subsystem})</span>
                                <p className="text-[11px] text-[var(--cd-ink-soft)] mt-0.5">{d.reason}</p>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 shrink-0">
                                {d.relationship}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Boundary Crossings Card */}
                    {resultData.boundaries_crossed && resultData.boundaries_crossed.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--cd-ink)]">
                          Boundary Crossings Detected ({resultData.boundaries_crossed.length})
                        </span>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {resultData.boundaries_crossed.map((b, idx) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2 font-mono text-[11px]">
                                <span className="text-[var(--cd-ink)]">{b.from_boundary}</span>
                                <ArrowRight className="h-3 w-3 text-amber-500" />
                                <span className="text-[var(--cd-ink)]">{b.to_boundary}</span>
                                <span className="text-[10px] text-[var(--cd-ink-faint)] font-sans">({b.reason})</span>
                              </div>
                              <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-mono font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                {b.severity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Traceable Evidence Notice */}
                    <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] p-4 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--cd-ink)]">Model Evidence Ledger</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            STATIC &bull; Graph Model Prediction
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--cd-ink-soft)]">
                          {resultData.generated_evidence_ids?.length || 0} evidence ledger entries generated with <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">STATIC</span> provenance.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--cd-ink-faint)] bg-[var(--cd-surface)] px-2 py-1 rounded border border-[var(--cd-border)]">
                        LEVEL_1_GRAPH_SIMULATION
                      </span>
                    </div>

                    {/* Honest Epistemic Notice */}
                    <div className="text-[11px] text-[var(--cd-ink-faint)] italic leading-relaxed pt-2 border-t border-[var(--cd-border-soft)]">
                      * Level 1 structural metrics are model-derived predictions calculated deterministically from AST graph dependencies. No code has been modified, compiled, or tested. No runtime latency, throughput, or cloud cost changes are inferred without Level 2 code experimentation and Level 3 production telemetry.
                    </div>
                  </div>
                )}

                {/* Architectural Economics Modeling Panel */}
                <div className="pt-2">
                  <ArchitecturalEconomicsPanel
                    experiment={activeExp}
                    resourceProfiles={resourceProfiles}
                    workloadProfiles={workloadProfiles}
                    pricingSnapshots={pricingSnapshots}
                    costScenarios={costScenarios}
                    onEvaluateScenario={onEvaluateEconomicScenario}
                    onRecordDecision={onRecordDecision}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
