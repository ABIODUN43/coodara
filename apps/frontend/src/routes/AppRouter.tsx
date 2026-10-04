import { createBrowserRouter, Navigate, useParams, useSearchParams } from "react-router-dom";

import { AppLayout } from "@/components/common/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/common/RouteErrorBoundary";

import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import AuthCallbackPage from "@/features/auth/pages/AuthCallbackPage";

import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { DashboardHome } from "@/pages/DashboardHome";
import { RepositoriesPage } from "@/pages/RepositoriesPage";
import { AnalysisPage } from "@/pages/AnalysisPage";
import { ArchitecturePage } from "@/pages/ArchitecturePage";
import { FindingsPage } from "@/pages/FindingsPage";
import { ArchitectureLabPage } from "@/pages/ArchitectureLabPage";
import { ExplorerPage } from "@/pages/ExplorerPage";
import { AIAssistantPage } from "@/pages/AIAssistantPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { ActivityPage } from "@/pages/ActivityPage";
import { IntegrationsPage } from "@/pages/IntegrationsPage";
import { WorkspaceSettingsPage } from "@/pages/WorkspaceSettingsPage";
import { ProjectSettingsPage } from "@/pages/ProjectSettingsPage";

/**
 * Redirect helper for legacy /dashboard/organizations/:orgId/repositories/:repoId/analysis paths
 */
function LegacyRepoAnalysisRedirect() {
  const { repoId } = useParams<{ repoId?: string }>();
  if (repoId) {
    return <Navigate to={`/repositories/${repoId}`} replace />;
  }
  return <Navigate to="/repositories" replace />;
}

/**
 * Redirect helper for legacy /dashboard/organizations/:orgId/repositories/:repoId/architecture paths
 * Preserves orgId, repoId, and query parameters (such as ?tab=studio&component=...)
 */
