// Types match the Coodara Architecture Intelligence Frontend Integration Contract.

export type ArchitectureStatus = "pending" | "analyzing" | "completed" | "failed";

export type ArchitectureNodeType =
  | "service"
  | "module"
  | "package"
  | "database"
  | "external"
  | "queue"
  | "frontend"
  | "ui_component"
  | "storage"
  | "cache"
  | "core";

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
  subsystem?: string | null;
  file_path?: string | null;
  dependency_count: number;
  dependent_count: number;
  issue_count: number;
  health_score?: number | null;
  responsibilities?: string[];
  coupling_velocity?: number;
  is_increasingly_coupled?: boolean;
  efferent_coupling?: number;
  afferent_coupling?: number;
  instability_index?: number;
  coupling_explanation?: string | null;
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  type: "dependency";
  label?: string | null;
  is_intentional?: boolean;
  boundary_status?: "intentional" | "violates_boundary" | "untracked";
  rationale?: string | null;
  source_subsystem?: string | null;
  target_subsystem?: string | null;
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
  status?: "open" | "in_progress" | "resolved" | "dismissed";
  dismissed_reason?: string | null;
  resolved_at?: string | null;
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

export interface ArchitectureStyleSummary {
  pattern_name: string;
  category: string;
  alignment_score: number;
  description: string;
  layers: string[];
  key_rules: string[];
  violations_count: number;
  anti_patterns: string[];
}

export interface ArchitectureFileViolation {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  line_number?: number | null;
  suggested_fix?: string | null;
}

export interface ArchitectureFileNode {
  id: string;
  name: string;
  path: string;
  type: "file" | "directory";
  language?: string | null;
  size?: number | null;
  content?: string | null;
  has_bad_architecture: boolean;
  violation_count: number;
  violations: ArchitectureFileViolation[];
  children?: ArchitectureFileNode[] | null;
}

export interface ArchitectureFileTreeResponse {
  root: ArchitectureFileNode;
  total_files: number;
  total_violations: number;
  bad_files_count: number;
  detected_architecture: string;
}

export interface AffectedComponentImpact {
  id: string;
  name: string;
  type: string;
  subsystem?: string;
  team?: string;
  impact_level: "high" | "medium" | "low";
  impact_depth?: number;
  reason: string;
  relationship: "direct" | "transitive" | "database" | "external" | "target" | "direct_dependency" | "upstream_caller" | string;
}

export interface ArchitectureImpactSimulationRequest {
  file_path: string;
  component_id?: string | null;
  proposed_code?: string | null;
  change_type?: "refactor" | "breaking_change" | "fix" | "feature" | null;
}

export interface ArchitectureImpactSimulationResponse {
  target_component: string;
  target_file: string;
  impact_level: "HIGH" | "MEDIUM" | "LOW";
  summary: string;
  blast_radius_percentage: number;
  directly_affected: AffectedComponentImpact[];
  transitive_impact: AffectedComponentImpact[];
  databases_affected: AffectedComponentImpact[];
  external_dependencies: AffectedComponentImpact[];
  recommendations: string[];
  architecture_style: string;
}

// ==========================================
// Pillar 3: Architectural Decision Records (ADRs) & Decision Memory
// ==========================================

export interface ArchitectureDecisionItem {
  id: string;
  title: string;
  status: "accepted" | "proposed" | "deprecated" | "superseded";
  decision_date: string;
  author: string;
  context: string;
  decision: string;
  consequences: string[];
  affected_components: string[];
  tags: string[];
  superseded_by?: string | null;
}

export interface ArchitectureDecisionCreateRequest {
  title: string;
  context: string;
  decision: string;
  status?: string;
  author?: string;
  consequences?: string[];
  affected_components?: string[];
  tags?: string[];
}

export interface ArchitectureDecisionListResponse {
  items: ArchitectureDecisionItem[];
  total_count: number;
}

// ==========================================
// Pillar 2: Architectural Boundaries & Layer Rules
// ==========================================

export interface ArchitectureBoundaryRule {
  id: string;
  source_layer: string;
  target_layer: string;
  is_allowed: boolean;
  rule_type: string;
  description: string;
  violation_count: number;
  active_breaches: string[];
}

export interface ArchitectureBoundaryMatrixResponse {
  pattern_name: string;
  layers: string[];
  rules: ArchitectureBoundaryRule[];
  total_violations: number;
  compliance_score: number;
}

// ==========================================
// Pillar 4: Git Architecture Evolution & Diffs
// ==========================================

