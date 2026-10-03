import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ArchitectureLabPage } from "@/pages/ArchitectureLabPage";
import * as labApi from "@/api/lab";
import type {
  DecisionRecord,
  EvidenceItem,
  Experiment,
  Hypothesis,
  LabOverviewResponse,
  ResourceProfile,
  WorkloadProfile,
} from "@/types/lab";

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
  repoData: [
    {
      repo: { id: 10, name: "billing-service" },
      architecture: {
        summary: { health_score: 84 },
        graph: {
          nodes: [
            { id: "billing-domain", name: "Billing Domain", type: "module" },
            { id: "payment-client", name: "Payment Client", type: "service" },
          ],
          edges: [],
        },
      },
    },
  ],
  allIssues: [
    {
      id: "issue-101",
      title: "Cyclic dependency between billing and payment gateway",
      severity: "critical",
      type: "circular_dependency",
      primaryComponent: "Billing Domain",
      repoId: 10,
    },
  ],
};

vi.mock("@/hooks/useDashboardOverview", () => ({
  useDashboardOverview: () => mockOverview,
}));

const sampleHypothesis: Hypothesis = {
  id: 1,
  organization_id: 1,
  repository_id: 10,
  title: "Decouple payment gateway adapter to reduce circular dependency",
  question: "Will introducing an interface boundary eliminate circular coupling?",
  description: "Investigate refactoring payment adapter to break cycle.",
  status: "DRAFT",
  created_at: "2026-10-02T12:00:00Z",
  updated_at: "2026-10-02T12:00:00Z",
  interventions: [
    {
      id: 11,
      hypothesis_id: 1,
      intervention_type: "COMPATIBLE_REFACTOR",
      title: "Introduce PaymentProvider Interface Port",
      description: "Extract port interface to decouple caller from implementation.",
      target_component_ids: ["Billing Domain", "Payment Client"],
      parameters: {},
      created_at: "2026-10-02T12:00:00Z",
    },
  ],
};

const sampleExperiment: Experiment = {
  id: 201,
  hypothesis_id: 1,
  name: "Adapter Decoupling Benchmark",
  description: "Test throughput and stability before and after refactor.",
  status: "READY",
  baseline_reference: { commit: "HEAD~1" },
  proposed_reference: { branch: "refactor/payment-port" },
  created_at: "2026-10-02T12:30:00Z",
  updated_at: "2026-10-02T12:30:00Z",
  runs: [],
};

const sampleWorkload: WorkloadProfile = {
  id: 301,
  organization_id: 1,
  repository_id: 10,
  name: "Peak Hour Traffic",
  description: "Assumed high load profile during peak checkout.",
  requests_per_second: 500,
  batch_volume: null,
  concurrency: 50,
  read_write_ratio: 0.8,
  data_volume_gb: 100,
  workload_pattern: "STEADY",
  configuration: {},
  is_measured: false,
  created_at: "2026-10-02T12:00:00Z",
  updated_at: "2026-10-02T12:00:00Z",
};

const sampleResource: ResourceProfile = {
  id: 401,
  organization_id: 1,
  repository_id: 10,
  name: "GCP Standard Sizing",
  description: "2 vCPU / 4GB RAM Cloud Run",
  provider: "gcp",
  region: "us-central1",
  cpu: "2",
  memory: "4Gi",
  database_class: "db-custom-2-8192",
  replicas: 3,
  storage_gb: 50,
  configuration: {},
  created_at: "2026-10-02T12:00:00Z",
  updated_at: "2026-10-02T12:00:00Z",
};

const sampleEvidence: EvidenceItem = {
  id: 501,
  organization_id: 1,
  repository_id: 10,
  hypothesis_id: 1,
  category: "STATIC",
  source_type: "AST_DEPENDENCY_GRAPH",
  subject: "Billing Domain Coupling",
  claim: "Instability I=0.82 with 2 circular references to payment client.",
  data: {},
  confidence: 0.95,
  provenance: { analyzer: "AST 2.0" },
  recorded_at: "2026-10-02T12:00:00Z",
  created_at: "2026-10-02T12:00:00Z",
};

const sampleDecision: DecisionRecord = {
  id: 601,
  hypothesis_id: 1,
  experiment_id: 201,
  decision: "ACCEPT",
  rationale: "Approved interface port extraction. Low risk and breaks circular dependency.",
  selected_intervention_id: 11,
  supporting_evidence_ids: [501],
  decision_maker: "Principal Architect",
  created_at: "2026-10-02T13:00:00Z",
  updated_at: "2026-10-02T13:00:00Z",
};

