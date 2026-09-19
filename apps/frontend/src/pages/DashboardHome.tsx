import { useState } from "react";
import { Dropdown, Label } from "@heroui/react";
import { Clock, ChevronDown, Zap, Check, GitCompare, HelpCircle, ChevronRight } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/context/ProjectContext";
import { useDashboardOverview } from "@/hooks/useDashboardOverview";
import { ArchitectureSection } from "@/components/dashboard/ArchitectureSection";
import { ArchitectureTimeline } from "@/components/dashboard/ArchitectureTimeline";
import { CodeHealthHotspots } from "@/components/dashboard/CodeHealthHotspots";
import { RiskActivitySection } from "@/components/dashboard/RiskActivitySection";
import { RecommendedActions } from "@/components/dashboard/RecommendedActions";
import { RepositoriesSection } from "@/components/dashboard/RepositoriesSection";
import { ArchitecturePipelineFlow } from "@/components/architecture/ArchitecturePipelineFlow";
import { MetricEvidenceModal, type MetricEvidenceData, type MetricType } from "@/components/architecture/MetricEvidenceModal";
import { ArchitectureIntelligenceModal } from "@/components/architecture/ArchitectureIntelligenceModal";

const dateRanges = ["Last 7 days", "Last 30 days", "Last 90 days", "All time"];
type Tab = "overview" | "hotspots" | "risks";

