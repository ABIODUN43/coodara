import type { Analysis, AnalysisResult } from "@/types/analysis";

// repo 9101 (coodara-frontend) — has a completed analysis + history
export const MOCK_ANALYSES: Record<string, Analysis[]> = {
  "9101": [
    {
      id: 7001,
      repository_id: 9101,
      status: "completed",
      progress: 100,
      started_at: "2026-08-23T10:00:00Z",
      completed_at: "2026-08-23T10:02:14Z",
      error_message: null,
      created_at: "2026-08-23T10:00:00Z",
      updated_at: "2026-08-23T10:02:14Z",
    },
    {
      id: 7000,
      repository_id: 9101,
      status: "completed",
      progress: 100,
      started_at: "2026-08-16T09:30:00Z",
      completed_at: "2026-08-16T09:32:40Z",
      error_message: null,
      created_at: "2026-08-16T09:30:00Z",
      updated_at: "2026-08-16T09:32:40Z",
    },
  ],
  // repo 9102 (coodara-backend) — never analyzed
  "9102": [],
  // repo 9103 (payment-service) — one failed attempt
  "9103": [
    {
      id: 7050,
      repository_id: 9103,
      status: "failed",
      progress: 40,
      started_at: "2026-08-20T14:00:00Z",
      completed_at: null,
      error_message: "Clone failed: repository archive exceeded size limit.",
      created_at: "2026-08-20T14:00:00Z",
      updated_at: "2026-08-20T14:01:12Z",
    },
  ],
};

export const MOCK_RESULTS: Record<number, AnalysisResult> = {
  7001: {
    id: 5001,
    analysis_job_id: 7001,
    summary:
      "coodara-frontend is a well-structured React/TypeScript application with clear separation between pages, components, and API layers. Maintainability is strong overall; the main watch item is growing coupling in the shared API client as more features are wired to real endpoints.",
    created_at: "2026-08-23T10:02:14Z",
    metrics: {
      id: 1,
      analysis_result_id: 5001,
      loc: 18420,
      files: 142,
      classes: 12,
      functions: 386,
      complexity: 9.8,
      maintainability: 84.2,
    },
    technologies: [
      { id: 1, analysis_result_id: 5001, technology: "TypeScript", version: "5.9", confidence_score: 0.99 },
      { id: 2, analysis_result_id: 5001, technology: "React", version: "19.2", confidence_score: 0.98 },
      { id: 3, analysis_result_id: 5001, technology: "Vite", version: "8.1", confidence_score: 0.95 },
      { id: 4, analysis_result_id: 5001, technology: "Tailwind CSS", version: "4.3", confidence_score: 0.93 },
    ],
    dependency_graph: {
      id: 1,
      analysis_result_id: 5001,
      graph_data: JSON.stringify({
        nodes: ["pages", "components", "api", "context", "hooks"],
        edges: [
          ["pages", "components"],
          ["pages", "hooks"],
          ["components", "context"],
          ["hooks", "api"],
        ],
      }),
      created_at: "2026-08-23T10:02:14Z",
    },
  },
  7000: {
    id: 5000,
    analysis_job_id: 7000,
    summary: "Baseline analysis before the auth integration work landed. Healthy overall.",
    created_at: "2026-08-16T09:32:40Z",
    metrics: {
      id: 2,
      analysis_result_id: 5000,
      loc: 15980,
      files: 118,
      classes: 9,
      functions: 301,
      complexity: 8.9,
      maintainability: 81.6,
    },
    technologies: [
      { id: 5, analysis_result_id: 5000, technology: "TypeScript", version: "5.8", confidence_score: 0.99 },
      { id: 6, analysis_result_id: 5000, technology: "React", version: "19.1", confidence_score: 0.98 },
    ],
    dependency_graph: null,
  },
};

export function getMockAnalysesForRepo(repoId: string | number): Analysis[] {
  return MOCK_ANALYSES[String(repoId)] ?? [];
}

export function getMockResult(analysisId: number): AnalysisResult | undefined {
  return MOCK_RESULTS[analysisId];
}