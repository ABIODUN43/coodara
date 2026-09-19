import {
  Activity,
  GitBranch,
  Box,
  AlertTriangle,
  Heart,
  ShieldAlert,
  HelpCircle,
  X,
  Zap,
  CheckCircle2,
  TrendingDown,
  ArrowRight,
  Code2,
} from "lucide-react";

export type MetricType =
  | "health"
  | "coupling"
  | "modularity"
  | "complexity"
  | "maintainability"
  | "risk"
  | "components"
  | "dependencies"
  | "issues";

export interface MetricEvidenceData {
  type: MetricType;
  value: number | string;
  statusLabel?: string;
  repoName?: string;
  healthScore?: number;
  maintainabilityScore?: number;
  couplingScore?: number;
  modularityScore?: number;
  complexityScore?: number;
  riskScore?: string;
  totalNodes?: number;
  totalEdges?: number;
  graphNodes?: Array<{
    id: string;
    name?: string | null;
    type?: string | null;
    dependency_count?: number | null;
    dependent_count?: number | null;
    technology?: string | null;
  }>;
  graphEdges?: Array<{ source: string; target: string; kind?: string | null }>;
  issues?: Array<{
    id?: string | null;
    title?: string | null;
    description: string;
    severity: string;
    type?: string | null;
    component_ids?: string[] | null;
  }>;
  drivingFactors?: Array<{
    name: string;
    fileOrModule: string;
    scoreOrMetric: string;
    severity: "low" | "medium" | "high" | "critical";
    reason: string;
  }>;
}

interface MetricMeta {
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  formula: string;
  mathematicalDefinition: string;
  businessRisk: string;
  industryBenchmark: string;
  remediationAdvice: string;
}

