import { API_BASE_URL, api, setAuthToken } from "./client";

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
  window.location.href = `${API_BASE_URL}/auth/github`;
}

/**
 * Retrieve the currently authenticated user.
 *
 * Authentication is provided through HttpOnly cookies with
 * Authorization Bearer header fallback.
 */
export async function getCurrentUser(): Promise<GithubUser> {
  const { data } = await api.get<{ user: GithubUser }>("/auth/me");

  return data.user;
}

/**
 * Rotate the current refresh session.
 *
 * The refresh token is stored in an HttpOnly cookie.
 */
export async function refreshAccessToken(): Promise<RefreshResponse> {
  const { data } = await api.post<RefreshResponse>("/auth/refresh");

  if (data?.access_token) {
    setAuthToken(data.access_token);
  }

  return data;
}

/**
 * Logout the current user.
 *
 * Clears both the server-side refresh session and the client token.
 */
export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } finally {
    setAuthToken(null);
  }
}

/**
 * Perform instant demo login without external OAuth.
 */
export async function demoLogin(): Promise<GithubUser> {
  const { data } = await api.post<{ user: GithubUser; access_token?: string }>(
    "/auth/demo-login",
  );

  if (data.access_token) {
    setAuthToken(data.access_token);
  }

  return data.user;
}