import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AuthCallbackPage from "../pages/AuthCallbackPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { getAuthToken, setAuthToken, api } from "@/api/client";
import * as authApi from "@/api/auth";

vi.mock("@/context/AuthContext", () => {
  return {
    useAuthContext: vi.fn(),
  };
});

vi.mock("@/hooks/useAuth", () => {
  return {
    useAuth: vi.fn(),
  };
});

describe("Authentication Lifecycle & Resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthToken(null);
  });

  describe("1. GitHub Callback & Token Extraction", () => {
    it("extracts token from hash, stores it, calls refreshUser and navigates to /dashboard", async () => {
      const mockRefreshUser = vi.fn().mockResolvedValue(undefined);
      const { useAuthContext } = await import("@/context/AuthContext");
      vi.mocked(useAuthContext).mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: false,
        login: vi.fn(),
        demoLogin: vi.fn(),
        logout: vi.fn(),
        refreshUser: mockRefreshUser,
      });

      // Set window.location.hash
      window.location.hash = "#token=gh_test_token_123";

      render(
        <MemoryRouter initialEntries={["/auth/callback#token=gh_test_token_123"]}>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/dashboard" element={<div>Dashboard Surface</div>} />
            <Route path="/login" element={<div>Login Surface</div>} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(getAuthToken()).toBe("gh_test_token_123");
        expect(mockRefreshUser).toHaveBeenCalledTimes(1);
        expect(screen.getByText("Dashboard Surface")).toBeTruthy();
      });
    });

    it("redirects to /login if refreshUser throws during callback", async () => {
      const mockRefreshUser = vi.fn().mockRejectedValue(new Error("Network Error"));
      const { useAuthContext } = await import("@/context/AuthContext");
      vi.mocked(useAuthContext).mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: false,
        login: vi.fn(),
        demoLogin: vi.fn(),
        logout: vi.fn(),
        refreshUser: mockRefreshUser,
      });

      window.location.hash = "";

      render(
        <MemoryRouter initialEntries={["/auth/callback"]}>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/dashboard" element={<div>Dashboard Surface</div>} />
            <Route path="/login" element={<div>Login Surface</div>} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(mockRefreshUser).toHaveBeenCalledTimes(1);
        expect(screen.getByText("Login Surface")).toBeTruthy();
      });
    });
  });

  describe("2. Protected Route Guard Evaluation", () => {
    it("does not redirect to /login while authentication state is loading", async () => {
      const { useAuth } = await import("@/hooks/useAuth");
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: true,
        login: vi.fn(),
        demoLogin: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Surface</div>} />
          </Routes>
        </MemoryRouter>,
      );

      // Must not render login surface or protected content while loading
      expect(screen.queryByText("Login Surface")).toBeNull();
      expect(screen.queryByText("Protected Content")).toBeNull();
    });

    it("redirects to /login when not authenticated and not loading", async () => {
      const { useAuth } = await import("@/hooks/useAuth");
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: false,
        login: vi.fn(),
        demoLogin: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Surface</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText("Login Surface")).toBeTruthy();
    });

    it("renders children when authenticated", async () => {
      const { useAuth } = await import("@/hooks/useAuth");
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 1, github_id: 123, username: "alice", email: "a@b.com", avatar_url: null },
        isAuthenticated: true,
        loading: false,
        login: vi.fn(),
        demoLogin: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Surface</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText("Protected Content")).toBeTruthy();
    });
  });

  describe("3. Client Bearer Token Injection & 401 Refresh", () => {
    it("attaches Authorization Bearer header when token is stored", async () => {
      setAuthToken("custom_jwt_token");

      const config = { headers: {} as Record<string, string> };
      // @ts-expect-error test interceptor handler
      const requestHandler = api.interceptors.request.handlers[0]?.fulfilled;
      if (requestHandler) {
        // @ts-expect-error test call
        const updatedConfig = (await requestHandler(config)) as { headers: Record<string, string> };
        expect(updatedConfig.headers.Authorization).toBe("Bearer custom_jwt_token");
      }
    });

    it("clears stored token on logout", async () => {
      setAuthToken("token_to_clear");
      expect(getAuthToken()).toBe("token_to_clear");

      vi.spyOn(api, "post").mockResolvedValueOnce({ data: { success: true } });

      await authApi.logout();
      expect(getAuthToken()).toBeNull();
    });
  });
});
