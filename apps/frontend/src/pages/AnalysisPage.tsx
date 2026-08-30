import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  GitBranch as RepoIcon,
  ArrowLeft,
  Play,
  AlertTriangle,
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

import { USE_MOCK_ANALYSIS_DATA } from "@/dev/devFlags";
import {
  getMockAnalysesForRepo,
  getMockResult,
} from "@/data/mockAnalyses";

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

function maintBand(v: number) {
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
      /*
       * Repository data is ALWAYS real.
       * Only analysis result/history data can use mocks.
       */
      const repoData = await getRepository(orgId, repoId);

      setRepo(repoData);

      if (USE_MOCK_ANALYSIS_DATA) {
        const list = getMockAnalysesForRepo(repoId);

        setHistory(list);

        const first = list[0] ?? null;

        setLatest(first);
        setSelectedId(first?.id ?? null);

        return;
      }

      const analysisList = await listAnalyses(
        orgId,
        repoId,
        1,
        20,
      );

      setHistory(analysisList.items);

      const first = analysisList.items[0] ?? null;

      setLatest(first);
      setSelectedId(first?.id ?? null);
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
   * Real analysis polling.
   *
   * When mock mode is disabled, this polls the backend analysis job.
   */
  const polledLatest = useAnalysisPolling(
    safeOrgId,
    safeRepoId,
    USE_MOCK_ANALYSIS_DATA ? null : latest,
    (settled) => {
      setHistory((prev) => [
        settled,
        ...prev.filter((h) => h.id !== settled.id),
      ]);

      setLatest(settled);

      if (settled.id === selectedId) {
        loadResultFor(settled);
      }
    },
  );

  const effectiveLatest = USE_MOCK_ANALYSIS_DATA
    ? latest
    : polledLatest ?? latest;

  async function loadResultFor(analysis: Analysis) {
    if (analysis.status !== "completed") {
      setResult(null);
      return;
    }

    if (USE_MOCK_ANALYSIS_DATA) {
      setResult(getMockResult(analysis.id) ?? null);
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
      effectiveLatest.id === selectedId
    ) {
      loadResultFor(effectiveLatest);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    effectiveLatest?.id,
    effectiveLatest?.status,
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

    /*
     * Mock mode is retained only for development.
     */
    if (USE_MOCK_ANALYSIS_DATA) {
      const mockId = Date.now();

      const base: Analysis = {
        id: mockId,
        repository_id: Number(repoId),
        status: "running",
        progress: 5,
        started_at: new Date().toISOString(),
        completed_at: null,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setHistory((prev) => [
        base,
        ...prev,
      ]);

      setLatest(base);
      setSelectedId(base.id);
      setResult(null);

      let progress = 5;

      const timer = setInterval(() => {
        progress += 15 + Math.random() * 10;

        if (progress >= 100) {
          clearInterval(timer);

          const finished: Analysis = {
            ...base,
            status: "completed",
            progress: 100,
            completed_at:
              new Date().toISOString(),
            updated_at:
              new Date().toISOString(),
          };

          setLatest(finished);

          setHistory((prev) => [
            finished,
            ...prev.filter(
              (h) => h.id !== finished.id,
            ),
          ]);

          setResult(
            getMockResult(7001) ?? null,
          );
        } else {
          setLatest((prev) =>
            prev
              ? {
                  ...prev,
                  progress: Math.round(progress),
                }
              : prev,
          );
        }
      }, 700);

      return;
    }

    /*
     * REAL ANALYSIS
     */
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
      <div className="p-6 text-[13px] text-[var(--cd-ink-soft)]">
        Loading repository...
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
                    ["Files", result.metrics.files],
                    [
                      "Lines",
                      result.metrics.loc.toLocaleString(),
                    ],
                    [
                      "Classes",
                      result.metrics.classes,
                    ],
                    [
                      "Functions",
                      result.metrics.functions,
                    ],
                    [
                      "Complexity",
                      result.metrics.complexity,
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
                          result.metrics.maintainability,
                        ).label
                      }
                    </div>

                    <div className="mt-2 h-2 w-[220px] max-w-full overflow-hidden rounded-full bg-[var(--cd-sunken)]">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${result.metrics.maintainability}%`,
                          background:
                            maintBand(
                              result.metrics
                                .maintainability,
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
                          result.metrics
                            .maintainability,
                        ).color,
                    }}
                  >
                    {result.metrics.maintainability.toFixed(
                      1,
                    )}

                    <span className="text-[13px] font-medium text-[var(--cd-ink-faint)]">
                      /100
                    </span>
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

              <div className="mb-4 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
                <div className="border-b border-[var(--cd-border-soft)] px-4.5 py-3.5">
                  <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--cd-ink-soft)]">
                    Dependency Graph
                  </h3>
                </div>

                <div className="overflow-x-auto p-5">
                  {result.dependency_graph ? (
                    <pre className="whitespace-pre-wrap break-all font-mono text-[11.5px] leading-relaxed text-[var(--cd-ink-soft)]">
                      {(() => {
                        try {
                          return JSON.stringify(
                            JSON.parse(
                              result.dependency_graph
                                .graph_data,
                            ),
                            null,
                            2,
                          );
                        } catch {
                          return result
                            .dependency_graph
                            .graph_data;
                        }
                      })()}
                    </pre>
                  ) : (
                    <span className="text-[12.5px] text-[var(--cd-ink-faint)]">
                      No dependency graph data
                      for this analysis.
                    </span>
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