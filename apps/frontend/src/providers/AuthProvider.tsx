import { useEffect, useState, type ReactNode } from "react";
import {
  getCurrentUser,
  logout as logoutRequest,
  type GithubUser,
} from "../api/auth";
import { AuthContext, type AuthContextValue } from "../context/AuthContext";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<GithubUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }

    getCurrentUser()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      })
      .finally(() => setLoading(false));
  }, []);

  async function login() {
    window.location.href =
      `${import.meta.env.VITE_API_URL}/auth/github`;
  }

  async function setUserFromTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
    const fetchedUser = await getCurrentUser();
    setUser(fetchedUser);
  }

  async function logout() {
    const refreshToken = localStorage.getItem("refresh_token");
    try {
      if (refreshToken) {
        await logoutRequest(refreshToken);
      }
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setUser(null);
    }
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    setUserFromTokens,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}