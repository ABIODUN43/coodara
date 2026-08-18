import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { api } from "./client";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
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

  if (error) {
    queue.forEach(({ reject }) => reject(error));
    return;
  }

  queue.forEach(({ resolve }) => resolve());
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

    /*
     * Never intercept the refresh endpoint itself.
     *
     * Otherwise:
     *
     * /auth/refresh
     *      ↓
     * 401
     *      ↓
     * /auth/refresh
     *      ↓
     * infinite loop
     */
    if (originalRequest.url?.includes("/auth/refresh")) {
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
      /*
       * The browser automatically sends the HttpOnly
       * refresh cookie.
       */
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