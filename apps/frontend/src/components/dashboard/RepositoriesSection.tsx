import { useEffect, useState } from "react";
import { ArrowRight, GitBranch } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { listRepositories } from "@/api/repositories";
import { useProject } from "@/context/ProjectContext";
import type { Repository } from "@/types/repository";

export function RepositoriesSection() {
  const { activeProject } = useProject();
  const navigate = useNavigate();

  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRepositories() {
      if (!activeProject?.id) {
        setRepos([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await listRepositories(
          activeProject.id,
          1,
          100,
        );

        if (!cancelled) {
          setRepos(response.items);
        }
      } catch {
        if (!cancelled) {
          setRepos([]);
          setError("Couldn't load repositories.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRepositories();

    return () => {
      cancelled = true;
    };
  }, [activeProject?.id]);

  function openRepositories() {
    if (!activeProject?.id) {
      return;
    }

    navigate(
      `/dashboard/organizations/${activeProject.id}/repositories`,
    );
  }

  function openRepository(repositoryId: number) {
    if (!activeProject?.id) {
      return;
    }

    navigate(
      `/dashboard/organizations/${activeProject.id}/repositories/${repositoryId}/analysis`,
    );
  }

  return (
    <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
      <div className="flex items-center justify-between border-b border-[var(--cd-border-soft,var(--cd-border))] px-4 py-3">
        <h3 className="text-[13px] font-semibold text-[var(--cd-ink)]">
          {loading ? "Repositories" : `${repos.length} repositories`}
        </h3>

        <button
          type="button"
          onClick={openRepositories}
          disabled={!activeProject?.id}
          className="flex cursor-pointer items-center gap-1 text-[12px] font-medium text-[var(--cd-ink-faint)] transition-colors hover:text-[var(--cd-ink)] disabled:cursor-not-allowed"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {loading && (
        <div className="p-8 text-center text-[13px] text-[var(--cd-ink-soft)]">
          Loading repositories...
        </div>
      )}

      {!loading && error && (
        <div className="p-8 text-center text-[13px] text-[var(--cd-risk)]">
          {error}
        </div>
      )}

      {!loading && !error && repos.length === 0 && (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <GitBranch className="h-5 w-5 text-[var(--cd-ink-faint)]" />

          <div className="text-[13px] font-semibold text-[var(--cd-ink-soft)]">
            No repositories connected yet.
          </div>

          <button
            type="button"
            onClick={openRepositories}
            className="mt-1 cursor-pointer rounded-lg bg-[var(--cd-accent)] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[var(--cd-accent-hover)]"
          >
            View repositories
          </button>
        </div>
      )}

      {!loading && !error && repos.length > 0 && (
        <div>
          {repos.map((repository) => (
            <button
              key={repository.id}
              type="button"
              onClick={() => openRepository(repository.id)}
              className="flex w-full cursor-pointer items-center gap-3.5 border-b border-[var(--cd-border-soft,var(--cd-border))] px-4 py-3.5 text-left last:border-b-0 hover:bg-[var(--cd-sunken)]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-3.5 w-3.5 flex-shrink-0 text-[var(--cd-ink-faint)]" />

                  <span className="truncate font-mono text-[13px] font-semibold text-[var(--cd-ink)]">
                    {repository.full_name}
                  </span>
                </div>

                {repository.description && (
                  <div className="mt-0.5 truncate text-[12px] text-[var(--cd-ink-soft)]">
                    {repository.description}
                  </div>
                )}

                <div className="mt-1.5 flex flex-wrap items-center gap-3.5 text-[11.5px] text-[var(--cd-ink-faint)]">
                  {repository.primary_language && (
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[var(--cd-accent)]" />
                      {repository.primary_language}
                    </span>
                  )}

                  <span className="capitalize">
                    {repository.visibility}
                  </span>

                  <span>
                    {repository.default_branch}
                  </span>
                </div>
              </div>

              <ArrowRight className="h-4 w-4 flex-shrink-0 text-[var(--cd-ink-faint)]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
