import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Code2,
  Search,
  ArrowRight,
} from "lucide-react";
import { useDashboardOverview } from "@/hooks/useDashboardOverview";

export function ExplorerPage() {
  const { repos } = useDashboardOverview();
  const [selectedRepoId, setSelectedRepoId] = useState<string>(
    repos[0]?.id ? String(repos[0].id) : ""
  );
  const [searchFilter, setSearchFilter] = useState("");

  const selectedRepo = repos.find((r) => String(r.id) === selectedRepoId) || repos[0];

  return (
    <div className="flex h-full min-h-[calc(100vh-52px)] flex-col bg-[var(--cd-bg)] p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[var(--cd-ink)] sm:text-2xl">
              Codebase Explorer
            </h1>
            <span className="rounded-full bg-[var(--cd-sunken)] px-2.5 py-0.5 font-mono text-xs font-semibold text-[var(--cd-ink-soft)] border border-[var(--cd-border)]">
              AST & Symbols
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[var(--cd-ink-soft)] max-w-2xl">
            Inspect repository file trees, modules, symbols, and architectural context backed by deterministic AST parsing.
          </p>
        </div>

        {repos.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--cd-ink-faint)]">Repository:</span>
            <select
              value={selectedRepoId}
              onChange={(e) => setSelectedRepoId(e.target.value)}
              className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-xs font-mono text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
            >
              {repos.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.full_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Explorer Workspace */}
      <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] pb-4">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-[var(--cd-accent)]" />
            <span className="text-sm font-semibold text-[var(--cd-ink)]">
              {selectedRepo?.full_name || "Repository Code Structure"}
            </span>
          </div>

          <Link
            to={`/architecture?repoId=${selectedRepo?.id || ""}&tab=studio`}
            className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-[var(--cd-accent)] hover:underline"
          >
            <span>Open in Interactive Architecture Studio</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--cd-ink-faint)]" />
          <input
            type="text"
            placeholder="Search files and architectural symbols..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] pl-9 pr-4 py-2 text-xs text-[var(--cd-ink)] placeholder:text-[var(--cd-ink-faint)] focus:outline-none focus:border-[var(--cd-accent)]"
          />
        </div>

        {/* Summary Info */}
        <div className="rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-bg)] p-4 text-xs text-[var(--cd-ink-soft)] space-y-2">
          <div className="font-semibold text-[var(--cd-ink)]">Structural Ingestion & File Indexing</div>
          <p>
            Coodara scans repository source trees and extracts AST symbols, imports, calls, and coupling metrics deterministically. Use the Code Studio inside the Architecture view to inspect live file trees with side-by-side component coupling diagrams.
          </p>
        </div>
      </div>
    </div>
  );
}
