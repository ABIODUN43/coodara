import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Cloud,
  Database,
  Layers,
  Box,
  Share2,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  FolderCode,
  Flame,
  ShieldCheck,
  ShieldAlert,
  Compass,
} from "lucide-react";
import { getArchitectureComponent } from "@/api/architecture";
import { ArchitecturalImpactModal } from "./ArchitecturalImpactModal";
import type { ArchitectureComponent, ArchitectureNodeType } from "@/types/architecture";

interface ComponentDetailsProps {
  orgId?: string | number;
  repositoryId: string;
  componentId: string | null;
  onSelectComponent?: (id: string) => void;
  onAskAi: (componentId: string) => void;
  onOpenAgentSpec?: (componentName: string) => void;
}

function getComponentIcon(type: ArchitectureNodeType) {
  switch (type) {
    case "frontend":
    case "service":
      return <Cloud className="h-4 w-4 text-blue-600" />;
    case "database":
    case "storage":
    case "cache":
      return <Database className="h-4 w-4 text-emerald-600" />;
    case "external":
      return <Share2 className="h-4 w-4 text-purple-600" />;
    case "ui_component":
    case "package":
      return <Box className="h-4 w-4 text-rose-600" />;
    case "queue":
      return <RefreshCw className="h-4 w-4 text-amber-600" />;
    default:
      return <Layers className="h-4 w-4 text-slate-600" />;
  }
}

function getTypeBadgeStyle(type: ArchitectureNodeType) {
  switch (type) {
    case "frontend":
    case "service":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800";
    case "database":
    case "storage":
    case "cache":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
    case "external":
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800";
    case "ui_component":
    case "package":
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
    case "queue":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  }
}

function buildFallbackComponent(id: string): ArchitectureComponent {
  const clean = id.replace(/\\/g, "/").replace(/\/$/, "");
  const base = clean.split("/").pop() || id;
  const name = base
    .replace(/[._-]/g, " ")
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    id,
    name,
    type: "service",
    description: `Architectural domain module coordinating ${name} responsibilities and boundary contracts.`,
    technology: "Core Architecture",
    dependencies: [],
    dependents: [],
    issues: [],
  };
}

