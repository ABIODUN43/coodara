import { api } from "@/api/client";
import type {
  ArchitectureResponse,
  ArchitectureComponent,
  ArchitectureInsightsResponse,
  ArchitectureEvidence,
  ArchitectureHistoryResponse,
  ArchitectureNode,
  ArchitectureEdge,
  ArchitectureStyleSummary,
  ArchitectureFileTreeResponse,
  ArchitectureImpactSimulationRequest,
  ArchitectureImpactSimulationResponse,
  ArchitectureDecisionListResponse,
  ArchitectureDecisionItem,
  ArchitectureDecisionCreateRequest,
  ArchitectureBoundaryMatrixResponse,
  ArchitectureEvolutionResponse,
  ArchitectureDegradationResponse,
  ArchitectureAgentSpecRequest,
  ArchitectureAgentSpecResponse,
  ArchitectureVerificationRequest,
  ArchitectureVerificationResponse,
  ArchitectureCommitDiffResponse,
  ArchitecturalImpactAnalysisResponse,
  ArchitectureGitCommitListResponse,
  ArchitectureRuleCreateRequest,
  ArchitectureRuleResponse,
  ArchitectureRuleListResponse,
  ArchitectureQualityGateResponse,
} from "@/types/architecture";

// All architecture API requests live here (contract §2) — no direct API
// calls inside components. `api` is the shared Axios instance from
// src/api/client.ts (baseURL already includes /api/v1, credentials
// already included), same one organizations.ts / repositories.ts use.

