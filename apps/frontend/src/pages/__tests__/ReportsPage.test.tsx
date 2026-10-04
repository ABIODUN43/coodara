import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ReportsPage } from "@/pages/ReportsPage";
import * as architectureApi from "@/api/architecture";
import type { ArchitectureReportResponse } from "@/types/architecture";

vi.mock("@/context/ProjectContext", () => ({
  useProject: () => ({
    activeProject: { id: 1, name: "Engineering Org" },
    loading: false,
  }),
}));

const mockOverview = {
  loading: false,
  repos: [
    { id: 10, name: "billing-service", primary_language: "Python" },
    { id: 20, name: "auth-gateway", primary_language: "TypeScript" },
  ],
  repoData: [],
  totalRepos: 2,
  analyzedReposCount: 2,
  totalLoc: 12500,
  totalFiles: 45,
  totalClasses: 30,
  totalFunctions: 120,
  healthScore: 88,
  healthLabel: "Healthy",
  healthBreakdown: {
    maintainability: 85,
    complexity: 70,
    coupling: 65,
    modularity: 88,
  },
  allIssues: [],
  allRecommendations: [],
  technologies: [
    { name: "FastAPI", count: 1, confidence: 0.95 },
    { name: "PostgreSQL", count: 1, confidence: 0.98 },
  ],
  criticalFindingsCount: 0,
  warningFindingsCount: 0,
};

vi.mock("@/hooks/useDashboardOverview", () => ({
  useDashboardOverview: () => mockOverview,
}));

const sampleReport: ArchitectureReportResponse = {
  meta: {
    repository_id: 10,
    repository_name: "billing-service",
    organization_id: 1,
    primary_language: "Python",
    commit_sha: "a1b2c3d4e5f6",
    branch: "main",
    analyzed_at: "2026-10-02T12:00:00Z",
    analysis_job_id: 101,
    analyzer_version: "2.0.0",
    total_loc: 4500,
    total_files: 32,
    total_classes: 18,
    total_functions: 95,
  },
  executive_summary: {
    detected_pattern: "Layered (N-Tier) & Clean Domain Architecture",
    pattern_category: "layered",
    alignment_score: 92.0,
    health_score: 86.5,
    health_label: "Healthy",
    maintainability: 84.0,
    modularity: 88.0,
    coupling: 72.0,
    complexity: 68.0,
    summary_text: "Separation of concerns between presentation and persistence layers.",
    key_architecture_rules: [
      "Controllers must delegate to services",
      "No direct database access from controllers",
    ],
    anti_patterns_detected: ["layer_violation"],
  },
  technology_stack: [
    { name: "FastAPI", version: "0.115.0", confidence_score: 0.98 },
  ],
  components: [
    {
      id: "app.controllers.billing",
      name: "BillingController",
      type: "controller",
      subsystem: "Presentation",
      file_path: "app/controllers/billing.py",
      responsibilities: ["Process invoices"],
      efferent_coupling: 2,
      afferent_coupling: 4,
      instability_index: 0.33,
      is_increasingly_coupled: false,
      issue_count: 1,
    },
  ],
  diagram: {
    mermaid_code: "flowchart TD\nBillingController-->BillingService",
    node_count: 2,
    edge_count: 1,
    subsystems: ["Presentation", "Domain Services"],
  },
  dependency_hotspots: [
    {
      source: "BillingController",
      target: "BillingModel",
      kind: "dependency",
      is_intentional: false,
      boundary_status: "violates_boundary",
      rationale: "Controller directly imports model",
    },
  ],
  findings: [
    {
      id: 1,
      category: "layer_violation",
      severity: "warning",
      description: "Direct import of BillingModel from BillingController",
      status: "open",
      evidence: [
        {
          source_type: "source_code",
          file_path: "app/controllers/billing.py",
          line_number: 14,
          snippet: "from app.models.billing import BillingModel",
          description: "Direct ORM import",
        },
      ],
      affected_components: ["BillingController", "BillingModel"],
      consequence: "Bypasses business validation logic",
    },
  ],
  recommendations: [
    {
      id: 1,
      priority: "medium",
      summary: "Route model calls through BillingService",
      action_plan: "Refactor BillingController to invoke BillingService.invoice()",
      related_finding_ids: [1],
    },
  ],
  adrs: [],
  methodology: {
    static_analysis_scope: "Full deterministic AST parsing and dependency analysis",
    limitations: [
      "Dynamic runtime reflection not captured in static pass",
    ],
    confidence_rationale: "Grounded directly in repository AST symbols and validated commit artifacts",
    generated_at: "2026-10-02T12:00:00Z",
  },
  markdown_content: "# Software Architecture Intelligence Report: billing-service\n\nFull Markdown Content",
};

describe("ReportsPage - Architecture Intelligence Report UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders report header and fetches repository architecture report", async () => {
    vi.spyOn(architectureApi, "fetchArchitectureReport").mockResolvedValue(sampleReport);

    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Architecture Intelligence Reports")).toBeDefined();

    // Verify report data renders
    await waitFor(() => {
      expect(
        screen.getByText("Software Architecture Intelligence Report: billing-service")
      ).toBeDefined();
    });

    expect(
      screen.getByText("Layered (N-Tier) & Clean Domain Architecture")
    ).toBeDefined();
    expect(screen.getByText("86.5")).toBeDefined();
    expect(screen.getAllByText("BillingController").length).toBeGreaterThan(0);
    expect(screen.getByText("FastAPI")).toBeDefined();
    expect(
      screen.getByText("Direct import of BillingModel from BillingController")
    ).toBeDefined();
  });

  it("allows switching between Repository Report and Portfolio Overview", async () => {
    vi.spyOn(architectureApi, "fetchArchitectureReport").mockResolvedValue(sampleReport);

    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText("Software Architecture Intelligence Report: billing-service")
      ).toBeDefined();
    });

    // Switch to Portfolio Overview
    const portfolioBtn = screen.getByRole("button", { name: "Portfolio Overview" });
    fireEvent.click(portfolioBtn);

    expect(screen.getByText("Executive Architecture Health Audit")).toBeDefined();
    expect(screen.getByText("Repository Health Scorecard")).toBeDefined();

    // Switch back to Repository Report
    const repoBtn = screen.getByRole("button", { name: "Repository Architecture Report" });
    fireEvent.click(repoBtn);

    await waitFor(
      () => {
        expect(
          screen.getByText("Software Architecture Intelligence Report: billing-service")
        ).toBeDefined();
      },
      { timeout: 5000 }
    );
  }, 15000);

  it("triggers markdown download when button is clicked", async () => {
    vi.spyOn(architectureApi, "fetchArchitectureReport").mockResolvedValue(sampleReport);
    const downloadSpy = vi
      .spyOn(architectureApi, "downloadArchitectureReportMarkdown")
      .mockResolvedValue();

    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText("Software Architecture Intelligence Report: billing-service")
      ).toBeDefined();
    });

    const downloadBtn = screen.getByRole("button", { name: "Download Markdown (.md)" });
    fireEvent.click(downloadBtn);

    expect(downloadSpy).toHaveBeenCalledWith(1, 10, "billing-service");
  });
});
