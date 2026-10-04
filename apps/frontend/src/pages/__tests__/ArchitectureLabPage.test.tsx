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
    vi.spyOn(labApi, "listPricingSnapshots").mockResolvedValue([]);
    vi.spyOn(labApi, "listCostScenarios").mockResolvedValue([]);
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

  it("navigates to Experiments tab, runs experiment and displays structural comparison results", async () => {
    const completedRun = {
      id: 1,
      experiment_id: 201,
      run_number: 1,
      status: "COMPLETED" as const,
      started_at: "2026-10-02T13:00:00Z",
      completed_at: "2026-10-02T13:00:02Z",
      created_at: "2026-10-02T13:00:00Z",
      result_data: {
        baseline_reference: { snapshot_id: 1 },
        proposed_reference: { intervention_type: "REMOVE" },
        metrics_before: { components: 10, dependencies: 25, efferent_coupling: 4, instability: 0.4 },
        metrics_after: { components: 9, dependencies: 23, efferent_coupling: 3, instability: 0.3 },
        differences: { components: -1, dependencies: -2, efferent_coupling: -1, instability: -0.1 },
        direct_impacts: [
          {
            entity_id: "payment-client",
            name: "Payment Client",
            subsystem: "billing",
            component_type: "module",
            relationship: "direct_dependency",
            reason: "Direct dependency broken",
          },
        ],
        boundaries_crossed: [],
        generated_evidence_ids: [1001],
        duration_seconds: 0.24,
      },
    };

    vi.spyOn(labApi, "createExperimentRun").mockResolvedValue({
      id: 1,
      experiment_id: 201,
      run_number: 1,
      status: "PENDING",
      created_at: "2026-10-02T13:00:00Z",
    });
    vi.spyOn(labApi, "executeExperimentRun").mockImplementation(async () => {
      // Mock refresh returning completed experiment
      vi.spyOn(labApi, "listExperiments").mockResolvedValue([
        {
          ...sampleExperiment,
          status: "COMPLETED",
          runs: [completedRun],
        },
      ]);
      return completedRun;
    });

    render(
      <MemoryRouter initialEntries={["/lab?repoId=10&tab=experiments"]}>
        <Routes>
          <Route path="/lab" element={<ArchitectureLabPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Adapter Decoupling Benchmark").length).toBeGreaterThan(0);
    });

    // Run Experiment button should be visible
    const runBtn = screen.getByRole("button", { name: /Run Experiment/i });
    expect(runBtn).toBeDefined();

    fireEvent.click(runBtn);

    // Verify comparison results render
    await waitFor(() => {
      expect(screen.getByText("Deterministic Structural Comparison")).toBeDefined();
      expect(screen.getByText("Efferent Coupling (Ce)")).toBeDefined();
      expect(screen.getByText("Directly Impacted Components (1)")).toBeDefined();
      expect(screen.getByText("Record Decision")).toBeDefined();
    });
  });

  it("evaluates architectural economics scenario and displays modeled cost deltas and transparent breakdown", async () => {
    vi.spyOn(labApi, "listPricingSnapshots").mockResolvedValue([
      {
        id: 501,
        provider: "AWS",
        region: "us-east-1",
        pricing_source: "AWS Rate Card",
        currency: "USD",
        captured_at: "2026-10-02T12:00:00Z",
        pricing_data: { vcpu_hour: 0.04, memory_gib_hour: 0.005 },
        source_metadata: {},
        created_at: "2026-10-02T12:00:00Z",
      },
    ]);

    vi.spyOn(labApi, "evaluateCostScenario").mockResolvedValue({
      scenario: {
        id: 601,
        experiment_id: 201,
        name: "Modeled Economics: Adapter Decoupling Benchmark",
        currency: "USD",
        assumptions: { assumptions_classified: [] },
        estimated_cost_outputs: {},
        calculation_metadata: {},
        created_at: "2026-10-02T13:00:00Z",
        updated_at: "2026-10-02T13:00:00Z",
      },
      evidence_item: {
        id: 701,
        organization_id: 1,
        repository_id: 10,
        experiment_id: 201,
        category: "MODELED",
        source_type: "ARCHITECTURAL_ECONOMICS",
        subject: "Economic Footprint",
        claim: "Modeled monthly cost: USD 140.00",
        data: {},
        confidence: 0.7,
        provenance: {},
        recorded_at: "2026-10-02T13:00:00Z",
        created_at: "2026-10-02T13:00:00Z",
      },
      baseline: {
        hourly: 0.25,
        daily: 6.0,
        monthly: 180.0,
        annual: 2160.0,
        currency: "USD",
        breakdown: { compute: 100, memory: 40, database: 30, storage: 10, network: 0, other: 0, total_monthly: 180 },
        formulas: { compute: "2 vCPU * 0.04/hr * 2 * 730" },
        assumptions_classified: [
          { field: "vCPU Capacity", value: "2 vCPU", type: "ASSUMED", source: "ResourceProfile" },
        ],
        limitations: ["Modeled estimate based on declared assumptions."],
        validation_path: ["Run synthetic load benchmark in staging."],
      },
      proposed: {
        hourly: 0.19,
        daily: 4.6,
        monthly: 140.0,
        annual: 1680.0,
        currency: "USD",
        breakdown: { compute: 80, memory: 30, database: 20, storage: 10, network: 0, other: 0, total_monthly: 140 },
        formulas: { compute: "1.5 vCPU * 0.04/hr * 2 * 730" },
        assumptions_classified: [
          { field: "vCPU Capacity", value: "1.5 vCPU", type: "ASSUMED", source: "ResourceProfile" },
        ],
        limitations: ["Modeled estimate based on declared assumptions."],
        validation_path: ["Run synthetic load benchmark in staging."],
      },
      comparison: {
        baseline_monthly: 180.0,
        proposed_monthly: 140.0,
        absolute_difference: -40.0,
        relative_difference_pct: -22.2,
        currency: "USD",
        baseline_breakdown: { compute: 100, memory: 40, database: 30, storage: 10, network: 0, other: 0, total_monthly: 180 },
        proposed_breakdown: { compute: 80, memory: 30, database: 20, storage: 10, network: 0, other: 0, total_monthly: 140 },
        explanation: "The proposed scenario models USD 40.00/month lower cost (-22.2% reduction) under supplied assumptions.",
        methodology_note: "Delta convention: Delta = Proposed - Baseline.",
      },
    });

    render(
      <MemoryRouter initialEntries={["/lab?repoId=10&tab=experiments"]}>
        <Routes>
          <Route path="/lab" element={<ArchitectureLabPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Architectural Economics")).toBeDefined();
      expect(screen.getByText("1. Configure Scenario Assumptions")).toBeDefined();
    });

    const evalBtn = screen.getByRole("button", { name: /Evaluate Architectural Economics/i });
    expect(evalBtn).toBeDefined();

    fireEvent.click(evalBtn);

    await waitFor(() => {
      expect(screen.getByText("Baseline Architecture")).toBeDefined();
      expect(screen.getByText("Proposed Architecture")).toBeDefined();
      expect(screen.getByText("Modeled Difference (Δ)")).toBeDefined();
      expect(screen.getByText("Infrastructure Component Breakdown")).toBeDefined();
      expect(screen.getByText("Handoff to Decision Record (ADR)")).toBeDefined();
    });
  });
});

