import type {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

import { api } from "./client";

interface RetryableRequestConfig
  extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;

let refreshQueue: Array<{
  resolve: () => void;
  reject: (error: unknown) => void;
}> = [];

function processRefreshQueue(error?: unknown): void {
  const queue = refreshQueue;

  refreshQueue = [];

  for (const { resolve, reject } of queue) {
    if (error) {
      reject(error);
    } else {
      resolve();
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
          resolve: () => {
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      await api.post("/auth/refresh");

      processRefreshQueue();

      return api(originalRequest);
    } catch (refreshError) {
      processRefreshQueue(refreshError);

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);