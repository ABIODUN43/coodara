import { useEffect, useState } from "react";
import { AlertCircle, Plus, Sliders, Sparkles, X } from "lucide-react";
import type { HypothesisCreateRequest, HypothesisStatus } from "@/types/lab";

interface HypothesisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: HypothesisCreateRequest) => Promise<void>;
  prefillData?: {
    findingId?: string;
    findingTitle?: string;
    findingCategory?: string;
    primaryComponent?: string;
    severity?: string;
  } | null;
}

export function HypothesisModal({
  isOpen,
  onClose,
  onSubmit,
  prefillData,
}: HypothesisModalProps) {
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<HypothesisStatus>("DRAFT");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefillData?.findingTitle) {
      setTitle(`Remediate finding: ${prefillData.findingTitle}`);
      setQuestion(
        `Will addressing ${prefillData.findingCategory || "structural risk"} in ${
          prefillData.primaryComponent || "target component"
        } reduce coupling without increasing latency?`
      );
      setDescription(
        `Investigating architectural violation detected in finding ${prefillData.findingId || ""}. Severity: ${
          prefillData.severity || "medium"
        }. Grounded in static AST analysis.`
      );
      setStatus("READY");
    } else {
      setTitle("");
      setQuestion("");
      setDescription("");
      setStatus("DRAFT");
    }
  }, [prefillData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a hypothesis title.");
      return;
    }
    if (!question.trim()) {
      setError("Please provide a falsifiable engineering question.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        title: title.trim(),
        question: question.trim(),
        description: description.trim() || undefined,
        status,
      });
      onClose();
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "Failed to create hypothesis.";
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
            <Sliders className="h-4 w-4 text-[var(--cd-accent)]" />
            <h2 className="text-base font-bold text-[var(--cd-ink)]">
              Formulate Architectural Hypothesis
            </h2>
          </div>
          <p className="text-xs text-[var(--cd-ink-soft)]">
            State a falsifiable engineering proposition to evaluate trade-offs before executing code changes.
          </p>
        </div>

        {prefillData?.findingTitle && (
          <div className="mb-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Context from Finding: {prefillData.findingTitle}</span>
              {prefillData.primaryComponent && (
                <div className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                  Target component: {prefillData.primaryComponent}
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--cd-ink)]">
              Hypothesis Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Decouple billing module from authentication layer"
              className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
              required
            />
          </div>

          {/* Falsifiable Question */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--cd-ink)]">
                Falsifiable Engineering Question <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-[var(--cd-ink-faint)]">
                Must be testable against baseline
              </span>
            </div>
            <textarea
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Will splitting the shared authentication component reduce coupling between the API and frontend without introducing additional critical dependencies?"
              className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 font-mono text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--cd-ink)]">
              Background & Architectural Rationale
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the current architectural bottleneck, affected boundaries, and why this hypothesis was raised..."
              className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
            />
          </div>

          {/* Initial Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--cd-ink)]">
              Initial Lifecycle State
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as HypothesisStatus)}
              className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
            >
              <option value="DRAFT">DRAFT (Formulating problem and boundaries)</option>
              <option value="READY">READY (Ready for intervention design and experiments)</option>
            </select>
          </div>

          {/* Action buttons */}
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
              <span>{isSubmitting ? "Creating..." : "Save Hypothesis"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
