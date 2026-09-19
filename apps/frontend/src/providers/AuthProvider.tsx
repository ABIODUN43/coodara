import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  getCurrentUser,
  loginWithGithub,
  logout as logoutRequest,
  demoLogin as demoLoginRequest,
} from "@/api/auth";

import type { GithubUser } from "@/types/auth";

import {
  AuthContext,
  type AuthContextValue,
} from "@/context/AuthContext";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] = useState<GithubUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<void> => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function restoreAuthentication(): Promise<void> {
      try {
        const currentUser = await getCurrentUser();

        if (mounted) {
          setUser(currentUser);
        }
      } catch {
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void restoreAuthentication();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback((): Promise<void> => {
    loginWithGithub();

    return Promise.resolve();
  }, []);

  const demoLogin = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const demoUser = await demoLoginRequest();
      setUser(demoUser);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    loading,
    login,
    demoLogin,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}