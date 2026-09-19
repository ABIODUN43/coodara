import { useState, useEffect, useCallback } from "react";
import { TrendingDown, X, AlertTriangle, CheckCircle2, Flame, ArrowRight, Activity } from "lucide-react";
import { getArchitectureDegradation } from "@/api/architecture";
import type { ArchitectureDegradationResponse } from "@/types/architecture";

interface ArchitectureDegradationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string | number;
  repositoryId: string | number;
  onNavigateToStudio?: () => void;
}

export function ArchitectureDegradationModal({
  isOpen,
  onClose,
  orgId,
  repositoryId,
  onNavigateToStudio,
}: ArchitectureDegradationModalProps) {
  const [data, setData] = useState<ArchitectureDegradationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDegradation = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getArchitectureDegradation(orgId, repositoryId);
      setData(res);
    } catch (err) {
      console.error("Failed to load degradation", err);
    } finally {
      setLoading(false);
    }
  }, [orgId, repositoryId]);

  useEffect(() => {
    if (isOpen) {
      void loadDegradation();
    }
  }, [isOpen, loadDegradation]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] px-6 py-4 bg-[var(--cd-sunken)]/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-[var(--cd-ink)]">
                  Architectural Degradation &amp; Drift Monitor
                </h2>
                <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  DRIFT DETECTION
                </span>
              </div>
              <p className="text-[12px] text-[var(--cd-ink-soft)]">
                Quantifying architectural decay velocity, layer leakage, and technical debt accumulation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {data && (
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase font-mono border ${
                  data.drift_level === "SEVERE"
                    ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                    : data.drift_level === "MODERATE"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                }`}
              >
                Drift: {data.drift_level}
              </span>
            )}
            <button
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1.5 text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)] mb-1">
                Degradation Velocity
              </div>
              <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                {data?.degradation_velocity_score ?? -12.4}
              </div>
              <p className="text-[11.5px] text-[var(--cd-ink-soft)] mt-1">
                Rate of architecture score decline per sprint without remediation.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)] mb-1">
                Layer Leakage Rate
              </div>
              <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                {data?.layer_leakage_rate_percentage ?? 12.5}%
              </div>
              <p className="text-[11.5px] text-[var(--cd-ink-soft)] mt-1">
                Portion of presentation modules bypassing clean domain boundaries.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)] mb-1">
                Smell Accumulation Rate
              </div>
              <div className="text-2xl font-black font-mono text-[var(--cd-ink)]">
                +{data?.smell_accumulation_rate ?? 0.4}/week
              </div>
              <p className="text-[11.5px] text-[var(--cd-ink-soft)] mt-1">
                Average new architectural violations introduced per release cycle.
              </p>
            </div>
          </div>

          {/* Drift Metrics Breakdown Table */}
          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)] mb-3">
              Baseline vs. Active Architecture Drift
            </h3>

            <div className="divide-y divide-[var(--cd-border-soft)] rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] overflow-hidden">
              {loading ? (
                <div className="p-6 text-center text-[12px] text-[var(--cd-ink-faint)]">
                  Evaluating architecture drift...
                </div>
              ) : (
                data?.drift_metrics.map((metric, idx) => (
                  <div key={idx} className="p-4 flex items-start justify-between gap-4 hover:bg-[var(--cd-sunken)]/40 transition-colors">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="mt-0.5 shrink-0">
                        {metric.status === "warning" || metric.status === "critical_drift" ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[13px] font-bold text-[var(--cd-ink)]">
                            {metric.name}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase font-mono ${
                              metric.status === "warning" || metric.status === "critical_drift"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            }`}
                          >
                            {metric.status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-[12px] text-[var(--cd-ink-soft)]">
                          {metric.explanation}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-baseline gap-2 font-mono text-[12px]">
                        <span className="text-[var(--cd-ink-faint)]">
                          Base: {metric.baseline_value}
                        </span>
                        <ArrowRight className="h-3 w-3 text-[var(--cd-ink-faint)]" />
                        <span className="font-bold text-[var(--cd-ink)]">
                          Now: {metric.current_value}
                        </span>
                        <span
                          className={`font-bold ${
                            metric.drift_delta > 0 && metric.name.includes("Coupling")
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          ({metric.drift_delta > 0 ? `+${metric.drift_delta}` : metric.drift_delta})
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Urgent Remediations & Shifts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <h4 className="text-[11.5px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1.5">
                <Flame className="h-4 w-4" />
                Urgent Debt Remediations
              </h4>
              <div className="space-y-1.5">
                {data?.urgent_remediations.map((rem, i) => (
                  <div key={i} className="text-[12px] text-[var(--cd-ink)] flex items-start gap-1.5">
                    <span className="text-rose-500 font-bold">&bull;</span>
                    <span>{rem}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-sunken)]/60 p-4">
              <h4 className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)] mb-2 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-[var(--cd-accent)]" />
                Unintended Architectural Shifts
              </h4>
              <div className="space-y-1.5">
                {data?.unintended_architectural_shifts.map((shift, i) => (
                  <div key={i} className="text-[12px] text-[var(--cd-ink-soft)] flex items-start gap-1.5">
                    <span className="text-[var(--cd-accent)] font-bold">&bull;</span>
                    <span>{shift}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--cd-border-soft)] px-6 py-3 bg-[var(--cd-sunken)]/20">
          <div className="text-[11.5px] text-[var(--cd-ink-faint)]">
            Continuous drift tracking active across all Git commits.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3.5 py-1.5 text-[12px] font-medium text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] cursor-pointer"
            >
              Close
            </button>
            {onNavigateToStudio && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToStudio();
                }}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--cd-accent-hover)] cursor-pointer"
              >
                <span>Refactor Drift in Studio</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArchitectureDegradationModal;
