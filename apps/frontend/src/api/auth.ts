import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL: API_URL,
});

// Attach access token to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

// Auto-refresh on 401, retry the original request
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        clearAuthStorage();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const { access_token } = await refreshAccessToken(refreshToken);
        localStorage.setItem("access_token", access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        refreshQueue.forEach((cb) => cb(access_token));
        refreshQueue = [];

        return api(originalRequest);
      } catch (refreshError) {
        clearAuthStorage();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

function clearAuthStorage() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export interface GithubUser {
  id: number;
  github_id: number;
  username: string;
  email: string | null;
  avatar_url: string;
}


export async function getCurrentUser(): Promise<GithubUser> {
  const { data } = await api.get<{ user: GithubUser }>("/auth/me");
  return data.user;
}

// Uses plain axios, not `api` — calling `api` here would re-trigger the
// response interceptor and cause an infinite loop on repeated 401s.
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; token_type: string }> {
  const { data } = await axios.post(`${API_URL}/auth/refresh`, {
    refresh_token: refreshToken,
  });
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post("/auth/logout", { refresh_token: refreshToken });
}

