import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  GitBranch as RepoIcon,
  ArrowLeft,
  Play,
  AlertTriangle,
  Loader2,
  Network,
  Share2,
  ChevronDown,
  ArrowRight,
  Layers,
  FileCode,
} from "lucide-react";

import { getRepository } from "@/api/repositories";
import {
  startAnalysis,
  listAnalyses,
  getAnalysisResult,
} from "@/api/analyses";

import { useAnalysisPolling } from "@/hooks/useAnalysisPolling";

import type { Repository } from "@/types/repository";
import type { Analysis, AnalysisResult } from "@/types/analysis";

const ACTIVE_STATUSES = new Set([
  "pending",
  "queued",
  "running",
]);

function statusLabel(status: Analysis["status"] | "empty") {
  switch (status) {
    case "empty":
      return "Never analyzed";
    case "pending":
      return "Analysis pending";
    case "queued":
      return "Analysis queued";
    case "running":
      return "Analyzing";
    case "completed":
      return "Analysis completed";
    case "failed":
      return "Analysis failed";
    case "cancelled":
      return "Analysis cancelled";
  }
}

function runButtonLabel(status: Analysis["status"] | "empty") {
  switch (status) {
    case "empty":
      return "Run First Analysis";
    case "pending":
      return "Analysis Pending...";
    case "queued":
      return "Analysis Queued...";
    case "running":
      return "Analysis Running...";
    case "completed":
      return "Run New Analysis";
    case "failed":
      return "Retry Analysis";
    case "cancelled":
      return "Run Analysis Again";
  }
}

function maintBand(v: number | null | undefined) {
  if (v == null) {
    return {
      label: "Not Calculated",
      color: "var(--cd-ink-faint)",
    };
  }

  if (v >= 80) {
    return {
      label: "Healthy",
      color: "var(--cd-good)",
    };
  }

  if (v >= 60) {
    return {
      label: "Watch",
      color: "var(--cd-warn)",
    };
  }

  return {
    label: "At risk",
    color: "var(--cd-risk)",
  };
}


