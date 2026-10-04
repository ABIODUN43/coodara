import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { RefreshCw, Sparkles, Code2, Network, Flame, HelpCircle, GitCompare, Compass, GitBranch } from "lucide-react";
import { getArchitecture, getArchitectureInsights } from "@/api/architecture";
import type { ArchitectureResponse, ArchitectureIssue } from "@/types/architecture";
import { useProject } from "@/context/ProjectContext";
import { useDashboardOverview } from "@/hooks/useDashboardOverview";
import { ArchitectureSummary } from "@/components/architecture/ArchitectureSummary";
import { ArchitectureGraph } from "@/components/architecture/ArchitectureGraph";
import { ComponentDetails } from "@/components/architecture/ComponentDetails";
import { ArchitectureInsights } from "@/components/architecture/ArchitectureInsights";
import { ArchitectureCodeStudio } from "@/components/architecture/ArchitectureCodeStudio";
import { ArchitecturePipelineFlow } from "@/components/architecture/ArchitecturePipelineFlow";
import { ArchitectureIntelligenceModal } from "@/components/architecture/ArchitectureIntelligenceModal";
import { ArchitectureCommitDiffModal } from "@/components/architecture/ArchitectureCommitDiffModal";
import { ArchitecturalImpactModal } from "@/components/architecture/ArchitecturalImpactModal";

