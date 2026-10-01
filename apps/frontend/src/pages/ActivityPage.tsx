import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  GitCommit,
  Layers,
  Cpu,
  FileCheck2,
} from "lucide-react";
import {
  fetchRepositoryHistory,
  fetchRepositoryMemory,
  type ArchitectureEvent,
  type ArchitectureMemoryOverview,
} from "@/api/memory";
import { listRepositories } from "@/api/repositories";
import type { Repository } from "@/types/repository";
import { useProject } from "@/context/ProjectContext";

export function ActivityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeProject } = useProject();

  const currentOrgId = activeProject?.id ? String(activeProject.id) : "";
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");

  const tabParam = searchParams.get("tab") || "timeline";
  const [activeTab, setActiveTab] = useState<"timeline" | "memory">(
    tabParam === "memory" ? "memory" : "timeline"
  );

  // History & Timeline State
  const [events, setEvents] = useState<ArchitectureEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "COMPONENT" | "TECH" | "ISSUE" | "SCORE">("ALL");
  const [historySearch, setHistorySearch] = useState("");

  // Memory State
  const [memory, setMemory] = useState<ArchitectureMemoryOverview | null>(null);
  const [loadingMemory, setLoadingMemory] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);

  // Load repositories
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
  }, [currentOrgId, selectedRepoId]);

  // Load history events
  useEffect(() => {
    if (!currentOrgId || !selectedRepoId) return;
    setLoadingHistory(true);
    setHistoryError(null);
    fetchRepositoryHistory(currentOrgId, selectedRepoId)
      .then((data) => {
        setEvents(data.events || []);
      })
      .catch((err) => {
        setHistoryError(err?.message || "Failed to load activity timeline.");
        setEvents([]);
      })
      .finally(() => setLoadingHistory(false));
  }, [currentOrgId, selectedRepoId]);

  // Load memory overview
  useEffect(() => {
    if (!currentOrgId || !selectedRepoId) return;
    setLoadingMemory(true);
    setMemoryError(null);
    fetchRepositoryMemory(currentOrgId, selectedRepoId)
      .then((data) => {
        setMemory(data);
      })
      .catch((err) => {
        setMemoryError(err?.message || "Failed to load architectural memory.");
        setMemory(null);
      })
      .finally(() => setLoadingMemory(false));
  }, [currentOrgId, selectedRepoId]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (historyFilter !== "ALL" && ev.event_type !== historyFilter) return false;
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        return (
          ev.title.toLowerCase().includes(q) ||
          ev.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [events, historyFilter, historySearch]);

  const handleTabChange = (tab: "timeline" | "memory") => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    });
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-52px)] flex-col bg-[var(--cd-bg)] p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[var(--cd-ink)] sm:text-2xl">
              Activity & Architecture Memory
            </h1>
            <span className="rounded-full bg-[var(--cd-sunken)] px-2.5 py-0.5 font-mono text-xs font-semibold text-[var(--cd-ink-soft)] border border-[var(--cd-border)]">
              Unified Engineering Record
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[var(--cd-ink-soft)] max-w-2xl">
            Track structural evolution, coupling drifts, component lifecycles, and architectural decision records (ADRs) across repositories.
          </p>
        </div>

        {repositories.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--cd-ink-faint)]">Repository:</span>
            <select
              value={selectedRepoId}
              onChange={(e) => setSelectedRepoId(e.target.value)}
              className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-xs font-mono text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
            >
              {repositories.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.full_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-[var(--cd-border-soft)]">
        <nav className="flex space-x-6">
          <button
            type="button"
            onClick={() => handleTabChange("timeline")}
            className={`cursor-pointer pb-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
              activeTab === "timeline"
                ? "border-[var(--cd-accent)] text-[var(--cd-accent)] font-semibold"
                : "border-transparent text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)] hover:border-[var(--cd-border)]"
            }`}
          >
            Evolution Timeline
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("memory")}
            className={`cursor-pointer pb-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
              activeTab === "memory"
                ? "border-[var(--cd-accent)] text-[var(--cd-accent)] font-semibold"
                : "border-transparent text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)] hover:border-[var(--cd-border)]"
            }`}
          >
            Architectural Memory & ADRs
          </button>
        </nav>
      </div>

      {/* Tab 1: Timeline */}
      {activeTab === "timeline" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--cd-ink-faint)]">Filter type:</span>
              <select
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value as any)}
                className="rounded-md border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-1 text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
              >
                <option value="ALL">All Events</option>
                <option value="COMPONENT">Component Lifecycles</option>
                <option value="TECH">Technology Upgrades</option>
                <option value="ISSUE">Issue Detections</option>
                <option value="SCORE">Score Drifts</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Search activity events..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="rounded-md border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1 text-xs text-[var(--cd-ink)] placeholder:text-[var(--cd-ink-faint)] focus:outline-none focus:border-[var(--cd-accent)] sm:w-64"
            />
          </div>

          <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4 divide-y divide-[var(--cd-border-soft)]">
            {loadingHistory ? (
              <div className="py-12 text-center text-xs text-[var(--cd-ink-soft)]">
                Loading activity events...
              </div>
            ) : historyError ? (
              <div className="py-8 text-center text-xs text-rose-500">
                {historyError}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--cd-ink-faint)]">
                No activity events found for the selected filter.
              </div>
            ) : (
              filteredEvents.map((ev) => (
                <div key={ev.id} className="py-3.5 flex items-start justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-[var(--cd-sunken)] p-1.5 border border-[var(--cd-border-soft)] text-[var(--cd-accent)]">
                      <GitCommit className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[var(--cd-ink)]">{ev.title}</div>
                      <p className="text-[11.5px] text-[var(--cd-ink-soft)] mt-0.5">{ev.description}</p>
                    </div>
                  </div>
                  <div className="text-[11px] text-[var(--cd-ink-faint)] font-mono whitespace-nowrap">
                    {new Date(ev.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Memory & ADRs */}
      {activeTab === "memory" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4">
              <div className="flex items-center gap-2 text-xs text-[var(--cd-ink-soft)]">
                <FileCheck2 className="h-4 w-4 text-[var(--cd-accent)]" />
                <span>Active Knowledge Entries</span>
              </div>
              <div className="text-2xl font-bold font-mono mt-1">
                {memory?.entries_count ?? 0}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4">
              <div className="flex items-center gap-2 text-xs text-[var(--cd-ink-soft)]">
                <Layers className="h-4 w-4 text-indigo-500" />
                <span>Components Tracked</span>
              </div>
              <div className="text-2xl font-bold font-mono mt-1">
                {memory?.components_count ?? 0}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4">
              <div className="flex items-center gap-2 text-xs text-[var(--cd-ink-soft)]">
                <Cpu className="h-4 w-4 text-emerald-500" />
                <span>Technologies Detected</span>
              </div>
              <div className="text-2xl font-bold font-mono mt-1">
                {memory?.technologies_count ?? 0}
              </div>
            </div>
          </div>

          {/* Components / Architecture Memory List */}
          <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--cd-ink)]">Discovered Components & Subsystems</h3>

            {loadingMemory ? (
              <div className="py-8 text-center text-xs text-[var(--cd-ink-soft)]">
                Loading architecture memory...
              </div>
            ) : memoryError ? (
              <div className="py-8 text-center text-xs text-rose-500">
                {memoryError}
              </div>
            ) : memory?.components && memory.components.length > 0 ? (
              <div className="divide-y divide-[var(--cd-border-soft)]">
                {memory.components.map((comp) => (
                  <div key={comp.id} className="py-3 flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[var(--cd-ink)]">{comp.name}</div>
                      <div className="text-[11px] font-mono text-[var(--cd-ink-soft)] mt-0.5">
                        Type: {comp.component_type} • Status: {comp.status}
                        {comp.path && ` • Path: ${comp.path}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[var(--cd-ink-faint)]">
                No active components recorded yet in architecture memory for this repository.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