function LegacyArchitectureRedirect() {
  const { orgId, repoId } = useParams<{ orgId?: string; repoId?: string }>();
  const [searchParams] = useSearchParams();
  const query = new URLSearchParams(searchParams);
  if (orgId && !query.has("orgId")) query.set("orgId", orgId);
  if (repoId && !query.has("repoId")) query.set("repoId", repoId);
  const searchStr = query.toString() ? `?${query.toString()}` : "";
  return <Navigate to={`/architecture${searchStr}`} replace />;
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      // Surface 15: Public / Auth / Onboarding
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

      // Authenticated Surfaces (DashboardLayout)
      {
        element: (
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        ),
        children: [
          // Surface 1: Dashboard Portfolio Overview
          {
            path: "/dashboard",
            element: <DashboardHome />,
          },

          // Surface 2: Repositories Inventory
          {
            path: "/repositories",
            element: <RepositoriesPage />,
          },

          // Surface 3: Repository Overview
          {
            path: "/repositories/:id",
            element: <AnalysisPage />,
          },

          // Surface 4: Architecture Map
          {
            path: "/architecture",
            element: <ArchitecturePage />,
          },

          // Surface 5: Architectural Findings
          {
            path: "/findings",
            element: <FindingsPage />,
          },

          // Surface 6: Finding Detail View
          {
            path: "/findings/:id",
            element: <FindingsPage />,
          },

          // Surface 7: Architecture Lab (Core Experimentation Workspace)
          {
            path: "/lab",
            element: <ArchitectureLabPage />,
          },

          // Surface 8: Codebase Explorer
          {
            path: "/explorer",
            element: <ExplorerPage />,
          },

          // Surface 9: Architecture Chat
          {
            path: "/chat",
            element: <AIAssistantPage />,
          },

          // Surface 10: Reports
          {
            path: "/reports",
            element: <ReportsPage />,
          },

          // Surface 11: Activity & Decisions
          {
            path: "/activity",
            element: <ActivityPage />,
          },

          // Surface 12: Integrations
          {
            path: "/integrations",
            element: <IntegrationsPage />,
          },

          // Surface 13: Workspace Settings
          {
            path: "/settings/workspace",
            element: <WorkspaceSettingsPage />,
          },

          // Surface 14: Project Settings
          {
            path: "/settings/project",
            element: <ProjectSettingsPage />,
          },

          // -------------------------------------------------------------------
          // Backward Compatibility & Deprecation Redirects
          // -------------------------------------------------------------------
          {
            path: "/settings",
            element: <Navigate to="/settings/workspace" replace />,
          },
          {
            path: "/risks",
            element: <Navigate to="/findings" replace />,
          },
          {
            path: "/recommendations",
            element: <Navigate to="/findings" replace />,
          },
          {
            path: "/memory",
            element: <Navigate to="/activity?tab=memory" replace />,
          },
          {
            path: "/history",
            element: <Navigate to="/activity?tab=timeline" replace />,
          },
          {
            path: "/ai-assistant",
            element: <Navigate to="/chat" replace />,
          },
          {
            path: "/analysis",
            element: <Navigate to="/repositories" replace />,
          },
          {
            path: "/organizations",
            element: <Navigate to="/repositories" replace />,
          },

          // Legacy /dashboard/* prefixes
          {
            path: "/dashboard/risks",
            element: <Navigate to="/findings" replace />,
          },
          {
            path: "/dashboard/recommendations",
            element: <Navigate to="/findings" replace />,
          },
          {
            path: "/dashboard/memory",
            element: <Navigate to="/activity?tab=memory" replace />,
          },
          {
            path: "/dashboard/history",
            element: <Navigate to="/activity?tab=timeline" replace />,
          },
          {
            path: "/dashboard/chat",
            element: <Navigate to="/chat" replace />,
          },
          {
            path: "/dashboard/ai-assistant",
            element: <Navigate to="/chat" replace />,
          },
          {
            path: "/dashboard/reports",
            element: <Navigate to="/reports" replace />,
          },
          {
            path: "/dashboard/settings",
            element: <Navigate to="/settings/workspace" replace />,
          },
          {
            path: "/dashboard/organizations",
            element: <Navigate to="/repositories" replace />,
          },
          {
            path: "/dashboard/organizations/:orgId",
            element: <Navigate to="/repositories" replace />,
          },
          {
            path: "/dashboard/organizations/:orgId/repositories",
            element: <Navigate to="/repositories" replace />,
          },
          {
            path: "/dashboard/organizations/:orgId/repositories/:repoId/analysis",
            element: <LegacyRepoAnalysisRedirect />,
          },
          {
            path: "/dashboard/organizations/:orgId/repositories/:repoId/architecture",
            element: <LegacyArchitectureRedirect />,
          },
          {
            path: "/dashboard/organizations/:orgId/repositories/:repoId/memory",
            element: <Navigate to="/activity?tab=memory" replace />,
          },
          {
            path: "/dashboard/organizations/:orgId/repositories/:repoId/history",
            element: <Navigate to="/activity?tab=timeline" replace />,
          },
          {
            path: "/dashboard/organizations/:orgId/memory",
            element: <Navigate to="/activity?tab=memory" replace />,
          },
          {
            path: "/dashboard/organizations/:orgId/history",
            element: <Navigate to="/activity?tab=timeline" replace />,
          },
          {
            path: "/dashboard/organizations/:orgId/chat",
            element: <Navigate to="/chat" replace />,
          },
          {
            path: "/dashboard/organizations/:orgId/ai-assistant",
            element: <Navigate to="/chat" replace />,
          },
          {
            path: "/dashboard/organizations/:orgId/risks",
            element: <Navigate to="/findings" replace />,
          },
          {
            path: "/dashboard/organizations/:orgId/reports",
            element: <Navigate to="/reports" replace />,
          },
          {
            path: "/dashboard/organizations/:orgId/recommendations",
            element: <Navigate to="/findings" replace />,
          },
          {
            path: "/dashboard/organizations/:orgId/settings",
            element: <Navigate to="/settings/project" replace />,
          },
        ],
      },
    ],
  },
]);