function inferNodeName(nodeId: string): string {
  const clean = nodeId.replace(/\\/g, "/").replace(/\/$/, "");
  const base = clean.split("/").pop() || nodeId;
  let name = base;
  if (name.includes(".")) {
    const parts = name.split(".");
    if (
      parts.length > 1 &&
      ["py", "ts", "tsx", "js", "jsx", "java", "go", "scala", "rs", "cpp", "c", "h", "rb", "php"].includes(
        parts[parts.length - 1].toLowerCase()
      )
    ) {
      name = parts.slice(0, -1).join(".");
    } else {
      name = parts[parts.length - 1];
    }
  }
  const words = name.replace(/[_-]/g, " ").trim().split(/\s+/);
  if (words.length > 0 && words[0]) {
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  return nodeId;
}

function inferNodeType(nodeId: string, rawType?: string): any {
  if (rawType && rawType !== "module") return rawType;
  const lower = nodeId.toLowerCase();
  if (
    lower.includes("page") ||
    lower.includes("view") ||
    lower.includes("route") ||
    lower.includes("router") ||
    lower.includes("controller") ||
    lower.includes("ingress") ||
    lower.includes("frontend") ||
    lower.includes("client")
  ) {
    return "frontend";
  }
  if (
    lower.includes("db") ||
    lower.includes("database") ||
    lower.includes("cache") ||
    lower.includes("redis") ||
    lower.includes("storage") ||
    lower.includes("repo") ||
    lower.includes("repository") ||
    lower.includes("model") ||
    lower.includes("persistence") ||
    lower.includes("store")
  ) {
    return "database";
  }
  if (
    lower.includes("external") ||
    lower.includes("oauth") ||
    lower.includes("sentry") ||
    lower.includes("stripe") ||
    lower.includes("third_party") ||
    lower.includes("remote") ||
    lower.includes("webhook") ||
    lower.includes("segment")
  ) {
    return "external";
  }
  if (
    lower.includes("ui") ||
    lower.includes("component") ||
    lower.includes("theme") ||
    lower.includes("token") ||
    lower.includes("style") ||
    lower.includes("design") ||
    lower.includes("shared") ||
    lower.includes("util") ||
    lower.includes("helper")
  ) {
    return "ui_component";
  }
  if (
    lower.includes("worker") ||
    lower.includes("task") ||
    lower.includes("celery") ||
    lower.includes("cron") ||
    lower.includes("sync") ||
    lower.includes("consumer") ||
    lower.includes("producer") ||
    lower.includes("queue") ||
    lower.includes("job") ||
    lower.includes("event") ||
    lower.includes("stream")
  ) {
    return "queue";
  }
  return lower.includes("service") ? "service" : "module";
}

function inferNodeTech(nodeId: string): string {
  const lower = nodeId.toLowerCase();
  if (lower.endsWith(".tsx") || lower.endsWith(".jsx")) {
    return lower.endsWith(".tsx") ? "React / TypeScript" : "React / JavaScript";
  }
  if (lower.endsWith(".ts")) return "TypeScript";
  if (lower.endsWith(".js")) return "JavaScript / Node";
  if (lower.endsWith(".py")) return "Python";
  if (lower.endsWith(".java")) return "Java";
  if (lower.endsWith(".scala")) return "Scala";
  if (lower.endsWith(".go")) return "Go";
  if (lower.endsWith(".rs")) return "Rust";
  if (lower.includes("postgres") || lower.includes("sql")) return "PostgreSQL / SQL";
  if (lower.includes("redis")) return "Redis";
  if (lower.includes("kafka")) return "Apache Kafka";
  return "Core Subsystem";
}

export async function getArchitecture(
  orgId: string | number,
  repositoryId: string | number
): Promise<ArchitectureResponse> {
  const res = await api.get<any>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture`
  );
  const data = res.data;

  // If already matching ArchitectureResponse
  if (data && data.status && data.summary && data.graph) {
    return data;
  }

  const rawNodes = data?.graph?.nodes || [];
  const rawEdges = data?.graph?.edges || [];
  const scoreVal = data?.score?.score != null ? Math.round(data.score.score) : 85;

  const nodes: ArchitectureNode[] = rawNodes.map((n: any) => {
    const inferredType = inferNodeType(n.id, n.type);
    const inferredName = n.name || inferNodeName(n.id);
    return {
      id: n.id,
      name: inferredName,
      type: inferredType,
      description: n.description || `Architectural module for ${inferredName}.`,
      technology: n.technology || inferNodeTech(n.id),
      subsystem: n.subsystem || (n.id.includes("/") ? n.id.split("/")[0] : "core"),
      file_path: n.file_path || n.id,
      dependency_count:
        n.dependency_count ?? rawEdges.filter((e: any) => e.source === n.id).length,
      dependent_count:
        n.dependent_count ?? rawEdges.filter((e: any) => e.target === n.id).length,
      issue_count: n.issue_count ?? 0,
      health_score: scoreVal,
      responsibilities: n.responsibilities || [
        `Coordinates ${inferredName} domain operations`,
        "Enforces architectural boundaries and type contracts",
      ],
    };
  });

  const edges: ArchitectureEdge[] = rawEdges.map((e: any) => ({
    id: e.id || `${e.source}->${e.target}`,
    source: e.source,
    target: e.target,
    type: "dependency",
    label: e.kind || e.label || "import",
  }));

  return {
    repository_id: String(data?.repository_id || repositoryId),
    status: "completed",
    analyzed_at: data?.created_at || new Date().toISOString(),
    summary: {
      health_score: scoreVal,
      components: nodes.length,
      dependencies: edges.length,
      issues: data?.issues?.length || 0,
    },
    graph: {
      nodes,
      edges,
    },
  };
}

export async function getArchitectureGraph(
  orgId: string | number,
  repositoryId: string | number
): Promise<{ nodes: ArchitectureNode[]; edges: ArchitectureEdge[] }> {
  const data = await getArchitecture(orgId, repositoryId);
  return data.graph;
}

export async function getArchitectureComponent(
  orgId: string | number,
  repositoryId: string | number,
  componentId: string
): Promise<ArchitectureComponent> {
  const res = await api.get<ArchitectureComponent>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/components/${encodeURIComponent(
      componentId
    )}`
  );
  return res.data;
}

export async function getArchitectureInsights(
  orgId: string | number,
  repositoryId: string | number
): Promise<ArchitectureInsightsResponse> {
  const res = await api.get<ArchitectureInsightsResponse>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/insights`
  );
  return res.data;
}

export async function getArchitectureEvidence(
  orgId: string | number,
  repositoryId: string | number,
  evidenceId: string
): Promise<ArchitectureEvidence> {
  const res = await api.get<ArchitectureEvidence>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/evidence/${evidenceId}`
  );
  return res.data;
}

