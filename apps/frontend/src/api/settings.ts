import { api } from "@/api/client";
import type { OrganizationSettings, UpdateOrganizationSettingsRequest } from "@/types/settings";

export async function getOrganizationSettings(
  orgId: string | number
): Promise<OrganizationSettings> {
  const res = await api.get<OrganizationSettings>(`/organizations/${orgId}/settings`);
  return res.data;
}

export async function updateOrganizationSettings(
  orgId: string | number,
  payload: UpdateOrganizationSettingsRequest
): Promise<OrganizationSettings> {
  const res = await api.put<OrganizationSettings>(`/organizations/${orgId}/settings`, payload);
  return res.data;
}