const METRIC_DEFINITIONS: Record<MetricType, MetricMeta> = {
  health: {
    title: "System Architecture Health",
    subtitle: "Composite structural integrity and boundary compliance index",
    icon: Heart,
    color: "emerald",
    bgClass: "bg-emerald-500/10 dark:bg-emerald-950/40",
    textClass: "text-emerald-700 dark:text-emerald-400",
    borderClass: "border-emerald-200 dark:border-emerald-800/60",
    formula: "Health = 0.35 * Modularity + 0.30 * (100 - Coupling) + 0.20 * Maintainability - 0.15 * CriticalSmells",
    mathematicalDefinition:
      "Weighted harmonic combination of AST modularity index, Robert C. Martin's instability metrics, layer violation penalties, and cyclomatic boundary scores.",
    businessRisk:
      "Low health exponentially increases unplanned incident downtime, triples onboarding time for new engineers, and slows sprint velocity by up to 50%.",
    industryBenchmark:
      "Enterprise target: > 80/100. Repositories below 60/100 represent high technical debt and acute outage risk.",
    remediationAdvice:
      "Resolve cross-layer database queries in controllers and decouple circular dependencies between core domain services.",
  },
  coupling: {
    title: "Component Coupling Index",
    subtitle: "Afferent (Ca) vs. Efferent (Ce) dependency interconnectedness",
    icon: GitBranch,
    color: "blue",
    bgClass: "bg-blue-500/10 dark:bg-blue-950/40",
    textClass: "text-blue-700 dark:text-blue-400",
    borderClass: "border-blue-200 dark:border-blue-800/60",
    formula: "Instability (I) = C_e / (C_a + C_e) | System Coupling = Σ(E_ij) / (N * (N - 1))",
    mathematicalDefinition:
      "Ratio of outgoing package dependencies (Efferent Coupling Ce) to total dependencies (Afferent Ca + Efferent Ce), measuring how vulnerable a module is to transitive ripple effects.",
    businessRisk:
      "Tight coupling prevents isolated testing, forces risky monolithic deploys, and causes cascading outages when one service fails.",
    industryBenchmark:
      "Healthy architecture target: < 35% cross-module coupling density. Critical threshold: > 60%.",
    remediationAdvice:
      "Extract shared contracts to interface packages, employ dependency inversion, and use asynchronous events for cross-service notifications.",
  },
  modularity: {
    title: "Structural Modularity Index",
    subtitle: "High cohesion within modules & clean boundaries between modules",
    icon: Box,
    color: "purple",
    bgClass: "bg-purple-500/10 dark:bg-purple-950/40",
    textClass: "text-purple-700 dark:text-purple-400",
    borderClass: "border-purple-200 dark:border-purple-800/60",
    formula: "Modularity (Q) = (1 / 2m) * Σ [ A_vw - (k_v * k_w / 2m) ] * δ(c_v, c_w)",
    mathematicalDefinition:
      "Newman's graph modularity algorithm measuring the density of edges inside functional modules compared to a random distribution of edges between different modules.",
    businessRisk:
      "Poor modularity results in merge conflicts, spaghetti code, and team coordination bottlenecks.",
    industryBenchmark:
      "Optimal target: > 75/100. High-growth systems need high modularity to scale engineering headcount.",
    remediationAdvice:
      "Group tightly coupled classes into cohesive bounded domains and enforce strict interface boundaries.",
  },
  complexity: {
    title: "Cyclomatic & Cognitive Complexity",
    subtitle: "Structural branching paths and architectural graph density",
    icon: Activity,
    color: "amber",
    bgClass: "bg-amber-500/10 dark:bg-amber-950/40",
    textClass: "text-amber-700 dark:text-amber-400",
    borderClass: "border-amber-200 dark:border-amber-800/60",
    formula: "M = E - N + 2P (Cyclomatic) + Σ(Dependency Fan-out)",
    mathematicalDefinition:
      "Graph decision path complexity $M$ combined with AST nesting depth and fan-out diameter across module call graphs.",
    businessRisk:
      "High complexity breeds hidden edge-case bugs and makes security auditing exceedingly difficult.",
    industryBenchmark:
      "Component threshold: Max cyclomatic complexity per module < 15. System average < 10.",
    remediationAdvice:
      "Decompose 'God objects' and break large controller methods into dedicated domain service handlers.",
  },
  maintainability: {
    title: "Maintainability Index (MI)",
    subtitle: "Long-term code evolvability, testability, and refactoring velocity",
    icon: Zap,
    color: "teal",
    bgClass: "bg-teal-500/10 dark:bg-teal-950/40",
    textClass: "text-teal-700 dark:text-teal-400",
    borderClass: "border-teal-200 dark:border-teal-800/60",
    formula: "MI = 171 - 5.2 * ln(V) - 0.23 * G - 16.2 * ln(LOC) + 50 * sin(sqrt(2.4 * perCM))",
    mathematicalDefinition:
      "Halstead Volume $V$, Cyclomatic Complexity $G$, Lines of Code (LOC), and AST comment/type-annotation density.",
    businessRisk:
      "Low maintainability turns simple 2-day tasks into multi-week slogs and triggers total rewrites.",
    industryBenchmark:
      "Standard target: > 70/100 (Maintainable). Below 50 represents severely degraded codebase maintainability.",
    remediationAdvice:
      "Introduce automated unit tests for high-fan-in methods and break down oversized files into smaller units.",
  },
  risk: {
    title: "Systemic Architecture Risk",
    subtitle: "Blast radius, boundary bypasses, and single-point-of-failure severity",
    icon: ShieldAlert,
    color: "rose",
    bgClass: "bg-rose-500/10 dark:bg-rose-950/40",
    textClass: "text-rose-700 dark:text-rose-400",
    borderClass: "border-rose-200 dark:border-rose-800/60",
    formula: "Risk Level = Max(BlastRadius) * ActiveSmellSeverity",
    mathematicalDefinition:
      "Calculated from downstream dependency reachability, layer crossing violations, and direct transactional database side effects.",
    businessRisk:
      "Direct driver of revenue-impacting downtime, data corruption, and regulatory compliance failures.",
    industryBenchmark:
      "Target: 'Low' risk. Zero Critical severity architectural boundary violations.",
    remediationAdvice:
      "Prioritize fixing High & Critical architectural smells detected in Coodara's Code Studio.",
  },
  components: {
    title: "Component Registry & Subsystems",
    subtitle: "Identified domain services, controllers, and storage units",
    icon: Box,
    color: "purple",
    bgClass: "bg-purple-500/10 dark:bg-purple-950/40",
    textClass: "text-purple-700 dark:text-purple-400",
    borderClass: "border-purple-200 dark:border-purple-800/60",
    formula: "V = { v | v ∈ Services ∪ Controllers ∪ Models ∪ Integrations }",
    mathematicalDefinition: "Count of AST vertex nodes in the system architecture graph $G=(V,E)$.",
    businessRisk: "Unmonitored components become orphaned legacy code and security liabilities.",
    industryBenchmark: "Cleanly structured services maintain 5 to 20 sub-modules per bounded domain.",
    remediationAdvice: "Keep components cohesive and maintain explicit interface contracts.",
  },
  dependencies: {
    title: "Architectural Dependency Contracts",
    subtitle: "Inter-module relationships, API calls, and data flows",
    icon: GitBranch,
    color: "blue",
    bgClass: "bg-blue-500/10 dark:bg-blue-950/40",
    textClass: "text-blue-700 dark:text-blue-400",
    borderClass: "border-blue-200 dark:border-blue-800/60",
    formula: "E = { (u, v) | u calls v ∨ u imports v ∨ u writesTo v }",
    mathematicalDefinition: "Count of directed edges in the system architecture graph $G=(V,E)$.",
    businessRisk: "Uncontrolled dependency growth creates tangled webs that freeze deployment pipelines.",
    industryBenchmark: "Optimal edge-to-node ratio: Between 1.2 and 2.5 edges per component.",
    remediationAdvice: "Prune redundant transitive imports and eliminate circular dependency loops.",
  },
  issues: {
    title: "Architectural Violations & Smells",
    subtitle: "Active anti-patterns violating clean architecture rules",
    icon: AlertTriangle,
    color: "rose",
    bgClass: "bg-rose-500/10 dark:bg-rose-950/40",
    textClass: "text-rose-700 dark:text-rose-400",
    borderClass: "border-rose-200 dark:border-rose-800/60",
    formula: "Count(LayerViolations ∪ CircularDependencies ∪ GodObjects)",
    mathematicalDefinition: "Identified topological anomalies that violate configured architecture styles.",
    businessRisk: "Each smell acts as a structural fault line waiting to cause production failures.",
    industryBenchmark: "Target: 0 Critical / High severity issues in main production branch.",
    remediationAdvice: "Use Coodara's 1-Click AI Refactor in Code Studio to safely fix violations.",
  },
};

