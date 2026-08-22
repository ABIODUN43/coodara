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
  type GithubUser,
} from "../api/auth";

import {
  AuthContext,
  type AuthContextValue,
} from "../context/AuthContext";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] =
    useState<GithubUser | null>(null);

  const [loading, setLoading] = useState(true);

  /**
   * Ask the backend who the current user is.
   *
   * The browser automatically sends the HttpOnly
   * authentication cookies.
   */
  const refreshUser = useCallback(async () => {
    const currentUser = await getCurrentUser();

    setUser(currentUser);
  }, []);

  /**
   * Restore authentication when the application starts.
   */
  useEffect(() => {
    let mounted = true;

    async function restoreAuthentication() {
      try {
        const currentUser =
          await getCurrentUser();

        if (mounted) {
          setUser(currentUser);
        }
      } catch {
        /*
         * 401 simply means there is no valid
         * authenticated session.
         */
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    restoreAuthentication();

    return () => {
      mounted = false;
    };
  }, []);

  async function login(): Promise<void> {
    loginWithGithub();
  }

  async function logout(): Promise<void> {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
    }
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    loading,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}