export async function getArchitectureHistory(
  orgId: string | number,
  repositoryId: string | number
): Promise<ArchitectureHistoryResponse> {
  const res = await api.get<ArchitectureHistoryResponse>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/history`
  );
  return res.data;
}

export async function getArchitectureStyle(
  orgId: string | number,
  repositoryId: string | number
): Promise<ArchitectureStyleSummary> {
  const res = await api.get<ArchitectureStyleSummary>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/style`
  );
  return res.data;
}

export async function getArchitectureFileTree(
  orgId: string | number,
  repositoryId: string | number
): Promise<ArchitectureFileTreeResponse> {
  const res = await api.get<ArchitectureFileTreeResponse>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/file-tree`
  );
  return res.data;
}

export async function simulateArchitectureImpact(
  orgId: string | number,
  repositoryId: string | number,
  payload: ArchitectureImpactSimulationRequest
): Promise<ArchitectureImpactSimulationResponse> {
  const res = await api.post<ArchitectureImpactSimulationResponse>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/simulate-impact`,
    payload
  );
  return res.data;
}

// Pillar 3: ADRs & Decision Memory
export async function getArchitectureDecisions(
  orgId: string | number,
  repositoryId: string | number
): Promise<ArchitectureDecisionListResponse> {
  const res = await api.get<ArchitectureDecisionListResponse>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/decisions`
  );
  return res.data;
}

export async function createArchitectureDecision(
  orgId: string | number,
  repositoryId: string | number,
  payload: ArchitectureDecisionCreateRequest
): Promise<ArchitectureDecisionItem> {
  const res = await api.post<ArchitectureDecisionItem>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/decisions`,
    payload
  );
  return res.data;
}

// Pillar 2: Boundaries & Layer Rules
export async function getArchitectureBoundaries(
  orgId: string | number,
  repositoryId: string | number
): Promise<ArchitectureBoundaryMatrixResponse> {
  const res = await api.get<ArchitectureBoundaryMatrixResponse>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/boundaries`
  );
  return res.data;
}

// Pillar 4: Git Architecture Evolution
export async function getArchitectureEvolution(
  orgId: string | number,
  repositoryId: string | number
): Promise<ArchitectureEvolutionResponse> {
  const res = await api.get<ArchitectureEvolutionResponse>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/evolution`
  );
  return res.data;
}

// Pillar 5: Degradation & Drift
export async function getArchitectureDegradation(
  orgId: string | number,
  repositoryId: string | number
): Promise<ArchitectureDegradationResponse> {
  const res = await api.get<ArchitectureDegradationResponse>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/degradation`
  );
  return res.data;
}

// Pillar 8: Architecture-Aware Agent Spec Generator
export async function generateAgentArchitectureSpec(
  orgId: string | number,
  repositoryId: string | number,
  payload: ArchitectureAgentSpecRequest
): Promise<ArchitectureAgentSpecResponse> {
  const res = await api.post<ArchitectureAgentSpecResponse>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/agent-spec`,
    payload
  );
  return res.data;
}

// Pillar 9: Re-Analysis & Verification Loop
export async function verifyArchitectureImprovement(
  orgId: string | number,
  repositoryId: string | number,
  payload: ArchitectureVerificationRequest
): Promise<ArchitectureVerificationResponse> {
  const res = await api.post<ArchitectureVerificationResponse>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/verify-improvement`,
    payload
  );
  return res.data;
}

// Commit-to-Commit Architectural Diff & Decision Evolution
export async function getArchitectureCommitDiff(
  orgId: string | number,
  repositoryId: string | number,
  baseCommit: string = "",
  targetCommit: string = ""
): Promise<ArchitectureCommitDiffResponse> {
  const res = await api.get<ArchitectureCommitDiffResponse>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/diff`,
    {
      params: {
        base_commit: baseCommit,
        target_commit: targetCommit,
      },
    }
  );
  return res.data;
}