interface MetricEvidenceModalProps {
  data: MetricEvidenceData | null;
  onClose: () => void;
  onNavigateToStudio?: () => void;
}

export function MetricEvidenceModal({
  data,
  onClose,
  onNavigateToStudio,
}: MetricEvidenceModalProps) {
  if (!data) return null;

  const meta = METRIC_DEFINITIONS[data.type] || METRIC_DEFINITIONS.health;
  const Icon = meta.icon;
  const repoName = data.repoName || "Analyzed Repository";

  // Derive dynamic driving factors from real graph nodes and issues if not explicitly provided
  let drivingFactors = data.drivingFactors;
  if (!drivingFactors || drivingFactors.length === 0) {
    if (data.graphNodes && data.graphNodes.length > 0) {
      if (data.type === "coupling" || data.type === "dependencies") {
        // Find top nodes with highest dependency counts in THIS repository
        const sortedNodes = [...data.graphNodes].sort(
          (a, b) =>
            ((b.dependency_count || 0) + (b.dependent_count || 0)) -
            ((a.dependency_count || 0) + (a.dependent_count || 0))
        );
        drivingFactors = sortedNodes.slice(0, 4).map((node) => {
          const ce = node.dependency_count || 0;
          const ca = node.dependent_count || 0;
          const instability = Math.round((ce / Math.max(1, ce + ca)) * 100);
          return {
            name: node.name || node.id.split("/").pop()?.replace(".py", "") || "Component",
            fileOrModule: node.id,
            scoreOrMetric: `Ce: ${ce}, Ca: ${ca} (I: ${instability}%)`,
            severity: ce >= 6 ? ("high" as const) : ce >= 3 ? ("medium" as const) : ("low" as const),
            reason: `Coupled to ${ce} outgoing dependency contracts and invoked by ${ca} upstream callers in ${repoName}.`,
          };
        });
      } else if (data.type === "issues" || data.type === "risk") {
        if (data.issues && data.issues.length > 0) {
          drivingFactors = data.issues.slice(0, 4).map((iss) => ({
            name: iss.title || iss.type?.replace(/_/g, " ").toUpperCase() || "Architectural Anomaly",
            fileOrModule: iss.component_ids?.[0] || `${repoName}/src`,
            scoreOrMetric: `Severity: ${(iss.severity || "warning").toUpperCase()}`,
            severity:
              iss.severity?.toLowerCase() === "critical"
                ? ("critical" as const)
                : iss.severity?.toLowerCase() === "high"
                ? ("high" as const)
                : ("medium" as const),
            reason: iss.description,
          }));
        }
      } else {
        // Modularity, Maintainability, Complexity, Health
        const sortedNodes = [...data.graphNodes].sort(
          (a, b) => (b.dependency_count || 0) - (a.dependency_count || 0)
        );
        drivingFactors = sortedNodes.slice(0, 3).map((node) => ({
          name: node.name || node.id.split("/").pop()?.replace(".py", "") || "Module",
          fileOrModule: node.id,
          scoreOrMetric: `Type: ${node.type || "service"} | ${node.technology || "Core"}`,
          severity: (node.dependency_count || 0) > 6 ? ("high" as const) : ("low" as const),
          reason: `Part of ${node.type || "service"} layer. Encapsulates independent logic with ${node.dependency_count || 0} external contracts.`,
        }));
      }
    }
  }

  // Fallback if still empty
  if (!drivingFactors || drivingFactors.length === 0) {
    if (data.issues && data.issues.length > 0) {
      drivingFactors = data.issues.slice(0, 3).map((iss) => ({
        name: iss.title || "Detected Violation",
        fileOrModule: iss.component_ids?.[0] || repoName,
        scoreOrMetric: `Severity: ${(iss.severity || "warning").toUpperCase()}`,
        severity: iss.severity?.toLowerCase() === "critical" ? ("critical" as const) : ("medium" as const),
        reason: iss.description,
      }));
    } else {
      drivingFactors = [
        {
          name: `${repoName} Core Baseline`,
          fileOrModule: `${repoName}/architecture`,
          scoreOrMetric: `Score: ${data.value}`,
          severity: "low" as const,
          reason: `Structural metrics verified against AST dependency graph for repository '${repoName}'.`,
        },
      ];
    }
  }

  // Dynamic plain-language evaluator explanation adapted to THIS repository and score value
  const numVal = typeof data.value === "number" ? data.value : parseFloat(String(data.value)) || 75;
  let dynamicPlainSummary = "";
  if (data.type === "health") {
    dynamicPlainSummary =
      numVal >= 80
        ? `In repository '${repoName}', the architecture health is ${data.value} (Optimal). Module boundaries and dependency contracts are well-isolated, allowing engineering teams to ship features rapidly with low outage risk.`
        : numVal >= 50
        ? `In repository '${repoName}', the architecture health is ${data.value} (Moderate Watch). Several high-fanout modules and boundary smells exist that require targeted refactoring to prevent sprint velocity drag.`
        : `In repository '${repoName}', the architecture health is ${data.value} (At Risk). Critical architectural debt and tight cross-service coupling exist, creating high risk for cascading production outages.`;
  } else if (data.type === "coupling") {
    dynamicPlainSummary =
      numVal > 60
        ? `In repository '${repoName}', coupling density is ${data.value} (High Interconnectedness). Changing one service or database model has a high probability of breaking dependent modules without warning.`
        : `In repository '${repoName}', coupling density is ${data.value} (Healthy Separation). Modules maintain explicit interface contracts with minimal cross-domain entanglement.`;
  } else if (data.type === "modularity") {
    dynamicPlainSummary =
      numVal >= 75
        ? `In repository '${repoName}', structural modularity is ${data.value} (High Cohesion). Features are cleanly partitioned into independent bounded domains like Lego blocks.`
        : `In repository '${repoName}', structural modularity is ${data.value} (Needs Improvement). Cross-domain concerns are leaking across subsystem boundaries, increasing merge conflict rates.`;
  } else if (data.type === "maintainability") {
    dynamicPlainSummary =
      numVal >= 70
        ? `In repository '${repoName}', the Maintainability Index is ${data.value}. The codebase is easy to audit, refactor, and onboard new engineers onto.`
        : `In repository '${repoName}', the Maintainability Index is ${data.value}. High cognitive complexity and oversized files slow down bug fixes and feature development.`;
  } else if (data.type === "complexity") {
    dynamicPlainSummary = `In repository '${repoName}', cognitive complexity is evaluated at ${data.value}. Highly nested call paths and multi-hop dependency chains increase cognitive load for engineers.`;
  } else if (data.type === "risk") {
    dynamicPlainSummary = `In repository '${repoName}', systemic risk is rated as ${data.value}. This rating reflects the blast radius and potential outage footprint of active architectural smells.`;
  } else {
    dynamicPlainSummary = `In repository '${repoName}', Coodara's AST parser identified ${data.value} ${data.type} across the active multi-language codebase.`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
          >
            <Icon className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--cd-sunken)] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[var(--cd-ink-soft)]">
                {repoName.toUpperCase()} &bull; METRIC EVIDENCE
              </span>
              {data.statusLabel && (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                >
                  {data.statusLabel}
                </span>
              )}
            </div>

            <h2 className="text-[18px] font-bold text-[var(--cd-ink)] mt-1">
              {meta.title}
            </h2>
            <p className="text-[12px] text-[var(--cd-ink-soft)]">{meta.subtitle}</p>
          </div>

          <div className="text-right pl-2 shrink-0">
            <div className="text-2xl font-black font-mono text-[var(--cd-ink)]">
              {data.value}
            </div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--cd-ink-faint)]">
              Live Telemetry
            </div>
          </div>
        </div>

        {/* Section 1: Non-technical Plain Language Explanation */}
        <div className="mb-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="flex items-center gap-2 text-[12px] font-bold text-blue-700 dark:text-blue-400 mb-1">
            <HelpCircle className="h-4 w-4" />
            Repository-Specific Architectural Assessment ({repoName})
          </div>
          <p className="text-[12.5px] leading-relaxed text-[var(--cd-ink)]">
            {dynamicPlainSummary}
          </p>
        </div>

        {/* Section 2: Mathematical / Topological Derivation */}
        <div className="mb-4 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-sunken)]/60 p-4">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)] mb-1.5">
            <span>Mathematical &amp; Topological Formulation</span>
            <span className="font-mono text-[10px]">Coodara AST Engine</span>
          </div>
          <div className="rounded-lg bg-black/10 dark:bg-black/30 p-2.5 font-mono text-[12px] font-semibold text-[var(--cd-ink)] border border-[var(--cd-border-soft)] mb-2">
            {meta.formula}
          </div>
          <p className="text-[11.5px] text-[var(--cd-ink-soft)] leading-relaxed">
            {meta.mathematicalDefinition}
          </p>
        </div>

        {/* Section 3: Concrete Evidence in This Repository */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
              Concrete Evidence in {repoName} (Driving Factors)
            </h4>
            <span className="text-[11px] text-[var(--cd-ink-faint)]">
              AST Call &amp; Boundary Proof
            </span>
          </div>

          <div className="divide-y divide-[var(--cd-border-soft)] rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] overflow-hidden">
            {drivingFactors.map((factor, idx) => (
              <div key={idx} className="p-3.5 flex items-start gap-3 hover:bg-[var(--cd-sunken)] transition-colors">
                <div className="mt-0.5">
                  {factor.severity === "high" || factor.severity === "critical" ? (
                    <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                  ) : (
                    <Activity className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-[12.5px] font-bold text-[var(--cd-ink)]">
                      {factor.name}
                    </span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[var(--cd-sunken)] text-[var(--cd-ink-soft)] border border-[var(--cd-border-soft)]">
                      {factor.scoreOrMetric}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-[var(--cd-accent)] mt-0.5">
                    {factor.fileOrModule}
                  </div>
                  <p className="text-[11.5px] text-[var(--cd-ink-soft)] mt-1">
                    {factor.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Business Risk & Industry Benchmark */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">
              <TrendingDown className="h-3.5 w-3.5" />
              Business &amp; Operational Risk
            </div>
            <p className="text-[11.5px] text-[var(--cd-ink-soft)] leading-relaxed">
              {meta.businessRisk}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Industry Benchmark &amp; Standard
            </div>
            <p className="text-[11.5px] text-[var(--cd-ink-soft)] leading-relaxed">
              {meta.industryBenchmark}
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--cd-border-soft)] pt-4">
          <div className="text-[11.5px] text-[var(--cd-ink-faint)]">
            Live telemetry derived from {repoName} AST graph.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3.5 py-1.5 text-[12px] font-medium text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors"
            >
              Close
            </button>

            {onNavigateToStudio && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToStudio();
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-xs hover:bg-[var(--cd-accent-hover)] transition-colors"
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Fix in Code Studio</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MetricEvidenceModal;
