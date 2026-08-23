import { api } from "@/api/client";
import type {
  ArchitectureResponse,
  ArchitectureComponent,
  ArchitectureInsightsResponse,
  ArchitectureEvidence,
  ArchitectureHistoryResponse,
} from "@/types/architecture";

// All architecture API requests live here (contract §2) — no direct API
// calls inside components. `api` is the shared Axios instance from
// src/api/client.ts (baseURL already includes /api/v1, credentials
// already included), same one organizations.ts / repositories.ts use.

export async function getArchitecture(
  repositoryId: string
): Promise<ArchitectureResponse> {
  const res = await api.get<ArchitectureResponse>(
    `/repositories/${repositoryId}/architecture`
  );
  return res.data;
}

export async function getArchitectureComponent(
  repositoryId: string,
  componentId: string
): Promise<ArchitectureComponent> {
  const res = await api.get<ArchitectureComponent>(
    `/repositories/${repositoryId}/architecture/components/${componentId}`
  );
  return res.data;
}

export async function getArchitectureInsights(
  repositoryId: string
): Promise<ArchitectureInsightsResponse> {
  const res = await api.get<ArchitectureInsightsResponse>(
    `/repositories/${repositoryId}/architecture/insights`
  );
  return res.data;
}

export async function getArchitectureEvidence(
  repositoryId: string,
  evidenceId: string
): Promise<ArchitectureEvidence> {
  const res = await api.get<ArchitectureEvidence>(
    `/repositories/${repositoryId}/architecture/evidence/${evidenceId}`
  );
  return res.data;
}

export async function getArchitectureHistory(
  repositoryId: string
): Promise<ArchitectureHistoryResponse> {
  const res = await api.get<ArchitectureHistoryResponse>(
    `/repositories/${repositoryId}/architecture/history`
  );
  return res.data;
}