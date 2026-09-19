import { useState } from "react";
import {
  FolderGit2,
  Binary,
  Network,
  Activity,
  AlertOctagon,
  Sparkles,
  Zap,
  ArrowRight,
  Info,
  X,
  CheckCircle2,
} from "lucide-react";

interface PipelineStep {
  id: string;
  stepNumber: number;
  name: string;
  shortDesc: string;
  icon: any;
  category: "ingestion" | "graph" | "intelligence" | "action";
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  details: {
    whatHappens: string;
    whyItMatters: string;
    coodaraMechanism: string;
    vsLegacyTools: string;
  };
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "ingest",
    stepNumber: 1,
    name: "Repository Ingestion",
    shortDesc: "Git tree & multi-language AST extraction",
    icon: FolderGit2,
    category: "ingestion",
    color: "emerald",
    bgClass: "bg-emerald-500/10 dark:bg-emerald-950/40",
    textClass: "text-emerald-700 dark:text-emerald-400",
    borderClass: "border-emerald-200 dark:border-emerald-800/60",
    details: {
      whatHappens:
        "Coodara indexes all source files, schemas, configs, and route definitions across languages (Python, TypeScript, Go, Java, Rust).",
      whyItMatters:
        "Architecture lives in the cross-file connections, not in single files. Universal AST extraction creates the raw foundation.",
      coodaraMechanism:
        "Tree-sitter and symbol table parsing extract classes, function calls, imports, and interface declarations into a structured AST corpus.",
      vsLegacyTools:
        "Linters only inspect single files in isolation; Coodara builds a unified cross-repository symbol registry.",
    },
  },
  {
    id: "ast",
    stepNumber: 2,
    name: "Structural Analysis",
    shortDesc: "Call graphs, exports & symbol contracts",
    icon: Binary,
    category: "ingestion",
    color: "teal",
    bgClass: "bg-teal-500/10 dark:bg-teal-950/40",
    textClass: "text-teal-700 dark:text-teal-400",
    borderClass: "border-teal-200 dark:border-teal-800/60",
    details: {
      whatHappens:
        "Resolves dynamic imports, dependency injection bindings, HTTP/gRPC route boundaries, and database query invocations.",
      whyItMatters:
        "Identifies true runtime dependencies rather than just static text mentions.",
      coodaraMechanism:
        "Determines caller-callee hierarchies, database CRUD boundaries, and inter-module data contracts.",
      vsLegacyTools:
        "Basic search/regex tools guess dependencies; Coodara proves them via syntactic call paths.",
    },
  },
  {
    id: "graph",
    stepNumber: 3,
    name: "Architecture Graph G=(V,E)",
    shortDesc: "Directed dependency graph & layer boundaries",
    icon: Network,
    category: "graph",
    color: "blue",
    bgClass: "bg-blue-500/10 dark:bg-blue-950/40",
    textClass: "text-blue-700 dark:text-blue-400",
    borderClass: "border-blue-200 dark:border-blue-800/60",
    details: {
      whatHappens:
        "Synthesizes thousands of AST symbols into a macro topology where Vertices (V) represent Services/Modules and Edges (E) represent architectural couplings.",
      whyItMatters:
        "Turns invisible cognitive complexity into an interactive, computable topological model.",
      coodaraMechanism:
        "Calculates Graph Centrality, In-Degree/Out-Degree (Afferent/Efferent), and Community Clusters to identify true system boundaries.",
      vsLegacyTools:
        "Documentation tools (like Pallo) write markdown descriptions; Coodara computes on an active mathematical graph.",
    },
  },
  {
    id: "metrics",
    stepNumber: 4,
    name: "Health & Risk Metrics",
    shortDesc: "Coupling, Modularity & Maintainability",
    icon: Activity,
    category: "intelligence",
    color: "indigo",
    bgClass: "bg-indigo-500/10 dark:bg-indigo-950/40",
    textClass: "text-indigo-700 dark:text-indigo-400",
    borderClass: "border-indigo-200 dark:border-indigo-800/60",
    details: {
      whatHappens:
        "Evaluates graph topology against structural quality metrics: Martin's Instability ($I = C_e / (C_a + C_e)$), Modularity Index ($Q$), and Cyclic Complexity.",
      whyItMatters:
        "Provides objective, mathematically substantiated health scores instead of subjective opinions.",
      coodaraMechanism:
        "Every single metric links directly to the underlying graph edges and source AST lines.",
      vsLegacyTools:
        "Generic dashboards give arbitrary numbers; Coodara grounds all metrics in verifiable structural evidence.",
    },
  },
  {
    id: "findings",
    stepNumber: 5,
    name: "Architectural Smells",
    shortDesc: "Layer violations, circular loops & God objects",
    icon: AlertOctagon,
    category: "intelligence",
    color: "amber",
    bgClass: "bg-amber-500/10 dark:bg-amber-950/40",
    textClass: "text-amber-700 dark:text-amber-400",
    borderClass: "border-amber-200 dark:border-amber-800/60",
    details: {
      whatHappens:
        "Detects structural anti-patterns: Presentation layer directly querying Postgres, circular service dependencies (A ↔ B), and unbounded fan-out hubs.",
      whyItMatters:
        "These smells cause 80% of systemic outages and technical debt velocity drag, but are invisible to standard PR reviewers.",
      coodaraMechanism:
        "Applies layer-boundary rules and topological cycle detection algorithms across the entire graph.",
      vsLegacyTools:
        "Code review relies on human memory; Coodara enforces structural boundaries automatically.",
    },
  },
  {
    id: "explanation",
    stepNumber: 6,
    name: "Plain AI Explanation",
    shortDesc: "Why it matters in plain engineering terms",
    icon: Sparkles,
    category: "intelligence",
    color: "purple",
    bgClass: "bg-purple-500/10 dark:bg-purple-950/40",
    textClass: "text-purple-700 dark:text-purple-400",
    borderClass: "border-purple-200 dark:border-purple-800/60",
    details: {
      whatHappens:
        "Translates raw topological anomalies into plain-English consequences for both senior architects and non-technical stakeholders.",
      whyItMatters:
        "Helps teams prioritize high-impact refactors by explaining business risk (outage danger, onboarding friction, deployment lag).",
      coodaraMechanism:
        "Contextualized LLM reasoning grounded directly in the AST graph proof and blast radius simulations.",
      vsLegacyTools:
        "Static analysis dumps cryptic warning codes; Coodara explains the real-world operational hazard.",
    },
  },
  {
    id: "simulation",
    stepNumber: 7,
    name: "Impact Simulator & 1-Click Fix",
    shortDesc: "Blast radius prediction & AI refactoring",
    icon: Zap,
    category: "action",
    color: "rose",
    bgClass: "bg-rose-500/10 dark:bg-rose-950/40",
    textClass: "text-rose-700 dark:text-rose-400",
    borderClass: "border-rose-200 dark:border-rose-800/60",
    details: {
      whatHappens:
        "Simulates what happens if a file or module is modified before code is merged: computes downstream service ripples, database writes, and external third-party contracts.",
      whyItMatters:
        "Eliminates fear of refactoring. Engineers see the exact blast radius before committing.",
      coodaraMechanism:
        "Traverses downstream DAG nodes and synthesizes a safe architectural refactoring with automated boundary isolation.",
      vsLegacyTools:
        "Linters cannot predict future change impact; Coodara delivers proactive change impact simulation.",
    },
  },
];