export function DashboardHome() {
  const { activeProject, loading: orgsLoading } = useProject();
  const dashboardData = useDashboardOverview();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(dateRanges[1]);
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedMetric, setSelectedMetric] = useState<MetricEvidenceData | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);

  if (orgsLoading || dashboardData.loading) {
    return (
      <div className="px-4 pb-10 pt-4 sm:px-6 text-[13px] text-[var(--cd-ink-soft)]">
        Loading organization intelligence...
      </div>
    );
  }
  if (!activeProject) {
    return (
      <div className="px-4 pb-10 pt-4 sm:px-6 text-[13px] text-[var(--cd-ink-soft)]">
        No organization selected — create one to get started.
      </div>
    );
  }

  const {
    totalRepos,
    analyzedReposCount,
    totalLoc,
    healthScore,
    healthLabel,
    riskLevel,
    criticalFindingsCount,
    lastSnapshotIso,
    mostAtRiskRepo,
    healthBreakdown,
    technologies,
  } = dashboardData;

  const kpis: Array<{
    type: MetricType;
    label: string;
    value: string;
    sub?: string;
    delta: string;
    dot?: string;
    deltaColor?: string;
  }> = [
    {
      type: "health",
      label: "Architecture health",
      value: healthLabel,
      sub: `${healthScore}/100`,
      delta: analyzedReposCount > 0 ? "↑ Real-time telemetry" : "Awaiting scan",
      dot: healthLabel === "Healthy" ? "var(--cd-good)" : healthLabel === "Watch" ? "var(--cd-warn)" : "var(--cd-risk)",
      deltaColor: "var(--cd-good)",
    },
    {
      type: "risk",
      label: "Risk level",
      value: riskLevel,
      delta: criticalFindingsCount > 0 ? `${criticalFindingsCount} critical finding(s)` : "Optimal posture",
      dot: riskLevel === "Low" ? "var(--cd-good)" : riskLevel === "Medium" ? "var(--cd-warn)" : "var(--cd-risk)",
      deltaColor: riskLevel === "Low" ? "var(--cd-good)" : "var(--cd-risk)",
    },
    {
      type: "issues",
      label: "Critical findings",
      value: String(criticalFindingsCount),
      delta: criticalFindingsCount === 0 ? "0 active risks" : `${criticalFindingsCount} needs review`,
      dot: criticalFindingsCount === 0 ? "var(--cd-good)" : "var(--cd-risk)",
      deltaColor: criticalFindingsCount === 0 ? "var(--cd-good)" : "var(--cd-risk)",
    },
    {
      type: "components",
      label: "Repositories",
      value: String(totalRepos),
      delta: `${analyzedReposCount} analyzed`,
      deltaColor: "var(--cd-ink-faint)",
    },
  ];

  const breakdownList: Array<{ type: MetricType; label: string; value: number }> = [
    { type: "maintainability", label: "Maintainability", value: healthBreakdown.maintainability },
    { type: "complexity", label: "Complexity", value: healthBreakdown.complexity },
    { type: "coupling", label: "Coupling", value: healthBreakdown.coupling },
    { type: "modularity", label: "Modularity", value: healthBreakdown.modularity },
  ];

  const lastSnapshotFormatted = lastSnapshotIso
    ? new Date(lastSnapshotIso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Recently scanned";

  const trendHistory = analyzedReposCount > 0
    ? [
        ...dashboardData.repoData
          .filter((r) => r.result?.metrics?.maintainability !== undefined)
          .map((r, idx) => ({
            i: idx,
            v: Math.round((r.result?.metrics?.maintainability || 1000) / 10),
          })),
        { i: dashboardData.repoData.length, v: healthScore },
      ]
    : [{ i: 0, v: 100 }, { i: 1, v: 100 }];

  const primaryRepoData = dashboardData.repoData?.find((r) => r.repo.name === mostAtRiskRepo?.name) || dashboardData.repoData?.[0];
  const primaryGraph = primaryRepoData?.architecture?.graph;
  const primaryIssues = dashboardData.allIssues
    ?.filter((i) => i.repoName === mostAtRiskRepo?.name)
    .map((i) => i.issue) || [];

  const openMetricEvidence = (type: MetricType, value: number | string, statusLabel?: string) => {
    setSelectedMetric({
      type,
      value,
      statusLabel,
      repoName: mostAtRiskRepo?.name || activeProject?.name || "Analyzed Repository",
      healthScore,
      maintainabilityScore: healthBreakdown.maintainability,
      couplingScore: healthBreakdown.coupling,
      modularityScore: healthBreakdown.modularity,
      graphNodes: primaryGraph?.nodes,
      graphEdges: primaryGraph?.edges,
      issues: primaryIssues.length > 0 ? primaryIssues : dashboardData.allIssues?.map((i) => i.issue),
    });
  };

  return (
    <div className="px-4 pb-10 pt-4 sm:px-6">
      {/* Page head */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--cd-ink-soft)]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1.5 font-semibold text-[var(--cd-ink)]">
            <span className="flex h-4 w-4 items-center justify-center rounded-[5px] bg-[var(--cd-accent)] text-white">
              <Zap className="h-2.5 w-2.5" />
            </span>
            {activeProject.name}
          </span>
          <span className="text-[var(--cd-ink-faint)]">/</span>
          {activeProject.description && (
            <span className="rounded-full bg-[var(--cd-sunken)] px-2 py-0.5 text-[11px] text-[var(--cd-ink-faint)]">
              {activeProject.description}
            </span>
          )}
          <span className="text-[var(--cd-ink-faint)]">/</span>
          <span className="font-medium text-[var(--cd-ink-soft)]">Architecture Intelligence</span>
        </div>

        {/* Why Architecture Intelligence vs Docs button */}
        <button
          onClick={() => setIsCategoryModalOpen(true)}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Why Architecture Intelligence? (Not a Doc Tool)</span>
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[18px] font-semibold tracking-tight text-[var(--cd-ink)]">
          Architecture Command Center
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <Dropdown>
            <Dropdown.Trigger className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]">
              <Clock className="h-3 w-3" />
              {dateRange}
              <ChevronDown className="h-3 w-3" />
            </Dropdown.Trigger>
            <Dropdown.Popover className="w-[160px]">
              <Dropdown.Menu>
                {dateRanges.map((range) => (
                  <Dropdown.Item
                    key={range}
                    id={range}
                    textValue={range}
                    onAction={() => setDateRange(range)}
                    className="cursor-pointer"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <Label>{range}</Label>
                      {range === dateRange && <Check className="h-3.5 w-3.5 text-[var(--cd-accent)]" />}
                    </div>
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>

          <div className="flex overflow-hidden rounded-lg border border-[var(--cd-border)]">
            {(["overview", "hotspots", "risks"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`cursor-pointer px-2.5 py-1.5 text-[12px] font-medium capitalize ${
                  tab === t
                    ? "bg-[var(--cd-accent-soft)] text-[var(--cd-accent)]"
                    : "text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === "overview" && (
        <>
          <div className="mb-4 flex gap-2.5 rounded-xl border border-[var(--cd-accent-soft)] bg-[var(--cd-accent-soft)] p-3">
            <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--cd-accent)]" />
            <p className="text-[13px] leading-relaxed text-[var(--cd-ink-soft)]">
              Organization <b className="text-[var(--cd-ink)]">{activeProject.name}</b> has{" "}
              <b className="text-[var(--cd-ink)]">{totalRepos} repositories</b> and{" "}
              <b className="text-[var(--cd-ink)]">{totalLoc.toLocaleString()} lines of code</b> across{" "}
              <b className="text-[var(--cd-ink)]">{technologies.length} detected technologies</b>.{" "}
              Continuous architecture AST intelligence is {analyzedReposCount > 0 ? "active and verified" : "awaiting first scan"}.
            </p>
          </div>

          {/* 7-Stage Architecture Intelligence Pipeline Bar */}
          <div className="mb-5">
            <ArchitecturePipelineFlow />
          </div>

          {/* 4 Interactive KPI Cards with Metric Evidence Triggers */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <button
                key={k.label}
                onClick={() => openMetricEvidence(k.type, k.sub || k.value, k.value)}
                className="group flex flex-col justify-between rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4 text-left shadow-sm transition-all hover:border-[var(--cd-accent)] hover:shadow-md cursor-pointer"
              >
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[12px] text-[var(--cd-ink-faint)] font-medium">{k.label}</span>
                    {k.dot && <span className="h-2 w-2 rounded-full" style={{ background: k.dot }} />}
                  </div>
                  <div
                    className="text-[20px] font-bold tracking-tight"
                    style={{ color: k.label === "Architecture health" ? k.dot : "var(--cd-ink)" }}
                  >
                    {k.value}
                  </div>
                  {k.sub && <div className="mt-0.5 text-[11px] text-[var(--cd-ink-faint)] font-mono">{k.sub}</div>}
                  <div className="mt-1.5 text-[11px]" style={{ color: k.deltaColor }}>
                    {k.delta}
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[10.5px] text-[var(--cd-accent)] opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Inspect evidence &amp; formula</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </button>
            ))}
          </div>

          {/* Detailed Snapshot, Risk, and Health Breakdown Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4">
              <h3 className="mb-3 text-[13px] font-semibold text-[var(--cd-ink)]">Last snapshot</h3>
              <div className="font-mono text-[16px] font-bold text-[var(--cd-ink)] truncate">
                {lastSnapshotFormatted}
              </div>
              <div className="mt-1 text-[11.5px] text-[var(--cd-ink-faint)]">
                Auto-captured after every analysis
              </div>
              <button className="mt-3 flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-[var(--cd-border)] px-2.5 py-1.5 text-[11.5px] text-[var(--cd-ink-faint)]">
                <GitCompare className="h-3.5 w-3.5" />
                Compare snapshot — coming soon
              </button>
            </div>

            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4">
              <h3 className="mb-3 text-[13px] font-semibold text-[var(--cd-ink)]">Primary repository</h3>
              <div className="font-mono text-[16px] font-bold text-[var(--cd-ink)] truncate">
                {mostAtRiskRepo ? mostAtRiskRepo.name : "None registered"}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    background: mostAtRiskRepo?.severity === "risk" ? "var(--cd-risk-bg)" : "var(--cd-good-bg)",
                    color: mostAtRiskRepo?.severity === "risk" ? "var(--cd-risk)" : "var(--cd-good)",
                  }}
                >
                  {mostAtRiskRepo?.severity === "risk" ? "Needs review" : "Monitored"}
                </span>
                <span className="text-[11.5px] text-[var(--cd-ink-faint)] truncate max-w-[140px]">
                  {mostAtRiskRepo?.riskReason ?? "Zero warnings"}
                </span>
              </div>
            </div>

            {/* Clickable Health Breakdown Bars */}
            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-[var(--cd-ink)]">Health breakdown</h3>
                <span className="text-[10px] text-[var(--cd-ink-faint)] uppercase font-semibold">Click to inspect</span>
              </div>
              <div className="flex flex-col gap-2">
                {breakdownList.map((h) => (
                  <button
                    key={h.label}
                    onClick={() => openMetricEvidence(h.type, `${h.value}%`, `${h.label} Score`)}
                    className="group flex items-center gap-2 text-left cursor-pointer hover:bg-[var(--cd-sunken)]/60 rounded px-1.5 py-0.5 transition-colors"
                  >
                    <span className="w-[88px] flex-shrink-0 text-[11.5px] text-[var(--cd-ink-soft)] group-hover:text-[var(--cd-accent)] group-hover:font-semibold">
                      {h.label}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--cd-sunken)]">
                      <div
                        className="h-full rounded-full bg-[var(--cd-accent)] transition-all duration-500"
                        style={{ width: `${h.value}%` }}
                      />
                    </div>
                    <span className="w-7 text-right text-[11px] font-mono text-[var(--cd-ink-faint)] group-hover:text-[var(--cd-accent)]">
                      {h.value}%
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Architecture Trend Chart */}
            <button
              onClick={() => openMetricEvidence("health", `${healthScore}/100`, "Architecture Health Index")}
              className="group flex flex-col justify-between rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4 text-left cursor-pointer hover:border-[var(--cd-accent)] transition-all"
            >
              <div>
                <h3 className="text-[13px] font-semibold text-[var(--cd-ink)]">Architecture trend</h3>
                <div className="mt-0.5 text-[11px] text-[var(--cd-ink-faint)]">Organization health index</div>
              </div>
              <div className="mt-1 flex items-end justify-between">
                <div className="text-[24px] font-bold text-[var(--cd-ink)]">{healthScore}</div>
                <div className="h-10 w-20">
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
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-[var(--cd-good)] font-medium">↑ Telemetry live</span>
                <span className="text-[var(--cd-accent)] opacity-0 group-hover:opacity-100 transition-opacity">
                  Inspect formula →
                </span>
              </div>
            </button>
          </div>

          <div className="mt-7">
            <ArchitectureSection data={dashboardData} />
          </div>

          <div className="mt-7">
            <ArchitectureTimeline events={dashboardData.timelineEvents} />
          </div>

          <div className="mt-7">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cd-ink-faint)]">
                Code health &amp; hotspots
              </span>
              <div className="h-px flex-1 bg-[var(--cd-border)]" />
            </div>
            <CodeHealthHotspots data={dashboardData} />
          </div>

          <div className="mt-7">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cd-ink-faint)]">
                Risk &amp; activity
              </span>
              <div className="h-px flex-1 bg-[var(--cd-border)]" />
            </div>
            <RiskActivitySection data={dashboardData} />
          </div>

          <div className="mt-7">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cd-ink-faint)]">
                Recommended actions
              </span>
              <div className="h-px flex-1 bg-[var(--cd-border)]" />
            </div>
            <RecommendedActions data={dashboardData} />
          </div>

          <div className="mt-7">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cd-ink-faint)]">
                Repositories
              </span>
              <div className="h-px flex-1 bg-[var(--cd-border)]" />
            </div>
            <RepositoriesSection />
          </div>
        </>
      )}

      {tab === "hotspots" && (
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 text-[13px] text-[var(--cd-ink-soft)]">
          <CodeHealthHotspots data={dashboardData} />
        </div>
      )}

      {tab === "risks" && (
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 text-[13px] text-[var(--cd-ink-soft)]">
          <RiskActivitySection data={dashboardData} />
        </div>
      )}

      {/* Metric Evidence Modal */}
      <MetricEvidenceModal
        data={selectedMetric}
        onClose={() => setSelectedMetric(null)}
        onNavigateToStudio={() => {
          if (activeProject && mostAtRiskRepo) {
            navigate(`/dashboard/organizations/${activeProject.id}/repositories/${mostAtRiskRepo.repoId}/architecture`);
          }
        }}
      />

      {/* Why Architecture Intelligence Modal */}
      <ArchitectureIntelligenceModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onNavigateToStudio={() => {
          setIsCategoryModalOpen(false);
          if (activeProject && mostAtRiskRepo) {
            navigate(`/dashboard/organizations/${activeProject.id}/repositories/${mostAtRiskRepo.repoId}/architecture`);
          }
        }}
      />
    </div>
  );
}