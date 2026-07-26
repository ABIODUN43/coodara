import { createContext, useContext } from "react";
import type { GithubUser } from "../api/auth";

export interface AuthContextValue {
  user: GithubUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setUserFromTokens: (accessToken: string, refreshToken: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return ctx;
}