interface ArchitecturePipelineFlowProps {
  currentStep?: number;
  onSelectStep?: (stepId: string) => void;
  className?: string;
}

export function ArchitecturePipelineFlow({
  currentStep = 7,
  onSelectStep,
  className = "",
}: ArchitecturePipelineFlowProps) {
  const [activeModalStep, setActiveModalStep] = useState<PipelineStep | null>(null);

  return (
    <div
      className={`rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4 shadow-xs ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--cd-accent)] text-white text-[11px] font-bold">
            AI
          </div>
          <div>
            <h4 className="text-[13px] font-bold tracking-tight text-[var(--cd-ink)] flex items-center gap-1.5">
              <span>Architecture Intelligence Flow</span>
              <span className="text-[11px] font-normal text-[var(--cd-ink-faint)]">
                (7-Stage AST &amp; Graph Engine)
              </span>
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[var(--cd-ink-soft)]">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Ingestion
          </span>
          <span className="text-[var(--cd-ink-faint)]">→</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> Graph G=(V,E)
          </span>
          <span className="text-[var(--cd-ink-faint)]">→</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-purple-500" /> Intelligence
          </span>
          <span className="text-[var(--cd-ink-faint)]">→</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> Impact Simulation
          </span>
        </div>
      </div>

      {/* Pipeline Stages Horizontal Flow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {PIPELINE_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCurrent = step.stepNumber === currentStep;
          const isPassed = step.stepNumber <= currentStep;

          return (
            <button
              key={step.id}
              onClick={() => {
                setActiveModalStep(step);
                if (onSelectStep) onSelectStep(step.id);
              }}
              className={`group relative flex flex-col justify-between rounded-lg border p-2.5 text-left transition-all cursor-pointer ${
                isCurrent
                  ? `${step.bgClass} ${step.borderClass} ring-2 ring-[var(--cd-accent)] shadow-sm`
                  : isPassed
                  ? `bg-[var(--cd-surface)] border-[var(--cd-border)] hover:border-[var(--cd-border-strong)] hover:bg-[var(--cd-sunken)]`
                  : `bg-[var(--cd-sunken)]/50 border-[var(--cd-border-soft)] opacity-70`
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-mono font-bold ${
                    isPassed
                      ? `${step.bgClass} ${step.textClass}`
                      : "bg-[var(--cd-sunken)] text-[var(--cd-ink-faint)]"
                  }`}
                >
                  {step.stepNumber}
                </span>

                <Icon className={`h-3.5 w-3.5 ${step.textClass}`} />
              </div>

              <div>
                <div className="text-[12px] font-bold text-[var(--cd-ink)] truncate">
                  {step.name}
                </div>
                <div className="text-[10px] text-[var(--cd-ink-faint)] line-clamp-1 mt-0.5">
                  {step.shortDesc}
                </div>
              </div>

              {idx < PIPELINE_STEPS.length - 1 && (
                <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-[var(--cd-ink-faint)] opacity-40 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="h-3 w-3" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Explanatory Drawer / Modal for Clicked Step */}
      {activeModalStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 shadow-2xl">
            <button
              onClick={() => setActiveModalStep(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl border ${activeModalStep.bgClass} ${activeModalStep.textClass} ${activeModalStep.borderClass}`}
              >
                <activeModalStep.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[var(--cd-sunken)] px-2 py-0.5 text-[10px] font-mono font-bold text-[var(--cd-ink-soft)]">
                    STAGE {activeModalStep.stepNumber} OF 7
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${activeModalStep.bgClass} ${activeModalStep.textClass} ${activeModalStep.borderClass}`}
                  >
                    {activeModalStep.category}
                  </span>
                </div>
                <h3 className="text-[17px] font-bold text-[var(--cd-ink)] mt-0.5">
                  {activeModalStep.name}
                </h3>
              </div>
            </div>

            <div className="space-y-3.5 text-[12.5px] leading-relaxed">
              <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)]/60 p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)] mb-1">
                  What Happens in This Stage
                </div>
                <p className="text-[var(--cd-ink)] font-medium">
                  {activeModalStep.details.whatHappens}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Coodara Engine Mechanism
                  </div>
                  <p className="text-[11.5px] text-[var(--cd-ink-soft)]">
                    {activeModalStep.details.coodaraMechanism}
                  </p>
                </div>

                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                    <Info className="h-3.5 w-3.5" />
                    Why This Matters
                  </div>
                  <p className="text-[11.5px] text-[var(--cd-ink-soft)]">
                    {activeModalStep.details.whyItMatters}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
                  Difference vs. Linters &amp; Documentation Tools (Pallo)
                </div>
                <p className="text-[11.5px] text-[var(--cd-ink-soft)]">
                  {activeModalStep.details.vsLegacyTools}
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setActiveModalStep(null)}
                className="cursor-pointer rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-[12.5px] font-semibold text-white shadow-sm hover:bg-[var(--cd-accent-hover)] transition-colors"
              >
                Close Stage Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArchitecturePipelineFlow;