export interface ArchitectureEvolutionPoint {
  commit_sha: string;
  commit_message: string;
  timestamp: string;
  author: string;
  health_score: number;
  coupling_index: number;
  modularity_index: number;
  nodes_count: number;
  edges_count: number;
  violations_count: number;
  nodes_added: string[];
  nodes_removed: string[];
  boundary_shifts: string[];
}

export interface ArchitectureEvolutionResponse {
  repository_id: string;
  points: ArchitectureEvolutionPoint[];
  total_snapshots: number;
  health_trend_delta: number;
  coupling_trend_delta: number;
}

// ==========================================
// Pillar 5: Architectural Degradation & Drift
// ==========================================

export interface ArchitectureDriftMetric {
  name: string;
  current_value: number;
  baseline_value: number;
  drift_delta: number;
  status: "healthy" | "warning" | "critical_drift";
  explanation: string;
}

export interface ArchitectureDegradationResponse {
  drift_level: "LOW" | "MODERATE" | "SEVERE";
  degradation_velocity_score: number;
  layer_leakage_rate_percentage: number;
  smell_accumulation_rate: number;
  drift_metrics: ArchitectureDriftMetric[];
  urgent_remediations: string[];
  unintended_architectural_shifts: string[];
}

// ==========================================
// Pillar 8: Architecture-Aware Agent Specification Generator
// ==========================================

export interface ArchitectureAgentSpecRequest {
  task_description: string;
  target_components?: string[];
  target_files?: string[];
  max_blast_radius_budget?: number;
}

export interface ArchitectureAgentSpecResponse {
  spec_id: string;
  task_description: string;
  architecture_style: string;
  target_components: string[];
  target_files: string[];
  allowed_imports: string[];
  forbidden_imports: string[];
  layer_boundary_constraints: string[];
  blast_radius_budget_percentage: number;
  interface_contracts: string[];
  required_architectural_invariants: string[];
  prompt_ready_spec: string;
}

// ==========================================
// Pillar 9: Re-Analysis & Verification Loop
// ==========================================

export interface ArchitectureDeltaMetrics {
  before_health: number;
  after_health: number;
  health_delta: number;
  before_coupling: number;
  after_coupling: number;
  coupling_delta: number;
  before_modularity: number;
  after_modularity: number;
  modularity_delta: number;
  before_violations_count: number;
  after_violations_count: number;
  violations_resolved_count: number;
  new_violations_introduced_count: number;
}

export interface ArchitectureVerificationRequest {
  file_path: string;
  modified_code: string;
  agent_spec_id?: string | null;
}

export interface ArchitectureVerificationResponse {
  verdict: "VERIFIED_IMPROVEMENT" | "REGRESSION_DETECTED" | "NEUTRAL";
  verification_summary: string;
  metrics_delta: ArchitectureDeltaMetrics;
  resolved_violations: string[];
  new_risks: string[];
  certification_stamp: string;
  is_safe_to_merge: boolean;
}

// ==========================================
// Commit-to-Commit Architectural Diff & Decision Evolution
// ==========================================

export interface ArchitectureDecisionDiffItem {
  decision_id: string;
  title: string;
  change_type: "superseded" | "status_change" | "modified" | "added" | "deprecated";
  before_status?: string | null;
  after_status?: string | null;
  before_summary?: string | null;
  after_summary?: string | null;
  reason: string;
  affected_components: string[];
}

export interface ArchitectureEdgeDiffItem {
  source_subsystem: string;
  target_subsystem: string;
  change_type: "added_intentional" | "added_violation" | "removed" | "modified";
  is_intentional: boolean;
  boundary_status: "intentional" | "violates_boundary";
  rationale: string;
}

export interface ArchitectureCoupledComponentDiff {
  component_name: string;
  subsystem: string;
  base_coupling: number;
  target_coupling: number;
  coupling_delta: number;
  velocity_status: "accelerating_coupling" | "stable" | "decoupled";
  explanation: string;
}

export interface ArchitectureCommitDiffResponse {
  repository_id: string;
  base_commit: string;
  target_commit: string;
  base_timestamp: string;
  target_timestamp: string;
  changed_decisions: ArchitectureDecisionDiffItem[];
  edge_diffs: ArchitectureEdgeDiffItem[];
  increasingly_coupled_components: ArchitectureCoupledComponentDiff[];
  boundary_shifts: string[];
  health_delta: number;
  modularity_delta: number;
  coupling_delta: number;
  summary: string;
}

// ==========================================
// Architectural Impact & Consequence Simulation (What-If Analysis)
// ==========================================

