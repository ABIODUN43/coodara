import { LineChart, Line, ResponsiveContainer } from "recharts";
import { ChevronRight } from "lucide-react";
import type { DashboardOverviewData } from "@/hooks/useDashboardOverview";
import type { MetricType } from "@/components/architecture/MetricEvidenceModal";

interface ArchitectureHealthCardProps {
  healthScore: number;
  healthBreakdown: DashboardOverviewData["healthBreakdown"];
  repoData: DashboardOverviewData["repoData"];
  analyzedReposCount: number;
  onInspectEvidence: (type: MetricType, value: string | number, label?: string) => void;
}

export function ArchitectureHealthCard({
  healthScore,
  healthBreakdown,
  repoData,
  analyzedReposCount,
  onInspectEvidence,
}: ArchitectureHealthCardProps) {

  const breakdownMetrics: Array<{
    type: MetricType;
    label: string;
    value: number;
    description: string;
  }> = [
    {
      type: "maintainability",
      label: "Maintainability",
      value: Math.round(healthBreakdown.maintainability),
      description: "Code health & AST cohesion",
    },
    {
      type: "modularity",
      label: "Modularity",
      value: Math.round(healthBreakdown.modularity),
      description: "Component boundary isolation",
    },
    {
      type: "coupling",
      label: "Coupling",
      value: Math.round(healthBreakdown.coupling),
      description: "Afferent/efferent dependencies",
    },
    {
      type: "complexity",
      label: "Complexity",
      value: Math.round(healthBreakdown.complexity),
      description: "Class & call graph cyclomatic depth",
    },
  ];

  const hasTrend = analyzedReposCount > 0;

  // Real history mapped from scanned repositories or single point
  const trendHistory = hasTrend
    ? [
        ...repoData
          .filter((r) => r.result?.metrics?.maintainability !== undefined)
          .map((r, idx) => ({
            i: idx,
            v: Math.round((r.result?.metrics?.maintainability || 1000) / 10),
          })),
        { i: repoData.length, v: healthScore },
      ]
    : [];

  return (
    <div className="rounded-[12px] border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 shadow-2xs">
      <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--cd-ink)] font-heading">
            Architecture Health Breakdown
          </h3>
        </div>

        <button
          type="button"
          onClick={() => onInspectEvidence("health", `${healthScore}/100`, "Architecture Health Index")}
          className="flex items-center gap-1 text-[11.5px] font-medium text-[var(--cd-accent)] hover:underline cursor-pointer"
        >
          <span>Formula</span>
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Main Score & Trend Overview */}
      <div className="mt-3.5 flex items-end justify-between">
        <div>
          <div className="text-[11px] font-medium text-[var(--cd-ink-faint)]">
            System Health Index
          </div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-[var(--cd-ink)] font-mono">
              {analyzedReposCount > 0 ? healthScore : "—"}
            </span>
            <span className="text-xs text-[var(--cd-ink-faint)]">/ 100</span>
          </div>
        </div>

        {/* Understated Trend Sparkline */}
        {hasTrend && trendHistory.length > 1 ? (
          <div className="h-10 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendHistory}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="var(--cd-good)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <span className="text-[11px] text-[var(--cd-ink-faint)]">
            {hasTrend ? "First telemetry baseline" : "Awaiting scan"}
          </span>
        )}
      </div>

      {/* Compact Analytical Breakdown */}
      <div className="mt-4 space-y-2.5 pt-2 border-t border-[var(--cd-border-soft)]">
        {breakdownMetrics.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onInspectEvidence(item.type, `${item.value}%`, `${item.label} Score`)}
            className="group flex w-full items-center justify-between rounded-[6px] px-2 py-1.5 text-left transition-colors hover:bg-[var(--cd-sunken)]/60 cursor-pointer"
          >
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-[var(--cd-ink)] group-hover:text-[var(--cd-accent)]">
                {item.label}
              </div>
              <div className="text-[10.5px] text-[var(--cd-ink-faint)]">{item.description}</div>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--cd-sunken)]">
                <div
                  className="h-full rounded-full bg-[var(--cd-accent)] transition-all duration-300"
                  style={{ width: `${analyzedReposCount > 0 ? item.value : 0}%` }}
                />
              </div>

              <span className="w-10 text-right font-mono text-[12px] font-bold text-[var(--cd-ink)] group-hover:text-[var(--cd-accent)]">
                {analyzedReposCount > 0 ? `${item.value}%` : "—"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
