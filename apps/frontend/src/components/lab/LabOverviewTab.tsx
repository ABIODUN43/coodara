import {
  ArrowRight,
  Database,
  FileCheck2,
  FlaskConical,
  Layers,
  Plus,
  Sliders,
  Sparkles,
} from "lucide-react";
import type {
  DecisionRecord,
  EvidenceItem,
  Experiment,
  Hypothesis,
  LabOverviewResponse,
  ResourceProfile,
  WorkloadProfile,
} from "@/types/lab";
import {
  DecisionStatusBadge,
  EvidenceCategoryBadge,
  ExperimentStatusBadge,
  HypothesisStatusBadge,
  WorkloadMeasurementBadge,
} from "./LabBadges";

interface LabOverviewTabProps {
  overview: LabOverviewResponse | null;
  hypotheses: Hypothesis[];
  experiments: Experiment[];
  workloadProfiles: WorkloadProfile[];
  resourceProfiles: ResourceProfile[];
  evidence: EvidenceItem[];
  decisions: DecisionRecord[];
  onSelectHypothesis: (h: Hypothesis) => void;
  onNavigateTab: (tab: "hypotheses" | "experiments" | "workloads" | "evidence" | "decisions") => void;
  onOpenNewHypothesis: () => void;
}

export function LabOverviewTab({
  overview,
  hypotheses,
  experiments,
  workloadProfiles,
  resourceProfiles,
  evidence,
  decisions,
  onSelectHypothesis,
  onNavigateTab,
  onOpenNewHypothesis,
}: LabOverviewTabProps) {
  const activeHypotheses = hypotheses.filter(
    (h) => h.status === "DRAFT" || h.status === "READY" || h.status === "RUNNING"
  );
  const activeExperiments = experiments.filter(
    (e) => e.status === "READY" || e.status === "RUNNING"
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--cd-ink)]">
            Architectural Economics Intelligence Workspace
          </h2>
          <p className="text-xs text-[var(--cd-ink-soft)] mt-0.5 max-w-3xl">
            Evaluate structural refactorings and boundary changes through falsifiable hypotheses,
            comparative experiments, and a durable evidence ledger.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewHypothesis}
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors shadow-xs self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Hypothesis</span>
        </button>
      </div>

      {/* 2. Key Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => onNavigateTab("hypotheses")}
          className="cursor-pointer rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4 space-y-1 hover:border-[var(--cd-accent)] transition-all shadow-2xs"
        >
          <div className="flex items-center justify-between text-xs text-[var(--cd-ink-soft)]">
            <span>Hypotheses</span>
            <Sliders className="h-4 w-4 text-[var(--cd-accent)]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--cd-ink)]">
            {overview?.hypotheses_count ?? hypotheses.length}
          </div>
          <p className="text-[11px] text-[var(--cd-ink-faint)]">
            {activeHypotheses.length} active investigations
          </p>
        </div>

        <div
          onClick={() => onNavigateTab("experiments")}
          className="cursor-pointer rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4 space-y-1 hover:border-[var(--cd-accent)] transition-all shadow-2xs"
        >
          <div className="flex items-center justify-between text-xs text-[var(--cd-ink-soft)]">
            <span>Experiments</span>
            <Layers className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--cd-ink)]">
            {overview?.experiments_count ?? experiments.length}
          </div>
          <p className="text-[11px] text-[var(--cd-ink-faint)]">
            {activeExperiments.length} ready / configured
          </p>
        </div>

        <div
          onClick={() => onNavigateTab("evidence")}
          className="cursor-pointer rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4 space-y-1 hover:border-[var(--cd-accent)] transition-all shadow-2xs"
        >
          <div className="flex items-center justify-between text-xs text-[var(--cd-ink-soft)]">
            <span>Evidence Items</span>
            <FlaskConical className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--cd-ink)]">
            {overview?.evidence_count ?? evidence.length}
          </div>
          <p className="text-[11px] text-[var(--cd-ink-faint)]">
            Durable audit ledger
          </p>
        </div>

        <div
          onClick={() => onNavigateTab("decisions")}
          className="cursor-pointer rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4 space-y-1 hover:border-[var(--cd-accent)] transition-all shadow-2xs"
        >
          <div className="flex items-center justify-between text-xs text-[var(--cd-ink-soft)]">
            <span>Decisions (ADRs)</span>
            <FileCheck2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--cd-ink)]">
            {overview?.decisions_count ?? decisions.length}
          </div>
          <p className="text-[11px] text-[var(--cd-ink-faint)]">
            Recorded engineering decisions
          </p>
        </div>
      </div>

      {/* 3. Empty State or Active Investigations Grid */}
      {hypotheses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--cd-border)] bg-[var(--cd-surface)]/50 p-12 text-center">
          <FlaskConical className="h-12 w-12 text-[var(--cd-accent)]/60 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[var(--cd-ink)]">
            No Architectural Hypotheses Yet
          </h3>
          <p className="mt-1 text-xs text-[var(--cd-ink-soft)] max-w-md mx-auto">
            Formulate your first falsifiable engineering hypothesis to explore decoupling, service
            extraction, or dependency reorganization.
          </p>
          <button
            type="button"
            onClick={onOpenNewHypothesis}
            className="mt-5 cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Formulate First Hypothesis</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main 2 Cols: Active Hypotheses & Experiments */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Hypotheses List */}
            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] overflow-hidden shadow-2xs">
              <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-[var(--cd-accent)]" />
                  <h3 className="text-xs font-semibold text-[var(--cd-ink)] uppercase tracking-wider">
                    Active Architectural Hypotheses
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab("hypotheses")}
                  className="cursor-pointer text-xs text-[var(--cd-accent)] hover:underline inline-flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="divide-y divide-[var(--cd-border-soft)]">
                {hypotheses.slice(0, 5).map((hyp) => (
                  <div
                    key={hyp.id}
                    onClick={() => onSelectHypothesis(hyp)}
                    className="p-4 hover:bg-[var(--cd-sunken)]/50 transition-colors cursor-pointer space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--cd-ink)] hover:text-[var(--cd-accent)] transition-colors">
                          {hyp.title}
                        </h4>
                        <p className="text-xs text-[var(--cd-ink-soft)] font-mono mt-0.5 line-clamp-1">
                          Q: {hyp.question}
                        </p>
                      </div>
                      <HypothesisStatusBadge status={hyp.status} />
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-[var(--cd-ink-faint)]">
                      <span>{hyp.interventions?.length || 0} proposed interventions</span>
                      <span>•</span>
                      <span>Created {new Date(hyp.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Experiments Status & Notice */}
            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-500" />
                  <h3 className="text-xs font-semibold text-[var(--cd-ink)] uppercase tracking-wider">
                    Experimentation State
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab("experiments")}
                  className="cursor-pointer text-xs text-[var(--cd-accent)] hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Experiments</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {experiments.length === 0 ? (
                <div className="rounded-lg bg-[var(--cd-sunken)] p-4 text-xs text-[var(--cd-ink-soft)] space-y-1">
                  <p className="font-semibold text-[var(--cd-ink)]">No experiments configured yet</p>
                  <p className="text-[11px] text-[var(--cd-ink-faint)]">
                    Create an experiment under a hypothesis to define a baseline vs proposed architecture comparison.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {experiments.slice(0, 3).map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-bg)]"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-[var(--cd-ink)]">{exp.name}</div>
                        <div className="text-[11px] text-[var(--cd-ink-faint)]">
                          {exp.runs?.length || 0} evaluation runs recorded
                        </div>
                      </div>
                      <ExperimentStatusBadge status={exp.status} />
                    </div>
                  ))}
                </div>
              )}

              {/* Explicit Scope Boundary Banner */}
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-900 dark:text-blue-200">
                <div className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Level 1 &mdash; Structural Pre-Flight Simulation</span>
                </div>
                <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 mt-1">
                  Level 1 evaluates predicted topological graph impact against the architecture model. Code-based experimentation (Level 2) and live telemetry (Level 3) are scheduled for subsequent phases. No synthetic results are fabricated.
                </p>
              </div>
            </div>
          </div>

          {/* Right Rail: Workloads & Decisions */}
          <div className="space-y-6">
            {/* Workload & Resource Profiles Summary */}
            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-xs font-semibold text-[var(--cd-ink)] uppercase tracking-wider">
                    Workload & Sizing Assumptions
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab("workloads")}
                  className="cursor-pointer text-xs text-[var(--cd-accent)] hover:underline inline-flex items-center gap-1"
                >
                  <span>Edit</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {workloadProfiles.length === 0 ? (
                <div className="text-xs text-[var(--cd-ink-faint)] italic">
                  No workload profile defined. Using default steady-state baseline assumptions.
                </div>
              ) : (
                <div className="space-y-3">
                  {workloadProfiles.slice(0, 2).map((wp) => (
                    <div
                      key={wp.id}
                      className="p-3 rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[var(--cd-ink)]">{wp.name}</span>
                        <WorkloadMeasurementBadge isMeasured={wp.is_measured} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--cd-ink-soft)] font-mono">
                        <div>RPS: {wp.requests_per_second ?? "N/A"}</div>
                        <div>Concurrency: {wp.concurrency ?? "N/A"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {resourceProfiles.length > 0 && (
                <div className="text-[11px] text-[var(--cd-ink-soft)] font-mono pt-1 border-t border-[var(--cd-border-soft)]">
                  {resourceProfiles.length} resource profile{resourceProfiles.length === 1 ? "" : "s"} configured
                </div>
              )}
            </div>

            {/* Recent Decisions (ADRs) */}
            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-indigo-500" />
                  <h3 className="text-xs font-semibold text-[var(--cd-ink)] uppercase tracking-wider">
                    Recent Decisions
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab("decisions")}
                  className="cursor-pointer text-xs text-[var(--cd-accent)] hover:underline inline-flex items-center gap-1"
                >
                  <span>All ADRs</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {decisions.length === 0 ? (
                <div className="text-xs text-[var(--cd-ink-faint)] italic">
                  No architecture decisions recorded yet. Decisions capture human engineering rationale backed by evidence.
                </div>
              ) : (
                <div className="space-y-3">
                  {decisions.slice(0, 3).map((dec) => (
                    <div
                      key={dec.id}
                      className="p-3 rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[var(--cd-ink-soft)]">
                          {dec.decision_maker || "Lead Architect"}
                        </span>
                        <DecisionStatusBadge status={dec.decision} />
                      </div>
                      <p className="text-xs text-[var(--cd-ink)] line-clamp-2">
                        {dec.rationale}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Evidence Items */}
            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-purple-500" />
                  <h3 className="text-xs font-semibold text-[var(--cd-ink)] uppercase tracking-wider">
                    Recent Evidence
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab("evidence")}
                  className="cursor-pointer text-xs text-[var(--cd-accent)] hover:underline inline-flex items-center gap-1"
                >
                  <span>Ledger</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {evidence.length === 0 ? (
                <div className="text-xs text-[var(--cd-ink-faint)] italic">
                  Evidence ledger is empty. Evidence will be logged from static analysis, observed topology, or benchmark runs.
                </div>
              ) : (
                <div className="space-y-2">
                  {evidence.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className="p-2.5 rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-medium text-[var(--cd-ink)] truncate max-w-[160px]">
                          {ev.subject}
                        </span>
                        <EvidenceCategoryBadge category={ev.category} />
                      </div>
                      <p className="text-[11px] text-[var(--cd-ink-soft)] line-clamp-2">
                        {ev.claim}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