export function ComponentDetails({
  orgId,
  repositoryId,
  componentId,
  onSelectComponent,
  onAskAi,
  onOpenAgentSpec,
}: ComponentDetailsProps) {
  const { orgId: routeOrgId } = useParams<{ orgId: string }>();
  const effectiveOrgId = orgId ?? routeOrgId;
  const [component, setComponent] = useState<ArchitectureComponent | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "dependencies" | "dependents" | "issues">("details");
  const [showImpactModal, setShowImpactModal] = useState(false);

  useEffect(() => {
    if (!componentId || !effectiveOrgId) {
      setComponent(null);
      return;
    }
    setLoading(true);
    getArchitectureComponent(effectiveOrgId, repositoryId, componentId)
      .then(setComponent)
      .catch(() => {
        setComponent(buildFallbackComponent(componentId));
      })
      .finally(() => setLoading(false));
  }, [effectiveOrgId, repositoryId, componentId]);

  if (!componentId) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-[var(--cd-ink-faint)]">
        <Layers className="mb-2 h-8 w-8 opacity-40 text-[var(--cd-accent)]" />
        <p className="text-[13px] font-medium text-[var(--cd-ink-soft)]">No component selected</p>
        <p className="mt-1 text-[11.5px] max-w-[200px]">
          Click any component or subsystem in the architecture graph to inspect its boundaries, coupling telemetry, and dependencies.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="h-5 w-5 animate-spin text-[var(--cd-accent)]" />
        <span className="mt-2 text-[12px] text-[var(--cd-ink-faint)]">
          Inspecting component contracts...
        </span>
      </div>
    );
  }

  if (!component) return null;

  const healthScore = Math.max(
    10,
    100 -
      component.issues.filter((i) => i.severity === "critical").length * 25 -
      component.issues.filter((i) => i.severity === "warning").length * 10
  );
  const location = component.id;

  // Coupling telemetry calculation
  const efferent = component.dependencies.length;
  const afferent = component.dependents.length;
  const totalCoupling = efferent + afferent;
  const instabilityIndex = totalCoupling > 0 ? Number((efferent / totalCoupling).toFixed(2)) : 0;
  const isIncreasinglyCoupled = totalCoupling >= 5 || efferent >= 4;

  const responsibilities = [
    `Coordinates ${component.name} module operations and interfaces`,
    ...(component.dependencies.length > 0
      ? [
          `Communicates with ${component.dependencies
            .slice(0, 3)
            .map((d) => d.name)
            .join(", ")}${component.dependencies.length > 3 ? " and others" : ""}`,
        ]
      : []),
    ...(component.dependents.length > 0
      ? [`Serves ${component.dependents.length} downstream dependent module(s)`]
      : []),
    ...(component.issues.length > 0
      ? [`Monitored for ${component.issues.length} architectural smell(s)`]
      : ["Maintains clean architectural boundaries with zero violations"]),
  ];

  return (
    <div className="flex flex-col p-4 space-y-4">
      {/* Top Component Header Card */}
      <div className="flex items-start gap-3 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-sunken)]/60 p-3.5 shadow-xs">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cd-surface)] shadow-xs border border-[var(--cd-border-soft)]">
          {getComponentIcon(component.type)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <h4 className="truncate text-[14.5px] font-bold text-[var(--cd-ink)]">{component.name}</h4>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getTypeBadgeStyle(
                component.type
              )}`}
            >
              {component.type}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11.5px] text-[var(--cd-ink-soft)]">
            {component.description || "Handles domain operations and architecture responsibilities."}
          </p>
        </div>
      </div>

      {/* Coupling Telemetry Alert Banner */}
      {isIncreasinglyCoupled && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-[12px] text-amber-700 dark:text-amber-300">
              <Flame className="h-4 w-4 text-amber-500 animate-pulse" />
              <span>This component is becoming increasingly coupled</span>
            </div>
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10.5px] font-mono font-bold text-amber-800 dark:text-amber-200">
              I = {instabilityIndex}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1 border-t border-amber-500/20 font-mono">
            <div>
              <div className="text-[10px] text-[var(--cd-ink-faint)]">Fan-out (Ce)</div>
              <div className="font-bold text-amber-700 dark:text-amber-300">{efferent} outgoing</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--cd-ink-faint)]">Fan-in (Ca)</div>
              <div className="font-bold text-blue-700 dark:text-blue-300">{afferent} incoming</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--cd-ink-faint)]">Coupling Risk</div>
              <div className="font-bold text-rose-600 dark:text-rose-400">
                {efferent > afferent ? "High Efferent" : "Stable Sink"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Architectural Consequence & What-If Impact Card */}
      <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-[var(--cd-surface)] to-[var(--cd-sunken)] p-3.5 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-[12px] text-purple-700 dark:text-purple-300">
            <Compass className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span>If we modify {component.name}:</span>
          </div>
          <button
            onClick={() => setShowImpactModal(true)}
            className="cursor-pointer rounded-lg bg-purple-600 px-2.5 py-1 text-[10.5px] font-bold text-white shadow-xs hover:bg-purple-700 transition-colors"
          >
            Simulate Blast Radius
          </button>
        </div>

        <div className="rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-surface)]/90 p-3 font-mono text-[11.5px] space-y-1.5 leading-relaxed">
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
            <span>→ {component.dependents.length} downstream dependent(s) directly impacted</span>
          </div>
          {component.dependencies.some((d) => d.type !== component.type) && (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
              <span>
                → Crosses architectural layer boundaries ({component.type} →{" "}
                {Array.from(new Set(component.dependencies.map((d) => d.type))).join(", ")})
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
            <span>→ Instability index I = {instabilityIndex} ({efferent} Ce / {afferent} Ca)</span>
          </div>
          {isIncreasinglyCoupled ? (
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
              <span>→ High efferent coupling detected — potential ripple effect</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <span>→ Low coupling blast radius — safe modular boundary</span>
            </div>
          )}
          {component.issues.length > 0 && (
            <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold">
              <span>→ Contains {component.issues.length} active architectural violation(s)</span>
            </div>
          )}
        </div>

        <div className="text-[11px] text-[var(--cd-ink-soft)] pt-1.5 border-t border-purple-500/20 leading-snug">
          <strong className="text-emerald-600 dark:text-emerald-400">Design Guidance:</strong>{" "}
          Maintain strict encapsulation and verify boundary contracts prior to modification.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--cd-border-soft)] text-[12px] font-medium">
        <button
          onClick={() => setActiveTab("details")}
          className={`cursor-pointer pb-2 font-bold transition-colors ${
            activeTab === "details"
              ? "border-b-2 border-purple-600 text-purple-600 dark:text-purple-400"
              : "text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
          }`}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab("dependencies")}
          className={`ml-4 cursor-pointer pb-2 font-bold transition-colors ${
            activeTab === "dependencies"
              ? "border-b-2 border-purple-600 text-purple-600 dark:text-purple-400"
              : "text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
          }`}
        >
          Dependencies ({component.dependencies.length})
        </button>
        <button
          onClick={() => setActiveTab("dependents")}
          className={`ml-4 cursor-pointer pb-2 font-bold transition-colors ${
            activeTab === "dependents"
              ? "border-b-2 border-purple-600 text-purple-600 dark:text-purple-400"
              : "text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
          }`}
        >
          Dependents ({component.dependents.length})
        </button>
        {component.issues.length > 0 && (
          <button
            onClick={() => setActiveTab("issues")}
            className={`ml-4 cursor-pointer pb-2 font-bold transition-colors ${
              activeTab === "issues"
                ? "border-b-2 border-rose-500 text-rose-500"
                : "text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
            }`}
          >
            Issues ({component.issues.length})
          </button>
        )}
      </div>

      {/* Tab 1: Details */}
      {activeTab === "details" && (
        <div className="space-y-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
              Description
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--cd-ink-soft)]">
              {component.description ||
                `Centralized ${component.name} module responsible for subsystem orchestration, type-safe interfaces, and decoupled communication.`}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
              <span>Health Score</span>
              <span className="font-mono text-emerald-600">{healthScore} / 100</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--cd-sunken)]">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min(Math.max(healthScore, 0), 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] p-2.5">
              <span className="text-[10.5px] font-semibold text-[var(--cd-ink-faint)]">Type</span>
              <div className="mt-1 text-[12px] font-semibold capitalize text-[var(--cd-ink)]">
                {component.type}
              </div>
            </div>
            <div className="rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] p-2.5">
              <span className="text-[10.5px] font-semibold text-[var(--cd-ink-faint)]">Technology</span>
              <div className="mt-1 truncate text-[12px] font-semibold text-[var(--cd-ink)]">
                {component.technology || "Core Architecture"}
              </div>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
              Subsystem Location
            </div>
            <div className="mt-1 flex items-center gap-1.5 rounded-md border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--cd-ink-soft)]">
              <FolderCode className="h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
              <span className="truncate">{location}</span>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
              Key Responsibilities
            </div>
            <ul className="mt-2 space-y-1.5 text-[12px] text-[var(--cd-ink-soft)]">
              {responsibilities.map((resp: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span>{resp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tab 2: Dependencies */}
      {activeTab === "dependencies" && (
        <div className="space-y-2.5">
          {component.dependencies.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-[var(--cd-ink-faint)]">
              No outgoing dependencies detected.
            </div>
          ) : (
            component.dependencies.map((dep) => {
              const isViolating = dep.type === "database" && (component.type === "frontend" || component.name.toLowerCase().includes("controller"));
              return (
                <div
                  key={dep.id}
                  className={`rounded-xl border p-2.5 text-left transition-all ${
                    isViolating ? "border-rose-500/30 bg-rose-500/5" : "border-[var(--cd-border-soft)] bg-[var(--cd-surface)] hover:bg-[var(--cd-sunken)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => onSelectComponent && onSelectComponent(dep.id)}
                      className="flex items-center gap-2 text-left cursor-pointer"
                    >
                      {getComponentIcon(dep.type)}
                      <div>
                        <div className="text-[12px] font-bold text-[var(--cd-ink)]">{dep.name}</div>
                        <div className="text-[10px] text-[var(--cd-ink-faint)] capitalize">{dep.type}</div>
                      </div>
                    </button>

                    <div>
                      {isViolating ? (
                        <span className="flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[9.5px] font-bold text-rose-700 dark:text-rose-300 border border-rose-500/30">
                          <ShieldAlert className="h-3 w-3" />
                          <span>Violates Boundary</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9.5px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          <ShieldCheck className="h-3 w-3" />
                          <span>Intentional</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-1 text-[11px] text-[var(--cd-ink-faint)]">
                    {isViolating
                      ? "This dependency violates an established boundary: Direct raw storage access."
                      : "This dependency is intentional: standard domain delegation."}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 3: Dependents */}
      {activeTab === "dependents" && (
        <div className="space-y-2">
          {component.dependents.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-[var(--cd-ink-faint)]">
              No upstream callers depend on this component.
            </div>
          ) : (
            component.dependents.map((dep) => (
              <button
                key={dep.id}
                onClick={() => onSelectComponent && onSelectComponent(dep.id)}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-2.5 text-left transition-all hover:border-purple-500 hover:bg-[var(--cd-sunken)]"
              >
                <div className="flex items-center gap-2">
                  {getComponentIcon(dep.type)}
                  <div>
                    <div className="text-[12px] font-semibold text-[var(--cd-ink)]">{dep.name}</div>
                    <div className="text-[10px] text-[var(--cd-ink-faint)]">{dep.type}</div>
                  </div>
                </div>
                <ArrowLeft className="h-3.5 w-3.5 text-[var(--cd-ink-faint)]" />
              </button>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Issues */}
      {activeTab === "issues" && (
        <div className="space-y-2.5">
          {component.issues.map((issue) => (
            <div
              key={issue.id}
              className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 text-[12px] dark:border-rose-900/50 dark:bg-rose-950/20"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-semibold text-rose-700 dark:text-rose-400">
                  {issue.title}
                </span>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:bg-rose-900 dark:text-rose-300">
                  {issue.severity}
                </span>
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--cd-ink-soft)]">
                {issue.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 space-y-2">
        {onOpenAgentSpec && isIncreasinglyCoupled && (
          <button
            onClick={() => onOpenAgentSpec(component.name)}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-[12.5px] font-bold text-white shadow-xs transition-colors hover:bg-purple-700"
          >
            <Sparkles className="h-4 w-4" />
            <span>🤖 Generate Decoupling Spec for Coding Agent</span>
          </button>
        )}

        <button
          onClick={() => onAskAi(component.id)}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] py-2 text-[12.5px] font-semibold text-[var(--cd-ink)] shadow-xs transition-colors hover:bg-[var(--cd-sunken)]"
        >
          <Sparkles className="h-3.5 w-3.5 text-purple-500" />
          <span>Ask Architect AI about this component</span>
        </button>
      </div>

      {/* Architectural Impact & Blast Radius Modal */}
      <ArchitecturalImpactModal
        isOpen={showImpactModal}
        onClose={() => setShowImpactModal(false)}
        orgId={effectiveOrgId || 1}
        repositoryId={repositoryId}
        initialComponentId={component.id}
        onOpenAgentSpec={onOpenAgentSpec}
      />
    </div>
  );
}
