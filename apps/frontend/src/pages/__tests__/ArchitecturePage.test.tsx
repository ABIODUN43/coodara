import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ArchitecturePage } from "@/pages/ArchitecturePage";
import * as architectureApi from "@/api/architecture";
import type { ArchitectureResponse } from "@/types/architecture";

vi.mock("@/context/ProjectContext", () => ({
  useProject: () => ({
    activeProject: { id: 1, name: "Engineering Org" },
    loading: false,
  }),
}));

const mockOverview = {
  loading: false,
  repos: [
    { id: 10, name: "billing-service", full_name: "coodara/billing-service", default_branch: "main" },
    { id: 20, name: "auth-gateway", full_name: "coodara/auth-gateway", default_branch: "main" },
  ],
};

vi.mock("@/hooks/useDashboardOverview", () => ({
  useDashboardOverview: () => mockOverview,
}));

// Mock Cytoscape graph component so tests don't require full canvas rendering
vi.mock("@/components/architecture/ArchitectureGraph", () => ({
  ArchitectureGraph: ({ selectedNodeId, onSelectNode }: any) => (
    <div data-testid="architecture-graph">
      <span>Mock Cytoscape Graph Canvas</span>
      <button onClick={() => onSelectNode("billing-controller")}>Select Controller</button>
      {selectedNodeId && <span>Selected: {selectedNodeId}</span>}
    </div>
  ),
}));

const sampleArchitecture: ArchitectureResponse = {
  repository_id: "repo-123",
  status: "completed",
  summary: {
    health_score: 82,
    components: 12,
    dependencies: 18,
    issues: 2,
  },
  graph: {
    nodes: [
      { id: "billing-controller", name: "BillingController", type: "service", file_path: "app/billing.py", dependency_count: 1, dependent_count: 0, issue_count: 0 },
      { id: "payment-client", name: "PaymentClient", type: "service", file_path: "app/payment.py", dependency_count: 0, dependent_count: 1, issue_count: 0 },
    ],
    edges: [
      { id: "e1", source: "billing-controller", target: "payment-client", type: "dependency", label: "calls", boundary_status: "intentional" },
    ],
  },
};

describe("ArchitecturePage (Bug 1 & Bug 2 Regression)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(architectureApi, "getArchitecture").mockResolvedValue(sampleArchitecture);
    vi.spyOn(architectureApi, "getArchitectureInsights").mockResolvedValue({ items: [] } as any);
  });

  it("renders without blank screen on direct /architecture route without route params (Bug 1)", async () => {
    render(
      <MemoryRouter initialEntries={["/architecture"]}>
        <Routes>
          <Route path="/architecture" element={<ArchitecturePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Should NOT render null or blank; should render Coodara banner and architecture map
    await waitFor(() => {
      expect(screen.getByText("Coodara.")).toBeDefined();
    });

    expect(screen.getByText("Architecture System Map")).toBeDefined();
    expect(screen.getByText("Code Studio & Impact Simulator")).toBeDefined();
    expect(screen.getByTestId("architecture-graph")).toBeDefined();
  });

  it("renders repository dropdown and allows switching repositories", async () => {
    render(
      <MemoryRouter initialEntries={["/architecture?repoId=10"]}>
        <Routes>
          <Route path="/architecture" element={<ArchitecturePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Coodara.")).toBeDefined();
    });

    const select = screen.getByRole("combobox");
    expect(select).toBeDefined();

    // Switch repo
    fireEvent.change(select, { target: { value: "20" } });
    expect(architectureApi.getArchitecture).toHaveBeenCalledWith("1", "20");
  });

  it("switches to Code Studio & Impact Simulator tab (Bug 2)", async () => {
    render(
      <MemoryRouter initialEntries={["/architecture?repoId=10&tab=studio"]}>
        <Routes>
          <Route path="/architecture" element={<ArchitecturePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Coodara.")).toBeDefined();
    });

    expect(screen.getByText(/Edit modules & simulate blast radius before committing/)).toBeDefined();
  });
});
