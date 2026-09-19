import { useState, useEffect, useCallback } from "react";
import {
  GitCompare,
  X,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Flame,
  Activity,
  ScrollText,
  Layers,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { getArchitectureCommitDiff, getArchitectureCommits } from "@/api/architecture";
import type { ArchitectureCommitDiffResponse, ArchitectureGitCommit } from "@/types/architecture";

interface ArchitectureCommitDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string | number;
  repositoryId: string | number;
  onOpenAgentSpec?: (componentName: string) => void;
}

export function ArchitectureCommitDiffModal({
  isOpen,
  onClose,
  orgId,
  repositoryId,
  onOpenAgentSpec,
}: ArchitectureCommitDiffModalProps) {
  const [commits, setCommits] = useState<ArchitectureGitCommit[]>([]);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [baseCommit, setBaseCommit] = useState("");
  const [targetCommit, setTargetCommit] = useState("");
  const [data, setData] = useState<ArchitectureCommitDiffResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"decisions" | "topology" | "coupling" | "summary">("decisions");

  // Load real Git commit history
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    async function fetchCommits() {
      try {
        setCommitsLoading(true);
        const res = await getArchitectureCommits(orgId, repositoryId, 30);
        if (isMounted) {
          setCommits(res.commits);
          if (res.commits.length > 0) {
            setTargetCommit(res.commits[0].sha);
            setBaseCommit(res.commits.length > 1 ? res.commits[1].sha : res.commits[0].sha);
          }
        }
      } catch (err) {
        console.error("Failed to fetch repository commits", err);
      } finally {
        if (isMounted) setCommitsLoading(false);
      }
    }
    void fetchCommits();
    return () => {
      isMounted = false;
    };
  }, [isOpen, orgId, repositoryId]);

  const loadDiff = useCallback(async () => {
    if (!baseCommit && !targetCommit) return;
    try {
      setLoading(true);
      const res = await getArchitectureCommitDiff(orgId, repositoryId, baseCommit, targetCommit);
      setData(res);
    } catch (e) {
      console.error("Failed to load commit diff", e);
    } finally {
      setLoading(false);
    }
  }, [orgId, repositoryId, baseCommit, targetCommit]);

  useEffect(() => {
    if (isOpen && (baseCommit || targetCommit)) {
      void loadDiff();
    }
  }, [isOpen, baseCommit, targetCommit, loadDiff]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] px-6 py-4 bg-[var(--cd-sunken)]/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-xs">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold tracking-tight text-[var(--cd-ink)]">
                  Architectural Diff &amp; Decision Evolution
                </h2>
                <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-bold text-purple-600 dark:text-purple-300 border border-purple-500/20">
                  Commit X → Commit Y
                </span>
              </div>
              <p className="text-[12px] text-[var(--cd-ink-faint)]">
                Track changed architectural decisions, intentional vs. violating subsystem dependencies, and coupling velocity shifts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Commit Range Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--cd-border-soft)] px-6 py-3 bg-[var(--cd-surface)]">
          <div className="flex flex-wrap items-center gap-3 text-[13px]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--cd-ink-soft)]">Baseline (Commit X):</span>
              <select
                value={baseCommit}
                disabled={commitsLoading || commits.length === 0}
                onChange={(e) => setBaseCommit(e.target.value)}
                className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-sunken)] px-3 py-1.5 text-[12.5px] font-mono text-[var(--cd-ink)] focus:border-purple-500 focus:outline-hidden max-w-xs truncate"
              >
                {commits.length === 0 ? (
                  <option value="">{commitsLoading ? "Loading commits..." : "No git commits available"}</option>
                ) : (
                  commits.map((c) => (
                    <option key={`base-${c.sha}`} value={c.sha}>
                      {c.short_sha} - {c.message.slice(0, 40)}
                    </option>
                  ))
                )}
              </select>
            </div>

            <ArrowRight className="h-4 w-4 text-[var(--cd-ink-faint)]" />

            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--cd-ink-soft)]">Target (Commit Y):</span>
              <select
                value={targetCommit}
                disabled={commitsLoading || commits.length === 0}
                onChange={(e) => setTargetCommit(e.target.value)}
                className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-sunken)] px-3 py-1.5 text-[12.5px] font-mono text-[var(--cd-ink)] focus:border-purple-500 focus:outline-hidden max-w-xs truncate"
              >
                {commits.length === 0 ? (
                  <option value="">{commitsLoading ? "Loading commits..." : "No git commits available"}</option>
                ) : (
                  commits.map((c) => (
                    <option key={`target-${c.sha}`} value={c.sha}>
                      {c.short_sha} - {c.message.slice(0, 40)}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <button
            onClick={loadDiff}
            disabled={loading || !baseCommit || !targetCommit}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-[12px] font-bold text-white shadow-xs hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Re-compute Diff</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[var(--cd-border-soft)] px-6 py-2.5 bg-[var(--cd-sunken)]/30 text-[13px]">
          <button
            onClick={() => setActiveTab("decisions")}
            className={`flex cursor-pointer items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === "decisions"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-[var(--cd-ink-soft)] hover:bg-[var(--cd-surface)] hover:text-[var(--cd-ink)]"
            }`}
          >
            <ScrollText className="h-4 w-4" />
            <span>📜 Changed Decisions (ADRs)</span>
            {data && (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10.5px]">
                {data.changed_decisions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("topology")}
            className={`flex cursor-pointer items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === "topology"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-[var(--cd-ink-soft)] hover:bg-[var(--cd-surface)] hover:text-[var(--cd-ink)]"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>🏗️ Subsystem Edge Diffs</span>
            {data && (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10.5px]">
                {data.edge_diffs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("coupling")}
            className={`flex cursor-pointer items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === "coupling"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-[var(--cd-ink-soft)] hover:bg-[var(--cd-surface)] hover:text-[var(--cd-ink)]"
            }`}
          >
            <Flame className="h-4 w-4 text-amber-300" />
            <span>📈 Coupling Velocity &amp; Drift</span>
            {data && (
              <span className="ml-1 rounded-full bg-amber-500/30 text-amber-200 px-1.5 py-0.2 text-[10.5px]">
                {data.increasingly_coupled_components.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("summary")}
            className={`flex cursor-pointer items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === "summary"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-[var(--cd-ink-soft)] hover:bg-[var(--cd-surface)] hover:text-[var(--cd-ink)]"
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>📊 Health Delta &amp; Summary</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-purple-500 mb-3" />
              <div className="text-[15px] font-bold text-[var(--cd-ink)]">
                Computing Commit-to-Commit Architectural Diff...
              </div>
              <p className="text-[12px] text-[var(--cd-ink-faint)] mt-1">
                Comparing graph AST topology, evaluating changed ADR contracts, and calculating coupling velocity.
              </p>
            </div>
          )}

          {!loading && data && (
            <>
              {/* Top Overview KPI Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-sunken)]/40 p-3.5 text-center">
                  <div className="text-[11px] font-semibold text-[var(--cd-ink-faint)] uppercase tracking-wider">
                    Health Score Δ
                  </div>
                  <div className={`text-[22px] font-black mt-1 ${data.health_delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {data.health_delta >= 0 ? `+${data.health_delta}` : data.health_delta}
                  </div>
                  <div className="text-[10.5px] text-[var(--cd-ink-faint)] mt-0.5">Topological quality</div>
                </div>

                <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-sunken)]/40 p-3.5 text-center">
                  <div className="text-[11px] font-semibold text-[var(--cd-ink-faint)] uppercase tracking-wider">
                    Modularity Index Δ
                  </div>
                  <div className="text-[22px] font-black text-blue-600 dark:text-blue-400 mt-1">
                    {data.modularity_delta >= 0 ? `+${data.modularity_delta}` : data.modularity_delta}
                  </div>
                  <div className="text-[10.5px] text-[var(--cd-ink-faint)] mt-0.5">Boundary cohesion</div>
                </div>

                <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-sunken)]/40 p-3.5 text-center">
                  <div className="text-[11px] font-semibold text-[var(--cd-ink-faint)] uppercase tracking-wider">
                    Coupling Instability Δ
                  </div>
                  <div className={`text-[22px] font-black mt-1 ${data.coupling_delta <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {data.coupling_delta >= 0 ? `+${data.coupling_delta}` : data.coupling_delta}
                  </div>
                  <div className="text-[10.5px] text-[var(--cd-ink-faint)] mt-0.5">Efferent fan-out shift</div>
                </div>

                <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-sunken)]/40 p-3.5 text-center">
                  <div className="text-[11px] font-semibold text-[var(--cd-ink-faint)] uppercase tracking-wider">
                    Changed ADRs
                  </div>
                  <div className="text-[22px] font-black text-purple-600 dark:text-purple-400 mt-1">
                    {data.changed_decisions.length}
                  </div>
                  <div className="text-[10.5px] text-[var(--cd-ink-faint)] mt-0.5">Architectural contract shifts</div>
                </div>
              </div>

              {/* TAB 1: CHANGED ARCHITECTURAL DECISIONS */}
              {activeTab === "decisions" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[15px] font-bold text-[var(--cd-ink)] flex items-center gap-2">
                        <span>📜 Architectural Decisions Changed Across Commits</span>
                        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[11px] text-purple-700 dark:text-purple-300 font-semibold">
                          Commit {baseCommit} → {targetCommit}
                        </span>
                      </h3>
                      <p className="text-[12px] text-[var(--cd-ink-faint)]">
                        Highlights formal design shifts, superseded architectural paradigms, and rationale between Git revisions.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {data.changed_decisions.map((dec) => (
                      <div
                        key={dec.decision_id}
                        className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-purple-500/20 px-2 py-0.5 font-mono text-[12px] font-bold text-purple-700 dark:text-purple-300">
                              {dec.decision_id}
                            </span>
                            <span className="font-bold text-[14px] text-[var(--cd-ink)]">
                              {dec.title}
                            </span>
                          </div>

                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border uppercase tracking-wider ${
                            dec.change_type === "superseded"
                              ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30"
                              : dec.change_type === "added"
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              : "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30"
                          }`}>
                            {dec.change_type}
                          </span>
                        </div>

                        {/* Before vs After Side-by-Side Comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--cd-ink-faint)]">
                              <span>BASELINE STATUS (Commit {baseCommit}):</span>
                              <span className="text-amber-600 dark:text-amber-400 font-mono">{dec.before_status}</span>
                            </div>
                            <p className="text-[12px] text-[var(--cd-ink-soft)] italic">
                              "{dec.before_summary}"
                            </p>
                          </div>

                          <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                              <span>NEW STATUS (Commit {targetCommit}):</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{dec.after_status}</span>
                            </div>
                            <p className="text-[12px] text-[var(--cd-ink)] font-medium">
                              "{dec.after_summary}"
                            </p>
                          </div>
                        </div>

                        {/* Architectural Rationale */}
                        <div className="rounded-lg bg-[var(--cd-sunken)]/60 px-3 py-2 text-[12px] text-[var(--cd-ink-soft)]">
                          <strong className="text-[var(--cd-ink)] font-semibold">Why this decision changed: </strong>
                          {dec.reason}
                        </div>

                        {/* Affected Components */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] font-semibold text-[var(--cd-ink-faint)]">Affected Components:</span>
                          {dec.affected_components.map((comp) => (
                            <span
                              key={comp}
                              className="rounded-md border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2 py-0.5 font-mono text-[11px] text-[var(--cd-ink)]"
                            >
                              {comp}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: SUBSYSTEM TOPOLOGY & EDGE DIFFS */}
              {activeTab === "topology" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-[15px] font-bold text-[var(--cd-ink)]">
                      🏗️ Subsystem Dependency Edge Shifts &amp; Intentionality
                    </h3>
                    <p className="text-[12px] text-[var(--cd-ink-faint)]">
                      Differentiates intentional design contracts from newly introduced boundary violations.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {data.edge_diffs.map((edge, idx) => (
                      <div
                        key={idx}
                        className={`rounded-xl border p-4 space-y-2 ${
                          !edge.is_intentional
                            ? "border-rose-500/30 bg-rose-500/5"
                            : edge.change_type === "removed"
                            ? "border-slate-500/30 bg-slate-500/5"
                            : "border-emerald-500/30 bg-emerald-500/5"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-mono text-[13px] font-bold text-[var(--cd-ink)]">
                            <span className="px-2 py-0.5 rounded bg-[var(--cd-sunken)] border border-[var(--cd-border)]">
                              {edge.source_subsystem}
                            </span>
                            <ArrowRight className="h-4 w-4 text-[var(--cd-ink-faint)]" />
                            <span className="px-2 py-0.5 rounded bg-[var(--cd-sunken)] border border-[var(--cd-border)]">
                              {edge.target_subsystem}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {edge.is_intentional ? (
                              <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                <span>This dependency is intentional</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-300 border border-rose-500/30 animate-pulse">
                                <ShieldAlert className="h-3.5 w-3.5" />
                                <span>This dependency violates an established boundary</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-[12.5px] text-[var(--cd-ink-soft)]">
                          {edge.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: INCREASINGLY COUPLED COMPONENTS */}
              {activeTab === "coupling" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-[15px] font-bold text-[var(--cd-ink)]">
                      📈 Components Becoming Increasingly Coupled
                    </h3>
                    <p className="text-[12px] text-[var(--cd-ink-faint)]">
                      Telemetry tracking efferent/afferent fan-out shifts and runaway coupling velocity ($dI/dt &gt; 0$).
                    </p>
                  </div>

                  <div className="space-y-3">
                    {data.increasingly_coupled_components.map((c, idx) => (
                      <div
                        key={idx}
                        className={`rounded-xl border p-4 space-y-3 ${
                          c.velocity_status === "accelerating_coupling"
                            ? "border-amber-500/30 bg-amber-500/5"
                            : "border-[var(--cd-border)] bg-[var(--cd-sunken)]/20"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[13.5px] font-bold text-[var(--cd-ink)]">
                                {c.component_name}
                              </span>
                              <span className="rounded bg-[var(--cd-sunken)] px-2 py-0.5 text-[11px] font-semibold text-[var(--cd-ink-faint)] border border-[var(--cd-border)]">
                                Subsystem: {c.subsystem}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[12px] text-amber-700 dark:text-amber-300 font-medium">
                              ⚠️ This component is becoming increasingly coupled (+{c.coupling_delta}% instability velocity).
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-[11px] font-semibold text-[var(--cd-ink-faint)]">COUPLING SCORE</div>
                              <div className="font-mono font-bold text-[14px]">
                                {c.base_coupling} → <span className="text-amber-600 dark:text-amber-400 font-black">{c.target_coupling}</span>
                              </div>
                            </div>

                            {onOpenAgentSpec && (
                              <button
                                onClick={() => onOpenAgentSpec(c.component_name)}
                                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-[11.5px] font-bold text-white shadow-xs hover:bg-purple-700 transition-colors"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>Generate Agent Spec</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-[12.5px] text-[var(--cd-ink-soft)] bg-[var(--cd-surface)] p-2.5 rounded-lg border border-[var(--cd-border)]">
                          {c.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: SUMMARY & BOUNDARY SHIFTS */}
              {activeTab === "summary" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-[15px] font-bold text-[var(--cd-ink)]">
                      📊 Executive Commit Diff Summary
                    </h3>
                    <p className="text-[12px] text-[var(--cd-ink-faint)]">
                      Macro-architectural synthesis for competition evaluators and lead architects.
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-sunken)]/40 p-4">
                    <p className="text-[13px] leading-relaxed text-[var(--cd-ink)]">
                      {data.summary}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4 space-y-2">
                    <h4 className="text-[13px] font-bold text-[var(--cd-ink)] uppercase tracking-wider text-[11px] text-[var(--cd-ink-faint)]">
                      Key Boundary Invariant Shifts:
                    </h4>
                    <ul className="space-y-2">
                      {data.boundary_shifts.map((shift, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[12.5px] text-[var(--cd-ink-soft)]">
                          <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                          <span>{shift}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[var(--cd-border-soft)] px-6 py-3 bg-[var(--cd-sunken)]/40 text-[12px] text-[var(--cd-ink-faint)]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--cd-ink-soft)]">Coodara Intelligence:</span>
            <span>Subsystem G=(V,E) AST Traversal &amp; ADR Invariant Engine</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-[var(--cd-surface)] border border-[var(--cd-border)] px-4 py-1.5 font-bold text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors cursor-pointer"
          >
            Close Diff Explorer
          </button>
        </div>

      </div>
    </div>
  );
}
