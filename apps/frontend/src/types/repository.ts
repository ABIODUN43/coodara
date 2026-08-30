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

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  visibility: string;
  default_branch: string;
  language: string | null;
  html_url: string;
  owner: {
    login: string;
    avatar_url?: string;
  };
}

export interface GitHubRepositoryOption {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  language: string | null;
  html_url: string;
  updated_at: string | null;
}

export interface GitHubRepositoryListResponse {
  items: GitHubRepositoryOption[];
  page: number;
  per_page: number;
  has_next_page: boolean;
}
