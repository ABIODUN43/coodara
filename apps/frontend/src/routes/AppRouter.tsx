import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "@/components/common/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import AuthCallbackPage from "@/features/auth/pages/AuthCallbackPage";

import { DashboardLayout } from "@/pages/DashboardLayout";
import { DashboardHome } from "@/pages/DashboardHome";
import { OrganizationsPage } from "@/pages/OrganizationsPage";
import { OrganizationDetailPage } from "@/pages/OrganizationDetailPage";
import { RepositoriesPage } from "@/pages/RepositoriesPage";
import { AnalysisPage } from "@/pages/AnalysisPage";
import { ArchitecturePage } from "@/pages/ArchitecturePage";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: "/",
        element: <LandingPage />,
      },
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/auth/callback",
        element: <AuthCallbackPage />,
      },
      {
        path: "/dashboard",
        element: (
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <DashboardHome />,
          },
          {
            path: "organizations",
            element: <OrganizationsPage />,
          },
          {
            path: "organizations/:orgId",
            element: <OrganizationDetailPage />,
          },
          {
            path: "repositories",
            element: <RepositoriesPage />,
          },
          {
            path: "organizations/:orgId/repositories/:repoId/analysis",
            element: <AnalysisPage />,
          },
          {
            path: "organizations/:orgId/repositories/:repoId/architecture",
            element: <ArchitecturePage />,
          },
        ],
      },
      {
        path: "*",
        element: <div>404 Not Found</div>,
      },
    ],
  },
]);