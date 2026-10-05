import { useState } from "react";
import { AlertCircle, Layers, Plus, Sparkles, X } from "lucide-react";
import type { ExperimentCreateRequest, ExperimentStatus, Intervention } from "@/types/lab";

interface ExperimentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: ExperimentCreateRequest) => Promise<void>;
  hypothesisId: number;
  hypothesisTitle: string;
  interventions?: Intervention[];
}

export function ExperimentModal({
  isOpen,
  onClose,
  onSubmit,
  hypothesisId,
  hypothesisTitle,
  interventions,
}: ExperimentModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ExperimentStatus>("READY");
  const baselineRefType = "latest";
  const [baselineRefVal, setBaselineRefVal] = useState("HEAD (Latest Snapshot)");
  const proposedRefType = "proposed_intervention";
  const [selectedInterventionId, setSelectedInterventionId] = useState<number | undefined>(
    interventions && interventions.length > 0 ? interventions[interventions.length - 1].id : undefined
  );
  const [proposedRefVal, setProposedRefVal] = useState(
    interventions && interventions.length > 0
      ? `${interventions[interventions.length - 1].intervention_type} on ${interventions[interventions.length - 1].target_component_ids.join(", ")}`
      : "Intervention Variant"
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide an experiment name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        hypothesis_id: hypothesisId,
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        baseline_reference: {
          type: baselineRefType,
          value: baselineRefVal,
        },
        proposed_reference: {
          type: proposedRefType,
          intervention_id: selectedInterventionId,
          value: proposedRefVal,
        },
      });
      onClose();
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "Failed to create experiment.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer absolute top-4 right-4 rounded-lg p-1.5 text-[var(--cd-ink-faint)] hover:text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-1 mb-5">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-500" />
            <h2 className="text-base font-bold text-[var(--cd-ink)]">
              Configure Comparative Experiment
            </h2>
          </div>
          <p className="text-xs text-[var(--cd-ink-soft)]">
            Setup comparison between baseline and proposed intervention for hypothesis:{" "}
            <span className="font-medium text-[var(--cd-ink)]">{hypothesisTitle}</span>
          </p>
        </div>

        {/* Notice of Level 1 Structural Pre-Flight Scope */}
        <div className="mb-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Level 1 &mdash; Structural Pre-Flight Simulation</span>
          </div>
          <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 mt-1">
            Experiments evaluate predicted structural consequences against the current architecture graph before code changes. Code-based execution (Level 2) and live benchmarks (Level 3) are scheduled for subsequent phases.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--cd-ink)]">
              Experiment Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Baseline vs Async Worker Queue Comparison"
              className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--cd-ink)]">
              Description & Objectives
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Comparison objective and metrics of interest..."
              className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
            />
          </div>

          {/* Baseline vs Proposed Explicit Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Baseline Reference */}
            <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] p-3 space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--cd-ink-soft)]">
                Baseline Reference
              </span>
              <input
                type="text"
                value={baselineRefVal}
                onChange={(e) => setBaselineRefVal(e.target.value)}
                placeholder="Current Commit / Snapshot"
                className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-1.5 font-mono text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
              />
            </div>

            {/* Proposed Reference */}
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Proposed Architecture / Intervention
              </span>
              {interventions && interventions.length > 0 ? (
                <select
                  value={selectedInterventionId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedInterventionId(id);
                    const matched = interventions.find((i) => i.id === id);
                    if (matched) {
                      setProposedRefVal(`${matched.intervention_type} on ${matched.target_component_ids.join(", ")}`);
                    }
                  }}
                  className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-1.5 font-mono text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
                >
                  {interventions.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.intervention_type} ({inv.target_component_ids.join(", ")})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={proposedRefVal}
                  onChange={(e) => setProposedRefVal(e.target.value)}
                  placeholder="Proposed Variant Name"
                  className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-1.5 font-mono text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
                />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--cd-ink)]">
              Experiment State
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ExperimentStatus)}
              className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
            >
              <option value="READY">READY (Configured & awaiting benchmark runner)</option>
              <option value="DRAFT">DRAFT (Under construction)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--cd-border-soft)]">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg px-4 py-2 text-xs font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors shadow-xs disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>{isSubmitting ? "Creating..." : "Save Experiment"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
