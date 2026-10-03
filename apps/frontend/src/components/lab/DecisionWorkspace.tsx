import { useState } from "react";
import {
  FileCheck2,
  Plus,
  Search,
  User,
  FlaskConical,
  ArrowRight,
  Shield,
  FileText,
  Clock,
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

interface DecisionWorkspaceProps {
  decisions: DecisionRecord[];
  hypotheses: Hypothesis[];
  experiments: Experiment[];
  evidence: EvidenceItem[];
  onOpenRecordDecision: (hypothesisId?: number) => void;
  onNavigateToHypothesis?: (hypothesisId: number) => void;
}

export function DecisionWorkspace({
  decisions,
  hypotheses,
  experiments,
  evidence,
  onOpenRecordDecision,
  onNavigateToHypothesis,
}: DecisionWorkspaceProps) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDecisions = decisions.filter((d) => {
    if (statusFilter !== "ALL" && d.decision !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hyp = hypotheses.find((h) => h.id === d.hypothesis_id);
      const matchesRationale = d.rationale.toLowerCase().includes(q);
      const matchesMaker = d.decision_maker?.toLowerCase().includes(q);
      const matchesHyp = hyp?.title.toLowerCase().includes(q);
      return matchesRationale || matchesMaker || matchesHyp;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2.5 text-white font-semibold text-lg">
            <FileCheck2 className="w-5 h-5 text-emerald-400" />
            Architectural Decision Records (ADR)
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Immutable log of architectural evaluations, trade-off rationales, and accepted or rejected interventions.
          </p>
        </div>
        <button
          onClick={() => onOpenRecordDecision()}
          disabled={hypotheses.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-500/10 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Record Decision
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(["ALL", "ACCEPT", "REJECT", "DEFER", "NEEDS_VALIDATION"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {st === "ALL" ? "All Decisions" : st.replace("_", " ")}
              <span className="ml-1.5 text-[10px] opacity-70">
                ({st === "ALL" ? decisions.length : decisions.filter((d) => d.decision === st).length})
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search decisions, rationale..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Decision Records List */}
      {filteredDecisions.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/30 border border-slate-800/60 rounded-xl">
          <FileCheck2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No Architectural Decisions Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            {searchQuery || statusFilter !== "ALL"
              ? "No decision records match your active search filters."
              : "Formulate a hypothesis, evaluate proposed structural interventions, and formalize an Architectural Decision Record."}
          </p>
          {hypotheses.length > 0 && !searchQuery && (
            <button
              onClick={() => onOpenRecordDecision()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Record First Decision
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDecisions.map((record) => {
            const hyp = hypotheses.find((h) => h.id === record.hypothesis_id);
            const exp = record.experiment_id ? experiments.find((e) => e.id === record.experiment_id) : null;
            const inv =
              record.selected_intervention_id && hyp
                ? hyp.interventions.find((i) => i.id === record.selected_intervention_id)
                : null;
            const supportingEv = evidence.filter((ev) =>
              record.supporting_evidence_ids?.includes(ev.id)
            );

            return (
              <div
                key={record.id}
                className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700/80 transition-all shadow-sm"
              >
                {/* Header Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-900/90 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <DecisionStatusBadge status={record.decision} />
                    <span className="text-xs font-mono text-slate-500">ADR-{record.id}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    {record.decision_maker && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-300 font-medium">{record.decision_maker}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(record.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-4">
                  {/* Linked Hypothesis */}
                  {hyp && (
                    <div className="flex items-start justify-between gap-3 p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
                          Subject Hypothesis
                        </div>
                        <div className="text-sm font-medium text-white flex items-center gap-2">
                          <span className="truncate">{hyp.title}</span>
                          <HypothesisStatusBadge status={hyp.status} />
                        </div>
                      </div>
                      {onNavigateToHypothesis && (
                        <button
                          onClick={() => onNavigateToHypothesis(hyp.id)}
                          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium flex-shrink-0"
                        >
                          View <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Evaluated Intervention (if selected) */}
                  {inv && (
                    <div className="p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                          Selected Intervention:
                        </span>
                        <InterventionTypeBadge type={inv.intervention_type} />
                      </div>
                      <div className="text-xs font-medium text-indigo-200">{inv.title}</div>
                      {inv.target_component_ids && inv.target_component_ids.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {inv.target_component_ids.map((comp: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-[10px] font-mono bg-indigo-950/60 border border-indigo-800 text-indigo-300 rounded"
                            >
                              {comp}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Corroborating Experiment (if selected) */}
                  {exp && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 p-2.5 bg-slate-950/40 border border-slate-800/60 rounded-lg">
                      <FlaskConical className="w-4 h-4 text-purple-400" />
                      <span className="text-slate-500">Corroborating Experiment:</span>
                      <span className="text-slate-200 font-medium">{exp.name}</span>
                      <ExperimentStatusBadge status={exp.status} />
                    </div>
                  )}

                  {/* Rationale Statement */}
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      Engineering Rationale & Trade-offs
                    </div>
                    <div className="p-3.5 bg-slate-950/80 border border-slate-800/90 rounded-lg text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                      {record.rationale}
                    </div>
                  </div>

                  {/* Supporting Evidence Chips */}
                  {supportingEv.length > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-slate-500" />
                        Supporting Evidence ({supportingEv.length})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {supportingEv.map((ev) => (
                          <div
                            key={ev.id}
                            className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <EvidenceCategoryBadge category={ev.category} />
                              {ev.confidence !== undefined && ev.confidence !== null && (
                                <span className="text-[10px] text-slate-500">
                                  {Math.round(ev.confidence * 100)}% conf
                                </span>
                              )}
                            </div>
                            <div className="font-medium text-slate-300 truncate">{ev.subject}</div>
                            <div className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                              {ev.claim}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
