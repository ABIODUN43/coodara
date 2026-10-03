/**
 * API client for Coodara Architecture Lab &
 * Architectural Economics Intelligence (AEI).
 *
 * Targets /api/v1/organizations/{organization_id}/repositories/{repository_id}/lab
 */

import { api } from "./client";
import type {
  CostScenario,
  CostScenarioCreateRequest,
  DecisionRecord,
  DecisionRecordCreateRequest,
  EvidenceCategory,
  EvidenceItem,
  EvidenceItemCreateRequest,
  Experiment,
  ExperimentCreateRequest,
  ExperimentRun,
  ExperimentRunCreateRequest,
  ExperimentStatus,
  Hypothesis,
  HypothesisCreateRequest,
  HypothesisStatus,
  HypothesisUpdateRequest,
  Intervention,
  InterventionCreateRequest,
  LabOverviewResponse,
  ResourceProfile,
  ResourceProfileCreateRequest,
  WorkloadProfile,
  WorkloadProfileCreateRequest,
} from "@/types/lab";

function getLabBaseUrl(orgId: string | number, repoId: string | number): string {
  return `/organizations/${orgId}/repositories/${repoId}/lab`;
}

/**
 * Fetch consolidated Architecture Lab overview.
 */
export async function getLabOverview(
  orgId: string | number,
  repoId: string | number
): Promise<LabOverviewResponse> {
  const { data } = await api.get<LabOverviewResponse>(getLabBaseUrl(orgId, repoId));
  return data;
}

// =============================================================================
// Hypotheses
// =============================================================================

export async function listHypotheses(
  orgId: string | number,
  repoId: string | number,
  status?: HypothesisStatus,
  limit = 50,
  offset = 0
): Promise<Hypothesis[]> {
  const { data } = await api.get<Hypothesis[]>(`${getLabBaseUrl(orgId, repoId)}/hypotheses`, {
    params: { status, limit, offset },
  });
  return data;
}

export async function getHypothesis(
  orgId: string | number,
  repoId: string | number,
  hypothesisId: number | string
): Promise<Hypothesis> {
  const { data } = await api.get<Hypothesis>(
    `${getLabBaseUrl(orgId, repoId)}/hypotheses/${hypothesisId}`
  );
  return data;
}

export async function createHypothesis(
  orgId: string | number,
  repoId: string | number,
  payload: HypothesisCreateRequest
): Promise<Hypothesis> {
  const { data } = await api.post<Hypothesis>(
    `${getLabBaseUrl(orgId, repoId)}/hypotheses`,
    payload
  );
  return data;
}

export async function updateHypothesis(
  orgId: string | number,
  repoId: string | number,
  hypothesisId: number | string,
  payload: HypothesisUpdateRequest
): Promise<Hypothesis> {
  const { data } = await api.patch<Hypothesis>(
    `${getLabBaseUrl(orgId, repoId)}/hypotheses/${hypothesisId}`,
    payload
  );
  return data;
}

export async function deleteHypothesis(
  orgId: string | number,
  repoId: string | number,
  hypothesisId: number | string
): Promise<void> {
  await api.delete(`${getLabBaseUrl(orgId, repoId)}/hypotheses/${hypothesisId}`);
}

// =============================================================================
// Interventions
// =============================================================================

export async function createIntervention(
  orgId: string | number,
  repoId: string | number,
  hypothesisId: number | string,
  payload: InterventionCreateRequest
): Promise<Intervention> {
  const { data } = await api.post<Intervention>(
    `${getLabBaseUrl(orgId, repoId)}/hypotheses/${hypothesisId}/interventions`,
    payload
  );
  return data;
}

export async function listInterventions(
  orgId: string | number,
  repoId: string | number,
  hypothesisId: number | string
): Promise<Intervention[]> {
  const { data } = await api.get<Intervention[]>(
    `${getLabBaseUrl(orgId, repoId)}/hypotheses/${hypothesisId}/interventions`
  );
  return data;
}

// =============================================================================
// Experiments & Runs
// =============================================================================

export async function listExperiments(
  orgId: string | number,
  repoId: string | number,
  hypothesisId?: number | string,
  status?: ExperimentStatus
): Promise<Experiment[]> {
  const { data } = await api.get<Experiment[]>(`${getLabBaseUrl(orgId, repoId)}/experiments`, {
    params: { hypothesis_id: hypothesisId, status },
  });
  return data;
}

export async function getExperiment(
  orgId: string | number,
  repoId: string | number,
  experimentId: number | string
): Promise<Experiment> {
  const { data } = await api.get<Experiment>(
    `${getLabBaseUrl(orgId, repoId)}/experiments/${experimentId}`
  );
  return data;
}

