import type {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

import { api, getAuthToken, setAuthToken } from "./client";
import type { RefreshResponse } from "@/types/auth";

interface RetryableRequestConfig
  extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;

let refreshQueue: Array<{
  resolve: (token?: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processRefreshQueue(error?: unknown, token?: string): void {
  const queue = refreshQueue;
  refreshQueue = [];

  for (const { resolve, reject } of queue) {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  }
}

function isRefreshRequest(
  request: RetryableRequestConfig,
): boolean {
  return request.url?.endsWith("/auth/refresh") ?? false;
}

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest =
      error.config as RetryableRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshRequest(originalRequest)) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (newToken?: string) => {
            const tokenToApply = newToken || getAuthToken();
            if (tokenToApply) {
              originalRequest.headers.Authorization = `Bearer ${tokenToApply}`;
            }
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const { data } = await api.post<RefreshResponse>("/auth/refresh");
      const newAccessToken = data?.access_token;

      if (newAccessToken) {
        setAuthToken(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }

      processRefreshQueue(undefined, newAccessToken);

      return api(originalRequest);
    } catch (refreshError) {
      setAuthToken(null);
      processRefreshQueue(refreshError);

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);