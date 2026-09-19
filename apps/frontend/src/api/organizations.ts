import { api } from "./client";

import type {
  CreateOrganizationRequest,
  Organization,
} from "@/types/organization";

export async function listOrganizations(): Promise<
  Organization[]
> {
  const { data } =
    await api.get<Organization[]>(
      "/organizations",
    );

  return data;
}

export async function createOrganization(
  payload: CreateOrganizationRequest,
): Promise<Organization> {
  const { data } =
    await api.post<Organization>(
      "/organizations",
      payload,
    );

  return data;
}

export async function getOrganization(
  id: number | string,
): Promise<Organization> {
  const { data } =
    await api.get<Organization>(
      `/organizations/${id}`,
    );

  return data;
}

export async function deleteOrganization(
  id: number | string,
): Promise<{ success: boolean }> {
  const { data } =
    await api.delete<{ success: boolean }>(
      `/organizations/${id}`,
    );

  return data;
}