export async function createExperiment(
  orgId: string | number,
  repoId: string | number,
  payload: ExperimentCreateRequest
): Promise<Experiment> {
  const { data } = await api.post<Experiment>(
    `${getLabBaseUrl(orgId, repoId)}/experiments`,
    payload
  );
  return data;
}

export async function createExperimentRun(
  orgId: string | number,
  repoId: string | number,
  experimentId: number | string,
  payload: ExperimentRunCreateRequest
): Promise<ExperimentRun> {
  const { data } = await api.post<ExperimentRun>(
    `${getLabBaseUrl(orgId, repoId)}/experiments/${experimentId}/runs`,
    payload
  );
  return data;
}

// =============================================================================
// Workload & Resource Profiles
// =============================================================================

export async function listWorkloadProfiles(
  orgId: string | number,
  repoId: string | number
): Promise<WorkloadProfile[]> {
  const { data } = await api.get<WorkloadProfile[]>(
    `${getLabBaseUrl(orgId, repoId)}/workload-profiles`
  );
  return data;
}

export async function createWorkloadProfile(
  orgId: string | number,
  repoId: string | number,
  payload: WorkloadProfileCreateRequest
): Promise<WorkloadProfile> {
  const { data } = await api.post<WorkloadProfile>(
    `${getLabBaseUrl(orgId, repoId)}/workload-profiles`,
    payload
  );
  return data;
}

export async function listResourceProfiles(
  orgId: string | number,
  repoId: string | number
): Promise<ResourceProfile[]> {
  const { data } = await api.get<ResourceProfile[]>(
    `${getLabBaseUrl(orgId, repoId)}/resource-profiles`
  );
  return data;
}

export async function createResourceProfile(
  orgId: string | number,
  repoId: string | number,
  payload: ResourceProfileCreateRequest
): Promise<ResourceProfile> {
  const { data } = await api.post<ResourceProfile>(
    `${getLabBaseUrl(orgId, repoId)}/resource-profiles`,
    payload
  );
  return data;
}

// =============================================================================
// Evidence Ledger
// =============================================================================

export async function listEvidence(
  orgId: string | number,
  repoId: string | number,
  options?: {
    hypothesisId?: number | string;
    experimentId?: number | string;
    category?: EvidenceCategory;
    limit?: number;
    offset?: number;
  }
): Promise<EvidenceItem[]> {
  const { data } = await api.get<EvidenceItem[]>(`${getLabBaseUrl(orgId, repoId)}/evidence`, {
    params: {
      hypothesis_id: options?.hypothesisId,
      experiment_id: options?.experimentId,
      category: options?.category,
      limit: options?.limit,
      offset: options?.offset,
    },
  });
  return data;
}

export async function createEvidenceItem(
  orgId: string | number,
  repoId: string | number,
  payload: EvidenceItemCreateRequest
): Promise<EvidenceItem> {
  const { data } = await api.post<EvidenceItem>(
    `${getLabBaseUrl(orgId, repoId)}/evidence`,
    payload
  );
  return data;
}

// =============================================================================
// Cost Scenarios
// =============================================================================

export async function listCostScenarios(
  orgId: string | number,
  repoId: string | number,
  experimentId?: number | string
): Promise<CostScenario[]> {
  const { data } = await api.get<CostScenario[]>(
    `${getLabBaseUrl(orgId, repoId)}/cost-scenarios`,
    {
      params: { experiment_id: experimentId },
    }
  );
  return data;
}

export async function createCostScenario(
  orgId: string | number,
  repoId: string | number,
  payload: CostScenarioCreateRequest
): Promise<CostScenario> {
  const { data } = await api.post<CostScenario>(
    `${getLabBaseUrl(orgId, repoId)}/cost-scenarios`,
    payload
  );
  return data;
}

// =============================================================================
// Decision Records
// =============================================================================

export async function listDecisionRecords(
  orgId: string | number,
  repoId: string | number,
  hypothesisId?: number | string
): Promise<DecisionRecord[]> {
  const { data } = await api.get<DecisionRecord[]>(
    `${getLabBaseUrl(orgId, repoId)}/decisions`,
    {
      params: { hypothesis_id: hypothesisId },
    }
  );
  return data;
}

export async function createDecisionRecord(
  orgId: string | number,
  repoId: string | number,
  payload: DecisionRecordCreateRequest
): Promise<DecisionRecord> {
  const { data } = await api.post<DecisionRecord>(
    `${getLabBaseUrl(orgId, repoId)}/decisions`,
    payload
  );
  return data;
}
