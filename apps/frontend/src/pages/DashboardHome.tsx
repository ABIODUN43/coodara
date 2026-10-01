import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/context/ProjectContext";
import { useDashboardActionContext } from "@/context/DashboardActionContext";
import { useDashboardOverviewContext } from "@/context/DashboardOverviewContext";
import { PageContainer } from "@/components/common/PageContainer";
import { OverviewHeader } from "@/components/dashboard/OverviewHeader";
import { SystemStateStrip } from "@/components/dashboard/SystemStateStrip";
import { ArchitectureWorkspace } from "@/components/dashboard/ArchitectureWorkspace";
import { RecentArchitectureChanges } from "@/components/dashboard/RecentArchitectureChanges";
import { CoodaraFindingCard } from "@/components/dashboard/CoodaraFindingCard";
import { ArchitectureRisksCard } from "@/components/dashboard/ArchitectureRisksCard";
import { ArchitectureHealthCard } from "@/components/dashboard/ArchitectureHealthCard";
import { ArchitecturalHotspotsCard } from "@/components/dashboard/ArchitecturalHotspotsCard";
import { AnalysisStatusSurface } from "@/components/dashboard/AnalysisStatusSurface";
import { EmptyOverviewState } from "@/components/dashboard/EmptyOverviewState";
import {
  MetricEvidenceModal,
  type MetricEvidenceData,
  type MetricType,
} from "@/components/architecture/MetricEvidenceModal";
import { ArchitectureIntelligenceModal } from "@/components/architecture/ArchitectureIntelligenceModal";
import type { OverviewRepositoryItem } from "@/types/overview";

