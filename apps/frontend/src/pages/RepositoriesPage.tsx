import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Search,
  GitBranch as RepoIcon,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";

import { useProject } from "@/context/ProjectContext";
import {
  listRepositories,
  importRepository,
} from "@/api/repositories";

import type { Repository } from "@/types/repository";

import { USE_MOCK_REPOSITORIES_DATA } from "@/dev/devFlags";
import { getMockRepositoriesForOrg } from "@/data/mockRepositories";

export function RepositoriesPage() {
  const { activeProject } = useProject();
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();

  /*
   * Organization identity comes from the URL when this page is
   * accessed through:
   *
   * /dashboard/organizations/:orgId/repositories
   *
   * The active project is kept as a fallback for the legacy
   * /dashboard/repositories route.
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [owner, setOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

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
    loadRepos();
    // loadRepos intentionally uses the current organization ID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  async function handleImport() {
    if (
      !organizationId ||
      !owner.trim() ||
      !repoName.trim()
    ) {
      return;
    }

    if (USE_MOCK_REPOSITORIES_DATA) {
      setImportError(
        "Importing repositories is disabled while running on demo data.",
      );
      return;
    }

    setImporting(true);
    setImportError(null);

    try {
      const created = await importRepository(
        organizationId,
        {
          owner: owner.trim(),
          name: repoName.trim(),
        },
      );

      setIsImportOpen(false);
      setOwner("");
      setRepoName("");

      await loadRepos();

      navigate(
        `/dashboard/organizations/${organizationId}/repositories/${created.id}/analysis`,
      );
    } catch (err: any) {
      const status = err?.response?.status;

      if (status === 409) {
        setImportError(
          "This repository is already imported.",
        );
      } else if (status === 404) {
        setImportError(
          "GitHub repository not found.",
        );
      } else if (status === 403) {
        setImportError(
          "GitHub repository access denied.",
        );
      } else {
        setImportError(
          err?.response?.data?.detail ??
            "Failed to import repository.",
        );
      }
    } finally {
      setImporting(false);
    }
  }

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

        <button
          type="button"
          onClick={() => {
            setImportError(null);
            setIsImportOpen(true);
          }}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-[var(--cd-accent-hover)]"
        >
          <Plus className="h-3.5 w-3.5" />
          Import repository
        </button>
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

              <button
                type="button"
                onClick={() => {
                  setImportError(null);
                  setIsImportOpen(true);
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3.5 py-2 text-[12.5px] font-medium text-white hover:bg-[var(--cd-accent-hover)]"
              >
                <Plus className="h-3.5 w-3.5" />
                Import Repository
              </button>
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

      {/* Import repository modal */}
      {isImportOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4"
          onClick={() => {
            if (!importing) {
              setIsImportOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-[400px] rounded-[14px] border border-[var(--cd-border)] bg-[var(--cd-surface)] p-[22px] shadow-[0_16px_40px_rgba(20,20,30,0.16)]"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* Modal header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[var(--cd-ink)]">
                Import GitHub repository
              </h2>

              <button
                type="button"
                onClick={() => {
                  if (!importing) {
                    setIsImportOpen(false);
                  }
                }}
                disabled={importing}
                aria-label="Close"
                className="cursor-pointer text-[var(--cd-ink-faint)] hover:text-[var(--cd-ink)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Import error */}
            {importError && (
              <div className="mb-3 rounded-lg bg-[var(--cd-risk-bg)] px-3 py-2 text-[12px] text-[var(--cd-risk)]">
                {importError}
              </div>
            )}

            {/* Owner */}
            <div className="mb-3 flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-[var(--cd-ink-soft)]">
                Owner
              </span>

              <input
                type="text"
                autoFocus
                value={owner}
                onChange={(event) =>
                  setOwner(event.target.value)
                }
                disabled={importing}
                placeholder="e.g. octocat"
                className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-sunken)] px-[11px] py-[9px] text-[13px] text-[var(--cd-ink)] outline-none focus:border-[var(--cd-accent)] focus:bg-[var(--cd-surface)] disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {/* Repository name */}
            <div className="mb-3 flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-[var(--cd-ink-soft)]">
                Repository name
              </span>

              <input
                type="text"
                value={repoName}
                onChange={(event) =>
                  setRepoName(event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !importing
                  ) {
                    void handleImport();
                  }
                }}
                disabled={importing}
                placeholder="e.g. hello-world"
                className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-sunken)] px-[11px] py-[9px] text-[13px] text-[var(--cd-ink)] outline-none focus:border-[var(--cd-accent)] focus:bg-[var(--cd-surface)] disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {/* Modal actions */}
            <div className="mt-[18px] flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (!importing) {
                    setIsImportOpen(false);
                  }
                }}
                disabled={importing}
                className="cursor-pointer rounded-lg px-3.5 py-2 text-[12.5px] font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleImport()}
                disabled={
                  importing ||
                  !owner.trim() ||
                  !repoName.trim()
                }
                className="cursor-pointer rounded-lg bg-[var(--cd-accent)] px-3.5 py-2 text-[12.5px] font-medium text-white hover:bg-[var(--cd-accent-hover)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {importing
                  ? "Importing..."
                  : "Import repository"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}