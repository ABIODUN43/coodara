import { Link } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import type { DashboardOverviewData } from "@/hooks/useDashboardOverview";

interface AnalysisStatusSurfaceProps {
  analysisQueue: DashboardOverviewData["analysisQueue"];
  organizationId: number | string;
  repos: DashboardOverviewData["repos"];
}

export function AnalysisStatusSurface({
  analysisQueue,
  organizationId,
  repos,
}: AnalysisStatusSurfaceProps) {
  if (!analysisQueue || analysisQueue.length === 0) return null;

  const currentJob = analysisQueue[0];
  const matchedRepo = repos.find((r) => r.name === currentJob.repoName);

  return (
    <div className="mb-6 rounded-[12px] border border-blue-500/30 bg-blue-50/50 p-4 dark:bg-blue-950/20 dark:border-blue-900/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 font-heading">
                Analysis in Progress
              </span>
              <span className="rounded bg-blue-500/20 px-1.5 py-0.2 font-mono text-[10.5px] font-bold text-blue-700 dark:text-blue-300">
                {currentJob.status}
              </span>
            </div>

            <p className="mt-0.5 text-[12.5px] text-[var(--cd-ink)]">
              Repository <b className="font-semibold">{currentJob.repoName}</b> is currently being
              analyzed for architectural structure and dependency graphs.
            </p>
          </div>
        </div>

        {matchedRepo && (
          <Link
            to={`/dashboard/organizations/${organizationId}/repositories/${matchedRepo.id}/analysis`}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-[8px] bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <span>View Analysis Details</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
