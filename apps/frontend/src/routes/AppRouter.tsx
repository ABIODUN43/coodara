import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "@/components/common/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import AuthCallbackPage from "@/features/auth/pages/AuthCallbackPage";

import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { DashboardHome } from "@/pages/DashboardHome";
import { OrganizationsPage } from "@/pages/OrganizationsPage";
import { OrganizationDetailPage } from "@/pages/OrganizationDetailPage";
import { RepositoriesPage } from "@/pages/RepositoriesPage";
import { AnalysisPage } from "@/pages/AnalysisPage";
import { ArchitecturePage } from "@/pages/ArchitecturePage";
import { MemoryPage } from "@/pages/MemoryPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { AIAssistantPage } from "@/pages/AIAssistantPage";
import { RisksPage } from "@/pages/RisksPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { RecommendationsPage } from "@/pages/RecommendationsPage";
import { SettingsPage } from "@/pages/SettingsPage";

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
            path: "organizations/:orgId/repositories",
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

          {
            path: "organizations/:orgId/repositories/:repoId/memory",
            element: <MemoryPage />,
          },

          {
            path: "organizations/:orgId/repositories/:repoId/history",
            element: <HistoryPage />,
          },

          {
            path: "memory",
            element: <MemoryPage />,
          },

          {
            path: "organizations/:orgId/memory",
            element: <MemoryPage />,
          },

          {
            path: "history",
            element: <HistoryPage />,
          },

          {
            path: "organizations/:orgId/history",
            element: <HistoryPage />,
          },

          {
            path: "chat",
            element: <AIAssistantPage />,
          },

          {
            path: "organizations/:orgId/chat",
            element: <AIAssistantPage />,
          },

          {
            path: "ai-assistant",
            element: <AIAssistantPage />,
          },

          {
            path: "organizations/:orgId/ai-assistant",
            element: <AIAssistantPage />,
          },

          {
            path: "risks",
            element: <RisksPage />,
          },

          {
            path: "organizations/:orgId/risks",
            element: <RisksPage />,
          },

          {
            path: "reports",
            element: <ReportsPage />,
          },

          {
            path: "organizations/:orgId/reports",
            element: <ReportsPage />,
          },

          {
            path: "recommendations",
            element: <RecommendationsPage />,
          },

          {
            path: "organizations/:orgId/recommendations",
            element: <RecommendationsPage />,
          },

          {
            path: "settings",
            element: <SettingsPage />,
          },

          {
            path: "organizations/:orgId/settings",
            element: <SettingsPage />,
          },
        ],
      },
    ],
  },
]);