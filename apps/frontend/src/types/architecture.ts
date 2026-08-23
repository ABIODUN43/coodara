// Types match the Coodara Architecture Intelligence Frontend Integration Contract.

export type ArchitectureStatus = "pending" | "analyzing" | "completed" | "failed";

export type ArchitectureNodeType =
  | "service"
  | "module"
  | "package"
  | "database"
  | "external"
  | "queue";

export interface ArchitectureSummary {
  health_score: number | null;
  components: number;
  dependencies: number;
  issues: number;
}

export interface ArchitectureNode {
  id: string;
  name: string;
  type: ArchitectureNodeType;
  description?: string | null;
  technology?: string | null;
  dependency_count: number;
  dependent_count: number;
  issue_count: number;
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  type: "dependency";
  label?: string | null;
}

export interface ArchitectureGraph {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}

export interface ArchitectureResponse {
  repository_id: string;
  status: ArchitectureStatus;
  analyzed_at?: string | null;
  summary: ArchitectureSummary;
  graph: ArchitectureGraph;
}

export interface ArchitectureRelatedComponent {
  id: string;
  name: string;
  type: ArchitectureNodeType;
}

export type ArchitectureIssueSeverity = "critical" | "warning" | "info";

export type ArchitectureIssueType =
  | "circular_dependency"
  | "high_coupling"
  | "boundary_violation"
  | "architectural_smell"
  | "unknown";

export interface ArchitectureIssue {
  id: string;
  title: string;
  description: string;
  severity: ArchitectureIssueSeverity;
  type: ArchitectureIssueType;
  component_ids: string[];
  evidence_ids: string[];
}

export interface ArchitectureComponent {
  id: string;
  name: string;
  type: ArchitectureNodeType;
  description?: string | null;
  technology?: string | null;
  dependencies: ArchitectureRelatedComponent[];
  dependents: ArchitectureRelatedComponent[];
  issues: ArchitectureIssue[];
}

export interface ArchitectureInsightsResponse {
  items: ArchitectureIssue[];
}

export type EvidenceSourceType =
  | "source_code"
  | "commit"
  | "pull_request"
  | "issue"
  | "documentation"
  | "configuration"
  | "dependency"
  | "api"
  | "test";

export interface ArchitectureEvidence {
  id: string;
  source_type: EvidenceSourceType;
  file_path?: string | null;
  line_start?: number | null;
  line_end?: number | null;
  commit_sha?: string | null;
  commit_message?: string | null;
  description: string;
  confidence?: "high" | "medium" | "low" | null;
}

export type ArchitectureEventType =
  | "component_added"
  | "component_removed"
  | "dependency_added"
  | "dependency_removed"
  | "boundary_changed"
  | "technology_changed"
  | "issue_detected"
  | "unknown";

export interface ArchitectureHistoryEvent {
  id: string;
  timestamp: string;
  type: ArchitectureEventType;
  title: string;
  description: string;
  commit_sha?: string | null;
  evidence_ids: string[];
}

export interface ArchitectureHistoryResponse {
  items: ArchitectureHistoryEvent[];
}

// UI-only state (not server data) — kept here for convenience, per contract §21
export interface ArchitectureChatContext {
  repositoryId: string;
  componentId?: string;
  issueId?: string;
  evidenceId?: string;
}