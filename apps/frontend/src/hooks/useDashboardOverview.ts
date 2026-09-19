import { useDashboardOverviewContext } from "@/context/DashboardOverviewContext";
import type { Repository } from "@/types/repository";
import type { Analysis, AnalysisResult, AnalysisStatus } from "@/types/analysis";
import type { ArchitectureResponse, ArchitectureIssue } from "@/types/architecture";

export interface RepoAnalysisData {
  repo: Repository;
  latestAnalysis: Analysis | null;
  result: AnalysisResult | null;
  architecture: ArchitectureResponse | null;
}

export interface DashboardOverviewData {
  loading: boolean;
  error: string | null;
  repos: Repository[];
  repoData: RepoAnalysisData[];
  totalRepos: number;
  analyzedReposCount: number;
  totalLoc: number;
  totalFiles: number;
  totalClasses: number;
  totalFunctions: number;
  healthScore: number;
  healthLabel: "Healthy" | "Watch" | "At risk";
  riskLevel: "Low" | "Medium" | "High";
  criticalFindingsCount: number;
  warningFindingsCount: number;
  lastSnapshotIso: string | null;
  mostAtRiskRepo: {
    name: string;
    repoId: number;
    riskReason: string;
    severity: "good" | "warn" | "risk";
  } | null;
  healthBreakdown: {
    maintainability: number;
    complexity: number;
    coupling: number;
    modularity: number;
  };
  allIssues: {
    repoName: string;
    repoId: number;
    issue: ArchitectureIssue;
  }[];
  allRecommendations: {
    id?: string | number;
    repoName: string;
    repoId: number;
    recommendation: string;
    priority: string;
    status?: string;
    action_plan?: string | null;
    resolved_at?: string | null;
    componentId?: string;
    componentName?: string;
    subsystem?: string;
    category?: string;
    impact_summary?: string;
    suggested_pattern?: string;
    adr_reference?: string;
    affected_components_count?: number;
    boundaries_crossed_count?: number;
    teams_impacted_count?: number;
  }[];
  recentActivities: {
    timestamp: string;
    text: string;
    tag: "good" | "warn" | "risk";
  }[];
  analysisQueue: {
    repoName: string;
    status: AnalysisStatus;
    text: string;
  }[];
  timelineEvents: {
    dateStr: string;
    label: string;
    detail: string;
    type: "add" | "risk" | "remove" | "resolved";
  }[];
  technologies: {
    name: string;
    count: number;
    confidence: number;
  }[];
  refreshOverview: () => Promise<void>;
}

export function useDashboardOverview(): DashboardOverviewData {
  return useDashboardOverviewContext();
}
