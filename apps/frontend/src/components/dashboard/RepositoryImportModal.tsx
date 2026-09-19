import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Check,
  ChevronDown,
  GitBranch,
  Loader2,
  Search,
  X,
} from "lucide-react";

import {
  importRepository,
  listGitHubRepositories,
} from "@/api/repositories";

import { useProject } from "@/context/ProjectContext";
import { useDashboardActionContext } from "@/context/DashboardActionContext";

import type { GitHubRepositoryOption } from "@/types/repository";

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          status?: number;
          data?: {
            detail?: unknown;
          };
        };
      }
    ).response;

    const detail = response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (
            typeof item === "object" &&
            item !== null &&
            "msg" in item &&
            typeof item.msg === "string"
          ) {
            return item.msg;
          }

          return null;
        })
        .filter(
          (message): message is string =>
            message !== null,
        );

      if (messages.length > 0) {
        return messages.join(", ");
      }
    }

    if (response?.status === 429) {
      return "GitHub API rate limit exceeded. Please try again later.";
    }

    if (response?.status === 403) {
      return "GitHub authorization is invalid or expired.";
    }

    if (response?.status === 401) {
      return "Authentication is required.";
    }

    if (response?.status === 404) {
      return "Organization or repository endpoint was not found.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to import repository.";
}