export interface BoundaryCrossedItem {
  boundary_id: string;
  boundary_name: string;
  from_layer: string;
  to_layer: string;
  rule_violated: string;
  severity: "critical" | "warning" | "info";
  impact_explanation: string;
}

export interface TeamImpactItem {
  team_name: string;
  subsystems_owned: string[];
  components_affected_count: number;
  lead_contact: string;
  review_required: boolean;
  impact_summary: string;
}

export interface CouplingShiftTelemetry {
  status: "increases_coupling" | "maintains_coupling" | "decreases_coupling";
  is_increasing_coupling: boolean;
  delta_efferent: number;
  current_instability: number;
  projected_instability: number;
  delta_instability: number;
  fan_out_before: number;
  fan_out_after: number;
  explanation: string;
}

export interface ADRViolationDetail {
  adr_id: string;
  adr_title: string;
  violation_reason: string;
  severity: "critical" | "warning";
  prescribed_pattern: string;
}

export interface RecommendedAlternativeOption {
  id: string;
  name: string;
  tag: string;
  summary: string;
  fit_score: number;
  complexity: string;
  boundary_violations_resolved: number;
  coupling_impact: string;
  code_snippet: string;
}

export interface RecommendedDesign {
  pattern_name: string;
  pattern_category?: string;
  summary: string;
  why_this_resolves_all_issues?: string[];
  architectural_blueprint: string;
  before_code?: string | null;
  after_code?: string | null;
  code_example?: string | null;
  step_by_step_guidance: string[];
  tradeoffs: string[];
  alternative_patterns?: RecommendedAlternativeOption[];
  agent_spec_prompt: string;
}

export interface SimulationConfidence {
  structural_confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  evidence_confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  runtime_confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  overall: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  rationale: string;
}

export interface SimulationEvidence {
  source_type: string;
  repository_path: string;
  entity_id: string;
  commit_sha?: string | null;
  excerpt_or_reference: string;
  relation_to_claim: string;
  evidence_strength: string;
}

export interface PropagationPath {
  target_id: string;
  target_name: string;
  hops: number;
  path_nodes: string[];
  edge_types?: string[];
  relationship: string;
}

export interface ArchitecturalImpactAnalysisResponse {
  component_id: string;
  component_name: string;
  subsystem: string;
  headline: string;
  consequence_bullets: string[];
  simulation_id?: string | null;
  normalized_intervention?: string;
  confidence?: SimulationConfidence | null;
  affected_components_count: number;
  affected_components: AffectedComponentImpact[];
  direct_impact_count?: number;
  indirect_impact_count?: number;
  propagation_paths_count?: number;
  propagation_paths?: PropagationPath[];
  boundaries_crossed_count: number;
  boundaries_crossed: BoundaryCrossedItem[];
  teams_impacted_count: number;
  teams_impacted: TeamImpactItem[];
  coupling_shift: CouplingShiftTelemetry;
  adr_violations_count: number;
  adr_violations: ADRViolationDetail[];
  constraints_affected_count?: number;
  constraints_affected?: string[];
  evidence?: SimulationEvidence[];
  recommended_design: RecommendedDesign;
}

// ==========================================
// Git Commit History Types
// ==========================================
export interface ArchitectureGitCommit {
  sha: string;
  short_sha: string;
  author: string;
  date: string;
  message: string;
}

export interface ArchitectureGitCommitListResponse {
  commits: ArchitectureGitCommit[];
  total_count: number;
}

// ==========================================
// Custom Boundary Rules & Quality Gate Types
// ==========================================
export interface ArchitectureRuleCreateRequest {
  name: string;
  rule_type?: string;
  source_pattern: string;
  target_pattern: string;
  severity?: string;
  rationale: string;
  is_active?: boolean;
}

export interface ArchitectureRuleResponse {
  id: number;
  repository_id: number;
  name: string;
  rule_type: string;
  source_pattern: string;
  target_pattern: string;
  severity: string;
  rationale: string;
  is_active: boolean;
  created_at: string;
}

export interface ArchitectureRuleListResponse {
  rules: ArchitectureRuleResponse[];
  total_count: number;
}

export interface ArchitectureQualityGateViolation {
  rule_id?: number | null;
  rule_name: string;
  source_component: string;
  target_component: string;
  severity: string;
  rationale: string;
  suggested_fix: string;
}

export interface ArchitectureQualityGateResponse {
  passed: boolean;
  status: string;
  violations: ArchitectureQualityGateViolation[];
  critical_violations_count: number;
  warning_violations_count: number;
  circular_dependencies_count: number;
  health_score: number;
  summary: string;
}
