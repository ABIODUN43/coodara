import { api } from "./client";

import type {
  GithubUser,
  RefreshResponse,
} from "@/types/auth";

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
 * HttpOnly authentication cookies.
 */
export async function getCurrentUser(): Promise<GithubUser> {
  const { data } = await api.get<{ user: GithubUser }>("/auth/me");

  return data.user;
}

/**
 * Rotate the current refresh session.
 *
 * The refresh token is stored in an HttpOnly cookie.
 * JavaScript never receives or sends the refresh token.
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