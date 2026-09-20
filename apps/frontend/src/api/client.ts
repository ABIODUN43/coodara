import axios from "axios";

const rawBaseUrl =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  "http://127.0.0.1:8000/api/v1";

const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, "");

export const API_BASE_URL = cleanBaseUrl.endsWith("/api/v1")
  ? cleanBaseUrl
  : `${cleanBaseUrl}/api/v1`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});