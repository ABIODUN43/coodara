import { api } from "./client";

import type {
  Repository,
  RepositoryImportRequest,
  RepositoryListResponse,
  RepositoryUpdateRequest,
  GitHubRepositoryListResponse,
} from "@/types/repository";

/**
 * List GitHub repositories accessible to the authenticated user.
 *
 * Used by the repository picker.
 *
 * Nothing is imported or persisted by this request.
 */
export async function listGitHubRepositories(
  orgId: string | number,
  page = 1,
  perPage = 50,
): Promise<GitHubRepositoryListResponse> {
  const { data } =
    await api.get<GitHubRepositoryListResponse>(
      `/organizations/${orgId}/repositories/github-available`,
      {
        params: {
          page,
          per_page: perPage,
        },
      },
    );

  return data;
}

/**
 * List repositories already imported into Coodara.
 */
export async function listRepositories(
  orgId: string | number,
  page = 1,
  perPage = 50,
): Promise<RepositoryListResponse> {
  const { data } = await api.get<RepositoryListResponse>(
    `/organizations/${orgId}/repositories`,
    {
      params: {
        page,
        per_page: perPage,
      },
    },
  );

  return data;
}

/**
 * Import a GitHub repository into an organization.
 */
export async function importRepository(
  orgId: string | number,
  payload: RepositoryImportRequest,
): Promise<Repository> {
  const { data } = await api.post<Repository>(
    `/organizations/${orgId}/repositories`,
    payload,
  );

  return data;
}

/**
 * Retrieve one imported repository.
 */
export async function getRepository(
  orgId: string | number,
  repoId: string | number,
): Promise<Repository> {
  const { data } = await api.get<Repository>(
    `/organizations/${orgId}/repositories/${repoId}`,
  );

  return data;
}

/**
 * Update repository settings.
 */
export async function updateRepository(
  orgId: string | number,
  repoId: string | number,
  payload: RepositoryUpdateRequest,
): Promise<Repository> {
  const { data } = await api.patch<Repository>(
    `/organizations/${orgId}/repositories/${repoId}`,
    payload,
  );

  return data;
}

/**
 * Remove a repository from Coodara.
 *
 * This does not delete the repository from GitHub.
 */
export async function deleteRepository(
  orgId: string | number,
  repoId: string | number,
): Promise<void> {
  await api.delete(
    `/organizations/${orgId}/repositories/${repoId}`,
  );
}