export interface OrganizationSettings {
  organization_id: number;
  block_on_circular: boolean;
  auto_scan_on_push: boolean;
  min_health_threshold: number;
  llm_provider: string;
  llm_model: string;
  has_api_key: boolean;
  api_key_preview: string | null;
  updated_at: string | null;
}

export interface UpdateOrganizationSettingsRequest {
  block_on_circular?: boolean;
  auto_scan_on_push?: boolean;
  min_health_threshold?: number;
  llm_provider?: string;
  llm_model?: string;
  api_key?: string;
}
