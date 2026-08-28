import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X } from "lucide-react";

import { importRepository } from "@/api/repositories";
import { useProject } from "@/context/ProjectContext";
import { useDashboardActionContext } from "@/context/DashboardActionContext";
import { USE_MOCK_REPOSITORIES_DATA } from "@/dev/devFlags";

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
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
          (message): message is string => message !== null,
        );

      if (messages.length > 0) {
        return messages.join(", ");
      }
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to import repository.";
}

export function RepositoryImportModal() {
  const navigate = useNavigate();
  const { orgId } = useParams<{ orgId: string }>();
  const { activeProject } = useProject();

  const {
    isRepositoryImportOpen,
    closeRepositoryImport,
    notifyRepositoryImported,
  } = useDashboardActionContext();

  const [owner, setOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [importError, setImportError] =
    useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const parsedOrganizationId = orgId
    ? Number(orgId)
    : undefined;

  const organizationId =
    parsedOrganizationId !== undefined &&
    Number.isInteger(parsedOrganizationId) &&
    parsedOrganizationId > 0
      ? parsedOrganizationId
      : activeProject?.id;

  function resetForm() {
    setOwner("");
    setRepoName("");
    setImportError(null);
  }

  function handleClose() {
    if (importing) {
      return;
    }

    closeRepositoryImport();
    resetForm();
  }

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
      const repository = await importRepository(
        organizationId,
        {
          owner: owner.trim(),
          name: repoName.trim(),
        },
      );

      notifyRepositoryImported();

      closeRepositoryImport();
      resetForm();

      navigate(
        `/dashboard/organizations/${organizationId}/repositories/${repository.id}/analysis`,
      );
    } catch (error) {
      setImportError(getErrorMessage(error));
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
        className="w-full max-w-[400px] rounded-[14px] border border-[var(--cd-border)] bg-[var(--cd-surface)] p-[22px] shadow-[0_16px_40px_rgba(20,20,30,0.16)]"
        onClick={(event) => event.stopPropagation()}
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

        {/* Import error */}
        {importError && (
          <div className="mb-3 rounded-lg bg-[var(--cd-risk-bg)] px-3 py-2 text-[12px] text-[var(--cd-risk)]">
            {importError}
          </div>
        )}

        {/* Owner */}
        <div className="mb-3 flex flex-col gap-1.5">
          <label
            htmlFor="repository-owner"
            className="text-[12px] font-medium text-[var(--cd-ink-soft)]"
          >
            Owner
          </label>

          <input
            id="repository-owner"
            type="text"
            autoFocus
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !importing
              ) {
                void handleImport();
              }
            }}
            disabled={
              importing || !organizationId
            }
            placeholder="e.g. octocat"
            className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-sunken)] px-[11px] py-[9px] text-[13px] text-[var(--cd-ink)] outline-none focus:border-[var(--cd-accent)] focus:bg-[var(--cd-surface)] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        {/* Repository name */}
        <div className="mb-3 flex flex-col gap-1.5">
          <label
            htmlFor="repository-name"
            className="text-[12px] font-medium text-[var(--cd-ink-soft)]"
          >
            Repository name
          </label>

          <input
            id="repository-name"
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
            disabled={
              importing || !organizationId
            }
            placeholder="e.g. hello-world"
            className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-sunken)] px-[11px] py-[9px] text-[13px] text-[var(--cd-ink)] outline-none focus:border-[var(--cd-accent)] focus:bg-[var(--cd-surface)] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

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
            onClick={() => void handleImport()}
            disabled={
              importing ||
              !organizationId ||
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
  );
}