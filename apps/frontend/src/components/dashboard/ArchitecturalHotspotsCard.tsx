import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { DashboardOverviewData } from "@/hooks/useDashboardOverview";

interface ArchitecturalHotspotsCardProps {
  repoData: DashboardOverviewData["repoData"];
  organizationId: number | string;
}

export function ArchitecturalHotspotsCard({
  repoData,
  organizationId,
}: ArchitecturalHotspotsCardProps) {
  const navigate = useNavigate();

  // Find components/repositories with lowest health or highest complexity
  const hotspots = repoData
    .filter((r) => r.result?.metrics !== undefined || (r.repo as any).health_score !== undefined)
    .sort((a, b) => {
      const scoreA = a.result?.metrics?.maintainability ?? (a.repo as any).health_score ?? 100;
      const scoreB = b.result?.metrics?.maintainability ?? (b.repo as any).health_score ?? 100;
      return scoreA - scoreB;
    })
    .slice(0, 3);

  const hasHotspots = hotspots.length > 0;

  return (
    <div className="rounded-[12px] border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 shadow-2xs">
      <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--cd-ink)] font-heading">
            Architectural Hotspots
          </h3>
          <span className="text-[11px] text-[var(--cd-ink-faint)]">
            High coupling × change intensity
          </span>
        </div>
      </div>

      <div className="mt-3 divide-y divide-[var(--cd-border-soft)]">
        {hasHotspots ? (
          hotspots.map((item, idx) => {
            const metrics = item.result?.metrics;
            const health = metrics?.maintainability
              ? Math.round(metrics.maintainability / 10)
              : (item.repo as any).health_score ?? 85;
            const loc = metrics?.loc ?? (item.repo as any).loc ?? 0;
            const isAtRisk = health < 70;

            return (
              <div
                key={`${item.repo.id}-${idx}`}
                className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-bold text-[var(--cd-ink)]">
                      {item.repo.name}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                        isAtRisk
                          ? "bg-[var(--cd-risk-bg)] text-[var(--cd-risk)]"
                          : "bg-[var(--cd-sunken)] text-[var(--cd-ink-soft)]"
                      }`}
                    >
                      {isAtRisk ? "Attention" : "Monitored"}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-[11px] text-[var(--cd-ink-faint)]">
                    <span>{loc > 0 ? `${loc.toLocaleString()} LOC` : "Scanned AST"}</span>
                    <span>·</span>
                    <span>Health score: {health}/100</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigate(
                      `/dashboard/organizations/${organizationId}/repositories/${item.repo.id}/architecture`,
                    );
                  }}
                  className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] cursor-pointer"
                >
                  <span>Inspect</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            );
          })
        ) : (
          <div className="flex items-center gap-2 py-4 text-[12px] text-[var(--cd-ink-faint)]">
            <CheckCircle2 className="h-4 w-4 text-[var(--cd-good)]" />
            <span>No hotspots exceeding threshold limits.</span>
          </div>
        )}
      </div>
    </div>
  );
}
