export interface GithubUser {
  id: number;
  github_id: number;
  username: string;
  email: string | null;
  avatar_url: string | null;
}

export interface RefreshResponse {
  access_token: string;
}