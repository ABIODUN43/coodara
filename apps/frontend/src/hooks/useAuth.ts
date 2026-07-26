import { useAuthContext } from "../context/AuthContext";

export function useAuth() {
  const { user, isAuthenticated, loading, login, logout } = useAuthContext();
  return { user, isAuthenticated, loading, login, logout };
}