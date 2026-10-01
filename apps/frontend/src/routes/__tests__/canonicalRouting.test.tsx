import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { router } from "@/routes/AppRouter";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { RiskInspector } from "@/components/risks/RiskInspector";
import { ArchitectureLabPage } from "@/pages/ArchitectureLabPage";
import type { ArchitectureIssue } from "@/types/architecture";

// Mock auth & project contexts so components can render cleanly in isolation
vi.mock("@/context/AuthContext", () => ({
  useAuthContext: () => ({
    user: { email: "architect@coodara.ai", user_metadata: { name: "Lead Architect" } },
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    loading: false,
    user: { email: "architect@coodara.ai" },
  }),
}));

vi.mock("@/context/ProjectContext", () => ({
  useProject: () => ({
    organizations: [{ id: "org-1", name: "Coodara Engineering" }],
    activeProject: { id: "proj-1", name: "Core Engine", organizationId: "org-1" },
    setActiveProject: vi.fn(),
    loading: false,
  }),
}));

vi.mock("@/hooks/useDashboardOverview", () => ({
  useDashboardOverview: () => ({
    repos: [
      { id: "repo-1", name: "coodara-core", full_name: "coodara/coodara-core", defaultBranch: "main" },
      { id: "repo-2", name: "coodara-worker", full_name: "coodara/coodara-worker", defaultBranch: "main" },
    ],
    allIssues: [
      {
        id: "finding-101",
        title: "Circular Dependency in Event Dispatcher",
        severity: "HIGH",
        category: "ARCHITECTURE_DRIFT",
        repositoryId: "repo-1",
      },
    ],
    loading: false,
    stats: { totalRepos: 2, totalIssues: 1, criticalCount: 0, highCount: 1 },
  }),
}));

