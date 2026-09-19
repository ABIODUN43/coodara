import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  GitBranch,
  FileCode2,
  AlertTriangle,
  CheckCircle2,
  Network,
  Code2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Layers,
  Activity,
  Zap,
} from "lucide-react";
import type {
  StructuredReasoningResult,
  ObservedItem,
  StructuralImpactItem,
  InferenceItem,
  UnknownItem,
  ReasoningConfidence,
  EvidenceItem,
  AlternativeOption,
  ActionItem,
} from "@/api/chat";
import { CoodaraMarkdown } from "./CoodaraMarkdown";

interface StructuredReasoningViewProps {
  data: StructuredReasoningResult;
  orgId?: number;
  repoId?: number | "all";
  onActionPrompt: (prompt: string) => void;
}

/**
 * 1. SummaryBlock: Executive 1-3 sentence direct answer with candidate disambiguation buttons
 */
export function SummaryBlock({
  summary,
  candidates,
  onSelectCandidate,
}: {
  summary: string;
  candidates?: string[];
  onSelectCandidate?: (candidate: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-3.5 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--cd-accent)]">
        <Sparkles className="h-3.5 w-3.5" />
        <span>Executive Summary</span>
      </div>
      <CoodaraMarkdown content={summary} className="text-[13px] font-medium text-[var(--cd-ink)]" />

      {candidates && candidates.length > 1 && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 mb-1.5 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Tied Highest-Coupling Coordinators (Select one to simulate):
          </div>
          <div className="flex flex-wrap gap-1.5">
            {candidates.map((cand, idx) => (
              <button
                key={idx}
                onClick={() => onSelectCandidate?.(cand.split("/").pop() || cand)}
                className="cursor-pointer rounded border border-amber-500/40 bg-[var(--cd-surface)] px-2.5 py-1 font-mono text-[11px] font-medium text-[var(--cd-ink)] hover:bg-[var(--cd-accent)] hover:text-white transition-colors"
                type="button"
              >
                {cand.split("/").pop()}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 2. ObservedBlock: Verified repository facts with provenance chips
 */
export function ObservedBlock({ items }: { items: ObservedItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-3.5 shadow-sm">
      <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-soft)]">
        <CheckCircle2 className="h-3.5 w-3.5 text-[var(--cd-good)]" />
        <span>Verified Repository Reality</span>
      </div>
      <div className="space-y-1.5">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded-lg bg-[var(--cd-sunken)] px-3 py-2 text-[12px]"
          >
            <div className="font-mono text-[var(--cd-ink)] flex-1">
              <CoodaraMarkdown content={item.statement} />
            </div>
            {item.evidence_ids && item.evidence_ids.length > 0 && (
              <span className="rounded bg-[var(--cd-accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--cd-accent)] ml-2">
                {item.evidence_ids.join(", ")}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 3. ImpactBlock: Direct vs indirect blast radius, BFS propagation paths, and cycle/boundary metrics
 */
export function ImpactBlock({ impacts }: { impacts: StructuralImpactItem[] }) {
  const directImpact = impacts.find(
    (i) => i.type === "direct" || i.statement.toLowerCase().includes("direct")
  );
  const indirectImpact = impacts.find(
    (i) => i.type === "indirect" || i.statement.toLowerCase().includes("indirect")
  );

  const directEntities = directImpact?.entity_ids || [];
  const indirectEntities = indirectImpact?.entity_ids || [];

  return (
    <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-3.5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-soft)]">
          <Layers className="h-3.5 w-3.5 text-rose-500" />
          <span>Structural Impact Analysis</span>
        </div>
        <span className="text-[11px] text-[var(--cd-ink-faint)]">
          BFS Unweighted Traversal
        </span>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-center">
          <div className="text-[18px] font-bold text-rose-600 dark:text-rose-400">
            {directEntities.length}
          </div>
          <div className="text-[10.5px] font-medium text-rose-700/80 dark:text-rose-300/80">
            Direct Broken Callers
          </div>
        </div>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-center">
          <div className="text-[18px] font-bold text-amber-600 dark:text-amber-400">
            {indirectEntities.length}
          </div>
          <div className="text-[10.5px] font-medium text-amber-700/80 dark:text-amber-300/80">
            Transitive Downstream
          </div>
        </div>
      </div>

      {/* Direct Dependents List */}
      {directEntities.length > 0 && (
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-[var(--cd-ink)]">
            Direct Dependents ({directEntities.length}):
          </div>
          <div className="flex flex-wrap gap-1.5">
            {directEntities.map((node, i) => (
              <span
                key={i}
                className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[11px] text-rose-700 dark:text-rose-300"
              >
                {node.split("/").pop()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Indirect Dependents List */}
      {indirectEntities.length > 0 && (
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-[var(--cd-ink)]">
            Indirect Downstream ({indirectEntities.length}):
          </div>
          <div className="flex flex-wrap gap-1.5">
            {indirectEntities.map((node, i) => (
              <span
                key={i}
                className="rounded-md border border-[var(--cd-border)] bg-[var(--cd-sunken)] px-2 py-0.5 font-mono text-[11px] text-[var(--cd-ink-soft)]"
              >
                {node.split("/").pop()}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 4. AlternativesBlock: Compare Remove vs Compatible Refactor
 */
export function AlternativesBlock({
  alternatives,
  targetComponent,
  onActionPrompt,
}: {
  alternatives: AlternativeOption[];
  targetComponent?: string | null;
  onActionPrompt: (prompt: string) => void;
}) {
  if (!alternatives || alternatives.length === 0) return null;

  return (
    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3.5 shadow-sm space-y-3">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
        <GitBranch className="h-3.5 w-3.5" />
        <span>Simulated Alternative Interventions</span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {alternatives.map((alt, idx) => {
          const isRefactor =
            alt.intervention.toLowerCase().includes("refactor") ||
            alt.name.toLowerCase().includes("refactor");
          return (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-3 space-y-2 shadow-xs"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[12.5px] text-[var(--cd-ink)]">
                    {alt.name}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      isRefactor
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {alt.intervention}
                  </span>
                </div>

                <div className="text-[11.5px] text-[var(--cd-ink-soft)] leading-snug">
                  <CoodaraMarkdown content={alt.summary} />
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px]">
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {alt.direct_breakage_count} direct break
                  </span>
                  <span className="text-[var(--cd-ink-faint)]">•</span>
                  <span className="text-[var(--cd-ink-soft)]">
                    {alt.indirect_impact_count} indirect
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  const tgt = targetComponent ? targetComponent.split("/").pop() : "component";
                  if (isRefactor) {
                    onActionPrompt(`What happens if I refactor ${tgt}?`);
                  } else {
                    onActionPrompt(`What happens if I remove ${tgt}?`);
                  }
                }}
                className="mt-2 w-full cursor-pointer rounded-lg border border-[var(--cd-border)] bg-[var(--cd-sunken)] py-1.5 text-center text-[11px] font-semibold text-[var(--cd-ink)] hover:bg-[var(--cd-accent)] hover:text-white transition-colors"
                type="button"
              >
                Run {alt.name}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 5. InferenceBlock: Inferred operational consequences with conditional phrasing
 */
export function InferenceBlock({ items }: { items: InferenceItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-3.5 shadow-sm space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
        <Zap className="h-3.5 w-3.5" />
        <span>Likely Structural Consequences</span>
      </div>
      <div className="space-y-1.5">
        {items.map((inf, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 rounded-lg bg-[var(--cd-sunken)] p-2.5 text-[12px]"
          >
            <span className="mt-0.5 rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300">
              {inf.language || "likely"}
            </span>
            <div className="text-[var(--cd-ink)] font-medium flex-1">
              <CoodaraMarkdown content={inf.statement} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 6. UnknownsBlock: Static analysis limits and missing runtime telemetry
 */
export function UnknownsBlock({ items }: { items: UnknownItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 shadow-sm space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
        <span>What Is Not Verified (Static Analysis Limits)</span>
      </div>
      <div className="space-y-1.5">
        {items.map((unk, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-amber-500/20 bg-[var(--cd-surface)] p-2.5 text-[11.5px] text-[var(--cd-ink-soft)]"
          >
            <div className="font-semibold text-[var(--cd-ink)]">
              <CoodaraMarkdown content={unk.statement} />
            </div>
            {unk.reason && (
              <div className="text-[11px] text-amber-700/90 dark:text-amber-300/90 mt-0.5">
                Reason: {unk.reason}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 7. ConfidenceBlock: Structural (High), Evidence (High), Runtime (Unknown)
 */
export function ConfidenceBlock({ confidence }: { confidence: ReasoningConfidence }) {
  return (
    <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-3.5 shadow-sm space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-soft)]">
          <Activity className="h-3.5 w-3.5 text-[var(--cd-accent)]" />
          <span>Confidence Assessment (Separated Dimensions)</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-[var(--cd-sunken)] p-2 text-center">
          <div className="text-[10px] font-semibold text-[var(--cd-ink-faint)] uppercase">
            Structural
          </div>
          <div
            className={`text-[12.5px] font-bold ${
              confidence.structural.toLowerCase() === "high"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {confidence.structural}
          </div>
          <div className="text-[9.5px] text-[var(--cd-ink-faint)]">
            AST Reachability
          </div>
        </div>

        <div className="rounded-lg bg-[var(--cd-sunken)] p-2 text-center">
          <div className="text-[10px] font-semibold text-[var(--cd-ink-faint)] uppercase">
            Evidence
          </div>
          <div
            className={`text-[12.5px] font-bold ${
              confidence.evidence.toLowerCase() === "high"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {confidence.evidence}
          </div>
          <div className="text-[9.5px] text-[var(--cd-ink-faint)]">
            File Provenance
          </div>
        </div>

        <div className="rounded-lg bg-[var(--cd-sunken)] p-2 text-center">
          <div className="text-[10px] font-semibold text-[var(--cd-ink-faint)] uppercase">
            Runtime
          </div>
          <div className="text-[12.5px] font-bold text-slate-500 dark:text-slate-400">
            {confidence.runtime}
          </div>
          <div className="text-[9.5px] text-[var(--cd-ink-faint)]">
            No Live Telemetry
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 8. EvidenceBlock: Traceable Citations & Evidence
 */
export function EvidenceBlock({
  evidence,
  orgId,
  repoId,
  onOpenCodeStudio,
}: {
  evidence: EvidenceItem[];
  orgId?: number;
  repoId?: number | null;
  onOpenCodeStudio?: (path: string) => void;
}) {
  const [showAllEvidence, setShowAllEvidence] = useState(false);

  if (!evidence || evidence.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-3.5 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-soft)]">
          <FileCode2 className="h-3.5 w-3.5 text-[var(--cd-accent)]" />
          <span>Traceable Citations &amp; Evidence ({evidence.length})</span>
        </div>
        {evidence.length > 2 && (
          <button
            onClick={() => setShowAllEvidence(!showAllEvidence)}
            className="cursor-pointer text-[10.5px] font-semibold text-[var(--cd-accent)] hover:underline flex items-center gap-0.5"
            type="button"
          >
            {showAllEvidence ? (
              <>
                Show fewer <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Show all <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {(showAllEvidence ? evidence : evidence.slice(0, 2)).map((ev, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] p-2.5 text-[11.5px] space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-semibold text-[var(--cd-ink)] flex items-center gap-1">
                <FileCode2 className="h-3 w-3 text-[var(--cd-accent)]" />
                {ev.repository_path}
              </span>
              {orgId && repoId && onOpenCodeStudio && (
                <button
                  onClick={() => onOpenCodeStudio(ev.repository_path)}
                  className="cursor-pointer rounded bg-[var(--cd-surface)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--cd-accent)] border border-[var(--cd-border-soft)] hover:bg-[var(--cd-accent)] hover:text-white transition-colors"
                  type="button"
                >
                  Open in Code Studio
                </button>
              )}
            </div>
            <div className="text-[11px] text-[var(--cd-ink-soft)]">
              {ev.why_supports} ({ev.relationship})
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 9. ActionButtons: Native Coodara actionable buttons
 */
export function ActionButtons({
  actions,
  onActionClick,
}: {
  actions: ActionItem[];
  onActionClick: (act: ActionItem) => void;
}) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="pt-1">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-soft)]">
        Suggested Next Actions
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((act, idx) => (
          <button
            key={idx}
            onClick={() => onActionClick(act)}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--cd-ink)] shadow-xs transition-all hover:border-[var(--cd-accent)] hover:bg-[var(--cd-accent)] hover:text-white"
            type="button"
          >
            {act.type === "view_affected" && <Network className="h-3.5 w-3.5" />}
            {act.type === "show_paths" && <ArrowRight className="h-3.5 w-3.5" />}
            {act.type === "open_code_studio" && <Code2 className="h-3.5 w-3.5" />}
            {(act.type === "simulate_removal" || act.type === "simulate_refactor") && (
              <GitBranch className="h-3.5 w-3.5" />
            )}
            <span>{act.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Main StructuredReasoningView
 */
export function StructuredReasoningView({
  data,
  orgId,
  repoId,
  onActionPrompt,
}: StructuredReasoningViewProps) {
  const navigate = useNavigate();
  const effectiveRepoId = typeof repoId === "number" ? repoId : null;

  function handleOpenCodeStudio(path?: string | null) {
    if (orgId && effectiveRepoId) {
      const query = path ? `?tab=studio&file=${encodeURIComponent(path)}` : "?tab=studio";
      navigate(`/dashboard/organizations/${orgId}/repositories/${effectiveRepoId}/architecture${query}`);
    }
  }

  function handleActionClick(act: ActionItem) {
    if (act.type === "open_code_studio" || act.type === "open_studio") {
      handleOpenCodeStudio(act.file_path || act.target);
    } else if (act.type === "view_affected") {
      if (orgId && effectiveRepoId) {
        navigate(`/dashboard/organizations/${orgId}/repositories/${effectiveRepoId}/architecture?tab=map`);
      }
    } else if (act.type === "simulate_removal") {
      const subject = act.target ? act.target.split("/").pop() : "the component";
      onActionPrompt(`What happens if I remove ${subject}?`);
    } else if (act.type === "simulate_refactor") {
      const subject = act.target ? act.target.split("/").pop() : "the component";
      onActionPrompt(`What happens if I refactor ${subject}?`);
    } else if (act.intervention) {
      const subject = act.target ? act.target.split("/").pop() : "the component";
      onActionPrompt(`What happens if I ${act.intervention.toLowerCase().replace("_", " ")} ${subject}?`);
    } else if (act.target) {
      onActionPrompt(`Analyze ${act.target}`);
    }
  }

  return (
    <div className="space-y-4 text-[12.5px] leading-relaxed">
      {/* 1. SummaryBlock */}
      <SummaryBlock
        summary={data.summary}
        candidates={data.candidates}
        onSelectCandidate={(cand) => onActionPrompt(`What happens if I remove or refactor ${cand}?`)}
      />

      {/* 2. ObservedBlock */}
      <ObservedBlock items={data.observed} />

      {/* 3. ImpactBlock */}
      <ImpactBlock impacts={data.structural_impacts} />

      {/* 4. AlternativesBlock */}
      <AlternativesBlock
        alternatives={data.alternatives}
        targetComponent={data.target_component}
        onActionPrompt={onActionPrompt}
      />

      {/* 5. InferenceBlock */}
      <InferenceBlock items={data.inferences} />

      {/* 6. UnknownsBlock */}
      <UnknownsBlock items={data.unknowns} />

      {/* 7. ConfidenceBlock */}
      <ConfidenceBlock confidence={data.confidence} />

      {/* 8. EvidenceBlock */}
      <EvidenceBlock
        evidence={data.evidence}
        orgId={orgId}
        repoId={effectiveRepoId}
        onOpenCodeStudio={handleOpenCodeStudio}
      />

      {/* 9. ActionButtons */}
      <ActionButtons actions={data.actions} onActionClick={handleActionClick} />
    </div>
  );
}