export function RepositoryImportModal() {
  const navigate = useNavigate();

  /*
   * orgId may be a route slug/name such as:
   *
   *     Coodara-Team
   *
   * It must NOT be sent directly to repository endpoints because
   * the backend expects organization_id to be an integer.
   */
  const { orgId } = useParams<{ orgId: string }>();

  const { activeProject, organizations } = useProject();

  const {
    isRepositoryImportOpen,
    closeRepositoryImport,
    notifyRepositoryImported,
  } = useDashboardActionContext();

  /*
   * The repository picker uses GitHubRepositoryOption because
   * /github-available returns the reduced repository shape.
   */
  const [repositories, setRepositories] = useState<
    GitHubRepositoryOption[]
  >([]);

  const [selectedRepository, setSelectedRepository] =
    useState<GitHubRepositoryOption | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [loadingRepositories, setLoadingRepositories] =
    useState(false);

  const [repositoriesError, setRepositoriesError] =
    useState<string | null>(null);

  const [importError, setImportError] =
    useState<string | null>(null);

  const [importing, setImporting] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);

  /*
   * Resolve the explicit numeric organization ID:
   * 1. If orgId route parameter is a valid integer, use it.
   * 2. If orgId route parameter matches an organization slug, resolve its integer ID.
   * 3. Otherwise fall back to activeProject.id.
   */
  const parsedOrgId = orgId ? Number(orgId) : undefined;
  const matchedOrgBySlug = orgId
    ? organizations.find(
        (o) =>
          o.slug?.toLowerCase() === orgId.toLowerCase() ||
          String(o.id) === orgId,
      )
    : undefined;

  const organizationId =
    parsedOrgId !== undefined &&
    Number.isInteger(parsedOrgId) &&
    parsedOrgId > 0
      ? parsedOrgId
      : matchedOrgBySlug?.id ?? activeProject?.id;


  /*
   * Load GitHub repositories when the modal opens and the
   * numeric organization ID is available.
   */
  useEffect(() => {
    if (
      !isRepositoryImportOpen ||
      !organizationId
    ) {
      return;
    }

    const currentOrganizationId = organizationId;

    let cancelled = false;

    async function loadGitHubRepositories() {
      setLoadingRepositories(true);
      setRepositoriesError(null);

      try {
        const response =
          await listGitHubRepositories(
            currentOrganizationId,
            1,
            100,
          );

        if (cancelled) {
          return;
        }

        setRepositories(response.items);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setRepositories([]);
        setRepositoriesError(
          getErrorMessage(error),
        );
      } finally {
        if (!cancelled) {
          setLoadingRepositories(false);
        }
      }
    }

    void loadGitHubRepositories();

    return () => {
      cancelled = true;
    };
  }, [
    isRepositoryImportOpen,
    organizationId,
  ]);

  /*
   * Search locally.
   *
   * The backend already gives us up to 100 repositories, so
   * there is no GitHub request for every keystroke.
   */
  const filteredRepositories = useMemo(() => {
    const query = searchTerm
      .trim()
      .toLowerCase();

    if (!query) {
      return repositories;
    }

    return repositories.filter(
      (repository) =>
        repository.name
          .toLowerCase()
          .includes(query) ||
        repository.full_name
          .toLowerCase()
          .includes(query) ||
        (
          repository.description ?? ""
        )
          .toLowerCase()
          .includes(query) ||
        (
          repository.language ?? ""
        )
          .toLowerCase()
          .includes(query),
    );
  }, [
    repositories,
    searchTerm,
  ]);

  function resetForm() {
    setSelectedRepository(null);
    setSearchTerm("");
    setPickerOpen(false);
    setRepositoriesError(null);
    setImportError(null);
  }

  function handleClose() {
    if (importing) {
      return;
    }

    closeRepositoryImport();
    resetForm();
  }

  function handleSelectRepository(
    repository: GitHubRepositoryOption,
  ) {
    if (importing) {
      return;
    }

    setSelectedRepository(repository);
    setSearchTerm("");
    setPickerOpen(false);
    setImportError(null);
  }

  async function handleImport() {
    /*
     * Capture the numeric organization ID in a local constant
     * before entering the async operation.
     */
    const currentOrganizationId = organizationId;

    if (
      !currentOrganizationId ||
      !selectedRepository
    ) {
      setImportError(
        "Select an organization and repository before importing.",
      );
      return;
    }

    /*
     * GitHub full_name has the form:
     *
     *     owner/repository
     *
     * Example:
     *
     *     saheed/coodara
     */
    const separatorIndex =
      selectedRepository.full_name.indexOf("/");

    if (separatorIndex <= 0) {
      setImportError(
        "The selected GitHub repository has an invalid name.",
      );
      return;
    }

    const owner =
      selectedRepository.full_name.slice(
        0,
        separatorIndex,
      );

    const name =
      selectedRepository.full_name.slice(
        separatorIndex + 1,
      );

    if (!owner || !name) {
      setImportError(
        "The selected GitHub repository has an invalid name.",
      );
      return;
    }

    setImporting(true);
    setImportError(null);

    try {
      const repository =
        await importRepository(
          currentOrganizationId,
          {
            owner,
            name,
            default_branch:
              selectedRepository.default_branch,
          },
        );

      notifyRepositoryImported();

      closeRepositoryImport();
      resetForm();

      navigate(
        `/dashboard/organizations/${currentOrganizationId}/repositories/${repository.id}/analysis`,
      );
    } catch (error) {
      setImportError(
        getErrorMessage(error),
      );
    } finally {
      setImporting(false);
    }
  }

  if (!isRepositoryImportOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="repository-import-title"
        className="w-full max-w-[440px] rounded-[14px] border border-[var(--cd-border)] bg-[var(--cd-surface)] p-[22px] shadow-[0_16px_40px_rgba(20,20,30,0.16)]"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="repository-import-title"
            className="text-[15px] font-semibold text-[var(--cd-ink)]"
          >
            Import GitHub repository
          </h2>

          <button
            type="button"
            onClick={handleClose}
            disabled={importing}
            aria-label="Close"
            className="cursor-pointer rounded-md p-1 text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* No organization */}
        {!organizationId && (
          <div className="mb-3 rounded-lg bg-[var(--cd-risk-bg)] px-3 py-2 text-[12px] text-[var(--cd-risk)]">
            Select or create an organization before
            importing a repository.
          </div>
        )}

        {/* Repository loading error */}
        {repositoriesError && (
          <div className="mb-3 rounded-lg bg-[var(--cd-risk-bg)] px-3 py-2 text-[12px] text-[var(--cd-risk)]">
            {repositoriesError}
          </div>
        )}

        {/* Import error */}
        {importError && (
          <div className="mb-3 rounded-lg bg-[var(--cd-risk-bg)] px-3 py-2 text-[12px] text-[var(--cd-risk)]">
            {importError}
          </div>
        )}

        {/* Repository */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="repository-picker"
            className="text-[12px] font-medium text-[var(--cd-ink-soft)]"
          >
            Repository
          </label>

          <div className="relative">
            <button
              id="repository-picker"
              type="button"
              disabled={
                importing ||
                !organizationId ||
                loadingRepositories
              }
              onClick={() =>
                setPickerOpen(
                  (open) => !open,
                )
              }
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-sunken)] px-[11px] py-[9px] text-left outline-none hover:border-[var(--cd-ink-faint)] focus:border-[var(--cd-accent)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingRepositories ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--cd-ink-faint)]" />

                  <span className="text-[12.5px] text-[var(--cd-ink-faint)]">
                    Loading GitHub repositories...
                  </span>
                </>
              ) : selectedRepository ? (
                <>
                  <GitBranch className="h-3.5 w-3.5 flex-shrink-0 text-[var(--cd-ink-faint)]" />

                  <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] font-medium text-[var(--cd-ink)]">
                    {selectedRepository.full_name}
                  </span>
                </>
              ) : (
                <span className="flex-1 text-[12.5px] text-[var(--cd-ink-faint)]">
                  Select a GitHub repository...
                </span>
              )}

              <ChevronDown
                className={`h-4 w-4 flex-shrink-0 text-[var(--cd-ink-faint)] transition-transform ${
                  pickerOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {/* Dropdown */}
            {pickerOpen && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] shadow-[0_12px_30px_rgba(20,20,30,0.14)]">
                {/* Search */}
                <div className="border-b border-[var(--cd-border-soft)] p-2">
                  <div className="flex items-center gap-1.5 rounded-md border border-[var(--cd-border)] bg-[var(--cd-sunken)] px-2.5 py-2 focus-within:border-[var(--cd-accent)]">
                    <Search className="h-3.5 w-3.5 flex-shrink-0 text-[var(--cd-ink-faint)]" />

                    <input
                      autoFocus
                      type="text"
                      value={searchTerm}
                      onChange={(event) =>
                        setSearchTerm(
                          event.target.value,
                        )
                      }
                      placeholder="Search repositories..."
                      className="w-full bg-transparent text-[12px] text-[var(--cd-ink)] outline-none placeholder:text-[var(--cd-ink-faint)]"
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                          "Escape"
                        ) {
                          setPickerOpen(false);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Results */}
                <div className="max-h-[260px] overflow-y-auto">
                  {filteredRepositories.length ===
                    0 && (
                    <div className="px-4 py-8 text-center">
                      <Search className="mx-auto mb-2 h-5 w-5 text-[var(--cd-ink-faint)]" />

                      <div className="text-[12px] font-medium text-[var(--cd-ink-soft)]">
                        No repositories found
                      </div>

                      <div className="mt-0.5 text-[11px] text-[var(--cd-ink-faint)]">
                        Try another search term.
                      </div>
                    </div>
                  )}

                  {filteredRepositories.map(
                    (repository) => {
                      const isSelected =
                        selectedRepository?.id ===
                        repository.id;

                      return (
                        <button
                          key={repository.id}
                          type="button"
                          onClick={() =>
                            handleSelectRepository(
                              repository,
                            )
                          }
                          className="flex w-full cursor-pointer items-start gap-2.5 border-b border-[var(--cd-border-soft)] px-3 py-2.5 text-left last:border-b-0 hover:bg-[var(--cd-sunken)]"
                        >
                          <GitBranch className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--cd-ink-faint)]" />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-mono text-[12.5px] font-semibold text-[var(--cd-ink)]">
                                {repository.full_name}
                              </span>

                              {repository.private && (
                                <span className="flex-shrink-0 rounded bg-[var(--cd-sunken)] px-1.5 py-0.5 text-[9.5px] font-medium text-[var(--cd-ink-faint)]">
                                  Private
                                </span>
                              )}
                            </div>

                            {repository.description && (
                              <div className="mt-0.5 truncate text-[11px] text-[var(--cd-ink-soft)]">
                                {
                                  repository.description
                                }
                              </div>
                            )}

                            <div className="mt-1 flex items-center gap-2.5 text-[10.5px] text-[var(--cd-ink-faint)]">
                              {repository.language && (
                                <span>
                                  {
                                    repository.language
                                  }
                                </span>
                              )}

                              <span>
                                {repository.default_branch}
                              </span>
                            </div>
                          </div>

                          {isSelected && (
                            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--cd-accent)]" />
                          )}
                        </button>
                      );
                    },
                  )}
                </div>

                {/* Result count */}
                {repositories.length > 0 && (
                  <div className="border-t border-[var(--cd-border-soft)] px-3 py-2 text-[10.5px] text-[var(--cd-ink-faint)]">
                    {filteredRepositories.length} of{" "}
                    {repositories.length} repositories
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selected repository details */}
        {selectedRepository && (
          <div className="mt-3 rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-mono text-[12px] font-semibold text-[var(--cd-ink)]">
                  {
                    selectedRepository.full_name
                  }
                </div>

                {selectedRepository.description && (
                  <div className="mt-0.5 line-clamp-2 text-[11px] text-[var(--cd-ink-soft)]">
                    {
                      selectedRepository.description
                    }
                  </div>
                )}

                <div className="mt-1.5 flex items-center gap-3 text-[10.5px] text-[var(--cd-ink-faint)]">
                  <span>
                    Branch:{" "}
                    {
                      selectedRepository.default_branch
                    }
                  </span>

                  {selectedRepository.language && (
                    <span>
                      {
                        selectedRepository.language
                      }
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRepository(null)
                }
                disabled={importing}
                aria-label="Clear selected repository"
                className="flex-shrink-0 cursor-pointer rounded p-1 text-[var(--cd-ink-faint)] hover:bg-[var(--cd-surface)] hover:text-[var(--cd-ink)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-[18px] flex justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={importing}
            className="cursor-pointer rounded-lg px-3.5 py-2 text-[12.5px] font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() =>
              void handleImport()
            }
            disabled={
              importing ||
              !organizationId ||
              !selectedRepository ||
              loadingRepositories
            }
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3.5 py-2 text-[12.5px] font-medium text-white hover:bg-[var(--cd-accent-hover)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {importing && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}

            {importing
              ? "Importing..."
              : "Import repository"}
          </button>
        </div>
      </div>
    </div>
  );
}