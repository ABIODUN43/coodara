/**
 * TypeScript definitions for Coodara Architecture Lab &
 * Architectural Economics Intelligence (AEI).
 *
 * Matches backend schemas in apps/backend/app/schemas/lab.py 1:1.
 */

export type HypothesisStatus =
  | "DRAFT"
  | "READY"
  | "RUNNING"
  | "COMPLETED"
  | "CANCELLED";

export type InterventionType =
  | "REMOVE"
  | "BREAKING_REFACTOR"
  | "COMPATIBLE_REFACTOR"
  | "MOVE"
  | "SPLIT"
  | "MERGE";

export type ExperimentStatus =
  | "DRAFT"
  | "READY"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type ExperimentRunStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type EvidenceCategory =
  | "STATIC"
  | "OBSERVED"
  | "MEASURED"
  | "MODELED"
  | "PROJECTED";

export type DecisionStatus =
  | "ACCEPT"
  | "REJECT"
  | "DEFER"
  | "NEEDS_VALIDATION";

// =============================================================================
// Interventions
// =============================================================================

export interface InterventionCreateRequest {
  intervention_type: InterventionType;
  title: string;
  description?: string | null;
  target_component_ids?: string[];
  parameters?: Record<string, unknown>;
}

export interface Intervention {
  id: number;
  hypothesis_id: number;
  intervention_type: InterventionType;
  title: string;
  description?: string | null;
  target_component_ids: string[];
  parameters: Record<string, unknown>;
  created_at: string;
}

// =============================================================================
// Hypotheses
// =============================================================================

export interface HypothesisCreateRequest {
  title: string;
  description?: string | null;
  question: string;
  status?: HypothesisStatus;
}

export interface HypothesisUpdateRequest {
  title?: string;
  description?: string | null;
  question?: string;
  status?: HypothesisStatus;
}

export interface Hypothesis {
  id: number;
  organization_id: number;
  repository_id: number;
  title: string;
  description?: string | null;
  question: string;
  status: HypothesisStatus;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  interventions: Intervention[];
}

// =============================================================================
// Experiments & Runs
// =============================================================================

export interface ExperimentRunCreateRequest {
  run_number?: number;
  status?: ExperimentRunStatus;
}

export interface ExperimentResultData {
  baseline_reference?: Record<string, unknown>;
  proposed_reference?: Record<string, unknown>;
  metrics_before?: Record<string, number | string>;
  metrics_after?: Record<string, number | string>;
  differences?: Record<string, number>;
  direct_impacts?: Array<{
    entity_id: string;
    name: string;
    subsystem: string;
    component_type: string;
    relationship: string;
    reason: string;
  }>;
  indirect_impacts?: Array<{
    entity_id: string;
    name: string;
    subsystem: string;
    hops: number;
    shortest_path: string[];
    reason: string;
  }>;
  propagation_paths?: Array<{
    target_id: string;
    target_name: string;
    hops: number;
    path_nodes: string[];
    relationship: string;
  }>;
  boundaries_crossed?: Array<{
    boundary_id: string;
    from_boundary: string;
    to_boundary: string;
    crossing_edge: string;
    reason: string;
    severity: string;
  }>;
  generated_evidence_ids?: number[];
  execution_metadata?: Record<string, unknown>;
  duration_seconds?: number;
}

export interface ExperimentRun {
  id: number;
  experiment_id: number;
  run_number: number;
  status: ExperimentRunStatus;
  started_at?: string | null;
  completed_at?: string | null;
  error?: string | null;
  result_data?: ExperimentResultData;
  created_at: string;
}

export interface ExperimentCreateRequest {
  hypothesis_id: number;
  name: string;
  description?: string | null;
  status?: ExperimentStatus;
  baseline_reference?: Record<string, unknown>;
  proposed_reference?: Record<string, unknown>;
}

export interface Experiment {
  id: number;
  hypothesis_id: number;
  name: string;
  description?: string | null;
  status: ExperimentStatus;
  baseline_reference: Record<string, unknown>;
  proposed_reference: Record<string, unknown>;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  runs: ExperimentRun[];
}

// =============================================================================
// Workload & Resource Profiles
// =============================================================================

export interface WorkloadProfileCreateRequest {
  name: string;
  description?: string | null;
  requests_per_second?: number | null;
  batch_volume?: number | null;
  concurrency?: number | null;
  read_write_ratio?: number | null;
  data_volume_gb?: number | null;
  workload_pattern?: string | null;
  configuration?: Record<string, unknown>;
  is_measured?: boolean;
}

