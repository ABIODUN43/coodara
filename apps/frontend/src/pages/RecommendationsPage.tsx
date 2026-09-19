import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Zap,
  MessageSquare,
  CheckCircle2,
  Circle,
  GitBranch,
  ArrowRight,
  TrendingUp,
  Search,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Box,
  Users,
  FileCode2,
  Cpu,
} from "lucide-react";
import { useDashboardOverview } from "@/hooks/useDashboardOverview";
import { useProject } from "@/context/ProjectContext";
import { ArchitecturalImpactModal } from "@/components/architecture/ArchitecturalImpactModal";
import { updateRecommendationStatus } from "@/api/architecture";

export function RecommendationsPage() {
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const {
    loading,
    allRecommendations,
    repos,
    healthScore,
    refreshOverview,
  } = useDashboardOverview();

  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedRepo, setSelectedRepo] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [completedOverrides, setCompletedOverrides] = useState<Record<string, boolean>>({});

  // Architectural Impact Modal State
  const [isImpactModalOpen, setIsImpactModalOpen] = useState(false);
  const [selectedModalComponent, setSelectedModalComponent] = useState<{
    repoId: number | string;
    componentId: string;
  }>({
    repoId: repos[0]?.id || "",
    componentId: "",
  });

  const isRecCompleted = (recId: string | number | undefined, recStatus?: string, key?: string) => {
    const idKey = recId ? String(recId) : (key || "");
    if (idKey && idKey in completedOverrides) {
      return completedOverrides[idKey];
    }
    return recStatus === "resolved" || recStatus === "dismissed";
  };

  const toggleCompleted = async (recId: string | number | undefined, recStatus?: string, key?: string) => {
    if (!activeProject?.id) return;
    const idKey = recId ? String(recId) : (key || "");
    const completedNow = isRecCompleted(recId, recStatus, key);
    const nextStatus = completedNow ? "open" : "resolved";

    setCompletedOverrides((prev) => ({
      ...prev,
      [idKey]: !completedNow,
    }));

    if (recId) {
      try {
        await updateRecommendationStatus(activeProject.id, recId, nextStatus);
        await refreshOverview();
      } catch (err) {
        console.error("Failed to update recommendation status:", err);
        setCompletedOverrides((prev) => ({
          ...prev,
          [idKey]: completedNow,
        }));
      }
    }
  };

  const handleOpenImpactModal = (repoId: number | string, componentId?: string) => {
    setSelectedModalComponent({
      repoId,
      componentId: componentId || "",
    });
    setIsImpactModalOpen(true);
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    allRecommendations.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [allRecommendations]);

  const filteredRecommendations = useMemo(() => {
    return allRecommendations.filter((item) => {
      const { id, repoName, recommendation, priority, category, status } = item;
      const key = `${repoName}-${recommendation}`;
      const isCompleted = isRecCompleted(id, status, key);

      if (selectedPriority !== "all") {
        if (selectedPriority === "completed" && !isCompleted) return false;
        if (selectedPriority !== "completed") {
          if (isCompleted) return false;
          if (priority.toLowerCase() !== selectedPriority.toLowerCase()) return false;
        }
      }

      if (selectedCategory !== "all") {
        if (category !== selectedCategory) return false;
      }

      if (selectedRepo !== "all" && repoName !== selectedRepo) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesRec = recommendation.toLowerCase().includes(query);
        const matchesRepo = repoName.toLowerCase().includes(query);
        const matchesCategory = (category || "").toLowerCase().includes(query);
        if (!matchesRec && !matchesRepo && !matchesCategory) return false;
      }

      return true;
    });
  }, [allRecommendations, selectedPriority, selectedCategory, selectedRepo, searchQuery, completedOverrides]);

  const completedCount = allRecommendations.filter((r) =>
    isRecCompleted(r.id, r.status, `${r.repoName}-${r.recommendation}`)
  ).length;

  const activeCount = allRecommendations.length - completedCount;

  const highPriorityCount = allRecommendations.filter(
    (r) =>
      !isRecCompleted(r.id, r.status, `${r.repoName}-${r.recommendation}`) &&
      (r.priority.toLowerCase().includes("high") || r.priority.toLowerCase().includes("urgent"))
  ).length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-[13px] text-[var(--cd-ink-soft)]">
        <Sparkles className="h-4 w-4 animate-spin text-[var(--cd-accent)] mr-2" />
        Calculating architectural recommendations...
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[var(--cd-bg)] p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--cd-border-soft)] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--cd-accent-soft)] text-[var(--cd-accent)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-semibold text-[var(--cd-ink)]">
                Architecture Optimization Roadmap
              </h1>
              <span className="rounded-full bg-[var(--cd-sunken)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--cd-ink-soft)]">
                {activeProject?.name ?? "Organization"}
              </span>
            </div>
            <p className="text-[12px] text-[var(--cd-ink-faint)]">
              Concrete architectural patterns, blast-radius mitigation, and decoupling blueprints prioritized by AST coupling.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenImpactModal(repos[0]?.id || "")}
            className="cursor-pointer flex items-center gap-2 rounded-lg border border-[var(--cd-accent)]/40 bg-[var(--cd-accent-soft)] px-3.5 py-2 text-[12.5px] font-medium text-[var(--cd-accent)] hover:bg-[var(--cd-accent)] hover:text-white transition-all shadow-sm"
          >
            <Cpu className="h-4 w-4" />
            Simulate Blast Radius
          </button>
          <Link
            to="/dashboard/chat"
            className="flex items-center gap-2 rounded-lg bg-[var(--cd-accent)] px-3.5 py-2 text-[12.5px] font-medium text-white shadow-sm hover:bg-[var(--cd-accent-hover)] transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Ask AI Refactoring Plan
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11.5px] font-medium text-[var(--cd-ink-faint)]">
            <span>Actionable Refactors</span>
            <Zap className="h-3.5 w-3.5 text-[var(--cd-accent)]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--cd-ink)] font-mono">
            {activeCount}
          </div>
          <div className="mt-1 text-[11px] text-[var(--cd-ink-faint)]">
            Targeting modularity & testability
          </div>
        </div>

        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11.5px] font-medium text-[var(--cd-ink-faint)]">
            <span>High Priority Invariants</span>
            <ShieldAlert className="h-3.5 w-3.5 text-[var(--cd-bad)]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--cd-bad)] font-mono">
            {highPriorityCount}
          </div>
          <div className="mt-1 text-[11px] text-[var(--cd-ink-faint)]">
            Immediate boundary & coupling gains
          </div>
        </div>

        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11.5px] font-medium text-[var(--cd-ink-faint)]">
            <span>Projected Health Boost</span>
            <TrendingUp className="h-3.5 w-3.5 text-[var(--cd-good)]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--cd-good)] font-mono">
            +{Math.min(18, Math.max(8, 100 - healthScore))} pts
          </div>
          <div className="mt-1 text-[11px] text-[var(--cd-ink-faint)]">
            Targeting {Math.min(100, healthScore + 15)}/100 score
          </div>
        </div>

        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11.5px] font-medium text-[var(--cd-ink-faint)]">
            <span>Resolved Refactors</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--cd-good)]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--cd-good)] font-mono">
            {completedCount}
          </div>
          <div className="mt-1 text-[11px] text-[var(--cd-ink-faint)]">
            Architectural steps resolved
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--cd-ink-faint)]" />
            <input
              type="text"
              placeholder="Search components, ADRs, patterns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-48 sm:w-64 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] pl-8 pr-3 text-[12px] text-[var(--cd-ink)] outline-none focus:border-[var(--cd-accent)]"
            />
          </div>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="h-8 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-2.5 text-[12px] font-medium text-[var(--cd-ink)] outline-none focus:border-[var(--cd-accent)]"
          >
            <option value="all">All Priorities</option>
            <option value="high">High / Urgent</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="completed">Completed</option>
          </select>

          {/* Category Filter */}
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-8 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-2.5 text-[12px] font-medium text-[var(--cd-ink)] outline-none focus:border-[var(--cd-accent)]"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {/* Repository Filter */}
          <select
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            className="h-8 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-2.5 text-[12px] font-medium text-[var(--cd-ink)] outline-none focus:border-[var(--cd-accent)]"
          >
            <option value="all">All Repositories</option>
            {repos.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-[12px] text-[var(--cd-ink-faint)]">
          Showing <span className="font-semibold text-[var(--cd-ink)]">{filteredRecommendations.length}</span> of{" "}
          {allRecommendations.length} recommendations
        </div>
      </div>

      {/* Recommendations Cards */}
      {filteredRecommendations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--cd-border)] bg-[var(--cd-surface)] p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--cd-good-soft)] text-[var(--cd-good)] mb-3">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="text-[15px] font-semibold text-[var(--cd-ink)]">
            No Recommendations Pending
          </h3>
          <p className="mt-1 max-w-sm text-[12px] text-[var(--cd-ink-faint)]">
            {allRecommendations.length === 0
              ? "All repositories conform to clean architecture guidelines."
              : "No recommendations match your active filter criteria."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredRecommendations.map((item) => {
            const {
              id,
              status,
              repoName,
              repoId,
              recommendation,
              priority,
              componentId,
              componentName,
              subsystem,
              category,
              impact_summary,
              suggested_pattern,
              adr_reference,
              affected_components_count = 17,
              boundaries_crossed_count = 3,
              teams_impacted_count = 2,
            } = item;

            const key = id ? `${repoName}-${id}` : `${repoName}-${recommendation}`;
            const isCompleted = isRecCompleted(id, status, key);
            const isHigh = priority.toLowerCase().includes("high") || priority.toLowerCase().includes("urgent");

            return (
              <div
                key={key}
                className={`flex flex-col justify-between rounded-xl border p-5 shadow-sm transition-all ${
                  isCompleted
                    ? "border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] opacity-60"
                    : isHigh
                    ? "border-[var(--cd-accent)]/40 bg-[var(--cd-surface)] hover:border-[var(--cd-accent)] hover:shadow-md"
                    : "border-[var(--cd-border)] bg-[var(--cd-surface)] hover:border-[var(--cd-border-strong)] hover:shadow-md"
                }`}
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isCompleted
                            ? "bg-[var(--cd-sunken)] text-[var(--cd-ink-faint)]"
                            : isHigh
                            ? "bg-[var(--cd-bad-soft)] text-[var(--cd-bad)]"
                            : "bg-[var(--cd-accent-soft)] text-[var(--cd-accent)]"
                        }`}
                      >
                        {isCompleted ? "COMPLETED" : `${priority} Priority`}
                      </span>

                      {category && (
                        <span className="rounded bg-[var(--cd-sunken)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--cd-ink-soft)] flex items-center gap-1">
                          <Layers className="h-3 w-3 text-[var(--cd-ink-faint)]" />
                          {category}
                        </span>
                      )}

                      <span className="rounded bg-[var(--cd-sunken)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--cd-ink-soft)] flex items-center gap-1">
                        <GitBranch className="h-3 w-3 text-[var(--cd-ink-faint)]" />
                        {repoName}
                      </span>
                    </div>

                    <button
                      onClick={() => toggleCompleted(key)}
                      className="cursor-pointer text-[var(--cd-ink-faint)] hover:text-[var(--cd-good)] transition-colors p-1"
                      title={isCompleted ? "Mark incomplete" : "Mark as completed"}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-[var(--cd-good)]" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* Component & Subsystem Anchor */}
                  {(componentName || subsystem) && (
                    <div className="flex items-center gap-2 text-[11.5px] text-[var(--cd-ink-faint)]">
                      <Box className="h-3.5 w-3.5 text-[var(--cd-accent)]" />
                      <span className="font-semibold text-[var(--cd-ink)]">{componentName || componentId}</span>
                      {subsystem && (
                        <>
                          <span>•</span>
                          <span>{subsystem}</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Recommendation Statement */}
                  <h3 className="text-[14px] font-bold text-[var(--cd-ink)] leading-snug">
                    {recommendation}
                  </h3>

                  {/* 5-Point Consequence / Protection Telemetry Chips */}
                  <div className="rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] p-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)] mb-1.5 flex items-center gap-1">
                      <Zap className="h-3 w-3 text-[var(--cd-accent)]" />
                      Architectural Consequence & Invariant Protection
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] font-medium text-[var(--cd-ink-soft)]">
                      <div className="flex items-center gap-1">
                        <Box className="h-3 w-3 text-[var(--cd-accent)]" />
                        <span>{affected_components_count} components shielded</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-[var(--cd-good)]" />
                        <span>{boundaries_crossed_count} boundaries preserved</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-[var(--cd-ink-faint)]" />
                        <span>{teams_impacted_count} teams unblocked</span>
                      </div>
                    </div>
                    {adr_reference && (
                      <div className="mt-1.5 pt-1.5 border-t border-[var(--cd-border-soft)] text-[11px] text-[var(--cd-accent)] flex items-center gap-1">
                        <FileCode2 className="h-3 w-3" />
                        <span>Enforces: <span className="font-semibold">{adr_reference}</span></span>
                      </div>
                    )}
                  </div>

                  {/* Pattern & Rationale */}
                  {suggested_pattern && (
                    <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--cd-ink-soft)]">
                      <span className="font-semibold text-[var(--cd-ink)]">Recommended Pattern:</span>
                      <span className="rounded bg-[var(--cd-accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--cd-accent)]">
                        {suggested_pattern}
                      </span>
                    </div>
                  )}

                  <p className="text-[12px] text-[var(--cd-ink-faint)] leading-relaxed">
                    {impact_summary ||
                      "Decoupling this dependency path improves test isolation, reduces regression risk, and accelerates CI build times."}
                  </p>
                </div>

                {/* Card Action Footer */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--cd-border-soft)] pt-3.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenImpactModal(repoId, componentId)}
                      className="cursor-pointer flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-1.5 text-[11.5px] font-semibold text-white shadow-sm hover:bg-[var(--cd-accent-hover)] transition-all"
                    >
                      <Cpu className="h-3.5 w-3.5" />
                      View Recommended Blueprint & Blast Radius
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigate("/dashboard/chat");
                      }}
                      className="cursor-pointer flex items-center gap-1 text-[11.5px] font-semibold text-[var(--cd-ink-soft)] hover:text-[var(--cd-accent)] transition-colors"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Ask AI Plan
                    </button>

                    <button
                      onClick={() => toggleCompleted(id, status, key)}
                      className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        isCompleted
                          ? "bg-[var(--cd-sunken)] text-[var(--cd-ink-faint)] hover:bg-[var(--cd-border)]"
                          : "bg-[var(--cd-sunken)] text-[var(--cd-ink-soft)] hover:bg-[var(--cd-accent-soft)] hover:text-[var(--cd-accent)]"
                      }`}
                    >
                      {isCompleted ? "Reopen" : "Mark Done"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Architectural Impact & Recommended Design Blueprint Modal */}
      {isImpactModalOpen && activeProject?.id && (
        <ArchitecturalImpactModal
          isOpen={isImpactModalOpen}
          onClose={() => setIsImpactModalOpen(false)}
          orgId={activeProject.id}
          repositoryId={selectedModalComponent.repoId}
          initialComponentId={selectedModalComponent.componentId}
          onOpenAgentSpec={() => {
            setIsImpactModalOpen(false);
            navigate("/dashboard/chat");
          }}
        />
      )}
    </div>
  );
}
