import { useState } from "react";
import {
  ChevronRight,
  FileCheck2,
  Plus,
  Sliders,
  Trash2,
} from "lucide-react";
import type {
  DecisionRecord,
  EvidenceItem,
  Experiment,
  Hypothesis,
} from "@/types/lab";
import {
  DecisionStatusBadge,
  EvidenceCategoryBadge,
  ExperimentStatusBadge,
  HypothesisStatusBadge,
  InterventionTypeBadge,
} from "./LabBadges";

interface HypothesisWorkspaceProps {
  hypotheses: Hypothesis[];
  selectedHypothesis: Hypothesis | null;
  onSelectHypothesis: (h: Hypothesis) => void;
  onOpenNewHypothesis: () => void;
  onOpenAddIntervention: (hypothesisId: number) => void;
  onOpenNewExperiment: (hypothesisId: number) => void;
  onOpenRecordDecision: (hypothesisId: number) => void;
  onDeleteHypothesis: (hypothesisId: number) => Promise<void>;
  experiments: Experiment[];
  evidence: EvidenceItem[];
  decisions: DecisionRecord[];
}

export function HypothesisWorkspace({
  hypotheses,
  selectedHypothesis,
  onSelectHypothesis,
  onOpenNewHypothesis,
  onOpenAddIntervention,
  onOpenNewExperiment,
  onOpenRecordDecision,
  onDeleteHypothesis,
  experiments,
  evidence,
  decisions,
}: HypothesisWorkspaceProps) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredHypotheses = hypotheses.filter((h) => {
    if (filterStatus !== "ALL" && h.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        h.title.toLowerCase().includes(q) ||
        h.question.toLowerCase().includes(q) ||
        (h.description && h.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const activeHypothesis = selectedHypothesis || hypotheses[0] || null;

  // Filter linked child items for currently active hypothesis
  const linkedInterventions = activeHypothesis?.interventions || [];
  const linkedExperiments = experiments.filter(
    (e) => activeHypothesis && e.hypothesis_id === activeHypothesis.id
  );
  const linkedEvidence = evidence.filter(
    (ev) => activeHypothesis && ev.hypothesis_id === activeHypothesis.id
  );
  const linkedDecision = decisions.find(
    (d) => activeHypothesis && d.hypothesis_id === activeHypothesis.id
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
      {/* Left Column: Hypotheses List (4 Cols) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[var(--cd-accent)]" />
            <h3 className="text-sm font-bold text-[var(--cd-ink)]">Hypotheses</h3>
            <span className="rounded-full bg-[var(--cd-sunken)] px-2 py-0.5 text-[11px] font-mono text-[var(--cd-ink-soft)]">
              {filteredHypotheses.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenNewHypothesis}
            className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-[var(--cd-accent)] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hypotheses..."
            className="flex-1 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-1.5 text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
          >
            <option value="ALL">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="READY">Ready</option>
            <option value="RUNNING">Running</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* List */}
        <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
          {filteredHypotheses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--cd-border)] p-8 text-center text-xs text-[var(--cd-ink-faint)]">
              No hypotheses match the current filter.
            </div>
          ) : (
            filteredHypotheses.map((hyp) => {
              const isSelected = activeHypothesis?.id === hyp.id;
              return (
                <div
                  key={hyp.id}
                  onClick={() => onSelectHypothesis(hyp)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    isSelected
                      ? "border-[var(--cd-accent)] bg-[var(--cd-surface)] shadow-sm ring-1 ring-[var(--cd-accent)]/20"
                      : "border-[var(--cd-border)] bg-[var(--cd-surface)] hover:border-[var(--cd-border-strong,var(--cd-border))]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-[var(--cd-ink)] leading-snug line-clamp-2">
                      {hyp.title}
                    </h4>
                    <HypothesisStatusBadge status={hyp.status} />
                  </div>

                  <p className="mt-1 text-[11px] font-mono text-[var(--cd-ink-soft)] line-clamp-2">
                    Q: {hyp.question}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--cd-ink-faint)] pt-2 border-t border-[var(--cd-border-soft)]">
                    <div className="flex items-center gap-2">
                      <span>{hyp.interventions?.length || 0} interventions</span>
                      <span>•</span>
                      <span>{new Date(hyp.created_at).toLocaleDateString()}</span>
                    </div>
                    {isSelected && (
                      <ChevronRight className="h-3.5 w-3.5 text-[var(--cd-accent)]" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Hypothesis Detail View (7 Cols) */}
      <div className="lg:col-span-7">
        {!activeHypothesis ? (
          <div className="rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-12 text-center text-xs text-[var(--cd-ink-soft)]">
            Select or formulate a hypothesis to inspect proposed architectural interventions and empirical evidence.
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 space-y-6 shadow-2xs">
            {/* Top Meta Bar */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--cd-border-soft)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-[var(--cd-ink-faint)]">
                    HYPOTHESIS #{activeHypothesis.id}
                  </span>
                  <HypothesisStatusBadge status={activeHypothesis.status} />
                </div>
                <h2 className="text-base font-bold text-[var(--cd-ink)] mt-1">
                  {activeHypothesis.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onDeleteHypothesis(activeHypothesis.id)}
                  className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Delete hypothesis"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            {/* Falsifiable Question Box */}
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Falsifiable Engineering Question
              </span>
              <p className="text-xs font-mono font-semibold text-[var(--cd-ink)] leading-relaxed">
                {activeHypothesis.question}
              </p>
            </div>

            {/* Description */}
            {activeHypothesis.description && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[var(--cd-ink)]">
                  Background Rationale
                </span>
                <p className="text-xs text-[var(--cd-ink-soft)] leading-relaxed whitespace-pre-wrap">
                  {activeHypothesis.description}
                </p>
              </div>
            )}

            {/* Section 1: Proposed Interventions */}
            <div className="space-y-3 pt-2 border-t border-[var(--cd-border-soft)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--cd-ink)]">
                    Proposed Architectural Interventions
                  </h3>
                  <p className="text-[11px] text-[var(--cd-ink-faint)]">
                    Structural mutations proposed for evaluation (not executed in production)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAddIntervention(activeHypothesis.id)}
                  className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-2.5 py-1.5 text-xs text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Intervention</span>
                </button>
              </div>

              {linkedInterventions.length === 0 ? (
                <div className="rounded-lg bg-[var(--cd-sunken)] p-4 text-xs text-[var(--cd-ink-faint)] italic">
                  No interventions declared yet. Add an intervention to specify structural changes (SPLIT, MERGE, REFACTOR).
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedInterventions.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--cd-ink)]">
                          {inv.title}
                        </span>
                        <InterventionTypeBadge type={inv.intervention_type} />
                      </div>

                      {inv.description && (
                        <p className="text-[11px] text-[var(--cd-ink-soft)]">{inv.description}</p>
                      )}

                      {inv.target_component_ids && inv.target_component_ids.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 text-[11px]">
                          <span className="text-[var(--cd-ink-faint)]">Targets:</span>
                          {inv.target_component_ids.map((cid) => (
                            <span
                              key={cid}
                              className="font-mono text-[10px] bg-[var(--cd-surface)] px-1.5 py-0.5 rounded border border-[var(--cd-border)] text-[var(--cd-ink)]"
                            >
                              {cid}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Associated Experiments */}
            <div className="space-y-3 pt-2 border-t border-[var(--cd-border-soft)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--cd-ink)]">
                    Comparative Experiments
                  </h3>
                  <p className="text-[11px] text-[var(--cd-ink-faint)]">
                    Baseline reference vs proposed architecture comparison
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenNewExperiment(activeHypothesis.id)}
                  className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-2.5 py-1.5 text-xs text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Experiment</span>
                </button>
              </div>

              {linkedExperiments.length === 0 ? (
                <div className="rounded-lg bg-[var(--cd-sunken)] p-4 text-xs text-[var(--cd-ink-faint)] italic">
                  No experiments defined for this hypothesis yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedExperiments.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-3.5 rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-[var(--cd-ink)]">{exp.name}</div>
                        <div className="text-[11px] text-[var(--cd-ink-soft)]">
                          {exp.runs?.length || 0} execution runs recorded
                        </div>
                      </div>
                      <ExperimentStatusBadge status={exp.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3: Grounded Evidence Items */}
            <div className="space-y-3 pt-2 border-t border-[var(--cd-border-soft)]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--cd-ink)]">
                  Supporting Evidence ({linkedEvidence.length})
                </h3>
              </div>

              {linkedEvidence.length === 0 ? (
                <div className="rounded-lg bg-[var(--cd-sunken)] p-4 text-xs text-[var(--cd-ink-faint)] italic">
                  No evidence items explicitly tagged to this hypothesis yet. Evidence in the durable ledger can be attached to support decisions.
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedEvidence.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[var(--cd-ink)]">
                          {ev.subject}
                        </span>
                        <EvidenceCategoryBadge category={ev.category} />
                      </div>
                      <p className="text-xs text-[var(--cd-ink-soft)]">{ev.claim}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 4: Architectural Decision Record (ADR) */}
            <div className="space-y-3 pt-2 border-t border-[var(--cd-border-soft)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--cd-ink)]">
                    Architectural Decision Record (ADR)
                  </h3>
                  <p className="text-[11px] text-[var(--cd-ink-faint)]">
                    Human engineering conclusion based on empirical evidence
                  </p>
                </div>
                {!linkedDecision && (
                  <button
                    type="button"
                    onClick={() => onOpenRecordDecision(activeHypothesis.id)}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors shadow-xs"
                  >
                    <FileCheck2 className="h-3.5 w-3.5" />
                    <span>Record Decision</span>
                  </button>
                )}
              </div>

              {linkedDecision ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-[var(--cd-ink)]">
                      Decision by: {linkedDecision.decision_maker || "Lead Architect"}
                    </span>
                    <DecisionStatusBadge status={linkedDecision.decision} />
                  </div>
                  <p className="text-xs text-[var(--cd-ink)] leading-relaxed">
                    {linkedDecision.rationale}
                  </p>
                  <div className="text-[10px] text-[var(--cd-ink-faint)] pt-1">
                    Recorded {new Date(linkedDecision.created_at).toLocaleDateString()}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-[var(--cd-sunken)] p-4 text-xs text-[var(--cd-ink-faint)] italic">
                  No decision recorded for this hypothesis yet. Once evidence is reviewed, record an ACCEPT, REJECT, DEFER, or NEEDS_VALIDATION decision.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
