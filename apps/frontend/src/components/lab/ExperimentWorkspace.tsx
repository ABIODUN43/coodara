import { useState } from "react";
import {
  AlertTriangle,
  Clock,
  Layers,
  Plus,
  Sparkles,
} from "lucide-react";
import type { Experiment, Hypothesis } from "@/types/lab";
import { ExperimentStatusBadge } from "./LabBadges";

interface ExperimentWorkspaceProps {
  experiments: Experiment[];
  hypotheses: Hypothesis[];
  selectedExperiment: Experiment | null;
  onSelectExperiment: (e: Experiment) => void;
  onOpenNewExperiment: () => void;
}

export function ExperimentWorkspace({
  experiments,
  hypotheses,
  selectedExperiment,
  onSelectExperiment,
  onOpenNewExperiment,
}: ExperimentWorkspaceProps) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const filteredExperiments = experiments.filter((exp) => {
    if (filterStatus !== "ALL" && exp.status !== filterStatus) return false;
    return true;
  });

  const activeExp = selectedExperiment || experiments[0] || null;
  const parentHypothesis = hypotheses.find((h) => activeExp && h.id === activeExp.hypothesis_id);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--cd-ink)]">
            Comparative Architecture Experiments
          </h2>
          <p className="text-xs text-[var(--cd-ink-soft)] mt-0.5">
            Compare baseline system topologies against proposed refactorings.
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

      {/* Scope Boundary Notice */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-blue-800 dark:text-blue-200">
            Stage 3 Execution Boundary Discipline
          </span>
          <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
            Experiments are currently configured in <span className="font-mono font-semibold">READY</span> status.
            In Stage 4, Coodara will run sandbox benchmarks and compare measured latencies, memory footprint, and call traces.
            No synthetic completed benchmark results are fabricated.
          </p>
        </div>
      </div>

      {experiments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--cd-border)] bg-[var(--cd-surface)]/50 p-12 text-center">
          <Layers className="h-10 w-10 text-[var(--cd-accent)]/60 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[var(--cd-ink)]">No Experiments Defined</h3>
          <p className="mt-1 text-xs text-[var(--cd-ink-soft)] max-w-sm mx-auto">
            Create an experiment under an active hypothesis to specify a baseline and proposed variant comparison.
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
          {/* Left Column: Experiments List (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
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

          {/* Right Column: Experiment Inspection & Comparison (7 Cols) */}
          <div className="lg:col-span-7">
            {activeExp && (
              <div className="rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 space-y-6 shadow-2xs">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-[var(--cd-border-soft)] pb-4">
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
                </div>

                {/* Explicit Comparison Card: Baseline vs Proposed */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--cd-ink)]">
                    Architectural Comparison
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Baseline */}
                    <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] p-4 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--cd-ink)]">
                        <Clock className="h-4 w-4 text-[var(--cd-ink-faint)]" />
                        <span>Baseline Architecture</span>
                      </div>
                      <div className="font-mono text-xs text-[var(--cd-ink-soft)] bg-[var(--cd-surface)] p-2.5 rounded-lg border border-[var(--cd-border)]">
                        {JSON.stringify(activeExp.baseline_reference, null, 2)}
                      </div>
                    </div>

                    {/* Proposed */}
                    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                        <Sparkles className="h-4 w-4 text-indigo-500" />
                        <span>Proposed Variant</span>
                      </div>
                      <div className="font-mono text-xs text-[var(--cd-ink)] bg-[var(--cd-surface)] p-2.5 rounded-lg border border-indigo-500/20">
                        {JSON.stringify(activeExp.proposed_reference, null, 2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evaluation State Notice */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Evaluation Status: Pending Sandbox Runner</span>
                  </div>
                  <p className="text-xs text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
                    This experiment is configured and verified in Coodara. Once the Stage 4 benchmark execution engine runs,
                    empirical throughput, latency percentiles, and dependency diffs will be populated into the evidence ledger.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