export function DashboardHome() {
  const { activeProject, loading: orgsLoading } = useProject();
  const dashboardData = useDashboardOverviewContext();
  const { openRepositoryImport } = useDashboardActionContext();
  const navigate = useNavigate();

  const [selectedMetric, setSelectedMetric] = useState<MetricEvidenceData | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);

  // Normalize repositories list from rawOverview or fallback
  const overviewRepos: OverviewRepositoryItem[] = useMemo(() => {
    if (dashboardData.rawOverview?.repos && dashboardData.rawOverview.repos.length > 0) {
      return dashboardData.rawOverview.repos;
    }
    return (dashboardData.repos || []).map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      default_branch: r.default_branch,
      primary_language: r.primary_language,
      latest_analysis_status: null,
      latest_analysis_id: null,
      loc: 0,
      files: 0,
      health_score: 100,
    }));
  }, [dashboardData.rawOverview?.repos, dashboardData.repos]);

  // Primary active repository
  const activeRepo = useMemo(() => {
    if (selectedRepoId) {
      const found = overviewRepos.find((r) => r.id === selectedRepoId);
      if (found) return found;
    }
    if (dashboardData.mostAtRiskRepo) {
      const atRisk = overviewRepos.find((r) => r.id === dashboardData.mostAtRiskRepo?.repoId);
      if (atRisk) return atRisk;
    }
    return overviewRepos[0] || null;
  }, [overviewRepos, selectedRepoId, dashboardData.mostAtRiskRepo]);

  // Loading technical experience
  if (orgsLoading || dashboardData.loading) {
    return (
      <PageContainer variant="wide">
        <div className="flex min-h-[480px] flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--cd-accent)] border-t-transparent" />
          <p className="text-[13px] font-medium text-[var(--cd-ink)]">
            Loading architecture intelligence...
          </p>
          <p className="text-[11.5px] text-[var(--cd-ink-faint)]">
            Fetching consolidated repository telemetry and dependency graphs.
          </p>
        </div>
      </PageContainer>
    );
  }

  // Missing organization state
  if (!activeProject) {
    return (
      <PageContainer variant="wide">
        <div className="rounded-[12px] border border-[var(--cd-border)] bg-[var(--cd-surface)] p-8 text-center">
          <p className="text-[13px] text-[var(--cd-ink-soft)]">
            No organization selected. Create or select an organization to get started.
          </p>
        </div>
      </PageContainer>
    );
  }

  const handleInspectEvidence = (
    type: MetricType,
    value: string | number,
    statusLabel?: string,
  ) => {
    setSelectedMetric({
      type,
      value,
      statusLabel,
      repoName: activeRepo?.name || activeProject.name,
      healthScore: dashboardData.healthScore,
      maintainabilityScore: dashboardData.healthBreakdown.maintainability,
      couplingScore: dashboardData.healthBreakdown.coupling,
      modularityScore: dashboardData.healthBreakdown.modularity,
      issues: dashboardData.allIssues?.map((i) => i.issue) || [],
    });
  };

  const handleAnalyzeActiveRepo = () => {
    if (activeRepo) {
      navigate(`/repositories/${activeRepo.id}`);
    } else {
      openRepositoryImport();
    }
  };

  const isCompletelyEmpty = dashboardData.totalRepos === 0 || overviewRepos.length === 0;

  return (
    <PageContainer variant="wide">
      {/* 1. Refined Page Header & Context Strip */}
      <OverviewHeader
        organizationName={activeProject.name}
        organizationId={activeProject.id}
        primaryRepo={activeRepo}
        analyzedReposCount={dashboardData.analyzedReposCount}
        totalRepos={dashboardData.totalRepos}
        lastSnapshotIso={dashboardData.lastSnapshotIso}
        onOpenImport={openRepositoryImport}
        onOpenIntelligenceModal={() => setIsCategoryModalOpen(true)}
      />

      {/* 2. Empty Onboarding State vs Full Command Center */}
      {isCompletelyEmpty ? (
        <EmptyOverviewState
          onOpenImport={openRepositoryImport}
          organizationName={activeProject.name}
        />
      ) : (
        <>
          {/* Active Analysis Status Surface (Rendered when jobs running) */}
          <AnalysisStatusSurface
            analysisQueue={dashboardData.analysisQueue}
            organizationId={activeProject.id}
            repos={dashboardData.repos}
          />

          {/* 3. System State Strip (Compact, non-oversized metric strip) */}
          <SystemStateStrip
            healthScore={dashboardData.healthScore}
            healthLabel={dashboardData.healthLabel}
            riskLevel={dashboardData.riskLevel}
            criticalFindingsCount={dashboardData.criticalFindingsCount}
            warningFindingsCount={dashboardData.warningFindingsCount}
            totalLoc={dashboardData.totalLoc}
            totalFiles={dashboardData.totalFiles}
            totalClasses={dashboardData.totalClasses}
            analyzedReposCount={dashboardData.analyzedReposCount}
            totalRepos={dashboardData.totalRepos}
            lastSnapshotIso={dashboardData.lastSnapshotIso}
            onInspectEvidence={handleInspectEvidence}
          />

          {/* 4. ARCHITECTURE WORKSPACE — THE VISUAL CENTERPIECE */}
          <ArchitectureWorkspace
            organizationId={activeProject.id}
            activeRepo={activeRepo}
            repos={overviewRepos}
            onSelectRepo={(r) => setSelectedRepoId(r.id)}
            onAnalyze={handleAnalyzeActiveRepo}
          />

          {/* 5. What's Changing & Coodara Finding (2-Column Narrative Row) */}
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RecentArchitectureChanges
              timelineEvents={dashboardData.timelineEvents}
              recentActivities={dashboardData.recentActivities}
              organizationId={activeProject.id}
            />

            <CoodaraFindingCard
              issues={dashboardData.allIssues}
              recommendations={dashboardData.allRecommendations}
              organizationId={activeProject.id}
            />
          </div>

          {/* 6. Risks, Health Breakdown & Hotspots (3-Column Analytical Section) */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <ArchitectureRisksCard
              issues={dashboardData.allIssues}
              criticalCount={dashboardData.criticalFindingsCount}
              warningCount={dashboardData.warningFindingsCount}
              organizationId={activeProject.id}
            />

            <ArchitectureHealthCard
              healthScore={dashboardData.healthScore}
              healthBreakdown={dashboardData.healthBreakdown}
              repoData={dashboardData.repoData}
              analyzedReposCount={dashboardData.analyzedReposCount}
              onInspectEvidence={handleInspectEvidence}
            />

            <ArchitecturalHotspotsCard
              repoData={dashboardData.repoData}
              organizationId={activeProject.id}
            />
          </div>
        </>
      )}

      {/* Metric Evidence Modal */}
      <MetricEvidenceModal
        data={selectedMetric}
        onClose={() => setSelectedMetric(null)}
        onNavigateToStudio={() => {
          if (activeProject && activeRepo) {
            navigate(
              `/dashboard/organizations/${activeProject.id}/repositories/${activeRepo.id}/architecture`,
            );
          }
        }}
      />

      {/* Why Architecture Intelligence Modal */}
      <ArchitectureIntelligenceModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onNavigateToStudio={() => {
          setIsCategoryModalOpen(false);
          if (activeProject && activeRepo) {
            navigate(
              `/dashboard/organizations/${activeProject.id}/repositories/${activeRepo.id}/architecture`,
            );
          }
        }}
      />
    </PageContainer>
  );
}