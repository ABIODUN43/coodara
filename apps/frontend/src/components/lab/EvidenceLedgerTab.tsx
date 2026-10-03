import { useState } from "react";
import {
  Code2,
  Cpu,
  FlaskConical,
  Layers,
  LineChart,
  Plus,
  Radio,
  Search,
  X,
} from "lucide-react";
import type { EvidenceCategory, EvidenceItem, EvidenceItemCreateRequest, Hypothesis } from "@/types/lab";
import { EvidenceCategoryBadge } from "./LabBadges";

interface EvidenceLedgerTabProps {
  evidence: EvidenceItem[];
  hypotheses: Hypothesis[];
  onAddEvidenceItem: (payload: EvidenceItemCreateRequest) => Promise<EvidenceItem>;
}

export function EvidenceLedgerTab({
  evidence,
  hypotheses,
  onAddEvidenceItem,
}: EvidenceLedgerTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [category, setCategory] = useState<EvidenceCategory>("STATIC");
  const [sourceType, setSourceType] = useState("AST_GRAPH_ANALYZER");
  const [subject, setSubject] = useState("");
  const [claim, setClaim] = useState("");
  const [confidence, setConfidence] = useState<string>("0.95");
  const [hypothesisId, setHypothesisId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories: Array<{ id: string; label: string; icon: typeof FlaskConical }> = [
    { id: "ALL", label: "All Evidence", icon: FlaskConical },
    { id: "STATIC", label: "STATIC (AST & Graphs)", icon: Code2 },
    { id: "OBSERVED", label: "OBSERVED (Tracing & Topology)", icon: Radio },
    { id: "MEASURED", label: "MEASURED (Benchmarks)", icon: Cpu },
    { id: "MODELED", label: "MODELED (Simulations)", icon: Layers },
    { id: "PROJECTED", label: "PROJECTED (Economics)", icon: LineChart },
  ];

  const filteredEvidence = evidence.filter((item) => {
    if (selectedCategory !== "ALL" && item.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.subject.toLowerCase().includes(q) ||
        item.claim.toLowerCase().includes(q) ||
        item.source_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !claim.trim()) {
      setError("Please provide both subject and claim.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onAddEvidenceItem({
        category,
        source_type: sourceType.trim(),
        subject: subject.trim(),
        claim: claim.trim(),
        confidence: confidence ? parseFloat(confidence) : undefined,
        hypothesis_id: hypothesisId ? parseInt(hypothesisId, 10) : undefined,
        data: { manual_entry: true },
        provenance: { user_recorded: true, timestamp: new Date().toISOString() },
      });
      setShowAddModal(false);
      setSubject("");
      setClaim("");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to record evidence item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--cd-ink)] flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-purple-500" />
            <span>Durable Evidence Ledger</span>
          </h2>
          <p className="text-xs text-[var(--cd-ink-soft)] mt-0.5">
            Append-only record of architectural facts, empirical measurements, and modeled projections.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setShowAddModal(true);
          }}
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors shadow-xs self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Record Evidence</span>
        </button>
      </div>

      {/* Category Pills & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((c) => {
            const Icon = c.icon;
            const isSelected = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? "bg-[var(--cd-accent)] text-white shadow-xs"
                    : "bg-[var(--cd-surface)] text-[var(--cd-ink-soft)] border border-[var(--cd-border)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)]"
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--cd-ink-faint)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search claims or subjects..."
            className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] pl-8 pr-3 py-1.5 text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
          />
        </div>
      </div>

      {/* Evidence Table */}
      {filteredEvidence.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--cd-border)] bg-[var(--cd-surface)]/50 p-12 text-center text-xs text-[var(--cd-ink-soft)]">
          No evidence items match the selected category or search filter.
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] overflow-hidden shadow-2xs divide-y divide-[var(--cd-border-soft)]">
          {filteredEvidence.map((ev) => (
            <div key={ev.id} className="p-4 hover:bg-[var(--cd-sunken)]/40 transition-colors space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <EvidenceCategoryBadge category={ev.category} />
                  <span className="font-mono text-xs font-bold text-[var(--cd-ink)]">
                    {ev.subject}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--cd-ink-faint)]">
                  <span>Source: {ev.source_type}</span>
                  {typeof ev.confidence === "number" && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {(ev.confidence * 100).toFixed(0)}% confidence
                    </span>
                  )}
                  <span>{new Date(ev.recorded_at || ev.created_at).toLocaleString()}</span>
                </div>
              </div>

              <p className="text-xs text-[var(--cd-ink)] leading-relaxed">
                {ev.claim}
              </p>

              {ev.provenance && Object.keys(ev.provenance).length > 0 && (
                <div className="text-[10px] font-mono text-[var(--cd-ink-soft)] bg-[var(--cd-bg)] p-2 rounded border border-[var(--cd-border-soft)]">
                  Provenance: {JSON.stringify(ev.provenance)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Record Evidence Item */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="cursor-pointer absolute top-4 right-4 rounded-lg p-1.5 text-[var(--cd-ink-faint)] hover:text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-base font-bold text-[var(--cd-ink)] mb-1">
              Append Item to Evidence Ledger
            </h3>
            <p className="text-xs text-[var(--cd-ink-soft)] mb-4">
              Record a verified architectural fact, benchmark result, or simulation claim.
            </p>

            {error && (
              <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--cd-ink)]">
                  Evidence Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as EvidenceCategory)}
                  className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] font-mono"
                >
                  <option value="STATIC">STATIC (AST graph, coupling score, cyclomatic complexity)</option>
                  <option value="OBSERVED">OBSERVED (Distributed trace, commit pattern, repository topology)</option>
                  <option value="MEASURED">MEASURED (Empirical load benchmark, runtime profiling)</option>
                  <option value="MODELED">MODELED (Blast radius simulation, impact propagation)</option>
                  <option value="PROJECTED">PROJECTED (Forward capacity growth, economic projection)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--cd-ink)]">
                    Source Type
                  </label>
                  <input
                    type="text"
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value)}
                    placeholder="e.g. AST_PARSER"
                    className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--cd-ink)]">
                    Confidence (0.0 - 1.0)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={confidence}
                    onChange={(e) => setConfidence(e.target.value)}
                    className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--cd-ink)]">
                  Subject Identifier <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. auth_controller_cyclic_coupling"
                  className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--cd-ink)]">
                  Evidence Claim <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={claim}
                  onChange={(e) => setClaim(e.target.value)}
                  placeholder="State the verifiable claim or measured observation..."
                  className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)]"
                  required
                />
              </div>

              {hypotheses.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--cd-ink)]">
                    Tag to Hypothesis (Optional)
                  </label>
                  <select
                    value={hypothesisId}
                    onChange={(e) => setHypothesisId(e.target.value)}
                    className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)]"
                  >
                    <option value="">None (General repository evidence)</option>
                    {hypotheses.map((h) => (
                      <option key={h.id} value={h.id}>
                        #{h.id} - {h.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--cd-border-soft)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="cursor-pointer rounded-lg px-4 py-2 text-xs font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)]"
                >
                  <span>{isSubmitting ? "Logging..." : "Record in Ledger"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
