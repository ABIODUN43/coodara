import { api } from "./client";
import type { OrganizationOverviewResponse } from "@/types/overview";

/**
 * Fetch consolidated organization telemetry in a single, high-speed request.
 * Powers Overview, Sidebar, Risks, Recommendations, and Reports.
 */
export async function getOrganizationOverview(
  orgId: string | number,
): Promise<OrganizationOverviewResponse> {
  const { data } = await api.get<OrganizationOverviewResponse>(
    `/organizations/${orgId}/overview`,
  );
  return data;
}
