import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useProject } from "@/context/ProjectContext";
import { getOrganizationOverview } from "@/api/overview";
import type { OrganizationOverviewResponse } from "@/types/overview";
import type { Repository } from "@/types/repository";
import type { ArchitectureIssue, ArchitectureIssueSeverity, ArchitectureIssueType } from "@/types/architecture";
import type { AnalysisStatus } from "@/types/analysis";
import type { DashboardOverviewData } from "@/hooks/useDashboardOverview";

interface DashboardOverviewContextValue extends DashboardOverviewData {
  rawOverview: OrganizationOverviewResponse | null;
  refreshOverview: () => Promise<void>;
}

const defaultOverviewData: DashboardOverviewData = {
  loading: true,
  error: null,
  repos: [],
  repoData: [],
  totalRepos: 0,
  analyzedReposCount: 0,
  totalLoc: 0,
  totalFiles: 0,
  totalClasses: 0,
  totalFunctions: 0,
  healthScore: 100,
  healthLabel: "Healthy",
  riskLevel: "Low",
  criticalFindingsCount: 0,
  warningFindingsCount: 0,
  lastSnapshotIso: null,
  mostAtRiskRepo: null,
  healthBreakdown: {
    maintainability: 0,
    complexity: 0,
    coupling: 0,
    modularity: 0,
  },
  allIssues: [],
  allRecommendations: [],
  recentActivities: [],
  analysisQueue: [],
  timelineEvents: [],
  technologies: [],
  refreshOverview: async () => {},
};

const DashboardOverviewContext = createContext<DashboardOverviewContextValue>({
  ...defaultOverviewData,
  rawOverview: null,
  refreshOverview: async () => {},
});

