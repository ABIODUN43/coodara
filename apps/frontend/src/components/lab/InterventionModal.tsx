import { useState } from "react";
import { AlertCircle, Layers, Plus, X } from "lucide-react";
import type { InterventionCreateRequest, InterventionType } from "@/types/lab";

interface InterventionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: InterventionCreateRequest) => Promise<void>;
  hypothesisTitle: string;
  availableComponents: Array<{ id: string; name: string; type?: string }>;
}

const INTERVENTION_TYPE_OPTIONS: Array<{
  type: InterventionType;
  label: string;
  description: string;
}> = [
  {
    type: "COMPATIBLE_REFACTOR",
    label: "Compatible Refactor",
    description: "Refactor internal component implementation while preserving existing public contracts.",
  },
  {
    type: "BREAKING_REFACTOR",
    label: "Breaking Refactor",
    description: "Alter boundaries or public APIs, requiring call-site synchronization across modules.",
  },
  {
    type: "SPLIT",
    label: "Split Component",
    description: "Divide an overburdened or god component into smaller, high-cohesion subcomponents.",
  },
  {
    type: "MERGE",
    label: "Merge Components",
    description: "Combine tightly coupled chatter-heavy components into a unified module boundary.",
  },
  {
    type: "MOVE",
    label: "Move Component",
    description: "Relocate a component or service to a different subsystem or architectural layer.",
  },
  {
    type: "REMOVE",
    label: "Remove / Eliminate",
    description: "Decommission an obsolete component, cyclic dependency adapter, or dead abstraction.",
  },
];

export function InterventionModal({
  isOpen,
  onClose,
  onSubmit,
  hypothesisTitle,
  availableComponents,
}: InterventionModalProps) {
  const [interventionType, setInterventionType] = useState<InterventionType>("COMPATIBLE_REFACTOR");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [customComponentInput, setCustomComponentInput] = useState("");
  const [parametersJson, setParametersJson] = useState("{}");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleComponent = (componentId: string) => {
    setSelectedComponents((prev) =>
      prev.includes(componentId)
        ? prev.filter((id) => id !== componentId)
        : [...prev, componentId]
    );
  };

  const handleAddCustomComponent = () => {
    const trimmed = customComponentInput.trim();
    if (trimmed && !selectedComponents.includes(trimmed)) {
      setSelectedComponents((prev) => [...prev, trimmed]);
      setCustomComponentInput("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide an intervention title.");
      return;
    }

    let parsedParameters = {};
    try {
      if (parametersJson.trim()) {
        parsedParameters = JSON.parse(parametersJson);
      }
    } catch {
      setError("Parameters must be a valid JSON object.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        intervention_type: interventionType,
        title: title.trim(),
        description: description.trim() || undefined,
        target_component_ids: selectedComponents,
        parameters: parsedParameters,
      });
      onClose();
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "Failed to create intervention.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer absolute top-4 right-4 rounded-lg p-1.5 text-[var(--cd-ink-faint)] hover:text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="space-y-1 mb-5">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
              PROPOSED ARCHITECTURAL CHANGE (NOT EXECUTED)
            </span>
          </div>
          <h2 className="text-base font-bold text-[var(--cd-ink)]">
            Design Architectural Intervention
          </h2>
          <p className="text-xs text-[var(--cd-ink-soft)]">
            Linked to: <span className="font-semibold text-[var(--cd-ink)]">{hypothesisTitle}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Intervention Type Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--cd-ink)]">
              Intervention Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {INTERVENTION_TYPE_OPTIONS.map((opt) => {
                const isSelected = interventionType === opt.type;
                return (
                  <div
                    key={opt.type}
                    onClick={() => setInterventionType(opt.type)}
                    className={`cursor-pointer rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-[var(--cd-accent)] bg-[var(--cd-accent)]/5 shadow-2xs"
                        : "border-[var(--cd-border-soft)] bg-[var(--cd-bg)] hover:border-[var(--cd-border)]"
                    }`}
                  >
                    <div className="text-xs font-semibold text-[var(--cd-ink)]">
                      {opt.label}
                    </div>
                    <div className="text-[11px] text-[var(--cd-ink-soft)] mt-0.5">
                      {opt.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--cd-ink)]">
              Intervention Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Split OrderService into Command and Query responsibilities"
              className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
              required
            />
          </div>

          {/* 3. Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--cd-ink)]">
              Description & Proposed Boundaries
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the architectural transition, interface shifts, and boundary rules..."
              className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
            />
          </div>

          {/* 4. Target Architecture Components Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--cd-ink)]">
                Target Architecture Components
              </label>
              <span className="text-[11px] text-[var(--cd-ink-faint)]">
                {selectedComponents.length} selected
              </span>
            </div>

            {/* Existing components chips */}
            {availableComponents.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-bg)]">
                {availableComponents.map((comp) => {
                  const isSelected = selectedComponents.includes(comp.id);
                  return (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => handleToggleComponent(comp.id)}
                      className={`cursor-pointer inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-mono transition-colors ${
                        isSelected
                          ? "bg-[var(--cd-accent)] text-white font-medium"
                          : "bg-[var(--cd-surface)] text-[var(--cd-ink-soft)] border border-[var(--cd-border)] hover:bg-[var(--cd-sunken)]"
                      }`}
                    >
                      <Layers className="h-3 w-3" />
                      <span>{comp.name || comp.id}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom component input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customComponentInput}
                onChange={(e) => setCustomComponentInput(e.target.value)}
                placeholder="Or type component identifier or file path..."
                className="flex-1 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-1.5 text-xs font-mono text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
              />
              <button
                type="button"
                onClick={handleAddCustomComponent}
                className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-xs text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* 5. Parameters JSON */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--cd-ink)]">
                Configuration Parameters (Optional JSON)
              </label>
              <span className="text-[10px] text-[var(--cd-ink-faint)]">
                Key-value structural parameters
              </span>
            </div>
            <textarea
              rows={2}
              value={parametersJson}
              onChange={(e) => setParametersJson(e.target.value)}
              className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 font-mono text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
            />
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
              <span>{isSubmitting ? "Creating..." : "Declare Intervention"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
