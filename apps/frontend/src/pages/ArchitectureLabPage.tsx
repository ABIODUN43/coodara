import { useState } from "react";
import { useSearchParams, useLocation, Link } from "react-router-dom";
import {
  FlaskConical,
  Play,
  Sparkles,
  Layers,
  ArrowRight,
  Sliders,
  DollarSign,
  FileCheck2,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { useDashboardOverview } from "@/hooks/useDashboardOverview";

type LabWorkspaceTab =
  | "overview"
  | "hypothesis"
  | "experiment"
  | "results"
  | "economics"
  | "decision";

const INTERVENTION_TYPES = [
  { id: "REMOVE", label: "Remove", desc: "Eliminate component or dependency layer" },
  { id: "BREAKING_REFACTOR", label: "Breaking Refactor", desc: "Alter public contract or boundaries" },
  { id: "COMPATIBLE_REFACTOR", label: "Compatible Refactor", desc: "Refactor internals while preserving contract" },
  { id: "MOVE", label: "Move", desc: "Relocate component to proper domain boundary" },
  { id: "SPLIT", label: "Split", desc: "Divide coordinator into focused units" },
  { id: "MERGE", label: "Merge", desc: "Consolidate tightly coupled operations" },
  { id: "CACHE", label: "Cache", desc: "Introduce or modify caching behavior" },
  { id: "CONSOLIDATE", label: "Consolidate", desc: "Reduce repeated calls or queries" },
  { id: "ISOLATE", label: "Isolate", desc: "Separate workloads to eliminate contention" },
  { id: "CUSTOM", label: "Custom", desc: "User-defined experiment with explicit configuration" },
] as const;

export function ArchitectureLabPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { repos } = useDashboardOverview();

  // Query params or location state from Finding handoff
  const queryFindingId = searchParams.get("findingId");
  const queryRepoId = searchParams.get("repoId");
  const locationState = location.state as
    | {
        findingId?: string;
        findingTitle?: string;
        findingCategory?: string;
        severity?: string;
        repoId?: number;
        repoName?: string;
        primaryComponent?: string;
        filePath?: string;
      }
    | undefined;

  const initialTab = (searchParams.get("tab") as LabWorkspaceTab) || (queryFindingId ? "hypothesis" : "overview");
  const [activeTab, setActiveTab] = useState<LabWorkspaceTab>(initialTab);

  // Selected Repository
  const [selectedRepoId, setSelectedRepoId] = useState<string>(
    queryRepoId || (repos[0]?.id ? String(repos[0].id) : "")
  );

  // Hypothesis Form State
  const [hypothesisTitle, setHypothesisTitle] = useState(
    locationState?.findingTitle
      ? `Remediate: ${locationState.findingTitle}`
      : "Decouple coordinator service and introduce port boundary"
  );
  const [interventionType, setInterventionType] = useState<string>("COMPATIBLE_REFACTOR");
  const [problemStatement, setProblemStatement] = useState(
    locationState?.findingTitle
      ? `Architectural finding detected: ${locationState.findingTitle} (${locationState.findingCategory || "Coupling"}). Structural coupling creates blast-radius hazards during deployments.`
      : "High efferent coupling and circular dependency across boundary creating deployment synchronization bottleneck."
  );
  const [targetComponent, setTargetComponent] = useState(
    locationState?.primaryComponent || "apps/backend/app/services/coordinator.py"
  );
  const [expectedEffects, setExpectedEffects] = useState(
    "Reduce instability I from 0.85 to 0.25; eliminate 2 circular dependency cycles; reduce p95 latency under burst load."
  );

  // Workload Assumptions
  const [workloadRps, setWorkloadRps] = useState<number>(500);
  const [concurrency, setConcurrency] = useState<number>(100);
  const [runDurationSec, setRunDurationSec] = useState<number>(300);

  // Sync tab with URL
  const switchTab = (tab: LabWorkspaceTab) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    });
  };

  const selectedRepo = repos.find((r) => String(r.id) === selectedRepoId) || repos[0];

  return (
    <div className="flex h-full min-h-[calc(100vh-52px)] flex-col bg-[var(--cd-bg)] text-[var(--cd-ink)]">
      {/* 1. Persistent Top Context Bar (Section 5.3) */}
      <div className="sticky top-[52px] z-20 flex flex-wrap items-center justify-between border-b border-[var(--cd-border)] bg-[var(--cd-surface)] px-4 py-2.5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--cd-ink)]">
            <FlaskConical className="h-4 w-4 text-[var(--cd-accent)]" />
            <span>Architecture Lab</span>
          </div>

          <span className="text-[var(--cd-ink-faint)]">/</span>

          {/* Repo Selector */}
          <select
            value={selectedRepoId}
            onChange={(e) => setSelectedRepoId(e.target.value)}
            className="rounded-md border border-[var(--cd-border)] bg-[var(--cd-bg)] px-2 py-1 text-xs font-mono text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
          >
            {repos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.full_name}
              </option>
            ))}
          </select>

          <span className="text-[var(--cd-ink-faint)]">/</span>

          <span className="font-mono text-[11px] text-[var(--cd-ink-soft)] bg-[var(--cd-sunken)] px-2 py-0.5 rounded border border-[var(--cd-border-soft)]">
            branch: {selectedRepo?.default_branch || "main"}
          </span>

          <span className="hidden sm:inline text-xs text-[var(--cd-ink-faint)]">|</span>

          {/* Evidence Coverage Indicator */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-[var(--cd-ink-soft)]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Coverage: 4/5 artifacts grounded</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Scenario: READY
          </span>

          <button
            type="button"
            onClick={() => switchTab("experiment")}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors shadow-xs"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>Run Experiment</span>
          </button>
        </div>
      </div>

      {/* 2. Workspace Sub-Navigation Tabs (6 Internal Workspaces per Section 4.2) */}
      <div className="border-b border-[var(--cd-border-soft)] bg-[var(--cd-bg)] px-4 sm:px-6">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2" aria-label="Lab Workspaces">
          {[
            { id: "overview", label: "Lab Overview", icon: Activity },
            { id: "hypothesis", label: "Hypothesis", icon: Sliders },
            { id: "experiment", label: "Experiment", icon: Play },
            { id: "results", label: "Results & Diff", icon: Layers },
            { id: "economics", label: "Architectural Economics", icon: DollarSign },
            { id: "decision", label: "Evidence & Decision", icon: FileCheck2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id as LabWorkspaceTab)}
                className={`cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--cd-surface)] text-[var(--cd-accent)] font-semibold shadow-2xs border border-[var(--cd-border)]"
                    : "text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)]"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[var(--cd-accent)]" : "text-[var(--cd-ink-faint)]"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Linked Finding Banner if navigated from Findings */}
      {queryFindingId && (
        <div className="mx-4 sm:mx-6 mt-4 flex items-center justify-between rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-4 py-2 text-xs text-indigo-900 dark:text-indigo-200">
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="h-4 w-4 text-indigo-500 flex-shrink-0" />
            <span className="font-semibold">Investigating Finding:</span>
            <span className="truncate font-mono">{locationState?.findingTitle || queryFindingId}</span>
          </div>
          <Link
            to={`/findings?finding=${queryFindingId}`}
            className="text-[11px] underline text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 ml-2 flex-shrink-0"
          >
            View Finding in Context
          </Link>
        </div>
      )}

      {/* 3. Main Workspace Canvas */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {/* Workspace 1: Lab Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6 max-w-6xl mx-auto">
            <div>
              <h2 className="text-lg font-bold text-[var(--cd-ink)]">Architecture Experimentation Overview</h2>
              <p className="text-xs text-[var(--cd-ink-soft)] mt-0.5">
                Formulate testable architectural hypotheses, compare baselines with proposed designs in isolated sandboxes, and evaluate resource and financial consequences.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-[var(--cd-ink-soft)]">
                  <span>Active Hypotheses</span>
                  <Sliders className="h-4 w-4 text-[var(--cd-accent)]" />
                </div>
                <div className="text-2xl font-bold font-mono">3</div>
                <p className="text-[11px] text-[var(--cd-ink-faint)]">2 ready for benchmark, 1 in draft</p>
              </div>

              <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-[var(--cd-ink-soft)]">
                  <span>Completed Experiments</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold font-mono">14</div>
                <p className="text-[11px] text-[var(--cd-ink-faint)]">Validated with empirical benchmark telemetry</p>
              </div>

              <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-[var(--cd-ink-soft)]">
                  <span>Recorded Decisions</span>
                  <FileCheck2 className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-bold font-mono">8</div>
                <p className="text-[11px] text-[var(--cd-ink-faint)]">Preserved in architecture organizational memory</p>
              </div>
            </div>

            {/* Recent Hypotheses Rail */}
            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--cd-ink)]">Active Hypotheses in this Repository</h3>
                <button
                  type="button"
                  onClick={() => switchTab("hypothesis")}
                  className="cursor-pointer text-xs font-medium text-[var(--cd-accent)] hover:underline"
                >
                  + New Hypothesis
                </button>
              </div>

              <div className="divide-y divide-[var(--cd-border-soft)]">
                <div className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-[var(--cd-ink)]">
                      Consolidate repeated database queries in catalog controller
                    </div>
                    <div className="text-[11px] text-[var(--cd-ink-soft)] font-mono mt-0.5">
                      Intervention: CONSOLIDATE • Target: apps/api/catalog.py • Mode: Benchmark-validated
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchTab("results")}
                    className="cursor-pointer text-xs text-[var(--cd-accent)] font-medium hover:underline"
                  >
                    View Results
                  </button>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-[var(--cd-ink)]">
                      Extract isolated port interface for payment gateway dependency
                    </div>
                    <div className="text-[11px] text-[var(--cd-ink-soft)] font-mono mt-0.5">
                      Intervention: COMPATIBLE_REFACTOR • Target: billing/stripe.py • Mode: Configuration-first
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchTab("hypothesis")}
                    className="cursor-pointer text-xs text-[var(--cd-accent)] font-medium hover:underline"
                  >
                    Edit Hypothesis
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Workspace 2: Hypothesis Workspace */}
        {activeTab === "hypothesis" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div>
              <h2 className="text-lg font-bold text-[var(--cd-ink)]">Formulate Architectural Hypothesis</h2>
              <p className="text-xs text-[var(--cd-ink-soft)] mt-0.5">
                Define the proposed intervention, affected components, workload assumptions, and success criteria.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--cd-ink)] mb-1">
                  Hypothesis Title
                </label>
                <input
                  type="text"
                  value={hypothesisTitle}
                  onChange={(e) => setHypothesisTitle(e.target.value)}
                  className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
                  placeholder="e.g. Consolidate repository queries into batched loader"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--cd-ink)] mb-1">
                  Intervention Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {INTERVENTION_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setInterventionType(t.id)}
                      className={`cursor-pointer p-2.5 rounded-lg border text-left transition-all ${
                        interventionType === t.id
                          ? "border-[var(--cd-accent)] bg-[var(--cd-accent-soft)]"
                          : "border-[var(--cd-border)] bg-[var(--cd-bg)] hover:border-[var(--cd-border-strong)]"
                      }`}
                    >
                      <div className="text-xs font-semibold text-[var(--cd-ink)]">{t.label}</div>
                      <div className="text-[10px] text-[var(--cd-ink-faint)] leading-tight mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--cd-ink)] mb-1">
                  Target Component / Scope
                </label>
                <input
                  type="text"
                  value={targetComponent}
                  onChange={(e) => setTargetComponent(e.target.value)}
                  className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs font-mono text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--cd-ink)] mb-1">
                  Problem Statement & Background
                </label>
                <textarea
                  rows={3}
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--cd-ink)] mb-1">
                  Expected Architectural Effects & Measurable Success Criteria
                </label>
                <textarea
                  rows={2}
                  value={expectedEffects}
                  onChange={(e) => setExpectedEffects(e.target.value)}
                  className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--cd-border-soft)]">
                <button
                  type="button"
                  onClick={() => switchTab("experiment")}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors"
                >
                  <span>Configure Experiment & Workload</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Workspace 3: Experiment Workspace */}
        {activeTab === "experiment" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div>
              <h2 className="text-lg font-bold text-[var(--cd-ink)]">Controlled Experiment Setup</h2>
              <p className="text-xs text-[var(--cd-ink-soft)] mt-0.5">
                Configure workload parameters for baseline (control) and proposed (treatment) execution in isolated runner sandboxes.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
                Workload Profile (Parity Invariant)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--cd-ink)] mb-1">Request Rate</label>
                  <div className="flex items-center rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-1.5">
                    <input
                      type="number"
                      value={workloadRps}
                      onChange={(e) => setWorkloadRps(Number(e.target.value))}
                      className="w-full bg-transparent text-xs font-mono text-[var(--cd-ink)] focus:outline-none"
                    />
                    <span className="text-[11px] text-[var(--cd-ink-faint)]">req/s</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--cd-ink)] mb-1">Concurrency</label>
                  <div className="flex items-center rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-1.5">
                    <input
                      type="number"
                      value={concurrency}
                      onChange={(e) => setConcurrency(Number(e.target.value))}
                      className="w-full bg-transparent text-xs font-mono text-[var(--cd-ink)] focus:outline-none"
                    />
                    <span className="text-[11px] text-[var(--cd-ink-faint)]">workers</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--cd-ink)] mb-1">Measurement Window</label>
                  <div className="flex items-center rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-1.5">
                    <input
                      type="number"
                      value={runDurationSec}
                      onChange={(e) => setRunDurationSec(Number(e.target.value))}
                      className="w-full bg-transparent text-xs font-mono text-[var(--cd-ink)] focus:outline-none"
                    />
                    <span className="text-[11px] text-[var(--cd-ink-faint)]">seconds</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-200">
                <span className="font-semibold">Baseline Parity Rule: </span>
                <span>Both control and proposed treatments execute with identical workload definitions, dataset volume, and hardware limits to guarantee comparability.</span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--cd-border-soft)]">
                <button
                  type="button"
                  onClick={() => switchTab("results")}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors shadow-xs"
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span>Execute Benchmark in Isolated Runner</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Workspace 4: Results Workspace */}
        {activeTab === "results" && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div>
              <h2 className="text-lg font-bold text-[var(--cd-ink)]">Side-by-Side Results & Evidence Comparison</h2>
              <p className="text-xs text-[var(--cd-ink-soft)] mt-0.5">
                Empirical delta between baseline and proposed design under controlled benchmark workload.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3.5 space-y-1">
                <div className="text-[11px] text-[var(--cd-ink-faint)]">p95 Request Latency</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">162 ms</span>
                  <span className="text-xs font-mono text-[var(--cd-ink-faint)] line-through">210 ms</span>
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">-22.8% latency reduction</div>
                <div className="text-[9.5px] font-mono text-[var(--cd-ink-faint)] uppercase">Class: MEASURED</div>
              </div>

              <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3.5 space-y-1">
                <div className="text-[11px] text-[var(--cd-ink-faint)]">Average CPU Utilization</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">51%</span>
                  <span className="text-xs font-mono text-[var(--cd-ink-faint)] line-through">72%</span>
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">-21.0% compute load</div>
                <div className="text-[9.5px] font-mono text-[var(--cd-ink-faint)] uppercase">Class: MEASURED</div>
              </div>

              <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3.5 space-y-1">
                <div className="text-[11px] text-[var(--cd-ink-faint)]">DB Queries per Request</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">3.0</span>
                  <span className="text-xs font-mono text-[var(--cd-ink-faint)] line-through">8.0</span>
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">-62.5% query consolidation</div>
                <div className="text-[9.5px] font-mono text-[var(--cd-ink-faint)] uppercase">Class: MEASURED</div>
              </div>

              <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3.5 space-y-1">
                <div className="text-[11px] text-[var(--cd-ink-faint)]">Instability Principle (I)</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">0.25</span>
                  <span className="text-xs font-mono text-[var(--cd-ink-faint)] line-through">0.86</span>
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Boundary stabilized</div>
                <div className="text-[9.5px] font-mono text-[var(--cd-ink-faint)] uppercase">Class: DERIVED</div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => switchTab("economics")}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors"
              >
                <span>Translate to Architectural Economics</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Workspace 5: Economics Workspace */}
        {activeTab === "economics" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div>
              <h2 className="text-lg font-bold text-[var(--cd-ink)]">Architectural Economics</h2>
              <p className="text-xs text-[var(--cd-ink-soft)] mt-0.5">
                Financial consequences translated from empirical resource requirement differences under explicit assumptions.
              </p>
            </div>

            {/* Invariant Banner */}
            <div className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-sunken)] p-3 text-xs text-[var(--cd-ink-soft)] space-y-1">
              <div className="font-semibold text-[var(--cd-ink)]">Architectural Economics Principles</div>
              <p>Values are <strong>projected monthly differences under stated infrastructure models</strong>, never claims of guaranteed cloud savings. Pricing is normalized from versioned catalog snapshots.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
                  Current Infrastructure Baseline
                </div>
                <div className="text-sm font-semibold">4x c6g.xlarge + db.r6g.xlarge</div>
                <div className="text-2xl font-bold font-mono text-[var(--cd-ink)]">$5,000 / mo</div>
                <div className="text-[11px] text-[var(--cd-ink-soft)] space-y-0.5">
                  <div>Compute: $3,200 (72% measured CPU saturation)</div>
                  <div>Database: $1,800 (8 queries/req IOPS profile)</div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Proposed Design Scenario
                </div>
                <div className="text-sm font-semibold">2x c6g.xlarge + db.r6g.large</div>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">$3,800 / mo</div>
                <div className="text-[11px] text-[var(--cd-ink-soft)] space-y-0.5">
                  <div>Compute: $2,400 (51% measured CPU saturation)</div>
                  <div>Database: $1,400 (3 queries/req IOPS profile)</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4">
              <div className="text-xs font-semibold text-[var(--cd-ink)]">Modeled Monthly Difference</div>
              <div className="mt-1 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                -$1,200 / month
              </div>
              <p className="mt-1 text-[11px] text-[var(--cd-ink-faint)]">
                Status: Benchmark-validated + Pricing-modeled. Production telemetry calibration required post-deployment.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => switchTab("decision")}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors"
              >
                <span>Record Architecture Decision</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Workspace 6: Evidence & Decision Workspace */}
        {activeTab === "decision" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div>
              <h2 className="text-lg font-bold text-[var(--cd-ink)]">Evidence Ledger & Decision Record</h2>
              <p className="text-xs text-[var(--cd-ink-soft)] mt-0.5">
                Every result linked to provenance, conditions, and multi-dimensional confidence. Human decision stays human.
              </p>
            </div>

            {/* Multi-Dimensional Confidence Grid (Section 8.2) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3">
                <div className="text-[10px] text-[var(--cd-ink-faint)] uppercase font-mono">Structural</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">HIGH</div>
                <div className="text-[10px] text-[var(--cd-ink-soft)]">Observed in AST graph</div>
              </div>

              <div className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3">
                <div className="text-[10px] text-[var(--cd-ink-faint)] uppercase font-mono">Evidence</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">HIGH</div>
                <div className="text-[10px] text-[var(--cd-ink-soft)]">4 empirical artifacts</div>
              </div>

              <div className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3">
                <div className="text-[10px] text-[var(--cd-ink-faint)] uppercase font-mono">Runtime</div>
                <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1">BENCHMARK</div>
                <div className="text-[10px] text-[var(--cd-ink-soft)]">Controlled sandbox</div>
              </div>

              <div className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3">
                <div className="text-[10px] text-[var(--cd-ink-faint)] uppercase font-mono">Economic</div>
                <div className="text-sm font-bold text-sky-600 dark:text-sky-400 mt-1">MODELED</div>
                <div className="text-[10px] text-[var(--cd-ink-soft)]">AWS snapshot v2026.09</div>
              </div>

              <div className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3">
                <div className="text-[10px] text-[var(--cd-ink-faint)] uppercase font-mono">Readiness</div>
                <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">DECISION READY</div>
                <div className="text-[10px] text-[var(--cd-ink-soft)]">Sufficient evidence</div>
              </div>
            </div>

            {/* Decision Record Form */}
            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
                Record Architectural Decision
              </h3>

              <div>
                <label className="block text-xs font-semibold text-[var(--cd-ink)] mb-1">
                  Decision Outcome
                </label>
                <div className="flex gap-2">
                  <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    ACCEPTED
                  </span>
                  <span className="rounded-lg bg-[var(--cd-sunken)] border border-[var(--cd-border)] px-3 py-1.5 text-xs font-medium text-[var(--cd-ink-soft)]">
                    REJECTED
                  </span>
                  <span className="rounded-lg bg-[var(--cd-sunken)] border border-[var(--cd-border)] px-3 py-1.5 text-xs font-medium text-[var(--cd-ink-soft)]">
                    NEEDS_VALIDATION
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--cd-ink)] mb-1">
                  Engineering Rationale & Post-Deployment Validation Plan
                </label>
                <textarea
                  rows={3}
                  defaultValue="Proceed with interface extraction and query consolidation. Benchmark results prove 22.8% p95 latency reduction and query consolidation from 8 to 3 queries/req. Verify production DB IOPS and request latency in Datadog after canary rollout."
                  className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--cd-border-soft)]">
                <button
                  type="button"
                  onClick={() => alert("Decision recorded to architecture memory.")}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors"
                >
                  <FileCheck2 className="h-3.5 w-3.5" />
                  <span>Save Decision Record to Architecture Memory</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
