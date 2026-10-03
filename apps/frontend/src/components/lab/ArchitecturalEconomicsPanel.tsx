import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Calculator,
  ChevronDown,
  ChevronRight,
  FileText,
  Info,
  Loader2,
  Scale,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type {
  CostScenario,
  EconomicComparison,
  EconomicEstimate,
  EconomicEvaluationRequest,
  EconomicEvaluationResponse,
  Experiment,
  PricingSnapshot,
  ResourceProfile,
  WorkloadProfile,
} from "@/types/lab";
import { AssumptionTypeBadge, CompletenessBadge, EvidenceCategoryBadge } from "./LabBadges";

interface ArchitecturalEconomicsPanelProps {
  experiment: Experiment;
  resourceProfiles: ResourceProfile[];
  workloadProfiles: WorkloadProfile[];
  pricingSnapshots: PricingSnapshot[];
  costScenarios: CostScenario[];
  onEvaluateScenario?: (payload: EconomicEvaluationRequest) => Promise<EconomicEvaluationResponse>;
  onRecordDecision?: (experiment: Experiment, defaultRationale?: string) => void;
}

export function ArchitecturalEconomicsPanel({
  experiment,
  resourceProfiles,
  workloadProfiles,
  pricingSnapshots,
  costScenarios,
  onEvaluateScenario,
  onRecordDecision,
}: ArchitecturalEconomicsPanelProps) {
  // Evaluation form state
  const [selectedResourceId, setSelectedResourceId] = useState<number | "">(
    resourceProfiles[0]?.id || ""
  );
  const [selectedProposedResourceId, setSelectedProposedResourceId] = useState<number | "">("");
  const [selectedWorkloadId, setSelectedWorkloadId] = useState<number | "">(
    workloadProfiles[0]?.id || ""
  );
  const [selectedPricingId, setSelectedPricingId] = useState<number | "">(
    pricingSnapshots[0]?.id || ""
  );
  const [scenarioName, setScenarioName] = useState<string>(
    `Modeled Economics: ${experiment.name}`
  );

  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [latestEvaluation, setLatestEvaluation] = useState<EconomicEvaluationResponse | null>(null);

  // Accordion toggles
  const [showFormulas, setShowFormulas] = useState<boolean>(false);
  const [showValidationPath, setShowValidationPath] = useState<boolean>(false);

  // Check if an existing scenario matches this experiment
  const matchingScenarios = useMemo(() => {
    return costScenarios.filter((cs) => cs.experiment_id === experiment.id);
  }, [costScenarios, experiment.id]);

  const activeScenario = latestEvaluation?.scenario || matchingScenarios[0] || null;

  const baselineEstimate: EconomicEstimate | null = useMemo(() => {
    if (latestEvaluation) return latestEvaluation.baseline;
    if (activeScenario?.estimated_cost_outputs?.baseline) {
      return activeScenario.estimated_cost_outputs.baseline as unknown as EconomicEstimate;
    }
    return null;
  }, [latestEvaluation, activeScenario]);

  const proposedEstimate: EconomicEstimate | null = useMemo(() => {
    if (latestEvaluation) return latestEvaluation.proposed;
    if (activeScenario?.estimated_cost_outputs?.proposed) {
      return activeScenario.estimated_cost_outputs.proposed as unknown as EconomicEstimate;
    }
    return null;
  }, [latestEvaluation, activeScenario]);

  const comparison: EconomicComparison | null = useMemo(() => {
    if (latestEvaluation) return latestEvaluation.comparison;
    if (activeScenario?.estimated_cost_outputs?.comparison) {
      return activeScenario.estimated_cost_outputs.comparison as unknown as EconomicComparison;
    }
    return null;
  }, [latestEvaluation, activeScenario]);

  const currency = activeScenario?.currency || pricingSnapshots[0]?.currency || "USD";

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResourceId || !selectedPricingId || !onEvaluateScenario) return;

    setIsEvaluating(true);
    setEvaluationError(null);

    const latestRun = experiment.runs && experiment.runs.length > 0
      ? experiment.runs[experiment.runs.length - 1]
      : null;

    try {
      const response = await onEvaluateScenario({
        experiment_id: experiment.id,
        run_id: latestRun?.id || null,
        resource_profile_id: Number(selectedResourceId),
        pricing_snapshot_id: Number(selectedPricingId),
        workload_profile_id: selectedWorkloadId ? Number(selectedWorkloadId) : null,
        proposed_resource_profile_id: selectedProposedResourceId ? Number(selectedProposedResourceId) : null,
        scenario_name: scenarioName.trim() || `Economics: ${experiment.name}`,
        description: `Modeled economic footprint evaluated for ${experiment.name}`,
      });
      setLatestEvaluation(response);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error)?.message ||
        "Economic evaluation failed";
      setEvaluationError(msg);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleADRHandoff = () => {
    if (!onRecordDecision) return;
    const diff = comparison?.absolute_difference || 0;
    const rel = comparison?.relative_difference_pct || 0;
    const rationale = `Based on experiment #${experiment.id} (${experiment.name}) and architectural economics scenario:
- Baseline modeled cost: ${currency} ${baselineEstimate?.monthly?.toFixed(2) || "—"}/month
- Proposed modeled cost: ${currency} ${proposedEstimate?.monthly?.toFixed(2) || "—"}/month
- Difference: ${currency} ${diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}/month (${rel > 0 ? `+${rel.toFixed(1)}` : rel.toFixed(1)}%)
- Assumptions: Delta convention is Proposed - Baseline under declared resource and rate card assumptions.
- Validation: Empirical benchmark testing recommended before production commitment.`;

    onRecordDecision(experiment, rationale);
  };

  return (
    <div className="rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[var(--cd-border-soft)]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--cd-ink)]">Architectural Economics</h3>
              <EvidenceCategoryBadge category="MODELED" />
            </div>
            <p className="text-xs text-[var(--cd-ink-soft)] mt-0.5">
              Deterministic, transparent cost modeling under declared workload and rate card assumptions.
            </p>
          </div>
        </div>

        {activeScenario && onRecordDecision && (
          <button
            type="button"
            onClick={handleADRHandoff}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[var(--cd-accent)]/30 bg-[var(--cd-accent)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--cd-accent)] hover:bg-[var(--cd-accent)]/20 transition-colors self-start sm:self-auto"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Handoff to Decision Record (ADR)</span>
          </button>
        )}
      </div>

      {/* Assumptions Configuration Form */}
      <form onSubmit={handleEvaluate} className="space-y-4 rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--cd-ink)]">
            1. Configure Scenario Assumptions
          </span>
          {pricingSnapshots.length === 0 && (
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Pricing snapshot required</span>
            </span>
          )}
        </div>

        {pricingSnapshots.length === 0 && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <span>Pricing snapshot required — please capture or import a rate card before modeling.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Baseline Resource Profile */}
          <div className="space-y-1">
            <label className="font-semibold text-[var(--cd-ink)]">Baseline Resource</label>
            <select
              value={selectedResourceId}
              onChange={(e) => setSelectedResourceId(Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-1.5 text-xs text-[var(--cd-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--cd-accent)]"
              required
            >
              {resourceProfiles.map((rp) => (
                <option key={rp.id} value={rp.id}>
                  {rp.name} ({rp.cpu || "1 vCPU"}, {rp.memory || "2GiB"}, ×{rp.replicas})
                </option>
              ))}
            </select>
          </div>

          {/* Proposed Resource Profile (Optional) */}
          <div className="space-y-1">
            <label className="font-semibold text-[var(--cd-ink)]">Proposed Resource (Optional)</label>
            <select
              value={selectedProposedResourceId}
              onChange={(e) => setSelectedProposedResourceId(e.target.value ? Number(e.target.value) : "")}
              className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-1.5 text-xs text-[var(--cd-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--cd-accent)]"
            >
              <option value="">Auto-derived from refactor impact</option>
              {resourceProfiles.map((rp) => (
                <option key={rp.id} value={rp.id}>
                  {rp.name} ({rp.cpu || "1 vCPU"}, {rp.memory || "2GiB"}, ×{rp.replicas})
                </option>
              ))}
            </select>
          </div>

          {/* Workload Profile */}
          <div className="space-y-1">
            <label className="font-semibold text-[var(--cd-ink)]">Workload Profile</label>
            <select
              value={selectedWorkloadId}
              onChange={(e) => setSelectedWorkloadId(e.target.value ? Number(e.target.value) : "")}
              className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-1.5 text-xs text-[var(--cd-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--cd-accent)]"
            >
              <option value="">Unspecified (Compute & Storage only)</option>
              {workloadProfiles.map((wp) => (
                <option key={wp.id} value={wp.id}>
                  {wp.name} ({wp.requests_per_second ? `${wp.requests_per_second} rps` : "steady"})
                </option>
              ))}
            </select>
          </div>

          {/* Pricing Snapshot */}
          <div className="space-y-1">
            <label className="font-semibold text-[var(--cd-ink)]">Pricing Rate Card</label>
            <select
              value={selectedPricingId}
              onChange={(e) => setSelectedPricingId(e.target.value ? Number(e.target.value) : "")}
              className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-1.5 text-xs text-[var(--cd-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--cd-accent)]"
              required
              disabled={pricingSnapshots.length === 0}
            >
              {pricingSnapshots.length === 0 ? (
                <option value="">No pricing snapshots available</option>
              ) : (
                pricingSnapshots.map((ps) => (
                  <option key={ps.id} value={ps.id}>
                    {ps.provider} ({ps.region}) — {ps.currency}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Scenario Name & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <input
            type="text"
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            placeholder="Scenario Name"
            className="flex-1 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-xs text-[var(--cd-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--cd-accent)]"
            required
          />

          <button
            type="submit"
            disabled={isEvaluating || !selectedResourceId || !selectedPricingId || pricingSnapshots.length === 0}
            className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors disabled:opacity-50 shrink-0"
          >
            {isEvaluating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Evaluating Scenario...</span>
              </>
            ) : (
              <>
                <Scale className="h-3.5 w-3.5" />
                <span>Evaluate Architectural Economics</span>
              </>
            )}
          </button>
        </div>

        {evaluationError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            {evaluationError}
          </div>
        )}
      </form>

      {/* Modeled Comparison View */}
      {comparison && baselineEstimate && proposedEstimate && (
        <div className="space-y-5">
          {/* Headline Cost Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Baseline Card */}
            <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--cd-ink-soft)] uppercase tracking-wider">
                  Baseline Architecture
                </span>
                <CompletenessBadge completeness={baselineEstimate.calculation_completeness} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-[var(--cd-ink)] font-mono">
                  ${baselineEstimate.monthly.toFixed(2)}
                </span>
                <span className="text-xs text-[var(--cd-ink-soft)]">/month</span>
              </div>
              <div className="text-[10px] font-medium text-[var(--cd-ink-faint)]">
                {baselineEstimate.calculation_completeness === "COMPLETE"
                  ? "Modeled Monthly Total"
                  : `Modeled Total (Partial — excludes ${(baselineEstimate.unmodeled_components || []).join(", ") || "unmodeled"})`}
              </div>
              <div className="text-[11px] text-[var(--cd-ink-faint)] flex items-center justify-between pt-1 border-t border-[var(--cd-border-soft)]">
                <span>Daily: ${baselineEstimate.daily.toFixed(2)}</span>
                <span>Annual: ${baselineEstimate.annual.toFixed(0)}</span>
              </div>
            </div>

            {/* Proposed Card */}
            <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--cd-ink-soft)] uppercase tracking-wider">
                  Proposed Architecture
                </span>
                <CompletenessBadge completeness={proposedEstimate.calculation_completeness} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-[var(--cd-ink)] font-mono">
                  ${proposedEstimate.monthly.toFixed(2)}
                </span>
                <span className="text-xs text-[var(--cd-ink-soft)]">/month</span>
              </div>
              <div className="text-[10px] font-medium text-[var(--cd-ink-faint)]">
                {proposedEstimate.calculation_completeness === "COMPLETE"
                  ? "Modeled Monthly Total"
                  : `Modeled Total (Partial — excludes ${(proposedEstimate.unmodeled_components || []).join(", ") || "unmodeled"})`}
              </div>
              <div className="text-[11px] text-[var(--cd-ink-faint)] flex items-center justify-between pt-1 border-t border-[var(--cd-border-soft)]">
                <span>Daily: ${proposedEstimate.daily.toFixed(2)}</span>
                <span>Annual: ${proposedEstimate.annual.toFixed(0)}</span>
              </div>
            </div>

            {/* Modeled Delta Card */}
            <div
              className={`rounded-xl border p-4 space-y-2 ${
                comparison.absolute_difference < 0
                  ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
                  : comparison.absolute_difference > 0
                  ? "border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-300"
                  : "border-[var(--cd-border-soft)] bg-[var(--cd-bg)] text-[var(--cd-ink)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Modeled Difference (&Delta;)
                </span>
                <div className="flex items-center gap-1.5">
                  <CompletenessBadge completeness={comparison.comparison_completeness} />
                  {comparison.absolute_difference < 0 ? (
                    <TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono">
                  {comparison.absolute_difference > 0 ? `+${comparison.absolute_difference.toFixed(2)}` : comparison.absolute_difference.toFixed(2)}
                </span>
                <span className="text-xs font-semibold">
                  ({comparison.relative_difference_pct > 0 ? `+${comparison.relative_difference_pct.toFixed(1)}` : comparison.relative_difference_pct.toFixed(1)}%)
                </span>
              </div>
              {comparison.comparison_completeness === "PARTIAL" && (
                <div className="text-[10px] font-medium opacity-80">
                  Common modeled: {(comparison.common_modeled_components || []).join(", ") || "none"}
                </div>
              )}
              <p className="text-[11px] leading-tight opacity-90">
                {comparison.explanation}
              </p>
            </div>
          </div>

          {/* Methodology Note Callout */}
          <div className="rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-bg)]/80 p-3 text-xs flex items-start gap-2.5">
            <Info className="h-4 w-4 text-[var(--cd-accent)] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-[var(--cd-ink)]">Delta Convention & Mathematical Baseline</span>
              <p className="text-[11px] text-[var(--cd-ink-soft)] leading-relaxed">
                {comparison.methodology_note}
              </p>
            </div>
          </div>

          {/* Component Breakdown Table */}
          <div className="rounded-xl border border-[var(--cd-border-soft)] overflow-hidden">
            <div className="bg-[var(--cd-bg)] px-4 py-2 border-b border-[var(--cd-border-soft)] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--cd-ink)]">
                Infrastructure Component Breakdown
              </span>
              <span className="text-[11px] font-mono text-[var(--cd-ink-faint)]">
                Monthly ({currency})
              </span>
            </div>

            <table className="w-full text-xs">
              <thead className="bg-[var(--cd-surface)] border-b border-[var(--cd-border-soft)] text-[10px] font-mono uppercase text-[var(--cd-ink-soft)]">
                <tr>
                  <th className="py-2 px-4 text-left">Category</th>
                  <th className="py-2 px-4 text-right">Baseline</th>
                  <th className="py-2 px-4 text-right">Proposed</th>
                  <th className="py-2 px-4 text-right">Difference (&Delta;)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--cd-border-soft)] font-mono">
                {/* Compute */}
                <tr>
                  <td className="py-2.5 px-4 font-sans text-[var(--cd-ink)] font-medium">Compute (vCPU)</td>
                  <td className="py-2.5 px-4 text-right">${baselineEstimate.breakdown.compute.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right">${proposedEstimate.breakdown.compute.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right font-semibold">
                    {(proposedEstimate.breakdown.compute - baselineEstimate.breakdown.compute) > 0 ? `+$${(proposedEstimate.breakdown.compute - baselineEstimate.breakdown.compute).toFixed(2)}` : `$${(proposedEstimate.breakdown.compute - baselineEstimate.breakdown.compute).toFixed(2)}`}
                  </td>
                </tr>

                {/* Memory */}
                <tr>
                  <td className="py-2.5 px-4 font-sans text-[var(--cd-ink)] font-medium">Memory (RAM)</td>
                  <td className="py-2.5 px-4 text-right">${baselineEstimate.breakdown.memory.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right">${proposedEstimate.breakdown.memory.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right font-semibold">
                    {(proposedEstimate.breakdown.memory - baselineEstimate.breakdown.memory) > 0 ? `+$${(proposedEstimate.breakdown.memory - baselineEstimate.breakdown.memory).toFixed(2)}` : `$${(proposedEstimate.breakdown.memory - baselineEstimate.breakdown.memory).toFixed(2)}`}
                  </td>
                </tr>

                {/* Database */}
                <tr>
                  <td className="py-2.5 px-4 font-sans text-[var(--cd-ink)] font-medium">Database Instance</td>
                  <td className="py-2.5 px-4 text-right">
                    {baselineEstimate.breakdown.database_modeled !== false ? (
                      `$${baselineEstimate.breakdown.database.toFixed(2)}`
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Not Modeled</span>
                        <span className="text-[10px] text-[var(--cd-ink-faint)] italic max-w-[200px] truncate" title={baselineEstimate.breakdown.unmodeled_reasons?.database}>
                          {baselineEstimate.breakdown.unmodeled_reasons?.database || "rate missing"}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {proposedEstimate.breakdown.database_modeled !== false ? (
                      `$${proposedEstimate.breakdown.database.toFixed(2)}`
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Not Modeled</span>
                        <span className="text-[10px] text-[var(--cd-ink-faint)] italic max-w-[200px] truncate" title={proposedEstimate.breakdown.unmodeled_reasons?.database}>
                          {proposedEstimate.breakdown.unmodeled_reasons?.database || "rate missing"}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold">
                    {baselineEstimate.breakdown.database_modeled !== false && proposedEstimate.breakdown.database_modeled !== false ? (
                      (proposedEstimate.breakdown.database - baselineEstimate.breakdown.database) > 0
                        ? `+$${(proposedEstimate.breakdown.database - baselineEstimate.breakdown.database).toFixed(2)}`
                        : `$${(proposedEstimate.breakdown.database - baselineEstimate.breakdown.database).toFixed(2)}`
                    ) : (
                      <span className="text-[11px] text-[var(--cd-ink-faint)] font-normal italic">—</span>
                    )}
                  </td>
                </tr>

                {/* Storage */}
                <tr>
                  <td className="py-2.5 px-4 font-sans text-[var(--cd-ink)] font-medium">Persistent Storage</td>
                  <td className="py-2.5 px-4 text-right">
                    {baselineEstimate.breakdown.storage_modeled !== false ? (
                      `$${baselineEstimate.breakdown.storage.toFixed(2)}`
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Not Modeled</span>
                        <span className="text-[10px] text-[var(--cd-ink-faint)] italic max-w-[200px] truncate" title={baselineEstimate.breakdown.unmodeled_reasons?.storage}>
                          {baselineEstimate.breakdown.unmodeled_reasons?.storage || "capacity not specified"}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {proposedEstimate.breakdown.storage_modeled !== false ? (
                      `$${proposedEstimate.breakdown.storage.toFixed(2)}`
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Not Modeled</span>
                        <span className="text-[10px] text-[var(--cd-ink-faint)] italic max-w-[200px] truncate" title={proposedEstimate.breakdown.unmodeled_reasons?.storage}>
                          {proposedEstimate.breakdown.unmodeled_reasons?.storage || "capacity not specified"}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold">
                    {baselineEstimate.breakdown.storage_modeled !== false && proposedEstimate.breakdown.storage_modeled !== false ? (
                      (proposedEstimate.breakdown.storage - baselineEstimate.breakdown.storage) > 0
                        ? `+$${(proposedEstimate.breakdown.storage - baselineEstimate.breakdown.storage).toFixed(2)}`
                        : `$${(proposedEstimate.breakdown.storage - baselineEstimate.breakdown.storage).toFixed(2)}`
                    ) : (
                      <span className="text-[11px] text-[var(--cd-ink-faint)] font-normal italic">—</span>
                    )}
                  </td>
                </tr>

                {/* Network */}
                <tr>
                  <td className="py-2.5 px-4 font-sans text-[var(--cd-ink)] font-medium">Network Egress / Transfer</td>
                  <td className="py-2.5 px-4 text-right">
                    {baselineEstimate.breakdown.network_modeled !== false ? (
                      `$${baselineEstimate.breakdown.network.toFixed(2)}`
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Not Modeled</span>
                        <span className="text-[10px] text-[var(--cd-ink-faint)] italic max-w-[200px] truncate" title={baselineEstimate.breakdown.unmodeled_reasons?.network}>
                          {baselineEstimate.breakdown.unmodeled_reasons?.network || "explicit egress input required"}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {proposedEstimate.breakdown.network_modeled !== false ? (
                      `$${proposedEstimate.breakdown.network.toFixed(2)}`
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Not Modeled</span>
                        <span className="text-[10px] text-[var(--cd-ink-faint)] italic max-w-[200px] truncate" title={proposedEstimate.breakdown.unmodeled_reasons?.network}>
                          {proposedEstimate.breakdown.unmodeled_reasons?.network || "explicit egress input required"}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold">
                    {baselineEstimate.breakdown.network_modeled !== false && proposedEstimate.breakdown.network_modeled !== false ? (
                      (proposedEstimate.breakdown.network - baselineEstimate.breakdown.network) > 0
                        ? `+$${(proposedEstimate.breakdown.network - baselineEstimate.breakdown.network).toFixed(2)}`
                        : `$${(proposedEstimate.breakdown.network - baselineEstimate.breakdown.network).toFixed(2)}`
                    ) : (
                      <span className="text-[11px] text-[var(--cd-ink-faint)] font-normal italic">—</span>
                    )}
                  </td>
                </tr>

                {/* Total Monthly Row */}
                <tr className="bg-[var(--cd-surface)] font-bold border-t border-[var(--cd-border)]">
                  <td className="py-2.5 px-4 font-sans text-[var(--cd-ink)]">
                    {comparison.comparison_completeness === "COMPLETE"
                      ? "Modeled Monthly Total"
                      : "Modeled Monthly Total (Partial)"}
                  </td>
                  <td className="py-2.5 px-4 text-right">${baselineEstimate.monthly.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right">${proposedEstimate.monthly.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right">
                    {comparison.absolute_difference > 0 ? `+$${comparison.absolute_difference.toFixed(2)}` : `$${comparison.absolute_difference.toFixed(2)}`}
                  </td>
                </tr>
              </tbody>
            </table>
            {comparison.comparison_completeness === "PARTIAL" && (
              <div className="bg-[var(--cd-bg)] px-4 py-2 border-t border-[var(--cd-border-soft)] text-[11px] text-[var(--cd-ink-soft)]">
                * Partial model: comparison reflects common modeled components ({comparison.common_modeled_components?.join(", ") || "none"}).
                Unmodeled components are excluded from the comparison delta.
              </div>
            )}
          </div>

          {/* Classified Assumptions Ledger */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--cd-ink)]">
              Classified Assumptions & Provenance
            </span>
            <div className="rounded-xl border border-[var(--cd-border-soft)] overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-[var(--cd-bg)] border-b border-[var(--cd-border-soft)] text-[10px] font-mono uppercase text-[var(--cd-ink-soft)]">
                  <tr>
                    <th className="py-2 px-4 text-left">Parameter</th>
                    <th className="py-2 px-4 text-left">Assumed Value</th>
                    <th className="py-2 px-4 text-left">Classification</th>
                    <th className="py-2 px-4 text-left">Provenance Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cd-border-soft)]">
                  {baselineEstimate.assumptions_classified.map((a, idx) => (
                    <tr key={idx} className="hover:bg-[var(--cd-surface)]/50">
                      <td className="py-2 px-4 font-medium text-[var(--cd-ink)]">{a.field}</td>
                      <td className="py-2 px-4 font-mono text-[var(--cd-ink)]">{a.value}</td>
                      <td className="py-2 px-4">
                        <AssumptionTypeBadge type={a.type} />
                      </td>
                      <td className="py-2 px-4 text-[11px] text-[var(--cd-ink-soft)]">{a.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transparent Formulas Accordion */}
          <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFormulas(!showFormulas)}
              className="w-full px-4 py-3 text-left flex items-center justify-between text-xs font-semibold text-[var(--cd-ink)] hover:bg-[var(--cd-surface)]/50 transition-colors"
            >
              <span>Calculation Formulas & Unit Rates</span>
              {showFormulas ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {showFormulas && (
              <div className="p-4 pt-0 space-y-2 text-xs font-mono border-t border-[var(--cd-border-soft)]">
                {Object.entries(baselineEstimate.formulas).map(([key, formula]) => (
                  <div key={key} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 py-1 border-b border-[var(--cd-border-soft)]/50">
                    <span className="text-[10px] uppercase font-bold text-[var(--cd-ink-faint)] w-28 shrink-0">
                      {key}
                    </span>
                    <span className="text-[11px] text-[var(--cd-ink)] break-all">{formula}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Validation Path & Limitations */}
          <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowValidationPath(!showValidationPath)}
              className="w-full px-4 py-3 text-left flex items-center justify-between text-xs font-semibold text-[var(--cd-ink)] hover:bg-[var(--cd-surface)]/50 transition-colors"
            >
              <span>Model Limitations & Empirical Validation Path ({baselineEstimate.validation_path.length} steps)</span>
              {showValidationPath ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {showValidationPath && (
              <div className="p-4 pt-0 space-y-3 text-xs border-t border-[var(--cd-border-soft)]">
                <div>
                  <span className="text-[11px] font-bold text-[var(--cd-ink)] uppercase tracking-wider block mb-1.5">
                    Model Limitations:
                  </span>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-[var(--cd-ink-soft)]">
                    {baselineEstimate.limitations.map((lim, idx) => (
                      <li key={idx}>{lim}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-[var(--cd-ink)] uppercase tracking-wider block mb-1.5">
                    Recommended Empirical Validation Steps:
                  </span>
                  <ol className="list-decimal pl-5 space-y-1 text-[11px] text-[var(--cd-ink-soft)]">
                    {baselineEstimate.validation_path.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
