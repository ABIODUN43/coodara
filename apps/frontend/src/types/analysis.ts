export type AnalysisStatus = "pending" | "queued" | "running" | "completed" | "failed" | "cancelled";

export interface Analysis {
  id: number;
  repository_id: number;
  status: AnalysisStatus;
  progress: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalysisListResponse {
  items: Analysis[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface AnalysisMetrics {
  id: number;
  analysis_result_id: number;
  loc: number;
  files: number;
  classes: number;
  functions: number;
  complexity: number;
  maintainability: number;
}

export interface AnalysisTechnology {
  id: number;
  analysis_result_id: number;
  technology: string;
  version: string | null;
  confidence_score: number;
}

export interface AnalysisDependencyGraph {
  id: number;
  analysis_result_id: number;
  graph_data: string;
  created_at: string;
}

export interface AnalysisResult {
  id: number;
  analysis_job_id: number;
  summary: string | null;
  created_at: string;
  metrics: AnalysisMetrics;
  technologies: AnalysisTechnology[];
  dependency_graph: AnalysisDependencyGraph | null;
}