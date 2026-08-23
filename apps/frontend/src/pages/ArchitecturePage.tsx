import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { GitBranch, RefreshCw, Sparkles } from "lucide-react";
import { getArchitecture, getArchitectureInsights } from "@/api/architecture";
import { getMockArchitecture, getMockInsights } from "@/data/MockArchitecture";
import { USE_MOCK_ARCHITECTURE_DATA } from "@/dev/devFlags";
import type { ArchitectureResponse, ArchitectureIssue } from "@/types/architecture";
import { ArchitectureSummary } from "@/components/architecture/ArchitectureSummary";
import { ArchitectureGraph } from "@/components/architecture/ArchitectureGraph";
import { ComponentDetails } from "@/components/architecture/ComponentDetails";
import { ArchitectureInsights } from "@/components/architecture/ArchitectureInsights";

/**
 * Route note: the contract's example route is /repositories/:repositoryId/architecture,
 * but this app nests repositories under organizations everywhere else (matches the
 * Analysis page route already in AppRouter.tsx), so this follows that same convention
 * for consistency:
 *
 *   /dashboard/organizations/:orgId/repositories/:repoId/architecture
 *
 * Only repoId is ever sent to the architecture API (per contract) — orgId is used
 * purely for the breadcrumb/back link.
 */
export function ArchitecturePage() {
  const { orgId, repoId } = useParams<{ orgId: string; repoId: string }>();
  const navigate = useNavigate();

  const [architecture, setArchitecture] = useState<ArchitectureResponse | null>(null);
  const [issues, setIssues] = useState<ArchitectureIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!repoId) return;
    setLoading(true);
    setError(null);

    // TEMP: backend architecture endpoints aren't built yet — use local
    // mock data (matches the real contract shapes exactly) until
    // USE_MOCK_ARCHITECTURE_DATA is flipped off in src/dev/devFlags.ts.
    if (USE_MOCK_ARCHITECTURE_DATA) {
      setTimeout(() => {
        setArchitecture(getMockArchitecture(repoId));
        setIssues(getMockInsights());
        setLoading(false);
      }, 350);
      return;
    }

    Promise.all([getArchitecture(repoId), getArchitectureInsights(repoId)])
      .then(([archData, insightsData]) => {
        setArchitecture(archData);
        setIssues(insightsData.items);
      })
      .catch(() => setError("Couldn't load architecture for this repository."))
      .finally(() => setLoading(false));
  }, [repoId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!repoId) return null;

  return (
    <div className="px-4 pb-10 pt-4 sm:px-6">
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--cd-ink-faint)]">
        <Link to="/dashboard/organizations" className="hover:text-[var(--cd-ink)]">
          Organizations
        </Link>
        <span>/</span>
        <Link to={`/dashboard/organizations/${orgId}`} className="hover:text-[var(--cd-ink)]">
          Repositories
        </Link>
        <span>/</span>
        <span className="font-medium text-[var(--cd-ink-soft)]">Architecture</span>
      </div>

      {USE_MOCK_ARCHITECTURE_DATA && (
        <div className="mb-3 rounded-lg border border-dashed border-[var(--cd-accent)] bg-[var(--cd-accent-soft)] px-3 py-2 text-[11.5px] font-medium text-[var(--cd-accent)]">
          Preview mode — showing local mock data. Backend endpoints aren't built yet
          (flip USE_MOCK_ARCHITECTURE_DATA off in src/dev/devFlags.ts once they are).
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight text-[var(--cd-ink)]">
            Architecture Intelligence
          </h1>
          <p className="mt-1 max-w-[520px] text-[12.5px] text-[var(--cd-ink-soft)]">
            Understand how your system is structured and how components relate.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="#"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)]"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Open GitHub
          </a>
          <button
            onClick={load}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-[var(--cd-accent-hover)]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Re-analyze
          </button>
        </div>
      </div>

      {/* Loading state — contract §17: never render fake/empty architecture while loading */}
      {loading && (
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-10 text-center text-[13px] text-[var(--cd-ink-soft)]">
          Analyzing architecture...
        </div>
      )}

      {/* Error state — contract §16: friendly error, never a raw stack trace */}
      {!loading && error && (
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-8 text-center">
          <div className="text-[13px] font-semibold text-[var(--cd-risk)]">
            Coodara couldn't complete the architecture analysis.
          </div>
          <button
            onClick={load}
            className="mt-4 cursor-pointer rounded-lg bg-[var(--cd-risk)] px-4 py-2 text-[12.5px] font-semibold text-white"
          >
            Retry Analysis
          </button>
        </div>
      )}

      {/* Pending state — analysis hasn't been run yet */}
      {!loading && !error && architecture?.status === "pending" && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-14 text-center">
          <div className="text-[15px] font-semibold text-[var(--cd-ink)]">
            Architecture analysis hasn't been run yet.
          </div>
          <p className="max-w-[380px] text-[12.5px] text-[var(--cd-ink-soft)]">
            Coodara needs to analyze this repository before its architecture can be visualized.
          </p>
          <button
            onClick={load}
            className="mt-2 cursor-pointer rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[var(--cd-accent-hover)]"
          >
            Analyze Repository
          </button>
        </div>
      )}

      {/* Analyzing state */}
      {!loading && !error && architecture?.status === "analyzing" && (
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-10 text-center text-[13px] text-[var(--cd-ink-soft)]">
          Analyzing architecture...
        </div>
      )}

      {/* Completed state — Phase 1 + 2 per contract: summary, graph, selection, component details, issues */}
      {!loading && !error && architecture?.status === "completed" && (
        <>
          <ArchitectureSummary summary={architecture.summary} />

          <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <ArchitectureGraph
              graph={architecture.graph}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
              <div className="border-b border-[var(--cd-border-soft)] px-4 py-3.5">
                <h3 className="text-[12.5px] font-semibold text-[var(--cd-ink)]">
                  Selected Component
                </h3>
              </div>
              <ComponentDetails
                repositoryId={repoId}
                componentId={selectedNodeId}
                onAskAi={() => navigate(`/dashboard/repositories/${repoId}/chat`)}
              />
            </div>
          </div>

          {/* Ask Coodara entry point — contract §20. Chat destination itself is a
              placeholder route for now; AI Chat integration is Phase 4, not built yet. */}
          <div className="mb-5 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-accent-soft)] p-4">
            <button
              onClick={() => navigate(`/dashboard/repositories/${repoId}/chat`)}
              className="flex cursor-pointer items-center gap-1.5 text-[12.5px] font-semibold text-[var(--cd-accent)]"
            >
              <Sparkles className="h-4 w-4" />
              Ask Coodara about this architecture
            </button>
          </div>

          <div className="mb-5">
            <ArchitectureInsights issues={issues} onSelectComponent={setSelectedNodeId} />
          </div>

          {/* Architecture History — contract §30 Phase 3, deliberately deferred tonight */}
          <div className="rounded-xl border border-dashed border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 text-center text-[12.5px] text-[var(--cd-ink-faint)]">
            Architecture History — Phase 3 per the integration contract, not built yet.
          </div>
        </>
      )}
    </div>
  );
}