const sampleLabOverview: LabOverviewResponse = {
  repository_id: 10,
  organization_id: 1,
  hypotheses_count: 1,
  experiments_count: 1,
  evidence_count: 1,
  cost_scenarios_count: 0,
  decisions_count: 1,
  hypotheses: [sampleHypothesis],
  workload_profiles: [sampleWorkload],
  resource_profiles: [sampleResource],
  recent_evidence: [sampleEvidence],
  recent_decisions: [sampleDecision],
};

describe("ArchitectureLabPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(labApi, "getLabOverview").mockResolvedValue(sampleLabOverview);
    vi.spyOn(labApi, "listHypotheses").mockResolvedValue([sampleHypothesis]);
    vi.spyOn(labApi, "listExperiments").mockResolvedValue([sampleExperiment]);
    vi.spyOn(labApi, "listWorkloadProfiles").mockResolvedValue([sampleWorkload]);
    vi.spyOn(labApi, "listResourceProfiles").mockResolvedValue([sampleResource]);
    vi.spyOn(labApi, "listEvidence").mockResolvedValue([sampleEvidence]);
    vi.spyOn(labApi, "listDecisionRecords").mockResolvedValue([sampleDecision]);
    vi.spyOn(labApi, "createHypothesis").mockResolvedValue(sampleHypothesis);
    vi.spyOn(labApi, "createDecisionRecord").mockResolvedValue(sampleDecision);
  });

  it("renders Architecture Lab context bar, navigation tabs, and overview metrics", async () => {
    render(
      <MemoryRouter initialEntries={["/lab?repoId=10"]}>
        <Routes>
          <Route path="/lab" element={<ArchitectureLabPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Context bar items
    expect(screen.getByText("Architecture Lab")).toBeDefined();
    expect(screen.getByText("coodara/billing-service")).toBeDefined();

    // Navigation tab labels
    expect(screen.getAllByText("Overview").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Hypotheses & Interventions").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Experiments").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Workloads & Sizing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Evidence Ledger").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Decisions (ADRs)").length).toBeGreaterThan(0);

    // Verify overview data loads
    await waitFor(() => {
      expect(screen.getByText(/1\s+Hypothesis/)).toBeDefined();
    });
  });

  it("switches to Hypotheses & Interventions tab and displays hypothesis workspace", async () => {
    render(
      <MemoryRouter initialEntries={["/lab?repoId=10"]}>
        <Routes>
          <Route path="/lab" element={<ArchitectureLabPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Hypotheses & Interventions")).toBeDefined();
    });

    const hypTab = screen.getByText("Hypotheses & Interventions");
    fireEvent.click(hypTab);

    await waitFor(() => {
      expect(
        screen.getAllByText("Decouple payment gateway adapter to reduce circular dependency").length
      ).toBeGreaterThan(0);
    });
  });

  it("switches to Decisions tab and displays ADR list", async () => {
    render(
      <MemoryRouter initialEntries={["/lab?repoId=10&tab=decisions"]}>
        <Routes>
          <Route path="/lab" element={<ArchitectureLabPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Architectural Decision Records (ADR)")).toBeDefined();
      expect(screen.getByText("ADR-601")).toBeDefined();
      expect(screen.getByText("Principal Architect")).toBeDefined();
    });
  });

  it("auto-opens Hypothesis modal with prefilled data when navigating with findingId", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/lab",
            search: "?findingId=issue-101&repoId=10",
            state: {
              findingId: "issue-101",
              findingTitle: "Cyclic dependency between billing and payment gateway",
              findingCategory: "Coupling",
              primaryComponent: "Billing Domain",
              severity: "critical",
            },
          },
        ]}
      >
        <Routes>
          <Route path="/lab" element={<ArchitectureLabPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Modal should be open
    await waitFor(() => {
      expect(screen.getByText("Formulate Architectural Hypothesis")).toBeDefined();
    });

    // Check prefilled inputs
    const titleInput = screen.getByDisplayValue(
      "Remediate finding: Cyclic dependency between billing and payment gateway"
    );
    expect(titleInput).toBeDefined();
  });

  it("opens Architecture Context Drawer and displays findings and components", async () => {
    render(
      <MemoryRouter initialEntries={["/lab?repoId=10"]}>
        <Routes>
          <Route path="/lab" element={<ArchitectureLabPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Architecture Lab")).toBeDefined();
    });

    const drawerBtn = screen.getByTitle("Open Architecture Context Drawer");
    fireEvent.click(drawerBtn);

    await waitFor(() => {
      expect(screen.getAllByText("Architecture Context").length).toBeGreaterThan(1);
      expect(
        screen.getByText("Cyclic dependency between billing and payment gateway")
      ).toBeDefined();
    });
  });
});
