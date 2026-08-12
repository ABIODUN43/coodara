import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth"; // adjust path to match your actual hook

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null; // or a spinner — see note below
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
}