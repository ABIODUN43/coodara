import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ShieldCheck,
  Search,
  MessageSquare,
  AlertOctagon,
  Layers,
  RotateCcw,
  FlaskConical,
} from "lucide-react";
import { useDashboardOverview } from "@/hooks/useDashboardOverview";
import { useProject } from "@/context/ProjectContext";
import { updateIssueStatus } from "@/api/architecture";
import { RiskRow } from "@/components/risks/RiskRow";
import { RiskInspector } from "@/components/risks/RiskInspector";

export function FindingsPage() {
  const { id: routeFindingId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const { activeProject } = useProject();
  const {
    loading,
    allIssues,
    allRecommendations,
    refreshOverview,
  } = useDashboardOverview();

  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedRepo, setSelectedRepo] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [resolvedOverrides, setResolvedOverrides] = useState<Record<string, boolean>>({});
  
  // URL finding id takes precedence, then searchParam, then null
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(
    routeFindingId || searchParams.get("finding") || null
  );

  useEffect(() => {
    if (routeFindingId) {
      setSelectedIssueId(routeFindingId);
    } else if (searchParams.get("finding")) {
      setSelectedIssueId(searchParams.get("finding"));
    }
  }, [routeFindingId, searchParams]);

  // Check resolved status with optimistic overrides
  const isIssueResolved = useCallback(
    (issueId: string, status?: string) => {
      if (issueId in resolvedOverrides) {
        return resolvedOverrides[issueId];
      }
      return status === "resolved" || status === "dismissed";
    },
    [resolvedOverrides]
  );

  // Persistent issue resolution lifecycle with rollback
  const toggleResolved = async (issueId: string, currentStatus?: string) => {
    if (!activeProject?.id || !issueId) return;
    const resolvedNow = isIssueResolved(issueId, currentStatus);
    const nextStatus = resolvedNow ? "open" : "resolved";

    // Optimistic UI update
    setResolvedOverrides((prev) => ({
      ...prev,
      [issueId]: !resolvedNow,
    }));

    try {
      await updateIssueStatus(activeProject.id, issueId, nextStatus);
      await refreshOverview();
    } catch (err) {
      console.error("Failed to update finding status:", err);
      // Rollback on error
      setResolvedOverrides((prev) => ({
        ...prev,
        [issueId]: resolvedNow,
      }));
    }
  };

  // Filter issues based on active filters
  const filteredIssues = useMemo(() => {
    return allIssues.filter(({ repoName, issue }) => {
      const isResolved = isIssueResolved(issue.id, issue.status);

      // Severity filtering
      if (selectedSeverity !== "all") {
        if (selectedSeverity === "resolved") {
          if (!isResolved) return false;
        } else {
          if (isResolved) return false;
          const sev = (issue.severity || "").toLowerCase();
          if (selectedSeverity === "critical" && sev !== "critical") return false;
          if (
            selectedSeverity === "high" &&
            sev !== "high" &&
            sev !== "warning"
          ) {
            return false;
          }
          if (
            selectedSeverity === "medium" &&
            sev !== "medium" &&
            sev !== "low" &&
            sev !== "info"
          ) {
            return false;
          }
        }
      }

      // Type / Category filtering
      if (selectedType !== "all") {
        const typeStr = (issue.type || "").toLowerCase();
        if (selectedType === "cycles" && !typeStr.includes("cycle") && !typeStr.includes("circular")) return false;
        if (
          selectedType === "boundary" &&
          !typeStr.includes("boundary") &&
          !typeStr.includes("layer")
        ) {
          return false;
        }
        if (
          selectedType === "coupling" &&
          !typeStr.includes("coupling") &&
          !typeStr.includes("instability") &&
          !typeStr.includes("hub")
        ) {
          return false;
        }
        if (selectedType === "god_component" && !typeStr.includes("god") && !typeStr.includes("smell")) return false;
      }

      // Repository filtering
      if (selectedRepo !== "all") {
        if (repoName !== selectedRepo) return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = (issue.title || "").toLowerCase().includes(query);
        const descMatch = (issue.description || "").toLowerCase().includes(query);
        const compMatch = (issue.component_ids || []).some((c) => c.toLowerCase().includes(query));
        const repoMatch = repoName.toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !compMatch && !repoMatch) return false;
      }

      return true;
    });
  }, [
    allIssues,
    selectedSeverity,
    selectedType,
    selectedRepo,
    searchQuery,
    isIssueResolved,
  ]);

  // Aggregate counts
  const counts = useMemo(() => {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let resolved = 0;

    allIssues.forEach(({ issue }) => {
      const isResolved = isIssueResolved(issue.id, issue.status);
      if (isResolved) {
        resolved++;
      } else {
        const sev = (issue.severity || "").toLowerCase();
        if (sev === "critical") critical++;
        else if (sev === "high" || sev === "warning") high++;
        else medium++;
      }
    });

    return { critical, high, medium, resolved, total: allIssues.length };
  }, [allIssues, isIssueResolved]);

  // Selected issue item
  const selectedFindingItem = useMemo(() => {
    if (!selectedIssueId) return null;
    return allIssues.find((item) => item.issue.id === selectedIssueId) || null;
  }, [allIssues, selectedIssueId]);

  const uniqueRepos = useMemo(() => {
    const set = new Set<string>();
    allIssues.forEach((i) => set.add(i.repoName));
    return Array.from(set).sort();
  }, [allIssues]);

  return (
    <div className="flex h-full min-h-[calc(100vh-52px)] flex-col bg-[var(--cd-bg)] p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[var(--cd-ink)] sm:text-2xl">
              Architectural Findings
            </h1>
            <span className="rounded-full bg-[var(--cd-sunken)] px-2.5 py-0.5 font-mono text-xs font-semibold text-[var(--cd-ink-soft)] border border-[var(--cd-border)]">
              {counts.total - counts.resolved} active
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[var(--cd-ink-soft)] max-w-2xl">
            Evidence-backed architectural violations, circular dependencies, unstable boundaries, and refactoring candidates. Select any finding to investigate in the Architecture Lab.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/lab"
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors shadow-xs"
          >
            <FlaskConical className="h-3.5 w-3.5" />
            <span>Open Architecture Lab</span>
          </Link>

          <Link
            to="/chat"
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-2 text-xs font-semibold text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors shadow-xs"
          >
            <MessageSquare className="h-3.5 w-3.5 text-[var(--cd-accent)]" />
            <span>Ask Coodara Chat</span>
          </Link>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div
          onClick={() => setSelectedSeverity(selectedSeverity === "critical" ? "all" : "critical")}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            selectedSeverity === "critical"
              ? "border-rose-500/50 bg-rose-500/10 shadow-sm"
              : "border-[var(--cd-border)] bg-[var(--cd-surface)] hover:border-rose-500/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[var(--cd-ink-soft)]">
            <span className="font-medium text-rose-600 dark:text-rose-400">Critical Severity</span>
            <AlertOctagon className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[var(--cd-ink)]">
            {counts.critical}
          </div>
          <p className="mt-1 text-[11px] text-[var(--cd-ink-faint)]">
            Immediate architectural hazards
          </p>
        </div>

        <div
          onClick={() => setSelectedSeverity(selectedSeverity === "high" ? "all" : "high")}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            selectedSeverity === "high"
              ? "border-amber-500/50 bg-amber-500/10 shadow-sm"
              : "border-[var(--cd-border)] bg-[var(--cd-surface)] hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[var(--cd-ink-soft)]">
            <span className="font-medium text-amber-600 dark:text-amber-400">High / Warning</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[var(--cd-ink)]">
            {counts.high}
          </div>
          <p className="mt-1 text-[11px] text-[var(--cd-ink-faint)]">
            Severe boundary and coupling risks
          </p>
        </div>

        <div
          onClick={() => setSelectedSeverity(selectedSeverity === "medium" ? "all" : "medium")}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            selectedSeverity === "medium"
              ? "border-sky-500/50 bg-sky-500/10 shadow-sm"
              : "border-[var(--cd-border)] bg-[var(--cd-surface)] hover:border-sky-500/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[var(--cd-ink-soft)]">
            <span className="font-medium text-sky-600 dark:text-sky-400">Medium / Notice</span>
            <Layers className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[var(--cd-ink)]">
            {counts.medium}
          </div>
          <p className="mt-1 text-[11px] text-[var(--cd-ink-faint)]">
            Technical debt & instability drift
          </p>
        </div>

        <div
          onClick={() => setSelectedSeverity(selectedSeverity === "resolved" ? "all" : "resolved")}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            selectedSeverity === "resolved"
              ? "border-emerald-500/50 bg-emerald-500/10 shadow-sm"
              : "border-[var(--cd-border)] bg-[var(--cd-surface)] hover:border-emerald-500/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[var(--cd-ink-soft)]">
            <span className="font-medium text-emerald-600 dark:text-emerald-400">Resolved</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[var(--cd-ink)]">
            {counts.resolved}
          </div>
          <p className="mt-1 text-[11px] text-[var(--cd-ink-faint)]">
            Addressed or remediated
          </p>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 flex-col lg:flex-row gap-6 min-h-0">
        {/* Left Column: Filter Bar & Findings List */}
        <div
          className={`flex flex-col flex-1 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] overflow-hidden transition-all ${
            selectedFindingItem ? "lg:max-w-[55%]" : "w-full"
          }`}
        >
          {/* Controls Header */}
          <div className="p-4 border-b border-[var(--cd-border-soft)] space-y-3 bg-[var(--cd-bg)]/40">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--cd-ink-faint)]" />
              <input
                type="text"
                placeholder="Search findings by title, component, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] pl-9 pr-4 py-2 text-xs text-[var(--cd-ink)] placeholder:text-[var(--cd-ink-faint)] focus:border-[var(--cd-accent)] focus:outline-none transition-colors"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-1.5 text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
              >
                <option value="all">All Finding Categories</option>
                <option value="cycles">Circular Dependencies</option>
                <option value="boundary">Boundary Violations</option>
                <option value="coupling">Coupling & Instability</option>
                <option value="god_component">Hub & God Components</option>
              </select>

              {uniqueRepos.length > 1 && (
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-1.5 text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
                >
                  <option value="all">All Repositories</option>
                  {uniqueRepos.map((repo) => (
                    <option key={repo} value={repo}>
                      {repo}
                    </option>
                  ))}
                </select>
              )}

              {(selectedSeverity !== "all" || selectedType !== "all" || selectedRepo !== "all" || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSeverity("all");
                    setSelectedType("all");
                    setSelectedRepo("all");
                    setSearchQuery("");
                  }}
                  className="cursor-pointer inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[var(--cd-ink-faint)] hover:text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset filters</span>
                </button>
              )}
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--cd-border-soft)]">
            {loading ? (
              <div className="flex h-48 items-center justify-center text-xs text-[var(--cd-ink-faint)]">
                Loading architectural findings...
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <ShieldCheck className="h-10 w-10 text-emerald-500 mb-2 opacity-80" />
                <h3 className="text-sm font-semibold text-[var(--cd-ink)]">
                  No architectural findings matching filters
                </h3>
                <p className="mt-1 text-xs text-[var(--cd-ink-faint)] max-w-sm">
                  {searchQuery || selectedSeverity !== "all" || selectedType !== "all"
                    ? "Try adjusting your search criteria or resetting filters."
                    : "No structural risks or boundary violations were identified."}
                </p>
              </div>
            ) : (
              filteredIssues.map((item) => (
                <RiskRow
                  key={item.issue.id}
                  finding={item}
                  isSelected={selectedIssueId === item.issue.id}
                  isResolved={isIssueResolved(item.issue.id, item.issue.status)}
                  onSelect={() => setSelectedIssueId(item.issue.id)}
                  onToggleResolved={() => toggleResolved(item.issue.id, item.issue.status)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Column: Finding Inspector / Detail View */}
        {selectedFindingItem && (
          <div className="flex-1 lg:max-w-[45%] h-full min-h-[500px]">
            <RiskInspector
              finding={selectedFindingItem}
              orgId={activeProject?.id || 1}
              isResolved={isIssueResolved(
                selectedFindingItem.issue.id,
                selectedFindingItem.issue.status
              )}
              onToggleResolved={() =>
                toggleResolved(
                  selectedFindingItem.issue.id,
                  selectedFindingItem.issue.status
                )
              }
              onClose={() => setSelectedIssueId(null)}
              allRecommendations={allRecommendations}
            />
          </div>
        )}
      </div>
    </div>
  );
}