export const DashboardOverviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeProject } = useProject();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rawOverview, setRawOverview] = useState<OrganizationOverviewResponse | null>(null);

  const fetchOverview = useCallback(async () => {
    if (!activeProject?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getOrganizationOverview(activeProject.id);
      setRawOverview(data);
    } catch (err: any) {
      console.error("Failed to load organization overview:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to load organization overview");
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const overviewData = useMemo<DashboardOverviewData>(() => {
    if (!rawOverview) {
      return {
        ...defaultOverviewData,
        loading,
        error,
      };
    }

    const repos: Repository[] = rawOverview.repos.map((r) => ({
      id: r.id,
      organization_id: rawOverview.organization_id,
      github_id: r.id,
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      visibility: "public",
      default_branch: r.default_branch,
      primary_language: r.primary_language,
      clone_url: "",
      html_url: "",
      last_synced_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Find most at risk repo
    let mostAtRiskRepo: DashboardOverviewData["mostAtRiskRepo"] = null;
    if (rawOverview.repos.length > 0) {
      const sorted = [...rawOverview.repos].sort((a, b) => a.health_score - b.health_score);
      const worst = sorted[0];
      if (worst && worst.health_score < 80) {
        mostAtRiskRepo = {
          name: worst.name,
          repoId: worst.id,
          riskReason: `Health score is ${worst.health_score}/100. Architectural degradation detected.`,
          severity: worst.health_score < 65 ? "risk" : "warn",
        };
      }
    }

    const allIssues: DashboardOverviewData["allIssues"] = rawOverview.all_issues.map((item) => {
      const sev: ArchitectureIssueSeverity = (item.severity === "critical" || item.severity === "warning" || item.severity === "info")
        ? item.severity
        : "warning";
      const issueType: ArchitectureIssueType = (item.type === "circular_dependency" || item.type === "high_coupling" || item.type === "boundary_violation" || item.type === "architectural_smell")
        ? item.type
        : "architectural_smell";
      const issue: ArchitectureIssue = {
        id: String(item.id),
        title: item.title || item.description,
        description: item.description,
        severity: sev,
        type: issueType,
        status: (item.status as any) || "open",
        dismissed_reason: item.dismissed_reason,
        resolved_at: item.resolved_at,
        component_ids: [],
        evidence_ids: [],
      };
      return {
        repoName: item.repo_name,
        repoId: item.repo_id,
        issue,
      };
    });

    const allRecommendations = rawOverview.all_recommendations.map((item) => ({
      id: item.id,
      repoName: item.repo_name,
      repoId: item.repo_id,
      recommendation: item.recommendation,
      priority: item.priority || "high",
      status: item.status || "open",
      action_plan: item.action_plan,
      resolved_at: item.resolved_at,
      componentId: item.component_id || undefined,
      componentName: item.component_name || undefined,
      subsystem: item.subsystem || undefined,
      category: item.category || undefined,
    }));

    const analysisQueue = rawOverview.repos
      .filter((r) => r.latest_analysis_status && r.latest_analysis_status !== "completed")
      .map((r) => ({
        repoName: r.name,
        status: (r.latest_analysis_status || "pending") as AnalysisStatus,
        text: `Analysis ${r.latest_analysis_status}`,
      }));

    const timelineEvents: DashboardOverviewData["timelineEvents"] = rawOverview.recent_activities.map((act) => ({
      dateStr: new Date(act.timestamp).toLocaleDateString(),
      label: act.text,
      detail: act.text,
      type: act.tag === "risk" ? "risk" : act.tag === "warn" ? "remove" : "resolved",
    }));

    const repoData: DashboardOverviewData["repoData"] = rawOverview.repos.map((r) => {
      const repo = repos.find((rep) => rep.id === r.id) || {
        id: r.id,
        organization_id: rawOverview.organization_id,
        github_id: r.id,
        name: r.name,
        full_name: r.full_name,
        description: r.description,
        visibility: "public" as const,
        default_branch: r.default_branch,
        primary_language: r.primary_language,
        clone_url: "",
        html_url: "",
        last_synced_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return {
        repo,
        latestAnalysis: r.latest_analysis_id
          ? {
              id: r.latest_analysis_id,
              repository_id: r.id,
              status: (r.latest_analysis_status as any) || "completed",
              progress: 100,
              created_at: new Date().toISOString(),
              started_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              error_message: null,
            }
          : null,
        result: {
          id: r.latest_analysis_id || r.id,
          analysis_job_id: r.latest_analysis_id || r.id,
          summary: r.description || `Architecture intelligence profile for ${r.name}`,
          created_at: new Date().toISOString(),
          metrics: {
            id: r.id,
            analysis_result_id: r.latest_analysis_id || r.id,
            loc: r.loc,
            files: r.files,
            classes: 0,
            functions: 0,
            complexity: 0,
            maintainability: r.health_score ? r.health_score * 10 : 850,
          },
          technologies: [],
          dependency_graph: null,
        },
        architecture: null,
      };
    });

    return {
      loading,
      error,
      repos,
      repoData,
      totalRepos: rawOverview.total_repos,
      analyzedReposCount: rawOverview.analyzed_repos_count,
      totalLoc: rawOverview.total_loc,
      totalFiles: rawOverview.total_files,
      totalClasses: rawOverview.total_classes,
      totalFunctions: rawOverview.total_functions,
      healthScore: rawOverview.health_score,
      healthLabel: rawOverview.health_label,
      riskLevel: rawOverview.risk_level,
      criticalFindingsCount: rawOverview.critical_findings_count,
      warningFindingsCount: rawOverview.warning_findings_count,
      lastSnapshotIso: rawOverview.last_snapshot_iso,
      mostAtRiskRepo,
      healthBreakdown: rawOverview.health_breakdown,
      allIssues,
      allRecommendations,
      recentActivities: rawOverview.recent_activities,
      analysisQueue,
      timelineEvents,
      technologies: rawOverview.technologies,
      refreshOverview: fetchOverview,
    };
  }, [rawOverview, loading, error, fetchOverview]);

  return (
    <DashboardOverviewContext.Provider
      value={{
        ...overviewData,
        rawOverview,
        refreshOverview: fetchOverview,
      }}
    >
      {children}
    </DashboardOverviewContext.Provider>
  );
};

export function useDashboardOverviewContext(): DashboardOverviewContextValue {
  return useContext(DashboardOverviewContext);
}
