import { api } from "./client";
import type {
  Repository,
  RepositoryListResponse,
  RepositoryImportRequest,
  RepositoryUpdateRequest,
} from "@/types/repository";

export async function listRepositories(
  orgId: string | number,
  page = 1,
  perPage = 50
): Promise<RepositoryListResponse> {
  const { data } = await api.get<RepositoryListResponse>(
    `/organizations/${orgId}/repositories`,
    {
      params: {
        page,
        per_page: perPage,
      },
    }
  );

  return data;
}

export async function importRepository(
  orgId: string | number,
  payload: RepositoryImportRequest
): Promise<Repository> {
  const { data } = await api.post<Repository>(
    `/organizations/${orgId}/repositories`,
    payload
  );

  return data;
}

export async function getRepository(
  orgId: string | number,
  repoId: string | number
): Promise<Repository> {
  const { data } = await api.get<Repository>(
    `/organizations/${orgId}/repositories/${repoId}`
  );

  return data;
}

export async function updateRepository(
  orgId: string | number,
  repoId: string | number,
  payload: RepositoryUpdateRequest
): Promise<Repository> {
  const { data } = await api.patch<Repository>(
    `/organizations/${orgId}/repositories/${repoId}`,
    payload
  );

  return data;
}

export async function deleteRepository(
  orgId: string | number,
  repoId: string | number
): Promise<void> {
  await api.delete(
    `/organizations/${orgId}/repositories/${repoId}`
  );
}