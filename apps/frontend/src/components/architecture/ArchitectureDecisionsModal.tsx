import { useState, useEffect, useCallback } from "react";
import { Scroll, X, Plus, CheckCircle2, AlertCircle, Clock, Tag, User, ChevronRight, Layers, Sparkles } from "lucide-react";
import { getArchitectureDecisions, createArchitectureDecision } from "@/api/architecture";
import type { ArchitectureDecisionItem } from "@/types/architecture";

interface ArchitectureDecisionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string | number;
  repositoryId: string | number;
}

export function ArchitectureDecisionsModal({
  isOpen,
  onClose,
  orgId,
  repositoryId,
}: ArchitectureDecisionsModalProps) {
  const [decisions, setDecisions] = useState<ArchitectureDecisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContext, setNewContext] = useState("");
  const [newDecision, setNewDecision] = useState("");
  const [newAuthor, setNewAuthor] = useState("Lead Architect");
  const [saving, setSaving] = useState(false);

  const loadDecisions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getArchitectureDecisions(orgId, repositoryId);
      setDecisions(res.items);
      if (res.items.length > 0 && !selectedId) {
        setSelectedId(res.items[0].id);
      }
    } catch (err) {
      console.error("Failed to load ADRs", err);
    } finally {
      setLoading(false);
    }
  }, [orgId, repositoryId, selectedId]);

  useEffect(() => {
    if (isOpen) {
      void loadDecisions();
    }
  }, [isOpen, loadDecisions]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContext || !newDecision) return;
    try {
      setSaving(true);
      const created = await createArchitectureDecision(orgId, repositoryId, {
        title: newTitle,
        context: newContext,
        decision: newDecision,
        author: newAuthor,
        status: "accepted",
        consequences: [
          "Prevents layer leakage and decouples cross-domain dependencies.",
          "Establishes permanent architectural precedent in Coodara Memory.",
        ],
        tags: ["architecture", "standard", "modularity"],
      });
      setDecisions((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setIsCreating(false);
      setNewTitle("");
      setNewContext("");
      setNewDecision("");
    } catch (err) {
      console.error("Failed to create ADR", err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const activeDecision = decisions.find((d) => d.id === selectedId) || decisions[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] px-6 py-4 bg-[var(--cd-sunken)]/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Scroll className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-[var(--cd-ink)]">
                  Architectural Decision Records (ADRs)
                </h2>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  DECISION MEMORY
                </span>
              </div>
              <p className="text-[12px] text-[var(--cd-ink-soft)]">
                Permanent architectural context: why decisions were made, constraints, and consequences.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCreating && (
              <button
                onClick={() => setIsCreating(true)}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Record New ADR</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1.5 text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-[320px_1fr]">
          {/* Left Sidebar List */}
          <div className="border-r border-[var(--cd-border-soft)] overflow-y-auto p-3 space-y-2 bg-[var(--cd-sunken)]/20">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
              <span>Decision Log ({decisions.length})</span>
              <span>Status</span>
            </div>

            {loading ? (
              <div className="p-4 text-center text-[12px] text-[var(--cd-ink-faint)]">
                Loading ADR history...
              </div>
            ) : decisions.length === 0 ? (
              <div className="p-4 text-center text-[12px] text-[var(--cd-ink-faint)]">
                No ADRs recorded yet.
              </div>
            ) : (
              decisions.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setSelectedId(d.id);
                    setIsCreating(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedId === d.id && !isCreating
                      ? "border-[var(--cd-accent)] bg-[var(--cd-surface)] shadow-xs"
                      : "border-[var(--cd-border-soft)] hover:border-[var(--cd-border)] bg-[var(--cd-surface)]/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono text-[11px] font-bold text-[var(--cd-accent)]">
                      {d.id}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase ${
                        d.status === "accepted"
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                  <h4 className="text-[12.5px] font-bold text-[var(--cd-ink)] line-clamp-1">
                    {d.title}
                  </h4>
                  <div className="mt-1 flex items-center gap-2 text-[10.5px] text-[var(--cd-ink-faint)]">
                    <Clock className="h-3 w-3" />
                    <span>{d.decision_date}</span>
                    <span>&bull;</span>
                    <span>{d.author}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Right Main Panel */}
          <div className="overflow-y-auto p-6 bg-[var(--cd-surface)]">
            {isCreating ? (
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] pb-3">
                  <h3 className="text-[15px] font-bold text-[var(--cd-ink)]">
                    Record New Architectural Decision
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="text-[12px] text-[var(--cd-ink-faint)] hover:text-[var(--cd-ink)] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[var(--cd-ink)] mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Enforce Asynchronous Redis Queue for Notification Dispatch"
                    className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-2 text-[12.5px] text-[var(--cd-ink)] focus:border-[var(--cd-accent)] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-[var(--cd-ink)] mb-1">
                      Author / Decider
                    </label>
                    <input
                      type="text"
                      value={newAuthor}
                      onChange={(e) => setNewAuthor(e.target.value)}
                      className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-2 text-[12.5px] text-[var(--cd-ink)] focus:border-[var(--cd-accent)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[var(--cd-ink)] mb-1">
                      Status
                    </label>
                    <select className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-2 text-[12.5px] text-[var(--cd-ink)] focus:border-[var(--cd-accent)] focus:outline-none">
                      <option value="accepted">Accepted</option>
                      <option value="proposed">Proposed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[var(--cd-ink)] mb-1">
                    Context &amp; Problem Statement
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={newContext}
                    onChange={(e) => setNewContext(e.target.value)}
                    placeholder="Describe the structural problem or debt driving this decision..."
                    className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-2 text-[12.5px] text-[var(--cd-ink)] focus:border-[var(--cd-accent)] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[var(--cd-ink)] mb-1">
                    Decision
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={newDecision}
                    onChange={(e) => setNewDecision(e.target.value)}
                    placeholder="State the agreed architectural solution, boundary rule, or pattern..."
                    className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-2 text-[12.5px] text-[var(--cd-ink)] focus:border-[var(--cd-accent)] focus:outline-none font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="rounded-lg border border-[var(--cd-border)] px-4 py-2 text-[12px] font-medium text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[var(--cd-accent-hover)] cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{saving ? "Saving..." : "Save to Decision Memory"}</span>
                  </button>
                </div>
              </form>
            ) : activeDecision ? (
              <div className="space-y-5">
                {/* Title and metadata */}
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-mono text-[12px] font-black text-[var(--cd-accent)]">
                      {activeDecision.id}
                    </span>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                      {activeDecision.status}
                    </span>
                    <span className="text-[11px] text-[var(--cd-ink-faint)]">
                      Recorded on {activeDecision.decision_date}
                    </span>
                  </div>

                  <h2 className="text-[18px] font-bold text-[var(--cd-ink)]">
                    {activeDecision.title}
                  </h2>
                  <div className="flex items-center gap-1 text-[12px] text-[var(--cd-ink-faint)] mt-1">
                    <User className="h-3.5 w-3.5" />
                    <span>Decided by <b>{activeDecision.author}</b></span>
                  </div>
                </div>

                {/* Section 1: Context */}
                <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-sunken)]/40 p-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)] mb-1.5 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                    Context &amp; Driver
                  </h4>
                  <p className="text-[12.5px] leading-relaxed text-[var(--cd-ink)]">
                    {activeDecision.context}
                  </p>
                </div>

                {/* Section 2: Decision */}
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Architectural Decision
                  </h4>
                  <p className="text-[12.5px] leading-relaxed text-[var(--cd-ink)] font-medium">
                    {activeDecision.decision}
                  </p>
                </div>

                {/* Section 3: Consequences */}
                <div>
                  <h4 className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)] mb-2">
                    Consequences &amp; Trade-offs
                  </h4>
                  <div className="space-y-1.5">
                    {activeDecision.consequences.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-[12px] text-[var(--cd-ink-soft)] bg-[var(--cd-sunken)]/60 rounded-lg p-2.5 border border-[var(--cd-border-soft)]"
                      >
                        <ChevronRight className="h-3.5 w-3.5 text-[var(--cd-accent)] shrink-0 mt-0.5" />
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 4: Affected Components & Tags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="rounded-xl border border-[var(--cd-border-soft)] p-3 bg-[var(--cd-surface)]">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)] mb-2 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      Affected Components
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeDecision.affected_components.map((comp) => (
                        <span
                          key={comp}
                          className="font-mono text-[11px] bg-[var(--cd-sunken)] text-[var(--cd-ink)] px-2 py-0.5 rounded border border-[var(--cd-border-soft)]"
                        >
                          {comp}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--cd-border-soft)] p-3 bg-[var(--cd-surface)]">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)] mb-2 flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" />
                      Tags &amp; Categories
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeDecision.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center text-[13px] text-[var(--cd-ink-faint)]">
                Select an ADR from the left panel to inspect decision memory.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArchitectureDecisionsModal;
