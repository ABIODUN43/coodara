import { api } from "./client";

export interface GithubUser {
  id: number;
  github_id: number;
  username: string;
  email: string | null;
  avatar_url: string;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
}

/**
 * Start GitHub OAuth authentication.
 *
 * The backend owns the OAuth flow and authentication cookies.
 */
export function loginWithGithub(): void {
  window.location.href = `${import.meta.env.VITE_API_URL}/auth/github`;
}

/**
 * Retrieve the currently authenticated user.
 *
 * Authentication is provided automatically through
 * the HttpOnly authentication cookies.
 */
export async function getCurrentUser(): Promise<GithubUser> {
  const { data } = await api.get<{ user: GithubUser }>("/auth/me");

  return data.user;
}

/**
 * Rotate the current refresh session.
 *
 * The refresh token is stored in an HttpOnly cookie,
 * therefore no token is passed from JavaScript.
 *
 * The backend will issue new authentication cookies.
 */
export async function refreshAccessToken(): Promise<RefreshResponse> {
  const { data } = await api.post<RefreshResponse>("/auth/refresh");

  return data;
}

/**
 * Logout the current user.
 *
 * The backend reads and revokes the refresh session
 * from the HttpOnly cookie.
 */
export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}