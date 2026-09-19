export interface OverviewRepositoryItem {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  primary_language: string | null;
  latest_analysis_status: string | null;
  latest_analysis_id: number | null;
  loc: number;
  files: number;
  health_score: number;
}

export interface OverviewIssueItem {
  id: string | number;
  repo_name: string;
  repo_id: number;
  title: string;
  description: string;
  severity: string;
  type: string;
  status?: string;
  dismissed_reason?: string | null;
  resolved_at?: string | null;
}

export interface OverviewRecommendationItem {
  id: string | number;
  repo_name: string;
  repo_id: number;
  recommendation: string;
  priority: string;
  status?: string;
  action_plan?: string | null;
  resolved_at?: string | null;
  component_id?: string | null;
  component_name?: string | null;
  subsystem?: string | null;
  category?: string | null;
}

export interface OverviewRecentActivity {
  timestamp: string;
  text: string;
  tag: "good" | "warn" | "risk";
}

export interface OverviewTechnology {
  name: string;
  count: number;
  confidence: number;
}

export interface HealthBreakdown {
  maintainability: number;
  complexity: number;
  coupling: number;
  modularity: number;
}

export interface OrganizationOverviewResponse {
  organization_id: number;
  total_repos: number;
  analyzed_repos_count: number;
  total_loc: number;
  total_files: number;
  total_classes: number;
  total_functions: number;
  health_score: number;
  health_label: "Healthy" | "Watch" | "At risk";
  risk_level: "Low" | "Medium" | "High";
  critical_findings_count: number;
  warning_findings_count: number;
  last_snapshot_iso: string | null;
  health_breakdown: HealthBreakdown;
  repos: OverviewRepositoryItem[];
  all_issues: OverviewIssueItem[];
  all_recommendations: OverviewRecommendationItem[];
  recent_activities: OverviewRecentActivity[];
  technologies: OverviewTechnology[];
}
