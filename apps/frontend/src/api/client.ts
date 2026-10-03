import axios from "axios";

const rawBaseUrl =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  "http://localhost:8000/api/v1";

const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, "");

export const API_BASE_URL = cleanBaseUrl.endsWith("/api/v1")
  ? cleanBaseUrl
  : `${cleanBaseUrl}/api/v1`;

const TOKEN_STORAGE_KEY = "coodara_access_token";
let inMemoryToken: string | null = null;

export function getAuthToken(): string | null {
  if (inMemoryToken) {
    return inMemoryToken;
  }
  try {
    const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      inMemoryToken = stored;
      return stored;
    }
  } catch {
    // Ignore storage errors in sandbox/restricted environments
  }
  return null;
}

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});