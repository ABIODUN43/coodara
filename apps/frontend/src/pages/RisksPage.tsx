import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ShieldCheck,
  Search,
  MessageSquare,
  CheckCircle2,
  AlertOctagon,
  GitBranch,
  Layers,
} from "lucide-react";
import { useDashboardOverview } from "@/hooks/useDashboardOverview";
import { useProject } from "@/context/ProjectContext";
import { updateIssueStatus } from "@/api/architecture";

export function RisksPage() {
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const {
    loading,
    allIssues,
    criticalFindingsCount,
    warningFindingsCount,
    totalRepos,
    repos,
    refreshOverview,
  } = useDashboardOverview();

  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedRepo, setSelectedRepo] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [resolvedOverrides, setResolvedOverrides] = useState<Record<string, boolean>>({});

  const isIssueResolved = (issueId: string, status?: string) => {
    if (issueId in resolvedOverrides) {
      return resolvedOverrides[issueId];
    }
    return status === "resolved" || status === "dismissed";
  };

  const toggleResolved = async (issueId: string, currentStatus?: string) => {
    if (!activeProject?.id || !issueId) return;
    const resolvedNow = isIssueResolved(issueId, currentStatus);
    const nextStatus = resolvedNow ? "open" : "resolved";

    setResolvedOverrides((prev) => ({
      ...prev,
      [issueId]: !resolvedNow,
    }));

    try {
      await updateIssueStatus(activeProject.id, issueId, nextStatus);
      await refreshOverview();
    } catch (err) {
      console.error("Failed to update issue status:", err);
      setResolvedOverrides((prev) => ({
        ...prev,
        [issueId]: resolvedNow,
      }));
    }
  };

  const filteredIssues = useMemo(() => {
    return allIssues.filter(({ repoName, issue }) => {
      const isResolved = isIssueResolved(issue.id, issue.status);

      if (selectedSeverity !== "all") {
        if (selectedSeverity === "resolved" && !isResolved) return false;
        if (selectedSeverity !== "resolved") {
          if (isResolved) return false;
          if (issue.severity.toLowerCase() !== selectedSeverity.toLowerCase()) return false;
        }
      }

      if (selectedType !== "all" && issue.type.toLowerCase() !== selectedType.toLowerCase()) {
        return false;
      }

      if (selectedRepo !== "all" && repoName !== selectedRepo) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDesc = issue.description.toLowerCase().includes(query);
        const matchesType = (issue.type || "").toLowerCase().includes(query);
        const matchesTitle = (issue.title || "").toLowerCase().includes(query);
        const matchesRepo = repoName.toLowerCase().includes(query);
        if (!matchesDesc && !matchesType && !matchesTitle && !matchesRepo) return false;
      }

      return true;
    });
  }, [allIssues, selectedSeverity, selectedType, selectedRepo, searchQuery, resolvedOverrides]);

  const types = useMemo(() => {
    const set = new Set<string>();
    allIssues.forEach(({ issue }) => {
      if (issue.type) set.add(issue.type);
    });
    return Array.from(set);
  }, [allIssues]);

  const totalActiveRisks = allIssues.filter(
    ({ issue }) => !isIssueResolved(issue.id, issue.status)
  ).length;

  const totalResolvedRisks = allIssues.length - totalActiveRisks;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-[13px] text-[var(--cd-ink-soft)]">
        Loading architecture risk telemetry...
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[var(--cd-bg)] p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--cd-border-soft)] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--cd-bad-soft)] text-[var(--cd-bad)]">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-semibold text-[var(--cd-ink)]">
                Architectural Risks & Violations
              </h1>
              <span className="rounded-full bg-[var(--cd-sunken)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--cd-ink-soft)]">
                {activeProject?.name ?? "Organization"}
              </span>
            </div>
            <p className="text-[12px] text-[var(--cd-ink-faint)]">
              Structural smells, circular dependencies, high coupling, and layer boundary violations across repositories.
            </p>
          </div>
        </div>

        <Link
          to="/dashboard/chat"
          className="flex items-center gap-2 rounded-lg bg-[var(--cd-accent)] px-3.5 py-2 text-[12.5px] font-medium text-white shadow-sm hover:bg-[var(--cd-accent-hover)] transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          Ask Chat Risk Remediation
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11.5px] font-medium text-[var(--cd-ink-faint)]">
            <span>Total Active Risks</span>
            <AlertTriangle className="h-3.5 w-3.5 text-[var(--cd-warn)]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--cd-ink)] font-mono">
            {totalActiveRisks}
          </div>
          <div className="mt-1 text-[11px] text-[var(--cd-ink-faint)]">
            Across {totalRepos} monitored repositories
          </div>
        </div>

        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11.5px] font-medium text-[var(--cd-ink-faint)]">
            <span>Critical Blockers</span>
            <AlertOctagon className="h-3.5 w-3.5 text-[var(--cd-bad)]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--cd-bad)] font-mono">
            {criticalFindingsCount}
          </div>
          <div className="mt-1 text-[11px] text-[var(--cd-ink-faint)]">
            Immediate refactoring required
          </div>
        </div>

        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11.5px] font-medium text-[var(--cd-ink-faint)]">
            <span>Warnings & Smells</span>
            <AlertTriangle className="h-3.5 w-3.5 text-[var(--cd-warn)]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--cd-warn)] font-mono">
            {warningFindingsCount}
          </div>
          <div className="mt-1 text-[11px] text-[var(--cd-ink-faint)]">
            Structural debt to monitor
          </div>
        </div>

        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11.5px] font-medium text-[var(--cd-ink-faint)]">
            <span>Resolved This Sprint</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--cd-good)]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--cd-good)] font-mono">
            {totalResolvedRisks}
          </div>
          <div className="mt-1 text-[11px] text-[var(--cd-ink-faint)]">
            Marked as addressed
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
              placeholder="Search risks, types, repos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-48 sm:w-60 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] pl-8 pr-3 text-[12px] text-[var(--cd-ink)] outline-none focus:border-[var(--cd-accent)]"
            />
          </div>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="h-8 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-2.5 text-[12px] font-medium text-[var(--cd-ink)] outline-none focus:border-[var(--cd-accent)]"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Type Filter */}
          {types.length > 0 && (
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-8 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-2.5 text-[12px] font-medium text-[var(--cd-ink)] outline-none focus:border-[var(--cd-accent)]"
            >
              <option value="all">All Risk Types</option>
              {types.map((t: string) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
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
          Showing <span className="font-semibold text-[var(--cd-ink)]">{filteredIssues.length}</span> of{" "}
          {allIssues.length} risks
        </div>
      </div>

      {/* Risks Table / Cards */}
      {filteredIssues.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--cd-border)] bg-[var(--cd-surface)] p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--cd-good-soft)] text-[var(--cd-good)] mb-3">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="text-[15px] font-semibold text-[var(--cd-ink)]">
            No Architectural Risks Found
          </h3>
          <p className="mt-1 max-w-sm text-[12px] text-[var(--cd-ink-faint)]">
            {allIssues.length === 0
              ? "All repositories in this organization are clean. No circular dependencies, layer inversions, or high-coupling issues detected."
              : "No risks match your active filter criteria. Try clearing search or severity filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIssues.map(({ repoName, issue }) => {
            const key = `${repoName}-${issue.id}-${issue.type}`;
            const isResolved = isIssueResolved(issue.id, issue.status);
            const isCritical = issue.severity.toLowerCase() === "critical";

            return (
              <div
                key={key}
                className={`flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition-all sm:flex-row sm:items-start sm:justify-between ${
                  isResolved
                    ? "border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] opacity-60"
                    : isCritical
                    ? "border-[var(--cd-bad)]/40 bg-[var(--cd-surface)] hover:border-[var(--cd-bad)]"
                    : "border-[var(--cd-border)] bg-[var(--cd-surface)] hover:border-[var(--cd-accent)]"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${
                      isResolved
                        ? "bg-[var(--cd-sunken)] text-[var(--cd-ink-faint)]"
                        : isCritical
                        ? "bg-[var(--cd-bad-soft)] text-[var(--cd-bad)]"
                        : "bg-[var(--cd-warn-soft)] text-[var(--cd-warn)]"
                    }`}
                  >
                    {isResolved ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isCritical ? (
                      <AlertOctagon className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`text-[13.5px] font-semibold ${
                          isResolved ? "line-through text-[var(--cd-ink-faint)]" : "text-[var(--cd-ink)]"
                        }`}
                      >
                        {issue.title || issue.type.replace(/_/g, " ")}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase ${
                          isResolved
                            ? "bg-[var(--cd-sunken)] text-[var(--cd-ink-faint)]"
                            : isCritical
                            ? "bg-[var(--cd-bad-soft)] text-[var(--cd-bad)]"
                            : "bg-[var(--cd-warn-soft)] text-[var(--cd-warn)]"
                        }`}
                      >
                        {issue.severity}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-[var(--cd-ink-faint)]">
                        <GitBranch className="h-3 w-3" />
                        {repoName}
                      </span>
                    </div>

                    <p className="mt-1 text-[12px] text-[var(--cd-ink-soft)] leading-relaxed">
                      {issue.description}
                    </p>

                    {issue.component_ids && issue.component_ids.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11.5px] font-mono text-[var(--cd-ink-faint)]">
                        <Layers className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{issue.component_ids.join(", ")}</span>
                      </div>
                    )}

                    <div className="mt-2 text-[11px] text-[var(--cd-ink-faint)]">
                      Impact: Affects module isolation, testability, and refactoring safety.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0 pt-2 sm:pt-0">
                  <button
                    onClick={() => {
                      navigate("/dashboard/chat");
                    }}
                    className="cursor-pointer flex items-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)]"
                    title="Ask Coodara AI for a step-by-step refactoring plan"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-[var(--cd-accent)]" />
                    Ask Chat Fix
                  </button>

                  <button
                    onClick={() => toggleResolved(issue.id, issue.status)}
                    className={`cursor-pointer flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium transition-colors ${
                      isResolved
                        ? "bg-[var(--cd-surface)] text-[var(--cd-ink-soft)] border border-[var(--cd-border)] hover:bg-[var(--cd-sunken)]"
                        : "bg-[var(--cd-good-soft)] text-[var(--cd-good)] border border-[var(--cd-good)]/30 hover:bg-[var(--cd-good)] hover:text-white"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {isResolved ? "Reopen" : "Mark Resolved"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