function formatDate(iso: string | null) {
  if (!iso) return "—";

  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AnalysisPage() {
  const { orgId, repoId } = useParams<{
    orgId: string;
    repoId: string;
  }>();

  /*
   * React Router params are technically optional.
   * The page itself validates them before making real API calls,
   * while the polling hook receives safe strings for TypeScript.
   */
  const safeOrgId = orgId ?? "";
  const safeRepoId = repoId ?? "";

  const [repo, setRepo] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [history, setHistory] = useState<Analysis[]>([]);
  const [latest, setLatest] = useState<Analysis | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [resultLoading, setResultLoading] = useState(false);

  const [conflictNotice, setConflictNotice] = useState<string | null>(null);

  async function loadAll() {
    if (!orgId || !repoId) {
      setLoadError("Invalid repository URL.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const [repoData, analysisList] = await Promise.all([
        getRepository(orgId, repoId),
        listAnalyses(orgId, repoId, 1, 20),
      ]);

      setRepo(repoData);
      setHistory(analysisList.items);

      const first = analysisList.items[0] ?? null;

      setLatest(first);
      setSelectedId(first?.id ?? null);

      if (first && first.status === "completed") {
        void loadResultFor(first);
      }
    } catch (err) {
      console.error(
        "Failed to load repository/analysis:",
        err,
      );

      setLoadError(
        "Couldn't load this repository's analysis data.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();

    // loadAll intentionally depends on the route parameters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, repoId]);

  /*
   * Real analysis polling from backend worker pipeline.
   */
  const polledLatest = useAnalysisPolling(
    safeOrgId,
    safeRepoId,
    latest,
    (settled) => {
      setHistory((prev) => [
        settled,
        ...prev.filter((h) => h.id !== settled.id),
      ]);

      setLatest(settled);

      if (settled.id === selectedId) {
        void loadResultFor(settled);
      }
    },
  );

  const effectiveLatest = polledLatest ?? latest;

  // Sync polled changes (progress, status) to history and results in real time
  useEffect(() => {
    if (polledLatest) {
      setHistory((prev) => {
        const exists = prev.some((h) => h.id === polledLatest.id);
        if (!exists) {
          return [polledLatest, ...prev];
        }
        return prev.map((h) => (h.id === polledLatest.id ? polledLatest : h));
      });
      if (polledLatest.status === "completed" && (selectedId === null || selectedId === polledLatest.id)) {
        void loadResultFor(polledLatest);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polledLatest?.id, polledLatest?.status, polledLatest?.progress]);

  async function loadResultFor(analysis: Analysis) {
    if (analysis.status !== "completed") {
      setResult(null);
      return;
    }

    if (!orgId || !repoId) {
      return;
    }

    setResultLoading(true);

    try {
      const r = await getAnalysisResult(
        orgId,
        repoId,
        analysis.id,
      );

      setResult(r);
    } catch (error) {
      console.error(
        "Failed to load analysis result:",
        error,
      );

      setResult(null);
    } finally {
      setResultLoading(false);
    }
  }

  useEffect(() => {
    if (
      effectiveLatest &&
      effectiveLatest.id === selectedId &&
      effectiveLatest.status === "completed" &&
      !result
    ) {
      void loadResultFor(effectiveLatest);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    effectiveLatest?.id,
    effectiveLatest?.status,
    selectedId,
  ]);

  async function handleSelectHistory(id: number) {
    setSelectedId(id);

    const entry = history.find(
      (h) => h.id === id,
    );

    if (entry) {
      await loadResultFor(entry);
    }
  }

  async function handleRun() {
    if (!orgId || !repoId) {
      setConflictNotice(
        "Invalid repository. Please return to the repository list and try again.",
      );

      return;
    }

    setConflictNotice(null);

    try {
      const created = await startAnalysis(
        orgId,
        repoId,
      );

      setHistory((prev) => [
        created,
        ...prev,
      ]);

      setLatest(created);
      setSelectedId(created.id);
      setResult(null);
    } catch (err: any) {
      console.error(
        "Failed to start analysis:",
        err,
      );

      if (err?.response?.status === 409) {
        setConflictNotice(
          "This repository already has an active analysis.",
        );

        await loadAll();
      } else {
        setConflictNotice(
          "Couldn't start a new analysis. Try again.",
        );
      }
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3 text-sm text-[var(--cd-ink-soft)]">
          <Link
            to="/dashboard/repositories"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--cd-accent)] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Repositories
          </Link>
          <span>/</span>
          <span className="h-4 w-32 bg-[var(--cd-surface-2)] rounded animate-pulse inline-block" />
        </div>

        <div className="flex items-center justify-between border-b border-[var(--cd-border)] pb-6">
          <div className="space-y-2">
            <div className="h-7 w-64 bg-[var(--cd-surface-2)] rounded animate-pulse" />
            <div className="h-4 w-40 bg-[var(--cd-surface-2)] rounded animate-pulse" />
          </div>
          <div className="h-9 w-32 bg-[var(--cd-surface-2)] rounded-md animate-pulse" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface-1)] p-4 space-y-3">
              <div className="h-4 w-24 bg-[var(--cd-surface-2)] rounded animate-pulse" />
              <div className="h-8 w-16 bg-[var(--cd-surface-2)] rounded animate-pulse" />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center py-12 gap-3 text-sm text-[var(--cd-ink-soft)]">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--cd-accent)]" />
          <span>Connecting to repository pipeline...</span>
        </div>
      </div>
    );
  }

  if (loadError || !repo) {
    return (
      <div className="p-6">
        <div className="mb-3 text-[13px] text-[var(--cd-risk)]">
          {loadError ?? "Repository not found."}
        </div>

        <Link
          to="/dashboard/repositories"
          className="text-[12.5px] font-medium text-[var(--cd-accent)]"
        >
          ← Back to repositories
        </Link>
      </div>
    );
  }

  const displayStatus:
    | Analysis["status"]
    | "empty" =
    effectiveLatest?.status ?? "empty";

  const isActive = effectiveLatest
    ? ACTIVE_STATUSES.has(
        effectiveLatest.status,
      )
    : false;

  const viewingLatest =
    selectedId === effectiveLatest?.id;

  const selectedEntry =
    history.find(
      (h) => h.id === selectedId,
    ) ?? null;

  const statusColorClass: Record<
    string,
    string
  > = {
    empty:
      "bg-[var(--cd-sunken)] text-[var(--cd-ink-faint)]",
    pending:
      "bg-[var(--cd-accent-soft)] text-[var(--cd-accent)]",
    queued:
      "bg-[var(--cd-accent-soft)] text-[var(--cd-accent)]",
    running:
      "bg-[var(--cd-accent-soft)] text-[var(--cd-accent)]",
    completed:
      "bg-[var(--cd-good-bg)] text-[var(--cd-good)]",
    failed:
      "bg-[var(--cd-risk-bg)] text-[var(--cd-risk)]",
    cancelled:
      "bg-[var(--cd-sunken)] text-[var(--cd-ink-faint)]",
  };

  const statusDotClass: Record<
    string,
    string
  > = {
    empty: "var(--cd-ink-faint)",
    pending: "var(--cd-accent)",
    queued: "var(--cd-accent)",
    running: "var(--cd-accent)",
    completed: "var(--cd-good)",
    failed: "var(--cd-risk)",
    cancelled: "var(--cd-ink-faint)",
  };

  return (
    <div className="px-4 pb-10 pt-4 sm:px-6">
      <Link
        to={`/dashboard/organizations/${orgId}/repositories`}
        className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--cd-ink-soft)] hover:text-[var(--cd-accent)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Repository
      </Link>

      <div className="mb-4 flex gap-1 border-b border-[var(--cd-border)]">
        <span className="mr-[22px] cursor-default border-b-2 border-[var(--cd-accent)] px-1 pb-2.5 pt-2 text-[13px] font-semibold text-[var(--cd-ink)]">
          Analysis
        </span>

        <Link
          to={`/dashboard/organizations/${orgId}/repositories/${repoId}/architecture`}
          className="mr-[22px] border-b-2 border-transparent px-1 pb-2.5 pt-2 text-[13px] font-medium text-[var(--cd-ink-faint)] hover:text-[var(--cd-ink)]"
        >
          Architecture
        </Link>
      </div>

      {/* Repository header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[10px] bg-[var(--cd-sunken)]">
            <RepoIcon className="h-[19px] w-[19px] text-[var(--cd-ink-soft)]" />
          </div>

          <div>
            <div className="font-mono text-[18px] font-semibold tracking-tight text-[var(--cd-ink)]">
              {repo.name}
            </div>

            <div className="font-mono text-[12px] text-[var(--cd-ink-faint)]">
              {repo.full_name}
            </div>

            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full py-[3px] pl-[7px] pr-[9px] text-[12px] font-semibold ${statusColorClass[displayStatus]}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    displayStatus === "running"
                      ? "animate-pulse"
                      : ""
                  }`}
                  style={{
                    background:
                      statusDotClass[
                        displayStatus
                      ],
                  }}
                />

                {statusLabel(displayStatus)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <button
            onClick={handleRun}
            disabled={isActive}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3.5 py-2 text-[12.5px] font-medium text-white hover:bg-[var(--cd-accent-hover)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Play className="h-3.5 w-3.5" />

            {runButtonLabel(displayStatus)}
          </button>

          {effectiveLatest?.completed_at && (
            <span className="text-[11.5px] text-[var(--cd-ink-faint)]">
              Last analyzed{" "}
              {formatDate(
                effectiveLatest.completed_at,
              )}
            </span>
          )}
        </div>
      </div>

      {conflictNotice && (
        <div className="mb-4 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-accent-soft)] px-4 py-2.5 text-[12.5px] text-[var(--cd-accent)]">
          {conflictNotice}
        </div>
      )}

      {/* No analysis */}
      {displayStatus === "empty" && (
        <div className="flex flex-col items-center rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] px-6 py-16 text-center">
          <div className="mb-3 text-[var(--cd-ink-faint)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-11 w-11"
            >
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="2"
              />
              <path d="M8 12h8" />
              <path d="M12 8v8" />
            </svg>
          </div>

          <div className="mb-1.5 text-[15px] font-semibold text-[var(--cd-ink)]">
            Analyze your repository
          </div>

          <div className="mb-4 max-w-[380px] text-[12.5px] leading-relaxed text-[var(--cd-ink-soft)]">
            Coodara will inspect your repository
            structure, dependencies, technologies,
            and code metrics.
          </div>

          <button
            onClick={handleRun}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3.5 py-2 text-[12.5px] font-medium text-white hover:bg-[var(--cd-accent-hover)]"
          >
            <Play className="h-3.5 w-3.5" />
            Run First Analysis
          </button>
        </div>
      )}

      {/* Running */}
      {isActive && (
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] px-6 py-8 text-center">
          <div className="mb-4 text-[14px] font-semibold text-[var(--cd-ink)]">
            Analyzing {repo.name}
          </div>

          <div className="mx-auto mb-2.5 h-2.5 max-w-[420px] overflow-hidden rounded-full bg-[var(--cd-sunken)]">
            <div
              className="h-full rounded-full bg-[var(--cd-accent)] transition-[width] duration-500"
              style={{
                width: `${effectiveLatest?.progress ?? 0}%`,
              }}
            />
          </div>

          <div className="font-mono text-[12.5px] font-semibold text-[var(--cd-ink-soft)]">
            {effectiveLatest?.progress ?? 0}%
          </div>

          <div className="mt-1.5 text-[12px] text-[var(--cd-ink-faint)]">
            Analyzing repository...
          </div>
        </div>
      )}

      {/* Failed */}
      {!isActive &&
        effectiveLatest?.status === "failed" &&
        viewingLatest && (
          <div className="mb-4 overflow-hidden rounded-xl border border-[var(--cd-risk)]/30 bg-[var(--cd-surface)]">
            <div className="border-b border-[var(--cd-risk)]/25 bg-[var(--cd-risk-bg)] px-4.5 py-3.5">
              <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--cd-risk)]">
                Analysis failed
              </h3>
            </div>

            <div className="p-5">
              <div className="mb-1.5 flex items-center gap-2 text-[14px] font-semibold text-[var(--cd-ink)]">
                <AlertTriangle className="h-4 w-4 text-[var(--cd-risk)]" />
                We couldn't complete the
                analysis of this repository.
              </div>

              <div className="mb-3.5 max-w-[520px] text-[12.5px] leading-relaxed text-[var(--cd-ink-soft)]">
                This analysis failed{" "}
                {formatDate(
                  effectiveLatest.updated_at,
                )}
                .
              </div>

              {effectiveLatest.error_message && (
                <div className="mb-4 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-sunken)] px-3.5 py-3 font-mono text-[12px] text-[var(--cd-ink-soft)]">
                  {effectiveLatest.error_message}
                </div>
              )}

              <button
                onClick={handleRun}
                className="cursor-pointer rounded-lg border border-[var(--cd-risk)]/40 bg-[var(--cd-surface)] px-3.5 py-2 text-[12.5px] font-medium text-[var(--cd-risk)] hover:bg-[var(--cd-risk-bg)]"
              >
                Retry Analysis
              </button>
            </div>
          </div>
        )}

      {/* Historical failure */}
      {selectedEntry &&
        selectedEntry.status === "failed" &&
        !viewingLatest && (
          <div className="mb-4 overflow-hidden rounded-xl border border-[var(--cd-risk)]/30 bg-[var(--cd-surface)]">
            <div className="border-b border-[var(--cd-risk)]/25 bg-[var(--cd-risk-bg)] px-4.5 py-3.5">
              <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--cd-risk)]">
                Analysis failed
              </h3>
            </div>

            <div className="p-5">
              <div className="mb-3.5 max-w-[520px] text-[12.5px] leading-relaxed text-[var(--cd-ink-soft)]">
                This analysis failed on{" "}
                {formatDate(
                  selectedEntry.updated_at,
                )}
                .
              </div>

              {selectedEntry.error_message && (
                <div className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-sunken)] px-3.5 py-3 font-mono text-[12px] text-[var(--cd-ink-soft)]">
                  {selectedEntry.error_message}
                </div>
              )}
            </div>
          </div>
        )}

      {/* Historical selection */}
      {!viewingLatest &&
        selectedEntry && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-accent-soft)] px-4 py-2.5 text-[12px] font-medium text-[var(--cd-accent)]">
            <span>
              Viewing analysis from{" "}
              {formatDate(
                selectedEntry.created_at,
              )}
            </span>

            <button
              onClick={() =>
                effectiveLatest &&
                handleSelectHistory(
                  effectiveLatest.id,
                )
              }
              className="cursor-pointer text-[11.5px] font-semibold underline"
            >
              Back to latest
            </button>
          </div>
        )}

      {/* Completed result */}
      {selectedEntry?.status === "completed" && (
        <>
          {resultLoading && (
            <div className="mb-4 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 text-center text-[13px] text-[var(--cd-ink-soft)]">
              Loading analysis result...
            </div>
          )}

          {!resultLoading && !result && (
            <div className="mb-4 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 text-center text-[13px] text-[var(--cd-ink-soft)]">
              <p>Analysis completed. Telemetry snapshot recorded.</p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => selectedEntry && loadResultFor(selectedEntry)}
                  className="rounded-lg bg-[var(--cd-brand)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
                >
                  Fetch Result Details
                </button>
              </div>
            </div>
          )}

          {!resultLoading && result && (
            <>
              <div className="mb-4 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
                <div className="border-b border-[var(--cd-border-soft)] px-4.5 py-3.5">
                  <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--cd-ink-soft)]">
                    Analysis Overview
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-t-lg bg-[var(--cd-border)] sm:grid-cols-5">
                  {[
                    ["Files", result.metrics?.files ?? 0],
                    [
                      "Lines",
                      (result.metrics?.loc ?? 0).toLocaleString(),
                    ],
                    [
                      "Classes",
                      result.metrics?.classes ?? 0,
                    ],
                    [
                      "Functions",
                      result.metrics?.functions ?? 0,
                    ],
                    [
                      "Complexity",
                      result.metrics?.complexity != null
                        ? Number(result.metrics.complexity).toFixed(1)
                        : "—",
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label as string}
                      className="bg-[var(--cd-surface)] p-4"
                    >
                      <span className="text-[11px] font-medium text-[var(--cd-ink-faint)]">
                        {label}
                      </span>

                      <span className="mt-1.5 block font-mono text-[20px] font-semibold text-[var(--cd-ink)]">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--cd-border-soft)] p-5">
                  <div>
                    <div className="text-[12px] font-semibold text-[var(--cd-ink-soft)]">
                      Maintainability
                    </div>

                    <div className="mt-0.5 text-[11px] text-[var(--cd-ink-faint)]">
                      {
                        maintBand(
                          result.metrics?.maintainability,
                        ).label
                      }
                    </div>

                    <div className="mt-2 h-2 w-[220px] max-w-full overflow-hidden rounded-full bg-[var(--cd-sunken)]">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${result.metrics?.maintainability ?? 0}%`,
                          background:
                            maintBand(
                              result.metrics?.maintainability,
                            ).color,
                        }}
                      />
                    </div>
                  </div>

                  <div
                    className="font-mono text-[22px] font-bold"
                    style={{
                      color:
                        maintBand(
                          result.metrics?.maintainability,
                        ).color,
                    }}
                  >
                    {result.metrics?.maintainability != null
                      ? Number(result.metrics.maintainability).toFixed(1)
                      : "—"}

                    {result.metrics?.maintainability != null && (
                      <span className="text-[13px] font-medium text-[var(--cd-ink-faint)]">
                        /100
                      </span>
                    )}
                  </div>
                </div>
              </div>


              <div className="mb-4 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
                <div className="border-b border-[var(--cd-border-soft)] px-4.5 py-3.5">
                  <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--cd-ink-soft)]">
                    Technologies detected
                  </h3>
                </div>

                <div className="p-5">
                  {result.technologies.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3.5 border-b border-[var(--cd-border-soft)] py-2.5 last:border-none"
                    >
                      <span className="w-[110px] flex-shrink-0 text-[12.5px] font-medium text-[var(--cd-ink)]">
                        {t.technology}
                      </span>

                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--cd-sunken)]">
                        <div
                          className="h-full rounded-full bg-[var(--cd-accent)]"
                          style={{
                            width: `${Math.round(
                              t.confidence_score * 100,
                            )}%`,
                          }}
                        />
                      </div>

                      <span className="w-[110px] flex-shrink-0 text-right text-[11.5px] text-[var(--cd-ink-faint)]">
                        <b className="font-mono font-semibold text-[var(--cd-ink)]">
                          {Math.round(
                            t.confidence_score * 100,
                          )}
                          %
                        </b>{" "}
                        confidence
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dependency Graph Topology Section */}
              <div className="mb-4 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--cd-border-soft)] px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--cd-accent-soft)] text-[var(--cd-accent)]">
                      <Network className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-[13px] font-bold tracking-tight text-[var(--cd-ink)]">
                        AST Dependency Graph Topology G = (V, E)
                      </h3>
                      <p className="text-[11.5px] text-[var(--cd-ink-faint)]">
                        Complete code symbol dependencies extracted from repository Abstract Syntax Trees
                      </p>
                    </div>
                  </div>

                  {orgId && repoId && (
                    <Link
                      to={`/dashboard/organizations/${orgId}/repositories/${repoId}/architecture?tab=map`}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-xs hover:bg-[var(--cd-accent-hover)] transition-colors"
                    >
                      <Network className="h-3.5 w-3.5" />
                      <span>Explore Interactive Architecture System Map</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>

                <div className="p-5">
                  {result.dependency_graph ? (
                    (() => {
                      const raw = result.dependency_graph.graph_data;
                      let parsed: { version?: string; nodes?: any[]; edges?: any[] } = {};
                      try {
                        parsed = JSON.parse(raw || "{}");
                      } catch {
                        parsed = {};
                      }

                      const totalNodes = parsed.nodes?.length ?? 0;
                      const totalEdges = parsed.edges?.length ?? 0;
                      const sampleNodes = (parsed.nodes || []).slice(0, 6);

                      return (
                        <div className="space-y-4">
                          {/* Topology Metrics Cards */}
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] p-3.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--cd-ink-faint)]">
                                <Layers className="h-3.5 w-3.5 text-[var(--cd-accent)]" />
                                <span>AST Nodes (|V|)</span>
                              </div>
                              <div className="mt-1 font-mono text-[18px] font-bold text-[var(--cd-ink)]">
                                {totalNodes.toLocaleString()}
                              </div>
                              <div className="text-[10.5px] text-[var(--cd-ink-soft)]">
                                Modules, classes &amp; files
                              </div>
                            </div>

                            <div className="rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] p-3.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--cd-ink-faint)]">
                                <Share2 className="h-3.5 w-3.5 text-purple-500" />
                                <span>Dependency Edges (|E|)</span>
                              </div>
                              <div className="mt-1 font-mono text-[18px] font-bold text-[var(--cd-ink)]">
                                {totalEdges.toLocaleString()}
                              </div>
                              <div className="text-[10.5px] text-[var(--cd-ink-soft)]">
                                Imports, calls &amp; type refs
                              </div>
                            </div>

                            <div className="rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] p-3.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--cd-ink-faint)]">
                                <FileCode className="h-3.5 w-3.5 text-emerald-500" />
                                <span>Analysis Engine</span>
                              </div>
                              <div className="mt-1 text-[13px] font-bold text-[var(--cd-ink)] truncate">
                                AST Graph Parser
                              </div>
                              <div className="text-[10.5px] text-[var(--cd-ink-soft)]">
                                Tree-sitter + Symbol trace
                              </div>
                            </div>

                            <div className="rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] p-3.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--cd-ink-faint)]">
                                <Network className="h-3.5 w-3.5 text-blue-500" />
                                <span>Architecture Snapshot</span>
                              </div>
                              <div className="mt-1 text-[13px] font-bold text-[var(--cd-good)] truncate">
                                Synchronized
                              </div>
                              <div className="text-[10.5px] text-[var(--cd-ink-soft)]">
                                Ready for blast simulation
                              </div>
                            </div>
                          </div>

                          {/* Sample Extracted AST Modules */}
                          {sampleNodes.length > 0 && (
                            <div className="rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] p-3.5">
                              <div className="mb-2 text-[11.5px] font-semibold text-[var(--cd-ink)]">
                                Sample Extracted AST Nodes (Showing 6 of {totalNodes.toLocaleString()})
                              </div>
                              <div className="space-y-1.5">
                                {sampleNodes.map((node: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between rounded border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] px-3 py-1.5 font-mono text-[11px]"
                                  >
                                    <span className="truncate text-[var(--cd-ink)] max-w-[80%]">
                                      {node.id || node.name || JSON.stringify(node)}
                                    </span>
                                    <span className="rounded bg-[var(--cd-sunken)] px-1.5 py-0.5 text-[10px] uppercase font-bold text-[var(--cd-ink-faint)]">
                                      {node.type || "module"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Collapsible Raw JSON Payload */}
                          <details className="group rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] p-3">
                            <summary className="flex cursor-pointer items-center justify-between font-mono text-[11.5px] font-semibold text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]">
                              <span>View Raw Graph JSON Payload ({raw.length.toLocaleString()} bytes)</span>
                              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                            </summary>
                            <pre className="mt-3 max-h-[220px] overflow-auto whitespace-pre-wrap break-all rounded border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-3 font-mono text-[11px] leading-relaxed text-[var(--cd-ink-soft)]">
                              {raw.length > 10000
                                ? JSON.stringify(
                                    {
                                      version: parsed.version,
                                      total_nodes: totalNodes,
                                      total_edges: totalEdges,
                                      sample_nodes: sampleNodes,
                                      note: "Full visual interactive model is available on the Architecture page.",
                                    },
                                    null,
                                    2,
                                  )
                                : raw}
                            </pre>
                          </details>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Network className="h-8 w-8 text-[var(--cd-ink-faint)] mb-2" />
                      <span className="text-[13px] font-medium text-[var(--cd-ink-soft)]">
                        No dependency graph data available for this analysis run.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
                <div className="border-b border-[var(--cd-border-soft)] px-4.5 py-3.5">
                  <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--cd-ink-soft)]">
                    Analysis Summary
                  </h3>
                </div>

                <div className="p-5">
                  <p className="text-[13px] leading-relaxed text-[var(--cd-ink)]">
                    {result.summary ??
                      "No summary available."}
                  </p>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* History */}
      <div className="overflow-hidden rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
        <div className="border-b border-[var(--cd-border-soft)] px-4.5 py-3.5">
          <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--cd-ink-soft)]">
            Analysis History
          </h3>
        </div>

        {history.length === 0 ? (
          <div className="p-5 text-[12.5px] text-[var(--cd-ink-faint)]">
            No analyses yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {[
                    "Date",
                    "Status",
                    "Progress",
                  ].map((h) => (
                    <th
                      key={h}
                      className="border-b border-[var(--cd-border-soft)] px-5 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wide text-[var(--cd-ink-faint)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {history.map((h) => (
                  <tr
                    key={h.id}
                    onClick={() =>
                      handleSelectHistory(h.id)
                    }
                    className={`cursor-pointer ${
                      h.id === selectedId
                        ? "bg-[var(--cd-accent-soft)]"
                        : "hover:bg-[var(--cd-sunken)]"
                    }`}
                  >
                    <td className="border-b border-[var(--cd-border-soft)] px-5 py-2.5 font-mono text-[12.5px] text-[var(--cd-ink)]">
                      {formatDate(h.created_at)}
                    </td>

                    <td className="border-b border-[var(--cd-border-soft)] px-5 py-2.5">
                      <span
                        className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold"
                        style={{
                          color:
                            statusDotClass[
                              h.status
                            ],
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            background:
                              statusDotClass[
                                h.status
                              ],
                          }}
                        />

                        {statusLabel(h.status)}
                      </span>
                    </td>

                    <td className="border-b border-[var(--cd-border-soft)] px-5 py-2.5 font-mono text-[12.5px] text-[var(--cd-ink)]">
                      {h.status === "completed"
                        ? "100%"
                        : `${h.progress}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}