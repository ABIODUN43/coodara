export interface Repository {
  id: number;
  organization_id: number;
  github_id: number;
  name: string;
  full_name: string;
  description: string | null;
  visibility: string;
  default_branch: string;
  primary_language: string | null;
  clone_url: string;
  html_url: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RepositoryListResponse {
  items: Repository[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface RepositoryImportRequest {
  owner: string;
  name: string;
  default_branch?: string | null;
}

export interface RepositoryUpdateRequest {
  default_branch?: string | null;
}