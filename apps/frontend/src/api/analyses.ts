import { api } from "./client";
import type { Analysis, AnalysisListResponse, AnalysisResult } from "@/types/analysis";

function base(orgId: string | number, repoId: string | number) {
  return `/organizations/${orgId}/repositories/${repoId}/analyses`;
}

export async function startAnalysis(orgId: string | number, repoId: string | number): Promise<Analysis> {
  const { data } = await api.post<Analysis>(base(orgId, repoId));
  return data;
}

export async function getAnalysis(
  orgId: string | number,
  repoId: string | number,
  analysisId: string | number
): Promise<Analysis> {
  const { data } = await api.get<Analysis>(`${base(orgId, repoId)}/${analysisId}`);
  return data;
}

export async function listAnalyses(
  orgId: string | number,
  repoId: string | number,
  page = 1,
  perPage = 20
): Promise<AnalysisListResponse> {
  const { data } = await api.get<AnalysisListResponse>(base(orgId, repoId), {
    params: { page, per_page: perPage },
  });
  return data;
}

export async function getAnalysisResult(
  orgId: string | number,
  repoId: string | number,
  analysisId: string | number
): Promise<AnalysisResult> {
  const { data } = await api.get<AnalysisResult>(`${base(orgId, repoId)}/${analysisId}/result`);
  return data;
}