// Multi-Dimensional Architectural Consequence & Blast Radius Simulation (What-If Analysis)
export async function getArchitecturalImpactAnalysis(
  orgId: string | number,
  repositoryId: string | number,
  componentId: string = "",
  proposedChange?: string
): Promise<ArchitecturalImpactAnalysisResponse> {
  const res = await api.post<ArchitecturalImpactAnalysisResponse>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/impact-analysis`,
    {
      component_id: componentId,
      proposed_change: proposedChange || "Architectural modification and dependency update",
      change_type: "feature_extension",
    }
  );
  return res.data;
}

export interface ArchitectureFileContentResponse {
  file_path: string;
  name: string;
  language: string;
  size: number;
  content: string;
  total_lines: number;
}

export interface ArchitectureRemediationRequest {
  file_path: string;
  violation_id?: string | null;
  category?: string | null;
  issue_description?: string | null;
  current_code: string;
  language?: string | null;
}

export interface ArchitectureRemediationResponse {
  file_path: string;
  refactored_code: string;
  diff: string;
  explanation: string;
  applied_rules: string[];
}

export async function getArchitectureFileContent(
  orgId: string | number,
  repositoryId: string | number,
  path: string
): Promise<ArchitectureFileContentResponse> {
  const res = await api.get<ArchitectureFileContentResponse>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/file-content`,
    { params: { path } }
  );
  return res.data;
}

export async function remediateArchitectureIssue(
  orgId: string | number,
  repositoryId: string | number,
  payload: ArchitectureRemediationRequest
): Promise<ArchitectureRemediationResponse> {
  const res = await api.post<ArchitectureRemediationResponse>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/remediate`,
    payload
  );
  return res.data;
}

// Pillar 4: Git Commits
export async function getArchitectureCommits(
  orgId: string | number,
  repositoryId: string | number,
  maxCount: number = 30
): Promise<ArchitectureGitCommitListResponse> {
  const res = await api.get<ArchitectureGitCommitListResponse>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/commits`,
    { params: { max_count: maxCount } }
  );
  return res.data;
}

// Pillar 2: Custom Boundary Rules & Quality Gate
export async function getArchitectureRules(
  orgId: string | number,
  repositoryId: string | number
): Promise<ArchitectureRuleListResponse> {
  const res = await api.get<ArchitectureRuleListResponse>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/rules`
  );
  return res.data;
}

export async function createArchitectureRule(
  orgId: string | number,
  repositoryId: string | number,
  payload: ArchitectureRuleCreateRequest
): Promise<ArchitectureRuleResponse> {
  const res = await api.post<ArchitectureRuleResponse>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/rules`,
    payload
  );
  return res.data;
}

export async function deleteArchitectureRule(
  orgId: string | number,
  repositoryId: string | number,
  ruleId: number
): Promise<void> {
  await api.delete(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/rules/${ruleId}`
  );
}

export async function evaluateArchitectureQualityGate(
  orgId: string | number,
  repositoryId: string | number
): Promise<ArchitectureQualityGateResponse> {
  const res = await api.post<ArchitectureQualityGateResponse>(
    `/organizations/${orgId}/repositories/${repositoryId}/architecture/quality-gate`
  );
  return res.data;
}

export async function updateIssueStatus(
  orgId: string | number,
  issueId: string | number,
  status: "open" | "in_progress" | "resolved" | "dismissed",
  dismissedReason?: string
): Promise<any> {
  const res = await api.patch(
    `/organizations/${orgId}/architecture/issues/${issueId}/status`,
    {
      status,
      dismissed_reason: dismissedReason,
    }
  );
  return res.data;
}

export async function updateRecommendationStatus(
  orgId: string | number,
  recId: string | number,
  status: "open" | "in_progress" | "resolved" | "dismissed",
  actionPlan?: string
): Promise<any> {
  const res = await api.patch(
    `/organizations/${orgId}/architecture/recommendations/${recId}/status`,
    {
      status,
      action_plan: actionPlan,
    }
  );
  return res.data;
}