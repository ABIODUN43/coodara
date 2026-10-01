import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ShieldCheck,
  Search,
  MessageSquare,
  CheckCircle2,
  AlertOctagon,
  Layers,
  RotateCcw,
} from "lucide-react";
import { useDashboardOverview } from "@/hooks/useDashboardOverview";
import { useProject } from "@/context/ProjectContext";
import { updateIssueStatus } from "@/api/architecture";
import { RiskRow } from "@/components/risks/RiskRow";
import { RiskInspector } from "@/components/risks/RiskInspector";

export function RisksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeProject } = useProject();
  const {
    loading,
    allIssues,
    allRecommendations,
    totalRepos,
    repos,
    refreshOverview,
  } = useDashboardOverview();

  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedRepo, setSelectedRepo] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [resolvedOverrides, setResolvedOverrides] = useState<Record<string, boolean>>({});
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(
    searchParams.get("finding") || null
  );

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
      console.error("Failed to update issue status:", err);
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

      // Type filtering
      if (selectedType !== "all" && issue.type.toLowerCase() !== selectedType.toLowerCase()) {
        return false;
      }

      // Repository filtering
      if (selectedRepo !== "all" && repoName !== selectedRepo) {
        return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDesc = (issue.description || "").toLowerCase().includes(query);
        const matchesType = (issue.type || "").toLowerCase().includes(query);
        const matchesTitle = (issue.title || "").toLowerCase().includes(query);
        const matchesRepo = repoName.toLowerCase().includes(query);
        const matchesComponent = (issue.component_ids || []).some((c) =>
          c.toLowerCase().includes(query)
        );
        if (!matchesDesc && !matchesType && !matchesTitle && !matchesRepo && !matchesComponent) {
          return false;
        }
      }

      return true;
    });
  }, [allIssues, selectedSeverity, selectedType, selectedRepo, searchQuery, isIssueResolved]);

  // Available unique categories
  const types = useMemo(() => {
    const set = new Set<string>();
    allIssues.forEach(({ issue }) => {
      if (issue.type) set.add(issue.type);
    });
    return Array.from(set);
  }, [allIssues]);

  // Real, grounded counts
  const totalActiveRisks = allIssues.filter(
    ({ issue }) => !isIssueResolved(issue.id, issue.status)
  ).length;

  const totalResolvedRisks = allIssues.length - totalActiveRisks;

  const activeCriticalCount = allIssues.filter(
    ({ issue }) =>
      !isIssueResolved(issue.id, issue.status) &&
      (issue.severity || "").toLowerCase() === "critical"
  ).length;

  const activeWarningCount = allIssues.filter(
    ({ issue }) =>
      !isIssueResolved(issue.id, issue.status) &&
      ((issue.severity || "").toLowerCase() === "high" ||
        (issue.severity || "").toLowerCase() === "warning")
  ).length;

  const activeMediumCount = totalActiveRisks - activeCriticalCount - activeWarningCount;

  // Sync selected finding with query parameters
  useEffect(() => {
    const findingFromUrl = searchParams.get("finding");
    if (findingFromUrl) {
      const match = allIssues.find(({ issue }) => String(issue.id) === findingFromUrl);
      if (match) {
        setSelectedIssueId(String(match.issue.id));
        return;
      }
    }

    // Default to first item if none selected and filtered issues are present
    if (!selectedIssueId && filteredIssues.length > 0) {
      setSelectedIssueId(String(filteredIssues[0].issue.id));
    }
  }, [searchParams, allIssues, filteredIssues, selectedIssueId]);

  const handleSelectFinding = (id: string) => {
    setSelectedIssueId(id);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("finding", id);
        return next;
      },
      { replace: true }
    );
  };

  const selectedFinding = useMemo(() => {
    if (!selectedIssueId) return null;
    return allIssues.find(({ issue }) => String(issue.id) === selectedIssueId) || null;
  }, [allIssues, selectedIssueId]);

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-3 text-[var(--cd-ink-soft)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--cd-accent)] border-t-transparent" />
        <div className="text-[13px] font-medium">Architecture analysis in progress...</div>
        <p className="text-[11.5px] text-[var(--cd-ink-faint)]">
          Evaluating AST dependency topologies and structural invariants.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[var(--cd-bg)] p-4 sm:p-6 space-y-4">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--cd-border-soft)] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--cd-bad-soft)] text-[var(--cd-bad)] shadow-xs">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-semibold tracking-tight text-[var(--cd-ink)]">
                Risks &amp; Evidence Intelligence
              </h1>
              <span className="rounded-full bg-[var(--cd-sunken)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--cd-ink-soft)] border border-[var(--cd-border-soft)]">
                {activeProject?.name ?? "Organization"}
              </span>
            </div>
            <p className="text-[12px] text-[var(--cd-ink-faint)]">
              Grounded architectural findings reconstructed from static dependency topology and AST symbol graphs.
            </p>
          </div>
        </div>

        <Link
          to={`/dashboard/organizations/${activeProject?.id ?? ""}/chat`}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--cd-accent)] px-3.5 py-2 text-[12.5px] font-semibold text-white shadow-xs hover:bg-[var(--cd-accent-hover)] transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Ask Chat Risk Remediation</span>
        </Link>
      </div>

      {/* 2. KPI Metrics Strip (Strictly Grounded, No Fake Sprints) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-[11.5px] font-medium text-[var(--cd-ink-faint)]">
            <span>Total Active Findings</span>
            <AlertTriangle className="h-3.5 w-3.5 text-[var(--cd-warn)]" />
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-[var(--cd-ink)]">
            {totalActiveRisks}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--cd-ink-faint)]">
            Across {totalRepos} monitored repositories
          </div>
        </div>

        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-[11.5px] font-medium text-[var(--cd-ink-faint)]">
            <span>Critical Blockers</span>
            <AlertOctagon className="h-3.5 w-3.5 text-[var(--cd-bad)]" />
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-[var(--cd-bad)]">
            {activeCriticalCount}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--cd-ink-faint)]">
            Immediate architectural refactoring
          </div>
        </div>

        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-[11.5px] font-medium text-[var(--cd-ink-faint)]">
            <span>Warnings &amp; Smells</span>
            <AlertTriangle className="h-3.5 w-3.5 text-[var(--cd-warn)]" />
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-[var(--cd-warn)]">
            {activeWarningCount}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--cd-ink-faint)]">
            Coupling and stability debt
          </div>
        </div>

        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-[11.5px] font-medium text-[var(--cd-ink-faint)]">
            <span>Resolved</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--cd-good)]" />
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-[var(--cd-good)]">
            {totalResolvedRisks}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--cd-ink-faint)]">
            Verified addressed findings
          </div>
        </div>
      </div>

      {/* 3. Filter Controls Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3 shadow-xs">
        {/* Left: Severity Pill Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedSeverity("all")}
            className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-all ${
              selectedSeverity === "all"
                ? "bg-[var(--cd-accent)] text-white shadow-xs"
                : "bg-[var(--cd-bg)] text-[var(--cd-ink-soft)] border border-[var(--cd-border-soft)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)]"
            }`}
          >
            All ({allIssues.length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedSeverity("critical")}
            className={`cursor-pointer flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-all ${
              selectedSeverity === "critical"
                ? "bg-[var(--cd-bad)] text-white shadow-xs"
                : "bg-[var(--cd-bg)] text-[var(--cd-bad)] border border-[var(--cd-bad)]/20 hover:bg-[var(--cd-bad-soft)]"
            }`}
          >
            <span>Critical</span>
            <span className="font-mono text-[10.5px]">({activeCriticalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedSeverity("high")}
            className={`cursor-pointer flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-all ${
              selectedSeverity === "high"
                ? "bg-[var(--cd-warn)] text-white shadow-xs"
                : "bg-[var(--cd-bg)] text-[var(--cd-warn)] border border-[var(--cd-warn)]/20 hover:bg-[var(--cd-warn-soft)]"
            }`}
          >
            <span>Warning</span>
            <span className="font-mono text-[10.5px]">({activeWarningCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedSeverity("medium")}
            className={`cursor-pointer flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-all ${
              selectedSeverity === "medium"
                ? "bg-[var(--cd-accent)] text-white shadow-xs"
                : "bg-[var(--cd-bg)] text-[var(--cd-ink-soft)] border border-[var(--cd-border-soft)] hover:bg-[var(--cd-sunken)]"
            }`}
          >
            <span>Info</span>
            <span className="font-mono text-[10.5px]">({activeMediumCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedSeverity("resolved")}
            className={`cursor-pointer flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-all ${
              selectedSeverity === "resolved"
                ? "bg-[var(--cd-good)] text-white shadow-xs"
                : "bg-[var(--cd-bg)] text-[var(--cd-good)] border border-[var(--cd-good)]/20 hover:bg-[var(--cd-good-soft)]"
            }`}
          >
            <span>Resolved</span>
            <span className="font-mono text-[10.5px]">({totalResolvedRisks})</span>
          </button>
        </div>

        {/* Right: Dropdowns & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Real-time search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--cd-ink-faint)]" />
            <input
              type="text"
              placeholder="Search findings, modules, repos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-44 sm:w-56 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] pl-8 pr-3 text-[12px] text-[var(--cd-ink)] outline-none focus:border-[var(--cd-accent)]"
            />
          </div>

          {/* Repository Dropdown */}
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

          {/* Category Dropdown */}
          {types.length > 0 && (
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-8 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-2.5 text-[12px] font-medium text-[var(--cd-ink)] outline-none focus:border-[var(--cd-accent)]"
            >
              <option value="all">All Finding Types</option>
              {types.map((t: string) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 4. Two-Pane Workspace Layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_460px] xl:grid-cols-[1fr_500px] items-start">
        {/* Left Pane: Risk List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11.5px] text-[var(--cd-ink-faint)] px-1">
            <span>
              Showing <span className="font-semibold text-[var(--cd-ink)]">{filteredIssues.length}</span> of{" "}
              {allIssues.length} findings
            </span>
            {(selectedSeverity !== "all" || selectedRepo !== "all" || selectedType !== "all" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSeverity("all");
                  setSelectedRepo("all");
                  setSelectedType("all");
                  setSearchQuery("");
                }}
                className="cursor-pointer text-[var(--cd-accent)] hover:underline flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset filters</span>
              </button>
            )}
          </div>

          {filteredIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--cd-border)] bg-[var(--cd-surface)] p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--cd-good-soft)] text-[var(--cd-good)] mb-3">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-[15px] font-semibold text-[var(--cd-ink)]">
                {allIssues.length === 0
                  ? "NO ACTIVE ARCHITECTURE RISKS"
                  : "No Matching Findings"}
              </h3>
              <p className="mt-1 max-w-md text-[12px] text-[var(--cd-ink-faint)] leading-relaxed">
                {allIssues.length === 0
                  ? "Coodara has not identified any current structural risks in the analyzed architecture. All modules conform to defined layer boundaries and stability invariants."
                  : "No architectural findings match the selected filter criteria. Try resetting severity, category, or search filters."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredIssues.map((finding) => {
                const isSelected = selectedIssueId === String(finding.issue.id);
                const isResolved = isIssueResolved(finding.issue.id, finding.issue.status);

                return (
                  <RiskRow
                    key={`${finding.repoName}-${finding.issue.id}`}
                    finding={finding}
                    isSelected={isSelected}
                    isResolved={isResolved}
                    onSelect={() => handleSelectFinding(String(finding.issue.id))}
                    onToggleResolved={(e) => {
                      e.stopPropagation();
                      toggleResolved(finding.issue.id, finding.issue.status);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Right Pane: Sticky Docked Contextual Inspector */}
        <div className="hidden lg:block sticky top-4 max-h-[calc(100vh-100px)]">
          {selectedFinding ? (
            <RiskInspector
              finding={selectedFinding}
              orgId={activeProject?.id ?? ""}
              isResolved={isIssueResolved(
                selectedFinding.issue.id,
                selectedFinding.issue.status
              )}
              onToggleResolved={() =>
                toggleResolved(selectedFinding.issue.id, selectedFinding.issue.status)
              }
              allRecommendations={allRecommendations}
            />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 text-center text-[var(--cd-ink-faint)]">
              <Layers className="h-8 w-8 mb-2 opacity-40 text-[var(--cd-accent)]" />
              <div className="text-[13px] font-semibold text-[var(--cd-ink)]">
                Select an Architectural Finding
              </div>
              <p className="text-[11.5px] max-w-xs mt-1">
                Choose any finding on the left to inspect its AST evidence, coupling metrics, and neighborhood.
              </p>
            </div>
          )}
        </div>

        {/* Mobile / Tablet Slide-over Drawer when a finding is selected */}
        {selectedFinding && (
          <div className="block lg:hidden mt-4">
            <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)] mb-2">
              Selected Finding Inspection
            </div>
            <RiskInspector
              finding={selectedFinding}
              orgId={activeProject?.id ?? ""}
              isResolved={isIssueResolved(
                selectedFinding.issue.id,
                selectedFinding.issue.status
              )}
              onToggleResolved={() =>
                toggleResolved(selectedFinding.issue.id, selectedFinding.issue.status)
              }
              allRecommendations={allRecommendations}
            />
          </div>
        )}
      </div>
    </div>
  );
}
