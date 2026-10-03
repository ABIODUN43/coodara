import { FlaskConical, GitBranch, RefreshCw, Sliders } from "lucide-react";
import type { Repository } from "@/types/repository";

interface LabContextBarProps {
  repos: Repository[];
  selectedRepoId: string;
  onSelectRepo: (repoId: string) => void;
  loading: boolean;
  onRefresh: () => void;
  onOpenNewHypothesis: () => void;
  hypothesesCount: number;
}

export function LabContextBar({
  repos,
  selectedRepoId,
  onSelectRepo,
  loading,
  onRefresh,
  onOpenNewHypothesis,
  hypothesesCount,
}: LabContextBarProps) {
  const selectedRepo = repos.find((r) => String(r.id) === selectedRepoId) || repos[0];

  return (
    <div className="sticky top-[52px] z-20 flex flex-wrap items-center justify-between border-b border-[var(--cd-border)] bg-[var(--cd-surface)] px-4 py-2.5 sm:px-6">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-[var(--cd-ink)]">
          <FlaskConical className="h-4 w-4 text-[var(--cd-accent)]" />
          <span>Architecture Lab</span>
        </div>

        <span className="text-[var(--cd-ink-faint)]">/</span>

        {/* Repo Selector */}
        <select
          value={selectedRepoId}
          onChange={(e) => onSelectRepo(e.target.value)}
          className="rounded-md border border-[var(--cd-border)] bg-[var(--cd-bg)] px-2.5 py-1 text-xs font-mono text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
          aria-label="Select Repository"
        >
          {repos.length === 0 && <option value="">No repositories available</option>}
          {repos.map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.full_name}
            </option>
          ))}
        </select>

        {selectedRepo && (
          <>
            <span className="text-[var(--cd-ink-faint)]">/</span>
            <div className="flex items-center gap-1 font-mono text-[11px] text-[var(--cd-ink-soft)] bg-[var(--cd-sunken)] px-2 py-0.5 rounded border border-[var(--cd-border-soft)]">
              <GitBranch className="h-3 w-3 text-[var(--cd-ink-faint)]" />
              <span>{selectedRepo.default_branch || "main"}</span>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="cursor-pointer inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors disabled:opacity-50"
          title="Refresh Lab Data"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin text-[var(--cd-accent)]" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex items-center gap-2 mt-2 sm:mt-0">
        <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
          {`${hypothesesCount} ${hypothesesCount === 1 ? "Hypothesis" : "Hypotheses"}`}
        </span>

        <button
          type="button"
          onClick={onOpenNewHypothesis}
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors shadow-xs"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>New Hypothesis</span>
        </button>
      </div>
    </div>
  );
}
