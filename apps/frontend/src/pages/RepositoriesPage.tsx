import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Search,
  GitBranch as RepoIcon,
  ChevronRight,
} from "lucide-react";

import { useProject } from "@/context/ProjectContext";
import { listRepositories } from "@/api/repositories";

import type { Repository } from "@/types/repository";

import { USE_MOCK_REPOSITORIES_DATA } from "@/dev/devFlags";
import { getMockRepositoriesForOrg } from "@/data/mockRepositories";

export function RepositoriesPage() {
  const { activeProject } = useProject();
  const { orgId } = useParams<{ orgId: string }>();

  /*
   * Organization identity comes from the URL when this page is
   * accessed through:
   *
   * /dashboard/organizations/:orgId/repositories
   *
   * The active project remains as a fallback for the legacy:
   *
   * /dashboard/repositories
   */
  const parsedOrganizationId = orgId
    ? Number(orgId)
    : undefined;

  const organizationId =
    parsedOrganizationId !== undefined &&
    Number.isInteger(parsedOrganizationId) &&
    parsedOrganizationId > 0
      ? parsedOrganizationId
      : activeProject?.id;

  const organizationName =
    activeProject?.id === organizationId
      ? activeProject?.name ?? "Organization"
      : "Organization";

  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] =
    useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  async function loadRepos() {
    if (!organizationId) {
      setRepos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    if (USE_MOCK_REPOSITORIES_DATA) {
      setRepos(
        getMockRepositoriesForOrg(organizationId),
      );
      setLoading(false);
      return;
    }

    try {
      const response = await listRepositories(
        organizationId,
        1,
        100,
      );

      setRepos(response.items);
    } catch {
      setLoadError(
        "Couldn't load repositories.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRepos();

    // loadRepos intentionally uses the current organization ID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const filteredRepositories = repos.filter(
    (repository) => {
      const query = searchTerm
        .trim()
        .toLowerCase();

      if (!query) {
        return true;
      }

      return (
        repository.name
          .toLowerCase()
          .includes(query) ||
        (
          repository.primary_language ?? ""
        )
          .toLowerCase()
          .includes(query)
      );
    },
  );

  /*
   * No organization is available.
   *
   * This protects the page if someone visits the repository
   * route without a valid organization context.
   */
  if (!organizationId) {
    return (
      <div className="px-4 pb-10 pt-4 sm:px-6">
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-8 text-center text-[13px] text-[var(--cd-ink-soft)]">
          Select or create an organization first.
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-10 pt-4 sm:px-6">
      {/* Breadcrumb */}
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--cd-ink-soft)]">
        <Link
          to={`/dashboard/organizations/${organizationId}`}
          className="flex items-center gap-1.5 font-semibold text-[var(--cd-ink)] hover:text-[var(--cd-accent)]"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-[5px] bg-[var(--cd-accent)] text-white">
            <RepoIcon className="h-2.5 w-2.5" />
          </span>

          {organizationName}
        </Link>

        <ChevronRight className="h-3 w-3 text-[var(--cd-ink-faint)]" />

        <span className="font-medium text-[var(--cd-ink-soft)]">
          Repositories
        </span>
      </div>

      {/* Page header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[18px] font-semibold tracking-tight text-[var(--cd-ink)]">
          Repositories
        </h1>
      </div>

      {/* Repository list */}
      <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
        <div className="flex flex-wrap items-center gap-2.5 px-5 py-4">
          <div className="flex min-w-[200px] max-w-[340px] flex-1 items-center gap-1.5 rounded-lg border border-[var(--cd-border)] px-3 py-2 focus-within:border-[var(--cd-accent)]">
            <Search className="h-3.5 w-3.5 flex-shrink-0 text-[var(--cd-ink-faint)]" />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Filter by name or language..."
              className="w-full bg-transparent text-[12.5px] text-[var(--cd-ink)] outline-none placeholder:text-[var(--cd-ink-faint)]"
            />
          </div>

          <span className="text-[12px] text-[var(--cd-ink-faint)]">
            <span className="font-mono">
              {repos.length}
            </span>{" "}
            repositories
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="p-8 text-center text-[13px] text-[var(--cd-ink-soft)]">
            Loading repositories...
          </div>
        )}

        {/* Error */}
        {!loading && loadError && (
          <div className="p-8 text-center text-[13px] text-[var(--cd-risk)]">
            {loadError}
          </div>
        )}

        {/* Empty state */}
        {!loading &&
          !loadError &&
          repos.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
              <div className="text-[13px] font-semibold text-[var(--cd-ink-soft)]">
                No repositories connected yet.
              </div>

              <div className="text-[12px] text-[var(--cd-ink-faint)]">
                Use the Import repository action in the
                dashboard navbar to connect a GitHub repository.
              </div>
            </div>
          )}

        {/* Search has no results */}
        {!loading &&
          !loadError &&
          repos.length > 0 &&
          filteredRepositories.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-5 py-14 text-center text-[var(--cd-ink-faint)]">
              <Search className="mb-1 h-7 w-7" />

              <b className="text-[13px] font-semibold text-[var(--cd-ink-soft)]">
                No repositories match
              </b>

              <span className="max-w-[320px] text-[12px]">
                Try a different search term.
              </span>
            </div>
          )}

        {/* Repository rows */}
        {!loading &&
          !loadError &&
          filteredRepositories.map(
            (repository) => (
              <Link
                key={repository.id}
                to={`/dashboard/organizations/${organizationId}/repositories/${repository.id}/analysis`}
                className="flex cursor-pointer items-center gap-3.5 border-b border-[var(--cd-border-soft)] px-5 py-3.5 last:border-b-0 hover:bg-[var(--cd-sunken)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <RepoIcon className="h-3.5 w-3.5 flex-shrink-0 text-[var(--cd-ink-faint)]" />

                    <span className="truncate font-mono text-[13px] font-semibold text-[var(--cd-ink)]">
                      {repository.full_name}
                    </span>
                  </div>

                  {repository.description && (
                    <div className="mt-0.5 truncate text-[12px] text-[var(--cd-ink-soft)]">
                      {repository.description}
                    </div>
                  )}

                  <div className="mt-1.5 flex items-center gap-3.5 text-[11.5px] text-[var(--cd-ink-faint)]">
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

                <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--cd-ink-faint)]" />
              </Link>
            ),
          )}
      </div>
    </div>
  );
}