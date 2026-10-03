import { useState, useEffect } from "react";
import {
  X,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import type {
  DecisionRecordCreateRequest,
  DecisionStatus,
  EvidenceItem,
  Experiment,
  Hypothesis,
  Intervention,
} from "@/types/lab";

interface DecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DecisionRecordCreateRequest) => Promise<void>;
  hypotheses: Hypothesis[];
  experiments: Experiment[];
  evidence: EvidenceItem[];
  preselectedHypothesisId?: number | null;
}

const DECISION_OPTIONS: Array<{
  value: DecisionStatus;
  label: string;
  icon: typeof CheckCircle2;
  color: string;
  desc: string;
}> = [
  {
    value: "ACCEPT",
    label: "Accept Intervention",
    icon: CheckCircle2,
    color: "emerald",
    desc: "Approve and adopt the proposed architectural intervention into the canonical baseline.",
  },
  {
    value: "REJECT",
    label: "Reject Intervention",
    icon: XCircle,
    color: "rose",
    desc: "Reject the intervention based on evidence, negative trade-offs, or prohibitive risk.",
  },
  {
    value: "DEFER",
    label: "Defer Decision",
    icon: Clock,
    color: "amber",
    desc: "Postpone decision to a future architectural milestone or sprint backlog.",
  },
  {
    value: "NEEDS_VALIDATION",
    label: "Needs Validation",
    icon: HelpCircle,
    color: "purple",
    desc: "Requires further empirical benchmark data or Stage 4 execution verification.",
  },
];

export function DecisionModal({
  isOpen,
  onClose,
  onSubmit,
  hypotheses,
  experiments,
  evidence,
  preselectedHypothesisId,
}: DecisionModalProps) {
  const [hypothesisId, setHypothesisId] = useState<number | "">("");
  const [decision, setDecision] = useState<DecisionStatus>("ACCEPT");
  const [rationale, setRationale] = useState("");
  const [selectedInterventionId, setSelectedInterventionId] = useState<number | "">("");
  const [experimentId, setExperimentId] = useState<number | "">("");
  const [supportingEvidenceIds, setSupportingEvidenceIds] = useState<number[]>([]);
  const [decisionMaker, setDecisionMaker] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedHypothesisId) {
      setHypothesisId(preselectedHypothesisId);
    } else if (hypotheses.length > 0 && !hypothesisId) {
      setHypothesisId(hypotheses[0].id);
    }
  }, [preselectedHypothesisId, hypotheses, hypothesisId]);

  if (!isOpen) return null;

  const currentHypothesis = hypotheses.find((h) => h.id === Number(hypothesisId));
  const availableInterventions: Intervention[] = currentHypothesis?.interventions || [];
  const availableExperiments: Experiment[] = experiments.filter(
    (e) => e.hypothesis_id === Number(hypothesisId)
  );
  const availableEvidence: EvidenceItem[] = evidence.filter(
    (ev) => !ev.hypothesis_id || ev.hypothesis_id === Number(hypothesisId)
  );

  const toggleEvidence = (evId: number) => {
    if (supportingEvidenceIds.includes(evId)) {
      setSupportingEvidenceIds(supportingEvidenceIds.filter((id) => id !== evId));
    } else {
      setSupportingEvidenceIds([...supportingEvidenceIds, evId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hypothesisId) {
      setError("Please select a target hypothesis.");
      return;
    }
    if (!rationale.trim() || rationale.trim().length < 15) {
      setError("Please provide a thorough rationale (at least 15 characters).");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        hypothesis_id: Number(hypothesisId),
        decision,
        rationale: rationale.trim(),
        selected_intervention_id: selectedInterventionId ? Number(selectedInterventionId) : undefined,
        experiment_id: experimentId ? Number(experimentId) : undefined,
        supporting_evidence_ids: supportingEvidenceIds,
        decision_maker: decisionMaker.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record decision.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Record Architectural Decision (ADR)</h2>
              <p className="text-xs text-slate-400">
                Formalize an engineering evaluation into an immutable Architecture Decision Record.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs text-rose-300 bg-rose-950/50 border border-rose-900/50 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Target Hypothesis */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Subject Hypothesis <span className="text-rose-400">*</span>
            </label>
            <select
              value={hypothesisId}
              onChange={(e) => {
                setHypothesisId(Number(e.target.value));
                setSelectedInterventionId("");
                setExperimentId("");
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              required
            >
              <option value="" disabled>Select a hypothesis</option>
              {hypotheses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title} ({h.status})
                </option>
              ))}
            </select>
          </div>

          {/* Decision Outcome Radio Cards */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Decision Outcome <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DECISION_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = decision === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDecision(opt.value)}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "bg-slate-800/90 border-indigo-500 shadow-sm shadow-indigo-500/10"
                        : "bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        opt.value === "ACCEPT"
                          ? "text-emerald-400"
                          : opt.value === "REJECT"
                          ? "text-rose-400"
                          : opt.value === "DEFER"
                          ? "text-amber-400"
                          : "text-purple-400"
                      }`}
                    />
                    <div>
                      <div className="text-xs font-medium text-white">{opt.label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Intervention & Linked Experiment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Evaluated Intervention
              </label>
              <select
                value={selectedInterventionId}
                onChange={(e) => setSelectedInterventionId(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">None / General Hypothesis</option>
                {availableInterventions.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    [{inv.intervention_type}] {inv.title}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">Specific proposed change evaluated.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Corroborating Experiment
              </label>
              <select
                value={experimentId}
                onChange={(e) => setExperimentId(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">None / Preliminary</option>
                {availableExperiments.map((exp) => (
                  <option key={exp.id} value={exp.id}>
                    {exp.name} ({exp.status})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">Linked experiment definition.</p>
            </div>
          </div>

          {/* Decision Rationale */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Engineering Rationale & Trade-offs <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Detail why this decision was reached: key architectural trade-offs, scalability consequences, migration risks, and team consensus..."
              rows={4}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none font-mono"
              required
            />
          </div>

          {/* Supporting Evidence Items Selection */}
          {availableEvidence.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Supporting Evidence Items ({supportingEvidenceIds.length} selected)
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-950/60 border border-slate-800 rounded-lg">
                {availableEvidence.map((ev) => {
                  const isChecked = supportingEvidenceIds.includes(ev.id);
                  return (
                    <label
                      key={ev.id}
                      className={`flex items-start gap-2.5 p-2 rounded cursor-pointer transition-colors text-xs ${
                        isChecked ? "bg-indigo-950/40 text-indigo-200" : "hover:bg-slate-900 text-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleEvidence(ev.id)}
                        className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-200 truncate">
                          [{ev.category}] {ev.subject}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{ev.claim}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Decision Maker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Decision Maker / Sign-off
            </label>
            <input
              type="text"
              value={decisionMaker}
              onChange={(e) => setDecisionMaker(e.target.value)}
              placeholder="e.g. Principal Architect / Architecture Review Board"
              className="w-full px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Notice */}
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg flex items-start gap-2.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">ADR Immutability: </span>
              Recorded decisions establish an indelible architecture decision record (ADR) linked to this repository's architectural intelligence graph.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
            >
              {submitting ? "Recording..." : "Record Decision"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
