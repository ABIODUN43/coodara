import {
    createContext,
    useContext,
  } from "react";

  import type { GithubUser } from "@/types/auth";

  export interface AuthContextValue {
    user: GithubUser | null;
    isAuthenticated: boolean;
    loading: boolean;

    login: () => Promise<void>;
    demoLogin: () => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
  }

  export const AuthContext =
    createContext<AuthContextValue | undefined>(
      undefined,
    );

  export function useAuthContext(): AuthContextValue {
    const context = useContext(AuthContext);

    if (context === undefined) {
      throw new Error(
        "useAuthContext must be used within an AuthProvider",
      );
    }

    return context;
  }