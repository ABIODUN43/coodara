import type {
  DecisionStatus,
  EvidenceCategory,
  ExperimentStatus,
  HypothesisStatus,
  InterventionType,
} from "@/types/lab";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  HelpCircle,
  Layers,
  LineChart,
  MinusCircle,
  Radio,
  Sparkles,
  XCircle,
} from "lucide-react";

/**
 * Visual badge for Evidence Categories.
 * Strict taxonomy: STATIC, OBSERVED, MEASURED, MODELED, PROJECTED.
 */
export function EvidenceCategoryBadge({ category }: { category: EvidenceCategory }) {
  switch (category) {
    case "STATIC":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-purple-700 dark:text-purple-300 border border-purple-500/20">
          <Code2 className="h-3 w-3 text-purple-500" />
          <span>STATIC</span>
        </span>
      );
    case "OBSERVED":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-sky-700 dark:text-sky-300 border border-sky-500/20">
          <Radio className="h-3 w-3 text-sky-500" />
          <span>OBSERVED</span>
        </span>
      );
    case "MEASURED":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
          <Cpu className="h-3 w-3 text-emerald-500" />
          <span>MEASURED</span>
        </span>
      );
    case "MODELED":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-amber-700 dark:text-amber-300 border border-amber-500/20">
          <Layers className="h-3 w-3 text-amber-500" />
          <span>MODELED</span>
        </span>
      );
    case "PROJECTED":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-rose-700 dark:text-rose-300 border border-rose-500/20">
          <LineChart className="h-3 w-3 text-rose-500" />
          <span>PROJECTED</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--cd-sunken)] px-2 py-0.5 text-[11px] font-mono text-[var(--cd-ink-soft)]">
          {category}
        </span>
      );
  }
}

/**
 * Visual badge for Hypothesis Status.
 */
export function HypothesisStatusBadge({ status }: { status: HypothesisStatus }) {
  switch (status) {
    case "DRAFT":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--cd-sunken)] px-2 py-0.5 text-[11px] font-medium text-[var(--cd-ink-soft)] border border-[var(--cd-border-soft)]">
          <Clock className="h-3 w-3 text-[var(--cd-ink-faint)]" />
          <span>Draft</span>
        </span>
      );
    case "READY":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 border border-blue-500/20">
          <Sparkles className="h-3 w-3 text-blue-500" />
          <span>Ready</span>
        </span>
      );
    case "RUNNING":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300 border border-amber-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
          <span>Evaluating</span>
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          <span>Completed</span>
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300 border border-rose-500/20">
          <MinusCircle className="h-3 w-3 text-rose-500" />
          <span>Cancelled</span>
        </span>
      );
    default:
      return <span>{status}</span>;
  }
}

/**
 * Visual badge for Experiment Status.
 */
export function ExperimentStatusBadge({ status }: { status: ExperimentStatus }) {
  switch (status) {
    case "DRAFT":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--cd-sunken)] px-2 py-0.5 text-[11px] font-mono text-[var(--cd-ink-soft)]">
          DRAFT
        </span>
      );
    case "READY":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-blue-700 dark:text-blue-300 border border-blue-500/20">
          READY FOR RUN
        </span>
      );
    case "RUNNING":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-amber-700 dark:text-amber-300 border border-amber-500/20">
          RUNNING
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
          COMPLETED
        </span>
      );
    case "FAILED":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-rose-700 dark:text-rose-300 border border-rose-500/20">
          FAILED
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-500/10 px-2 py-0.5 text-[11px] font-mono text-slate-600 dark:text-slate-400">
          CANCELLED
        </span>
      );
    default:
      return <span>{status}</span>;
  }
}

/**
 * Visual badge for Decision Records.
 */
export function DecisionStatusBadge({ status }: { status: DecisionStatus }) {
  switch (status) {
    case "ACCEPT":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>ACCEPTED</span>
        </span>
      );
    case "REJECT":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-500/20">
          <XCircle className="h-3.5 w-3.5 text-rose-500" />
          <span>REJECTED</span>
        </span>
      );
    case "DEFER":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-500/20">
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          <span>DEFERRED</span>
        </span>
      );
    case "NEEDS_VALIDATION":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
          <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
          <span>NEEDS VALIDATION</span>
        </span>
      );
    default:
      return <span>{status}</span>;
  }
}

/**
 * Visual badge for Intervention Type.
 */
export function InterventionTypeBadge({ type }: { type: InterventionType }) {
  const configs: Record<InterventionType, { label: string; color: string }> = {
    REMOVE: { label: "REMOVE", color: "text-rose-600 bg-rose-500/10 border-rose-500/20" },
    BREAKING_REFACTOR: { label: "BREAKING REFACTOR", color: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
    COMPATIBLE_REFACTOR: { label: "COMPATIBLE REFACTOR", color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
    MOVE: { label: "MOVE", color: "text-teal-600 bg-teal-500/10 border-teal-500/20" },
    SPLIT: { label: "SPLIT", color: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20" },
    MERGE: { label: "MERGE", color: "text-violet-600 bg-violet-500/10 border-violet-500/20" },
  };

  const cfg = configs[type] || { label: type, color: "text-[var(--cd-ink)] bg-[var(--cd-sunken)] border-[var(--cd-border)]" };

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-mono font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

/**
 * Workload assumption vs measured tag.
 */
export function WorkloadMeasurementBadge({ isMeasured }: { isMeasured: boolean }) {
  if (isMeasured) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        <span>MEASURED TELEMETRY</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-700 dark:text-amber-300 border border-amber-500/20">
      <AlertTriangle className="h-3 w-3 text-amber-500" />
      <span>MODELED ASSUMPTION</span>
    </span>
  );
}

/**
 * Assumption type badge (ASSUMED, MEASURED, OBSERVED, MODELED).
 */
export function AssumptionTypeBadge({
  type,
}: {
  type: "ASSUMED" | "MEASURED" | "OBSERVED" | "MODELED" | string;
}) {
  switch (type) {
    case "MEASURED":
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
          MEASURED
        </span>
      );
    case "OBSERVED":
      return (
        <span className="inline-flex items-center gap-1 rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-sky-700 dark:text-sky-300 border border-sky-500/20">
          OBSERVED
        </span>
      );
    case "ASSUMED":
      return (
        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-amber-700 dark:text-amber-300 border border-amber-500/20">
          ASSUMED
        </span>
      );
    case "MODELED":
      return (
        <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-purple-700 dark:text-purple-300 border border-purple-500/20">
          MODELED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded bg-neutral-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-neutral-600 dark:text-neutral-400">
          {type}
        </span>
      );
  }
}