describe("Stage 1: 15 Canonical Surfaces & Routing Consolidation", () => {
  // --------------------------------------------------------------------------
  // 1. Canonical Route Declarations
  // --------------------------------------------------------------------------
  describe("Canonical Route Inventory", () => {
    // Extract all paths declared in the router tree
    function collectPaths(routes: any[]): string[] {
      const paths: string[] = [];
      for (const route of routes) {
        if (route.path) paths.push(route.path);
        if (route.children) {
          paths.push(...collectPaths(route.children));
        }
      }
      return paths;
    }

    const registeredPaths = collectPaths(router.routes);

    it("registers all 15 canonical application surfaces", () => {
      const canonicalSurfaces = [
        "/dashboard",
        "/repositories",
        "/repositories/:id",
        "/architecture",
        "/findings",
        "/findings/:id",
        "/lab",
        "/explorer",
        "/chat",
        "/reports",
        "/activity",
        "/integrations",
        "/settings/workspace",
        "/settings/project",
        "/login",
      ];

      for (const surface of canonicalSurfaces) {
        expect(
          registeredPaths,
          `Expected canonical surface "${surface}" to be registered in router`
        ).toContain(surface);
      }
    });

    it("registers redirects for all deprecated surfaces", () => {
      const deprecatedPaths = [
        "/settings",
        "/risks",
        "/recommendations",
        "/memory",
        "/history",
        "/ai-assistant",
        "/analysis",
        "/organizations",
        "/dashboard/risks",
        "/dashboard/recommendations",
        "/dashboard/memory",
        "/dashboard/history",
        "/dashboard/chat",
        "/dashboard/reports",
        "/dashboard/settings",
      ];

      for (const depPath of deprecatedPaths) {
        expect(
          registeredPaths,
          `Expected deprecated path "${depPath}" to have a redirect entry`
        ).toContain(depPath);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 2. Sidebar Navigation Canonical Grouping
  // --------------------------------------------------------------------------
  describe("Sidebar Navigation Structure", () => {
    it("renders Core, Engineering, and Configuration navigation groups with canonical links", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Sidebar isMobileOpen={false} onClose={vi.fn()} isCollapsed={false} />
        </MemoryRouter>
      );

      // Section titles
      expect(screen.getByText("Core")).toBeDefined();
      expect(screen.getByText("Engineering")).toBeDefined();
      expect(screen.getByText("Configuration")).toBeDefined();

      // Canonical links in Core
      const dashboardLink = screen.getByRole("link", { name: /^dashboard$/i });
      expect(dashboardLink.getAttribute("href")).toBe("/dashboard");

      const reposLink = screen.getByRole("link", { name: /^repositories$/i });
      expect(reposLink.getAttribute("href")).toBe("/repositories");

      const archLink = screen.getByRole("link", { name: /^architecture$/i });
      expect(archLink.getAttribute("href")).toBe("/architecture");

      const findingsLink = screen.getByRole("link", { name: /^findings$/i });
      expect(findingsLink.getAttribute("href")).toBe("/findings");

      const labLink = screen.getByRole("link", { name: /^architecture lab$/i });
      expect(labLink.getAttribute("href")).toBe("/lab");

      // Canonical links in Engineering
      const explorerLink = screen.getByRole("link", { name: /^explorer$/i });
      expect(explorerLink.getAttribute("href")).toBe("/explorer");

      const chatLink = screen.getByRole("link", { name: /^chat$/i });
      expect(chatLink.getAttribute("href")).toBe("/chat");

      const reportsLink = screen.getByRole("link", { name: /^reports$/i });
      expect(reportsLink.getAttribute("href")).toBe("/reports");

      const activityLink = screen.getByRole("link", { name: /^activity$/i });
      expect(activityLink.getAttribute("href")).toBe("/activity");

      // Canonical links in Configuration
      const integrationsLink = screen.getByRole("link", { name: /^integrations$/i });
      expect(integrationsLink.getAttribute("href")).toBe("/integrations");

      const workspaceSettingsLink = screen.getByRole("link", { name: /^workspace settings$/i });
      expect(workspaceSettingsLink.getAttribute("href")).toBe("/settings/workspace");

      const projectSettingsLink = screen.getByRole("link", { name: /^project settings$/i });
      expect(projectSettingsLink.getAttribute("href")).toBe("/settings/project");
    });
  });

  // --------------------------------------------------------------------------
  // 3. Findings -> Architecture Lab Investigation Handoff
  // --------------------------------------------------------------------------
  describe("Findings to Architecture Lab Handoff", () => {
    it("renders 'Investigate in Architecture Lab' action on finding inspection and triggers navigation", () => {
      const mockIssue: ArchitectureIssue = {
        id: "issue-888",
        title: "Leaky Domain Boundary in Billing Coordinator",
        description: "Billing coordinator directly invokes internal database connection without mediation.",
        severity: "critical",
        type: "boundary_violation",
        status: "open",
        component_ids: ["BillingCoordinator"],
        evidence_ids: ["ev-1"],
      };

      const mockFinding = {
        issue: mockIssue,
        repoId: 101,
        repoName: "coodara-engine",
      };

      render(
        <MemoryRouter initialEntries={["/findings/issue-888"]}>
          <RiskInspector
            finding={mockFinding}
            orgId="org-1"
            isResolved={false}
            onToggleResolved={vi.fn()}
            onClose={vi.fn()}
          />
        </MemoryRouter>
      );

      // Verify the primary action button is rendered
      const labBtn = screen.getByRole("button", { name: /investigate in architecture lab/i });
      expect(labBtn).toBeDefined();

      // Clicking it executes the navigation handler without crashing
      fireEvent.click(labBtn);
    });

    it("ArchitectureLabPage ingests finding handoff context from route location state", () => {
      const mockLocationState = {
        findingId: "issue-888",
        findingTitle: "Leaky Domain Boundary in Billing Coordinator",
        findingCategory: "DOMAIN_LEAK",
        severity: "HIGH",
        repoId: "repo-1",
        repoName: "coodara-core",
        primaryComponent: "BillingCoordinator",
        filePath: "services/billing/coordinator.py",
      };

      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/lab",
              search: "?findingId=issue-888&repoId=repo-1",
              state: mockLocationState,
            },
          ]}
        >
          <Routes>
            <Route path="/lab" element={<ArchitectureLabPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Verify Architecture Lab shell rendered
      expect(screen.getByText("Architecture Lab")).toBeDefined();

      // Verify context banner rendered from finding handoff
      expect(screen.getByText("Investigating Finding:")).toBeDefined();
      expect(screen.getByText("Leaky Domain Boundary in Billing Coordinator")).toBeDefined();
      expect(screen.getByText("View Finding in Context")).toBeDefined();
    });
  });
});
