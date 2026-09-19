import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  History,
  GitCommit,
  TrendingUp,
  PlusCircle,
  MinusCircle,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Layers,
  Cpu,
  ShieldAlert,
  Sparkles,
  Search,
  Filter,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import {
  fetchRepositoryHistory,
  type ArchitectureEvent,
} from "@/api/memory";
import { listRepositories } from "@/api/repositories";
import type { Repository } from "@/types/repository";
import { useProject } from "@/context/ProjectContext";

export function HistoryPage() {
  const { orgId, repoId } = useParams<{ orgId?: string; repoId?: string }>();
  const navigate = useNavigate();
  const { activeProject } = useProject();

  const currentOrgId = orgId || (activeProject?.id ? String(activeProject.id) : "");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>(repoId || "");
  const [events, setEvents] = useState<ArchitectureEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "COMPONENT" | "TECH" | "ISSUE" | "SCORE">("ALL");

  // Keep selectedRepoId in sync with route param
  useEffect(() => {
    if (repoId && repoId !== selectedRepoId) {
      setSelectedRepoId(repoId);
    }
  }, [repoId]);

  // Load repositories for selector
  useEffect(() => {
    if (!currentOrgId) return;
    listRepositories(currentOrgId)
      .then((res) => {
        const repoList = res.items || [];
        setRepositories(repoList);
        if (!selectedRepoId && repoList.length > 0) {
          setSelectedRepoId(String(repoList[0].id));
        }
      })
      .catch(() => setRepositories([]));
  }, [currentOrgId]);

  // Load history data
  const loadHistory = () => {
    if (!currentOrgId || !selectedRepoId) return;
    setLoading(true);
    setError(null);
    fetchRepositoryHistory(currentOrgId, selectedRepoId, 0, 100)
      .then((res: any) => {
        const rawEvents = res?.events || res?.items || [];
        setEvents(Array.isArray(rawEvents) ? rawEvents : []);
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || "Failed to load architecture history.");
        setEvents([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHistory();
  }, [currentOrgId, selectedRepoId]);

  const handleRepoChange = (newRepoId: string) => {
    setSelectedRepoId(newRepoId);
    if (currentOrgId) {
      navigate(`/dashboard/organizations/${currentOrgId}/repositories/${newRepoId}/history`);
    }
  };

  const getEventBadge = (eventType: string) => {
    const type = (eventType || "").toUpperCase();
    if (type.includes("COMPONENT_ADDED") || type.includes("COMPONENT_REINTRODUCED")) {
      return {
        label: "Component Added",
        icon: <PlusCircle className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />,
        color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      };
    }
    if (type.includes("COMPONENT_REMOVED")) {
      return {
        label: "Component Removed",
        icon: <MinusCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />,
        color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      };
    }
    if (type.includes("TECHNOLOGY")) {
      return {
        label: "Tech Stack",
        icon: <Cpu className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />,
        color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
      };
    }
    if (type.includes("SCORE")) {
      return {
        label: "Score Shift",
        icon: <TrendingUp className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />,
        color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      };
    }
    if (type.includes("RESOLVED")) {
      return {
        label: "Issue Resolved",
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />,
        color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      };
    }
    if (type.includes("ISSUE") || type.includes("RISK")) {
      return {
        label: "Risk Detected",
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />,
        color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
    }
    if (type.includes("DECISION") || type.includes("ARCHITECTURE")) {
      return {
        label: "ADR / Invariant",
        icon: <Sparkles className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />,
        color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      };
    }
    return {
      label: eventType,
      icon: <Layers className="w-3.5 h-3.5 text-[var(--cd-ink-soft)]" />,
      color: "bg-[var(--cd-surface-subtle)] text-[var(--cd-ink)] border-[var(--cd-border)]",
    };
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const type = (ev.event_type || (ev as any).type || "").toUpperCase();
      const matchesSearch =
        searchQuery.trim() === "" ||
        (ev.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.details || "").toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === "ALL") return true;
      if (activeFilter === "COMPONENT") return type.includes("COMPONENT");
      if (activeFilter === "TECH") return type.includes("TECHNOLOGY") || type.includes("TECH");
      if (activeFilter === "ISSUE") return type.includes("ISSUE") || type.includes("RISK") || type.includes("RESOLVED");
      if (activeFilter === "SCORE") return type.includes("SCORE") || type.includes("DECISION") || type.includes("ARCHITECTURE");

      return true;
    });
  }, [events, searchQuery, activeFilter]);

  // Statistics
  const stats = useMemo(() => {
    let compCount = 0;
    let techCount = 0;
    let riskCount = 0;
    let scoreCount = 0;

    events.forEach((ev) => {
      const type = (ev.event_type || (ev as any).type || "").toUpperCase();
      if (type.includes("COMPONENT")) compCount++;
      else if (type.includes("TECHNOLOGY") || type.includes("TECH")) techCount++;
      else if (type.includes("ISSUE") || type.includes("RISK") || type.includes("RESOLVED")) riskCount++;
      else if (type.includes("SCORE") || type.includes("DECISION")) scoreCount++;
    });

    return { compCount, techCount, riskCount, scoreCount };
  }, [events]);

  const activeRepo = repositories.find((r) => String(r.id) === selectedRepoId);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[var(--cd-bg)] p-4 sm:p-6 space-y-6">
      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--cd-ink-faint)]">
        <Link to="/dashboard/organizations" className="hover:text-[var(--cd-ink)] transition-colors">
          Organizations
        </Link>
        <span>/</span>
        {currentOrgId && (
          <>
            <Link to={`/dashboard/organizations/${currentOrgId}/repositories`} className="hover:text-[var(--cd-ink)] transition-colors">
              {activeProject?.name || `Org #${currentOrgId}`}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-[var(--cd-ink)] font-medium">Architecture History</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[var(--cd-border-soft)] pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--cd-accent-soft)] text-[var(--cd-accent)] border border-[var(--cd-accent)]/20 shadow-xs">
            <History className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[19px] font-semibold text-[var(--cd-ink)] tracking-tight">
                Architecture History & Evolution
              </h1>
              <span className="rounded-full bg-[var(--cd-accent-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--cd-accent)] border border-[var(--cd-accent)]/20">
                Timeline Ledger
              </span>
            </div>
            <p className="text-[12.5px] text-[var(--cd-ink-faint)] mt-0.5">
              Chronological immutable ledger of component additions, technology stack shifts, and architectural invariants.
            </p>
          </div>
        </div>

        {/* Action buttons & repository selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {repositories.length > 0 && (
            <div className="flex items-center gap-2 bg-[var(--cd-surface)] border border-[var(--cd-border)] rounded-xl px-3 py-1.5 shadow-xs">
              <span className="text-[12px] font-medium text-[var(--cd-ink-faint)]">Repository:</span>
              <select
                value={selectedRepoId}
                onChange={(e) => handleRepoChange(e.target.value)}
                className="bg-transparent text-[13px] font-semibold text-[var(--cd-ink)] focus:outline-none cursor-pointer"
              >
                {repositories.map((repo) => (
                  <option key={repo.id} value={String(repo.id)} className="bg-[var(--cd-surface)] text-[var(--cd-ink)]">
                    {repo.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={loadHistory}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] hover:bg-[var(--cd-sunken)] text-[12.5px] font-medium text-[var(--cd-ink-soft)] transition-colors shadow-xs"
            title="Refresh History"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          {currentOrgId && selectedRepoId && (
            <Link
              to={`/dashboard/organizations/${currentOrgId}/repositories/${selectedRepoId}/architecture`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--cd-ink)] hover:bg-[var(--cd-ink)]/90 text-[var(--cd-bg)] text-[12.5px] font-semibold transition-colors shadow-xs"
            >
              <span>Architecture Overview</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <button
          onClick={() => setActiveFilter("ALL")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeFilter === "ALL"
              ? "bg-[var(--cd-accent-soft)]/50 border-[var(--cd-accent)] shadow-xs"
              : "bg-[var(--cd-surface)] border-[var(--cd-border)] hover:border-[var(--cd-border-soft)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-[var(--cd-ink-faint)]">Total Events</span>
            <History className="w-4 h-4 text-[var(--cd-accent)]" />
          </div>
          <div className="text-[20px] font-bold text-[var(--cd-ink)] mt-1">{events.length}</div>
        </button>

        <button
          onClick={() => setActiveFilter("COMPONENT")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeFilter === "COMPONENT"
              ? "bg-emerald-500/10 border-emerald-500/40 shadow-xs"
              : "bg-[var(--cd-surface)] border-[var(--cd-border)] hover:border-[var(--cd-border-soft)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-[var(--cd-ink-faint)]">Components</span>
            <Layers className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-[20px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.compCount}</div>
        </button>

        <button
          onClick={() => setActiveFilter("TECH")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeFilter === "TECH"
              ? "bg-cyan-500/10 border-cyan-500/40 shadow-xs"
              : "bg-[var(--cd-surface)] border-[var(--cd-border)] hover:border-[var(--cd-border-soft)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-[var(--cd-ink-faint)]">Technologies</span>
            <Cpu className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-[20px] font-bold text-cyan-600 dark:text-cyan-400 mt-1">{stats.techCount}</div>
        </button>

        <button
          onClick={() => setActiveFilter("ISSUE")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeFilter === "ISSUE"
              ? "bg-amber-500/10 border-amber-500/40 shadow-xs"
              : "bg-[var(--cd-surface)] border-[var(--cd-border)] hover:border-[var(--cd-border-soft)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-[var(--cd-ink-faint)]">Risks & Issues</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-[20px] font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.riskCount}</div>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--cd-surface)] border border-[var(--cd-border)] rounded-xl p-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cd-ink-faint)]" />
          <input
            type="text"
            placeholder="Search evolution events, files, or components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[var(--cd-sunken)] border border-[var(--cd-border-soft)] rounded-lg text-[12.5px] text-[var(--cd-ink)] placeholder-[var(--cd-ink-faint)] focus:outline-none focus:border-[var(--cd-accent)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-[var(--cd-ink-faint)] mr-1 hidden sm:block" />
          {(
            [
              { id: "ALL", label: "All" },
              { id: "COMPONENT", label: "Components" },
              { id: "TECH", label: "Technologies" },
              { id: "ISSUE", label: "Risks & Resolves" },
              { id: "SCORE", label: "Scores & ADRs" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-[11.5px] font-medium transition-colors ${
                activeFilter === tab.id
                  ? "bg-[var(--cd-ink)] text-[var(--cd-bg)]"
                  : "bg-[var(--cd-sunken)] hover:bg-[var(--cd-border-soft)] text-[var(--cd-ink-soft)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Evolution Timeline */}
      {loading ? (
        <div className="py-20 text-center text-[13px] text-[var(--cd-ink-soft)] space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[var(--cd-accent)]" />
          <p>Loading architectural evolution ledger...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-5 text-center text-[13px] text-rose-600 dark:text-rose-400">
          {error}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-[var(--cd-surface)] border border-[var(--cd-border)] rounded-xl p-12 text-center text-[var(--cd-ink-soft)] space-y-3 shadow-xs">
          <GitCommit className="w-8 h-8 text-[var(--cd-ink-faint)] mx-auto" />
          <h3 className="text-[14px] font-semibold text-[var(--cd-ink)]">
            {events.length === 0 ? "No Evolution Events Recorded Yet" : "No Matching Events Found"}
          </h3>
          <p className="text-[12px] text-[var(--cd-ink-faint)] max-w-md mx-auto">
            {events.length === 0
              ? "Architectural changes will be detected and logged automatically as repository code evolves."
              : "Try adjusting your search query or filter criteria to see other events."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[12px] text-[var(--cd-ink-faint)]">
            <span>
              Showing {filteredEvents.length} of {events.length} recorded evolution events
            </span>
            <span className="font-mono">
              {activeRepo ? activeRepo.name : `Repo #${selectedRepoId}`}
            </span>
          </div>

          <div className="relative pl-6 border-l-2 border-[var(--cd-border)] space-y-4">
            {filteredEvents.map((ev: any) => {
              const eventType = ev.event_type || ev.type || "COMPONENT_ADDED";
              const badge = getEventBadge(eventType);
              const createdAt = ev.created_at || ev.timestamp;

              return (
                <div key={ev.id} className="relative group">
                  {/* Timeline bullet */}
                  <div className="absolute -left-[31px] top-1.5 p-1 bg-[var(--cd-surface)] border-2 border-[var(--cd-border)] group-hover:border-[var(--cd-accent)] rounded-full transition-colors">
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--cd-accent)]" />
                  </div>

                  <div className="bg-[var(--cd-surface)] border border-[var(--cd-border)] hover:border-[var(--cd-border-soft)] rounded-xl p-4.5 space-y-2.5 shadow-xs transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1.5 ${badge.color}`}
                        >
                          {badge.icon}
                          {badge.label}
                        </span>
                        {ev.analysis_id && (
                          <span className="text-[11.5px] text-[var(--cd-ink-faint)] font-mono">
                            Analysis #{ev.analysis_id}
                          </span>
                        )}
                      </div>

                      <span className="text-[11.5px] text-[var(--cd-ink-faint)] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {createdAt ? new Date(createdAt).toLocaleString() : "Recent"}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-[13.5px] font-semibold text-[var(--cd-ink)]">{ev.title}</h3>
                      {ev.description && (
                        <p className="text-[12px] text-[var(--cd-ink-soft)] mt-1 leading-relaxed">
                          {ev.description}
                        </p>
                      )}
                    </div>

                    {ev.details && (
                      <div className="bg-[var(--cd-sunken)] border border-[var(--cd-border-soft)] rounded-lg p-2.5 text-[11px] font-mono text-[var(--cd-ink-soft)] overflow-x-auto">
                        {typeof ev.details === "string" ? ev.details : JSON.stringify(ev.details, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