export interface WorkloadProfile {
  id: number;
  organization_id: number;
  repository_id: number;
  name: string;
  description?: string | null;
  requests_per_second?: number | null;
  batch_volume?: number | null;
  concurrency?: number | null;
  read_write_ratio?: number | null;
  data_volume_gb?: number | null;
  workload_pattern?: string | null;
  configuration: Record<string, unknown>;
  is_measured: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResourceProfileCreateRequest {
  name: string;
  description?: string | null;
  provider?: string;
  region?: string;
  cpu?: string | null;
  memory?: string | null;
  database_class?: string | null;
  replicas?: number;
  storage_gb?: number | null;
  configuration?: Record<string, unknown>;
}

export interface ResourceProfile {
  id: number;
  organization_id: number;
  repository_id: number;
  name: string;
  description?: string | null;
  provider: string;
  region: string;
  cpu?: string | null;
  memory?: string | null;
  database_class?: string | null;
  replicas: number;
  storage_gb?: number | null;
  configuration: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Pricing Snapshot
// =============================================================================

export interface PricingSnapshotCreateRequest {
  provider: string;
  region: string;
  pricing_source: string;
  currency?: string;
  captured_at?: string | null;
  pricing_data?: Record<string, unknown>;
  source_metadata?: Record<string, unknown>;
}

export interface PricingSnapshot {
  id: number;
  provider: string;
  region: string;
  pricing_source: string;
  currency: string;
  captured_at: string;
  pricing_data: Record<string, unknown>;
  source_metadata: Record<string, unknown>;
  created_at: string;
}

// =============================================================================
// Evidence Ledger
// =============================================================================

export interface EvidenceItemCreateRequest {
  hypothesis_id?: number | null;
  experiment_id?: number | null;
  run_id?: number | null;
  category: EvidenceCategory;
  source_type: string;
  subject: string;
  claim: string;
  data?: Record<string, unknown>;
  confidence?: number | null;
  provenance?: Record<string, unknown>;
}

export interface EvidenceItem {
  id: number;
  organization_id: number;
  repository_id: number;
  hypothesis_id?: number | null;
  experiment_id?: number | null;
  run_id?: number | null;
  category: EvidenceCategory;
  source_type: string;
  subject: string;
  claim: string;
  data: Record<string, unknown>;
  confidence?: number | null;
  provenance: Record<string, unknown>;
  recorded_at: string;
  created_at: string;
}

// =============================================================================
// Cost Scenario
// =============================================================================

export interface CostScenarioCreateRequest {
  experiment_id: number;
  run_id?: number | null;
  workload_profile_id?: number | null;
  resource_profile_id?: number | null;
  pricing_snapshot_id?: number | null;
  name: string;
  description?: string | null;
  assumptions?: Record<string, unknown>;
  estimated_cost_outputs?: Record<string, unknown>;
  currency?: string;
  calculation_metadata?: Record<string, unknown>;
}

export interface CostScenario {
  id: number;
  experiment_id: number;
  run_id?: number | null;
  workload_profile_id?: number | null;
  resource_profile_id?: number | null;
  pricing_snapshot_id?: number | null;
  name: string;
  description?: string | null;
  assumptions: Record<string, unknown>;
  estimated_cost_outputs: Record<string, unknown>;
  currency: string;
  calculation_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Decision Records
// =============================================================================

export interface DecisionRecordCreateRequest {
  hypothesis_id: number;
  experiment_id?: number | null;
  decision: DecisionStatus;
  rationale: string;
  selected_intervention_id?: number | null;
  supporting_evidence_ids?: number[];
  decision_maker?: string | null;
}

export interface DecisionRecord {
  id: number;
  hypothesis_id: number;
  experiment_id?: number | null;
  decision: DecisionStatus;
  rationale: string;
  selected_intervention_id?: number | null;
  supporting_evidence_ids: number[];
  decision_maker?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Consolidated Lab Overview
// =============================================================================

export interface LabOverviewResponse {
  repository_id: number;
  organization_id: number;
  hypotheses_count: number;
  experiments_count: number;
  evidence_count: number;
  cost_scenarios_count: number;
  decisions_count: number;
  hypotheses: Hypothesis[];
  workload_profiles: WorkloadProfile[];
  resource_profiles: ResourceProfile[];
  recent_evidence: EvidenceItem[];
  recent_decisions: DecisionRecord[];
}
