import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Brain,
  Search,
  Layers,
  Cpu,
  Sparkles,
  GitCommit,
  Clock,
  Code2,
  FileCode2,
} from "lucide-react";
import {
  fetchRepositoryMemory,
  searchRepositoryMemory,
  type ArchitectureMemoryOverview,
  type ScoredMemoryEntry,
} from "@/api/memory";
import { listRepositories } from "@/api/repositories";
import type { Repository } from "@/types/repository";
import { useProject } from "@/context/ProjectContext";

export function MemoryPage() {
  const { orgId, repoId } = useParams<{ orgId?: string; repoId?: string }>();
  const navigate = useNavigate();
  const { activeProject } = useProject();

  const currentOrgId = orgId || (activeProject?.id ? String(activeProject.id) : "");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>(repoId || "");
  const [memory, setMemory] = useState<ArchitectureMemoryOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ScoredMemoryEntry[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"knowledge" | "components" | "tech" | "events">("knowledge");

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

  // Load memory data
  useEffect(() => {
    if (!currentOrgId || !selectedRepoId) return;
    setLoading(true);
    setError(null);
    fetchRepositoryMemory(currentOrgId, selectedRepoId)
      .then((data) => {
        setMemory(data);
        setSearchResults(null);
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || "Failed to load architecture memory.");
        setMemory(null);
      })
      .finally(() => setLoading(false));
  }, [currentOrgId, selectedRepoId]);

  // Perform search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrgId || !selectedRepoId || !searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const typeParam = selectedTypeFilter !== "ALL" ? selectedTypeFilter : undefined;
      const res = await searchRepositoryMemory(currentOrgId, selectedRepoId, searchQuery, typeParam);
      setSearchResults(res.results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleRepoChange = (newRepoId: string) => {
    setSelectedRepoId(newRepoId);
    if (currentOrgId) {
      navigate(`/dashboard/organizations/${currentOrgId}/repositories/${newRepoId}/memory`);
    }
  };

  const currentRepo = repositories.find((r) => String(r.id) === selectedRepoId);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[var(--cd-bg)] p-4 sm:p-6 space-y-5">
      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--cd-ink-faint)]">
        <Link to="/dashboard/organizations" className="hover:text-[var(--cd-ink)]">
          Organizations
        </Link>
        <span>/</span>
        {currentOrgId && (
          <>
            <Link to={`/dashboard/organizations/${currentOrgId}/repositories`} className="hover:text-[var(--cd-ink)]">
              {activeProject?.name || `Org #${currentOrgId}`}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-[var(--cd-ink)] font-medium">Architecture Memory</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[var(--cd-border-soft)] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--cd-accent-soft)] text-[var(--cd-accent)] border border-[var(--cd-accent)]/20 shadow-xs">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-semibold text-[var(--cd-ink)]">
                Architecture Memory
              </h1>
              <span className="rounded-full bg-[var(--cd-accent-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--cd-accent)] border border-[var(--cd-accent)]/20">
                V2 Engine
              </span>
            </div>
            <p className="text-[12px] text-[var(--cd-ink-faint)]">
              Persistent architectural knowledge, provenance tracking, and semantic memory across analysis runs.
            </p>
          </div>
        </div>

        {/* Repository selector */}
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
      </div>

      {/* Repository Stats Banner */}
      {currentRepo && (
        <div className="bg-[var(--cd-surface)] border border-[var(--cd-border)] rounded-xl p-4.5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[var(--cd-accent)]" />
              <span className="text-[14px] font-semibold text-[var(--cd-ink)]">{currentRepo.full_name}</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--cd-sunken)] text-[var(--cd-ink-soft)] border border-[var(--cd-border-soft)]">
                {currentRepo.primary_language || "Multi-language"}
              </span>
            </div>
            <p className="text-[11.5px] text-[var(--cd-ink-faint)]">
              Default branch: <span className="font-mono text-[var(--cd-ink-soft)]">{currentRepo.default_branch}</span>
            </p>
          </div>

          <div className="flex items-center gap-6 text-[12px]">
            <div className="text-center">
              <p className="text-[11px] text-[var(--cd-ink-faint)] uppercase tracking-wider font-semibold">Active Components</p>
              <p className="text-[16px] font-bold text-[var(--cd-ink)] mt-0.5">{memory?.active_components_count ?? 0}</p>
            </div>
            <div className="w-px h-7 bg-[var(--cd-border)]" />
            <div className="text-center">
              <p className="text-[11px] text-[var(--cd-ink-faint)] uppercase tracking-wider font-semibold">Tracked Tech</p>
              <p className="text-[16px] font-bold text-[var(--cd-accent)] mt-0.5">{memory?.technologies_count ?? 0}</p>
            </div>
            <div className="w-px h-7 bg-[var(--cd-border)]" />
            <div className="text-center">
              <p className="text-[11px] text-[var(--cd-ink-faint)] uppercase tracking-wider font-semibold">Knowledge Items</p>
              <p className="text-[16px] font-bold text-[var(--cd-good)] mt-0.5">{memory?.entries_count ?? 0}</p>
            </div>
            <div className="w-px h-7 bg-[var(--cd-border)]" />
            <div className="text-center">
              <p className="text-[11px] text-[var(--cd-ink-faint)] uppercase tracking-wider font-semibold">Evolution Events</p>
              <p className="text-[16px] font-bold text-[var(--cd-ink)] mt-0.5">{memory?.events_count ?? 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Semantic Memory Search Bar */}
      <div className="bg-[var(--cd-surface)] border border-[var(--cd-border)] rounded-xl p-3.5 shadow-xs">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cd-ink-faint)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search architecture memory (e.g. 'Where is authentication handled?', 'FastAPI', 'circular dependencies')..."
              className="w-full pl-9 pr-4 py-2 bg-[var(--cd-bg)] border border-[var(--cd-border)] rounded-lg text-[13px] text-[var(--cd-ink)] placeholder-[var(--cd-ink-faint)] focus:outline-none focus:border-[var(--cd-accent)] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="bg-[var(--cd-bg)] border border-[var(--cd-border)] text-[12px] text-[var(--cd-ink-soft)] rounded-lg px-2.5 py-2 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="ARCHITECTURE_FACT">Facts</option>
              <option value="ARCHITECTURE_DECISION">Decisions</option>
              <option value="ARCHITECTURE_PATTERN">Patterns</option>
              <option value="ARCHITECTURE_ISSUE">Issues</option>
            </select>

            <button
              type="submit"
              disabled={searching}
              className="px-4 py-2 bg-[var(--cd-accent)] hover:bg-[var(--cd-accent-hover)] text-white text-[12px] font-medium rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap"
            >
              {searching ? (
                <>Searching...</>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Semantic Search
                </>
              )}
            </button>
            {searchResults !== null && (
              <button
                type="button"
                onClick={() => {
                  setSearchResults(null);
                  setSearchQuery("");
                }}
                className="px-3 py-2 bg-[var(--cd-sunken)] hover:bg-[var(--cd-border)] text-[var(--cd-ink-soft)] text-[12px] font-medium rounded-lg transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Search Results Display */}
      {searchResults !== null && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-[var(--cd-ink)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--cd-accent)]" />
              Search Results ({searchResults.length} matches)
            </h2>
          </div>

          {searchResults.length === 0 ? (
            <div className="bg-[var(--cd-surface)] border border-[var(--cd-border)] rounded-xl p-6 text-center text-[13px] text-[var(--cd-ink-soft)]">
              No matching architectural memories found for &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {searchResults.map((res, idx) => (
                <div
                  key={idx}
                  className="bg-[var(--cd-surface)] border border-[var(--cd-border)] hover:border-[var(--cd-accent)]/50 rounded-xl p-4 space-y-2.5 shadow-xs transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--cd-accent-soft)] text-[var(--cd-accent)] border border-[var(--cd-accent)]/20 uppercase tracking-wider">
                        {res.entry.memory_type}
                      </span>
                      <h3 className="text-[13px] font-bold text-[var(--cd-ink)] mt-1.5">{res.entry.title}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-mono font-bold text-[var(--cd-good)] bg-[var(--cd-good-bg)] px-2 py-0.5 rounded border border-[var(--cd-good)]/20">
                        Score: {(res.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <p className="text-[12px] text-[var(--cd-ink-soft)] leading-relaxed">{res.entry.content}</p>

                  <div className="flex items-center justify-between text-[11px] text-[var(--cd-ink-faint)] border-t border-[var(--cd-border-soft)] pt-2">
                    <span className="flex items-center gap-1">
                      <FileCode2 className="w-3 h-3" />
                      {res.entry.source_analyzer || "Coodara Engine"}
                    </span>
                    <span>Confidence: {(res.entry.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[var(--cd-border-soft)] overflow-x-auto">
        <button
          onClick={() => setActiveTab("knowledge")}
          className={`pb-2.5 px-3.5 text-[12.5px] font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "knowledge"
              ? "border-[var(--cd-accent)] text-[var(--cd-accent)] font-semibold"
              : "border-transparent text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
          }`}
        >
          <Brain className="w-4 h-4" />
          Knowledge Entries ({memory?.entries_count ?? 0})
        </button>

        <button
          onClick={() => setActiveTab("components")}
          className={`pb-2.5 px-3.5 text-[12.5px] font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "components"
              ? "border-[var(--cd-accent)] text-[var(--cd-accent)] font-semibold"
              : "border-transparent text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
          }`}
        >
          <Layers className="w-4 h-4" />
          Components Directory ({memory?.components_count ?? 0})
        </button>

        <button
          onClick={() => setActiveTab("tech")}
          className={`pb-2.5 px-3.5 text-[12.5px] font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "tech"
              ? "border-[var(--cd-accent)] text-[var(--cd-accent)] font-semibold"
              : "border-transparent text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
          }`}
        >
          <Cpu className="w-4 h-4" />
          Tracked Technologies ({memory?.technologies_count ?? 0})
        </button>

        <button
          onClick={() => setActiveTab("events")}
          className={`pb-2.5 px-3.5 text-[12.5px] font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "events"
              ? "border-[var(--cd-accent)] text-[var(--cd-accent)] font-semibold"
              : "border-transparent text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
          }`}
        >
          <Clock className="w-4 h-4" />
          Evolution Events ({memory?.events_count ?? 0})
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="py-12 text-center text-[13px] text-[var(--cd-ink-soft)]">
          Loading architecture memory...
        </div>
      ) : error ? (
        <div className="bg-[var(--cd-risk-bg)] border border-[var(--cd-risk)]/30 rounded-xl p-5 text-center text-[13px] text-[var(--cd-risk)]">
          {error}
        </div>
      ) : (
        <>
          {/* Tab 1: Knowledge Entries */}
          {activeTab === "knowledge" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {memory?.entries && memory.entries.length > 0 ? (
                memory.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-[var(--cd-surface)] border border-[var(--cd-border)] rounded-xl p-4 space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--cd-sunken)] text-[var(--cd-accent)] border border-[var(--cd-border-soft)]">
                        {entry.memory_type}
                      </span>
                      <span className="text-[11px] text-[var(--cd-ink-faint)]">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-[13px] font-semibold text-[var(--cd-ink)]">{entry.title}</h3>
                    <p className="text-[12px] text-[var(--cd-ink-soft)] leading-relaxed">{entry.content}</p>

                    <div className="flex items-center justify-between text-[11px] text-[var(--cd-ink-faint)] border-t border-[var(--cd-border-soft)] pt-2">
                      <span>Source: {entry.source_analyzer || "AST Scanner"}</span>
                      <span>Confidence: {(entry.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-8 text-center text-[13px] text-[var(--cd-ink-faint)] bg-[var(--cd-surface)] border border-[var(--cd-border)] rounded-xl">
                  No memory knowledge entries recorded yet. Run a repository analysis to populate memory.
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Components Directory */}
          {activeTab === "components" && (
            <div className="bg-[var(--cd-surface)] border border-[var(--cd-border)] rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-[12px] text-[var(--cd-ink)]">
                <thead className="bg-[var(--cd-sunken)] text-[var(--cd-ink-faint)] uppercase tracking-wider font-semibold border-b border-[var(--cd-border-soft)] text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Component Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">First Seen</th>
                    <th className="py-3 px-4">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cd-border-soft)]">
                  {memory?.components && memory.components.length > 0 ? (
                    memory.components.map((comp) => (
                      <tr key={comp.id} className="hover:bg-[var(--cd-sunken)]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-[var(--cd-ink)]">{comp.name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-[var(--cd-sunken)] text-[var(--cd-ink-soft)] border border-[var(--cd-border-soft)] font-mono text-[11px]">
                            {comp.component_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              comp.status === "active"
                                ? "bg-[var(--cd-good-bg)] text-[var(--cd-good)] border border-[var(--cd-good)]/20"
                                : "bg-[var(--cd-risk-bg)] text-[var(--cd-risk)] border border-[var(--cd-risk)]/20"
                            }`}
                          >
                            {comp.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[var(--cd-ink-soft)]">Analysis #{comp.first_seen_analysis_id || "N/A"}</td>
                        <td className="py-3 px-4 text-[var(--cd-ink-faint)]">
                          {new Date(comp.updated_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[13px] text-[var(--cd-ink-faint)]">
                        No components discovered in memory yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Tracked Technologies */}
          {activeTab === "tech" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {memory?.technologies && memory.technologies.length > 0 ? (
                memory.technologies.map((t) => (
                  <div key={t.id} className="bg-[var(--cd-surface)] border border-[var(--cd-border)] rounded-xl p-4 space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-[var(--cd-ink)]">{t.technology}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          t.status === "active"
                            ? "bg-[var(--cd-good-bg)] text-[var(--cd-good)] border border-[var(--cd-good)]/20"
                            : t.status === "upgraded"
                            ? "bg-[var(--cd-accent-soft)] text-[var(--cd-accent)] border border-[var(--cd-accent)]/20"
                            : "bg-[var(--cd-risk-bg)] text-[var(--cd-risk)] border border-[var(--cd-risk)]/20"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="text-[12px] text-[var(--cd-ink-soft)] font-mono">Version: {t.version || "latest"}</p>
                    <p className="text-[11px] text-[var(--cd-ink-faint)]">First seen: Analysis #{t.first_seen_analysis_id || "N/A"}</p>
                  </div>
                ))
              ) : (
                <div className="col-span-3 py-8 text-center text-[13px] text-[var(--cd-ink-faint)] bg-[var(--cd-surface)] border border-[var(--cd-border)] rounded-xl">
                  No technologies tracked in memory yet.
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Evolution Events */}
          {activeTab === "events" && (
            <div className="space-y-2.5">
              {memory?.recent_events && memory.recent_events.length > 0 ? (
                memory.recent_events.map((ev) => (
                  <div
                    key={ev.id}
                    className="bg-[var(--cd-surface)] border border-[var(--cd-border)] rounded-xl p-3.5 flex items-start justify-between gap-4 shadow-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-[var(--cd-sunken)] rounded-lg text-[var(--cd-accent)] mt-0.5">
                        <GitCommit className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--cd-sunken)] text-[var(--cd-ink-soft)] font-mono border border-[var(--cd-border-soft)]">
                            {ev.event_type}
                          </span>
                          <h4 className="text-[12.5px] font-semibold text-[var(--cd-ink)]">{ev.title}</h4>
                        </div>
                        <p className="text-[12px] text-[var(--cd-ink-soft)] mt-1">{ev.description}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-[var(--cd-ink-faint)] whitespace-nowrap">
                      {new Date(ev.created_at).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-[13px] text-[var(--cd-ink-faint)] bg-[var(--cd-surface)] border border-[var(--cd-border)] rounded-xl">
                  No evolution events recorded yet. Changes will appear when you re-analyze updated code.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