export function ArchitecturePage() {
  const { orgId: routeOrgId, repoId: routeRepoId } = useParams<{ orgId?: string; repoId?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeProject } = useProject();
  const { repos, loading: reposLoading } = useDashboardOverview();

  // Resolve canonical orgId and repoId with robust fallback hierarchy
  const effectiveOrgId =
    routeOrgId ||
    searchParams.get("orgId") ||
    (activeProject?.id ? String(activeProject.id) : "");

  const effectiveRepoId =
    routeRepoId ||
    searchParams.get("repoId") ||
    (repos.length > 0 ? String(repos[0].id) : "");

  const selectedRepo = repos.find((r) => String(r.id) === effectiveRepoId) || repos[0];
  const repoDisplayName = selectedRepo?.name || effectiveRepoId || "Repository";

  const [architecture, setArchitecture] = useState<ArchitectureResponse | null>(null);
  const [issues, setIssues] = useState<ArchitectureIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    searchParams.get("component") || null
  );
  const [activeTab, setActiveTab] = useState<"studio" | "map">(
    searchParams.get("tab") === "studio" ? "studio" : "map"
  );
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isImpactModalOpen, setIsImpactModalOpen] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "studio" || tab === "map") {
      setActiveTab(tab);
    }
    const comp = searchParams.get("component");
    if (comp) {
      setSelectedNodeId(comp);
    }
  }, [searchParams]);

  const load = useCallback(() => {
    if (!effectiveOrgId || !effectiveRepoId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    Promise.all([
      getArchitecture(effectiveOrgId, effectiveRepoId),
      getArchitectureInsights(effectiveOrgId, effectiveRepoId).catch(() => ({ items: [] })),
    ])
      .then(([archData, insightsData]) => {
        setArchitecture(archData);
        setIssues(insightsData.items);
      })
      .catch(() => setError("Couldn't load architecture for this repository."))
      .finally(() => setLoading(false));
  }, [effectiveOrgId, effectiveRepoId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelectRepo = (newRepoId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("repoId", newRepoId);
    if (effectiveOrgId) next.set("orgId", effectiveOrgId);
    setSearchParams(next);
  };

  if (reposLoading && !architecture) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl p-8 text-center text-[13px] text-[var(--cd-ink-soft)]">
        <RefreshCw className="h-6 w-6 animate-spin text-[var(--cd-accent)] mb-3" />
        <div>Resolving repository architecture intelligence...</div>
      </div>
    );
  }

  if (!reposLoading && repos.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-12 text-center text-[13px] text-[var(--cd-ink-soft)] space-y-3 m-6">
        <div className="text-base font-bold text-[var(--cd-ink)]">No Repositories Available</div>
        <p className="max-w-md mx-auto">
          Please add and analyze a repository to view its macro architectural topology, dependency contracts, and blast radius simulations.
        </p>
        <Link
          to="/repositories"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-[12px] font-semibold text-white shadow-xs"
        >
          Go to Repositories
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 pb-12 pt-4 sm:px-6">
      {/* Top Breadcrumbs & Value Proposition Tag */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <div className="flex items-center gap-1.5 text-[var(--cd-ink-faint)]">
          <Link to="/dashboard" className="hover:text-[var(--cd-ink)]">
            Dashboard
          </Link>
          <span>/</span>
          <Link to="/repositories" className="hover:text-[var(--cd-ink)]">
            Repositories
          </Link>
          <span>/</span>
          <span className="font-medium text-[var(--cd-ink-soft)]">{repoDisplayName}</span>
          <span>/</span>
          <span className="font-medium text-[var(--cd-ink)]">Architecture Intelligence</span>
        </div>

        {/* Why Coodara vs Docs button */}
        <button
          onClick={() => setIsCategoryModalOpen(true)}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Why Architecture Intelligence? (Not a Doc Tool)</span>
        </button>
      </div>

      {/* Hero Header Banner */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--cd-accent-soft)] font-black text-lg text-[var(--cd-accent)] shadow-xs">
            C
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[17px] font-black tracking-tight text-[var(--cd-ink)]">
                Coodara.
              </span>
              <span className="text-[13px] font-semibold text-[var(--cd-ink-soft)]">
                Metric → Evidence → Explanation → Action
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-[var(--cd-ink-faint)]">
              Transforming raw AST symbols into computable macro dependency graphs and change impact simulations.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Repository Selector Dropdown */}
          {repos.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-2.5 py-1 text-[12px]">
              <GitBranch className="h-3.5 w-3.5 text-[var(--cd-ink-faint)]" />
              <select
                value={effectiveRepoId}
                onChange={(e) => handleSelectRepo(e.target.value)}
                className="bg-transparent font-medium text-[var(--cd-ink)] focus:outline-none cursor-pointer"
              >
                {repos.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImpactModalOpen(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-purple-500/40 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 px-3 py-1.5 text-[12px] font-bold text-purple-700 dark:text-purple-300 hover:from-purple-600/30 hover:to-indigo-600/30 transition-colors shadow-xs"
            >
              <Compass className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span>🔮 Impact Simulator</span>
            </button>
            <button
              onClick={() => setIsDiffModalOpen(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-[12px] font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 transition-colors shadow-xs"
            >
              <GitCompare className="h-3.5 w-3.5" />
              <span>Commit Diff (X → Y)</span>
            </button>
            <button
              onClick={load}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              onClick={() => navigate('/chat')}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3.5 py-1.5 text-[12px] font-medium text-white shadow-xs hover:bg-[var(--cd-accent-hover)] transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ask Architect AI
            </button>
          </div>
        </div>
      </div>

      {/* 7-Stage Architecture Intelligence Pipeline Bar */}
      <div className="mb-6">
        <ArchitecturePipelineFlow />
      </div>

      {/* Main View Mode Selector Tabs */}
      <div className="mb-6 flex items-center justify-between border-b border-[var(--cd-border-soft)] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("studio")}
            className={`flex cursor-pointer items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${
              activeTab === "studio"
                ? "bg-[var(--cd-accent)] text-white shadow-sm"
                : "bg-[var(--cd-sunken)] text-[var(--cd-ink-soft)] hover:bg-[var(--cd-surface)] hover:text-[var(--cd-ink)] border border-[var(--cd-border)]"
            }`}
          >
            <Code2 className="h-4 w-4" />
            <span>Code Studio &amp; Impact Simulator</span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
              <Flame className="h-3 w-3 text-rose-400" />
              Blinking Issues
            </span>
          </button>

          <button
            onClick={() => setActiveTab("map")}
            className={`flex cursor-pointer items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${
              activeTab === "map"
                ? "bg-[var(--cd-accent)] text-white shadow-sm"
                : "bg-[var(--cd-sunken)] text-[var(--cd-ink-soft)] hover:bg-[var(--cd-surface)] hover:text-[var(--cd-ink)] border border-[var(--cd-border)]"
            }`}
          >
            <Network className="h-4 w-4" />
            <span>Architecture System Map</span>
          </button>
        </div>

        <div className="text-[12px] text-[var(--cd-ink-faint)] hidden sm:block">
          {activeTab === "studio"
            ? "Edit modules & simulate blast radius before committing"
            : "Explore global subsystem dependencies & component contracts"}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-14 text-center">
          <RefreshCw className="h-6 w-6 animate-spin text-[var(--cd-accent)] mb-3" />
          <div className="text-[14px] font-semibold text-[var(--cd-ink)]">
            Analyzing architecture dependencies...
          </div>
          <p className="mt-1 text-[12px] text-[var(--cd-ink-soft)]">
            Extracting modules, tracing relationships, and evaluating health scores.
          </p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-8 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
          <div className="text-[14px] font-semibold text-rose-700 dark:text-rose-400">
            {error}
          </div>
          <p className="mt-1 text-[12px] text-[var(--cd-ink-soft)]">
            Ensure this repository has completed analysis before loading its architecture.
          </p>
          <button
            onClick={load}
            className="mt-4 cursor-pointer rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[var(--cd-accent-hover)]"
          >
            Retry Architecture Load
          </button>
        </div>
      )}

      {/* Completed state */}
      {!loading && !error && (
        <>
          {activeTab === "studio" ? (
            <ArchitectureCodeStudio
              orgId={effectiveOrgId}
              repositoryId={effectiveRepoId}
              onNavigateToChat={() => navigate('/chat')}
            />
          ) : (
            architecture && (
              <>
                <ArchitectureSummary
                  summary={architecture.summary}
                  repoName={repoDisplayName}
                  graph={architecture.graph}
                  issues={issues}
                  onNavigateToStudio={() => setActiveTab("studio")}
                />

                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
                  <ArchitectureGraph
                    graph={architecture.graph}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={setSelectedNodeId}
                  />
                  <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] shadow-sm">
                    <div className="border-b border-[var(--cd-border-soft)] px-4 py-3">
                      <h3 className="text-[13px] font-bold text-[var(--cd-ink)]">
                        Selected Component
                      </h3>
                    </div>
                    <ComponentDetails
                      orgId={effectiveOrgId}
                      repositoryId={effectiveRepoId}
                      componentId={selectedNodeId}
                      onSelectComponent={setSelectedNodeId}
                      onAskAi={() => navigate('/chat')}
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <ArchitectureInsights
                    issues={issues}
                    onSelectComponent={setSelectedNodeId}
                    onNavigateToStudio={() => setActiveTab("studio")}
                    onSimulateImpact={() => setActiveTab("studio")}
                  />
                </div>
              </>
            )
          )}

          {/* Footer branding */}
          <div className="mt-8 flex items-center justify-between border-t border-[var(--cd-border-soft)] pt-4 text-[11.5px] text-[var(--cd-ink-faint)]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--cd-ink-soft)]">Coodara</span>
              <span>|</span>
              <span>Architecture Intelligence Platform</span>
            </div>
            <span>Better Architecture. Stronger Software.</span>
          </div>
        </>
      )}

      {/* Why Architecture Intelligence (Distinction from Docs) Modal */}
      <ArchitectureIntelligenceModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onNavigateToStudio={() => {
          setIsCategoryModalOpen(false);
          setActiveTab("studio");
        }}
      />

      {/* Commit-to-Commit Architectural Diff & Decision Evolution Modal */}
      <ArchitectureCommitDiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        orgId={effectiveOrgId}
        repositoryId={effectiveRepoId}
      />

      {/* Architectural Impact & Consequence Simulation (Pillar 6) Modal */}
      <ArchitecturalImpactModal
        isOpen={isImpactModalOpen}
        onClose={() => setIsImpactModalOpen(false)}
        orgId={effectiveOrgId}
        repositoryId={effectiveRepoId}
        initialComponentId={selectedNodeId || undefined}
      />
    </div>
  );
}

export default ArchitecturePage;