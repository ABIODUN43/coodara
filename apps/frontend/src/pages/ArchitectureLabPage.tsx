import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useLocation, Link } from "react-router-dom";
import {
  AlertTriangle,
  Layers,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { useDashboardOverview } from "@/hooks/useDashboardOverview";
import { useProject } from "@/context/ProjectContext";
import { useArchitectureLab } from "@/hooks/useArchitectureLab";
import type { LabTabId } from "@/components/lab/LabNavigation";
import { LabNavigation } from "@/components/lab/LabNavigation";
import { LabContextBar } from "@/components/lab/LabContextBar";
import { LabOverviewTab } from "@/components/lab/LabOverviewTab";
import { HypothesisWorkspace } from "@/components/lab/HypothesisWorkspace";
import { HypothesisModal } from "@/components/lab/HypothesisModal";
import { InterventionModal } from "@/components/lab/InterventionModal";
import { ExperimentWorkspace } from "@/components/lab/ExperimentWorkspace";
import { ExperimentModal } from "@/components/lab/ExperimentModal";
import { WorkloadResourceSection } from "@/components/lab/WorkloadResourceSection";
import { EvidenceLedgerTab } from "@/components/lab/EvidenceLedgerTab";
import { DecisionWorkspace } from "@/components/lab/DecisionWorkspace";
import { DecisionModal } from "@/components/lab/DecisionModal";
import { ArchitectureContextDrawer } from "@/components/lab/ArchitectureContextDrawer";
import type {
  DecisionRecordCreateRequest,
  ExperimentCreateRequest,
  Hypothesis,
  HypothesisCreateRequest,
  InterventionCreateRequest,
} from "@/types/lab";

interface FindingHandoffState {
  findingId?: string;
  findingTitle?: string;
  findingCategory?: string;
  severity?: string;
  repoId?: number | string;
  repoName?: string;
  primaryComponent?: string;
  filePath?: string;
}

export function ArchitectureLabPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const { activeProject } = useProject();
  const { repos, repoData, allIssues } = useDashboardOverview();

  const safeRepos = repos || [];
  const safeRepoData = repoData || [];
  const safeAllIssues = allIssues || [];

  // Location state and query params (handoff from Findings or direct navigation)
  const locationState = location.state as FindingHandoffState | undefined;
  const queryFindingId = searchParams.get("findingId");
  const queryRepoId = searchParams.get("repoId");

  // Active Tab
  const validTabs: LabTabId[] = [
    "overview",
    "hypotheses",
    "experiments",
    "workloads",
    "evidence",
    "decisions",
  ];
  const urlTab = searchParams.get("tab") as LabTabId;
  const initialTab: LabTabId =
    validTabs.includes(urlTab) ? urlTab : queryFindingId ? "hypotheses" : "overview";
  const [activeTab, setActiveTab] = useState<LabTabId>(initialTab);

  // Selected Repository
  const initialRepoId =
    queryRepoId ||
    (locationState?.repoId ? String(locationState.repoId) : "") ||
    (safeRepos[0]?.id ? String(safeRepos[0].id) : "");
  const [selectedRepoId, setSelectedRepoId] = useState<string>(initialRepoId);

  // Synchronize repoId if repos load asynchronously and none was preselected
  useEffect(() => {
    if (!selectedRepoId && safeRepos.length > 0) {
      setSelectedRepoId(String(safeRepos[0].id));
    }
  }, [safeRepos, selectedRepoId]);

  // Connect the Architecture Lab hook
  const lab = useArchitectureLab(activeProject?.id || 1, selectedRepoId);

  // Modals state
  const [showHypothesisModal, setShowHypothesisModal] = useState(false);
  const [prefillFindingData, setPrefillFindingData] = useState<{
    findingId?: string;
    findingTitle?: string;
    findingCategory?: string;
    primaryComponent?: string;
    severity?: string;
  } | null>(null);

  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [targetHypothesisForIntervention, setTargetHypothesisForIntervention] = useState<Hypothesis | null>(null);

  const [showExperimentModal, setShowExperimentModal] = useState(false);
  const [targetHypothesisForExperiment, setTargetHypothesisForExperiment] = useState<Hypothesis | null>(null);

  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [preselectedDecisionHypothesisId, setPreselectedDecisionHypothesisId] = useState<number | null>(null);

  const [showContextDrawer, setShowContextDrawer] = useState(false);

  // Auto-open Hypothesis modal when handed off from a Finding
  useEffect(() => {
    if (queryFindingId || locationState?.findingId) {
      setPrefillFindingData({
        findingId: queryFindingId || locationState?.findingId,
        findingTitle: locationState?.findingTitle || `Finding ${queryFindingId}`,
        findingCategory: locationState?.findingCategory,
        primaryComponent: locationState?.primaryComponent,
        severity: locationState?.severity,
      });
      setShowHypothesisModal(true);
      setActiveTab("hypotheses");
    }
  }, [queryFindingId, locationState]);

  // Tab switcher
  const handleTabChange = (tab: LabTabId) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    });
  };

  // Repository switcher
  const handleSelectRepo = (newRepoId: string) => {
    setSelectedRepoId(newRepoId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("repoId", newRepoId);
      return next;
    });
  };

  // Current repo architecture data for context drawer and intervention targets
  const currentRepoArchitecture = useMemo(() => {
    const matched = safeRepoData.find((r) => String(r.repo.id) === selectedRepoId);
    return matched?.architecture;
  }, [safeRepoData, selectedRepoId]);

  const availableComponents = useMemo(() => {
    if (currentRepoArchitecture?.graph?.nodes) {
      return currentRepoArchitecture.graph.nodes.map((n) => ({
        id: n.id,
        name: n.name,
        type: n.type,
      }));
    }
    return [
      { id: "core-domain", name: "Core Domain Layer", type: "module" },
      { id: "api-gateway", name: "API Gateway / Routes", type: "service" },
      { id: "data-access", name: "Data Access / Repository", type: "database" },
    ];
  }, [currentRepoArchitecture]);

  const repoIssues = useMemo(() => {
    return safeAllIssues
      .filter((item: any) => !selectedRepoId || String(item.repoId) === selectedRepoId)
      .map((item: any) => {
        const iss = item.issue || item;
        return {
          id: String(iss.id),
          title: iss.title,
          severity: iss.severity,
          type: iss.type,
          primaryComponent: iss.primaryComponent || iss.component_ids?.[0],
        };
      });
  }, [safeAllIssues, selectedRepoId]);

  // Modal Handlers
  const handleOpenNewHypothesis = () => {
    setPrefillFindingData(null);
    setShowHypothesisModal(true);
  };

  const handleOpenAddIntervention = (hypothesisId: number) => {
    const hyp = lab.hypotheses.find((h) => h.id === hypothesisId);
    if (hyp) {
      setTargetHypothesisForIntervention(hyp);
      setShowInterventionModal(true);
    }
  };

  const handleOpenNewExperiment = (hypothesisId?: number) => {
    const targetId = hypothesisId || lab.selectedHypothesis?.id || lab.hypotheses[0]?.id;
    const hyp = lab.hypotheses.find((h) => h.id === targetId);
    if (hyp) {
      setTargetHypothesisForExperiment(hyp);
      setShowExperimentModal(true);
    } else {
      handleOpenNewHypothesis();
    }
  };

  const handleOpenRecordDecision = (hypothesisId?: number) => {
    setPreselectedDecisionHypothesisId(hypothesisId || lab.selectedHypothesis?.id || null);
    setShowDecisionModal(true);
  };

  const handleFormulateFromFinding = (finding: {
    id: string;
    title: string;
    severity: string;
    primaryComponent?: string;
  }) => {
    setPrefillFindingData({
      findingId: finding.id,
      findingTitle: finding.title,
      primaryComponent: finding.primaryComponent,
      severity: finding.severity,
    });
    setShowHypothesisModal(true);
    setActiveTab("hypotheses");
  };

  return (
    <div className="min-h-screen bg-[var(--cd-bg)] text-[var(--cd-ink)] flex flex-col">
      {/* Top Context Bar */}
      <LabContextBar
        repos={safeRepos}
        selectedRepoId={selectedRepoId}
        onSelectRepo={handleSelectRepo}
        loading={lab.loading}
        onRefresh={lab.refresh}
        onOpenNewHypothesis={handleOpenNewHypothesis}
        hypothesesCount={lab.hypotheses.length}
      />

      {/* Sub-header Navigation with Counts & Drawer Action */}
      <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] bg-[var(--cd-bg)] pr-4 sm:pr-6">
        <div className="flex-1">
          <LabNavigation
            activeTab={activeTab}
            onTabChange={handleTabChange}
            counts={{
              hypotheses: lab.hypotheses.length,
              experiments: lab.experiments.length,
              evidence: lab.evidence.length,
              decisions: lab.decisions.length,
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowContextDrawer(true)}
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-1 text-xs font-medium text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)] hover:border-[var(--cd-accent)] transition-colors shadow-2xs"
          title="Open Architecture Context Drawer"
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Architecture Context</span>
        </button>
      </div>

      {/* Linked Finding Banner if navigated from Findings */}
      {queryFindingId && (
        <div className="mx-4 sm:mx-6 mt-4 flex items-center justify-between rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-4 py-2 text-xs text-indigo-900 dark:text-indigo-200">
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="h-4 w-4 text-indigo-500 flex-shrink-0" />
            <span className="font-semibold">Investigating Finding:</span>
            <span className="truncate font-mono">{locationState?.findingTitle || queryFindingId}</span>
          </div>
          <Link
            to={`/findings?finding=${queryFindingId}`}
            className="text-[11px] underline text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 ml-2 flex-shrink-0"
          >
            View Finding in Context
          </Link>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {/* Error Notification */}
        {lab.error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-900/50 text-rose-300 flex items-start justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{lab.error}</span>
            </div>
            <button
              onClick={lab.refresh}
              className="text-xs font-semibold text-rose-400 hover:text-white underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty Repositories State */}
        {repos.length === 0 && !lab.loading ? (
          <div className="text-center py-20 bg-[var(--cd-surface)] border border-[var(--cd-border)] rounded-2xl p-8">
            <Layers className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-white">No Connected Repositories</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-6">
              Connect and analyze a repository to formulate hypotheses, evaluate structural interventions, and record Architectural Decision Records (ADRs).
            </p>
          </div>
        ) : (
          <>
            {/* Active Tab View */}
            {activeTab === "overview" && (
              <LabOverviewTab
                overview={lab.overview}
                hypotheses={lab.hypotheses}
                experiments={lab.experiments}
                workloadProfiles={lab.workloadProfiles}
                resourceProfiles={lab.resourceProfiles}
                evidence={lab.evidence}
                decisions={lab.decisions}
                onSelectHypothesis={(h) => {
                  lab.selectHypothesis(h);
                  handleTabChange("hypotheses");
                }}
                onNavigateTab={(tab) => handleTabChange(tab)}
                onOpenNewHypothesis={handleOpenNewHypothesis}
              />
            )}

            {activeTab === "hypotheses" && (
              <HypothesisWorkspace
                hypotheses={lab.hypotheses}
                selectedHypothesis={lab.selectedHypothesis}
                onSelectHypothesis={lab.selectHypothesis}
                onOpenNewHypothesis={handleOpenNewHypothesis}
                onOpenAddIntervention={handleOpenAddIntervention}
                onOpenNewExperiment={handleOpenNewExperiment}
                onOpenRecordDecision={handleOpenRecordDecision}
                onDeleteHypothesis={lab.removeHypothesis}
                experiments={lab.experiments}
                evidence={lab.evidence}
                decisions={lab.decisions}
              />
            )}

            {activeTab === "experiments" && (
              <ExperimentWorkspace
                experiments={lab.experiments}
                hypotheses={lab.hypotheses}
                selectedExperiment={lab.selectedExperiment}
                onSelectExperiment={lab.selectExperiment}
                onOpenNewExperiment={handleOpenNewExperiment}
                onExecuteExperiment={lab.executeExperiment}
                onCancelExperiment={lab.cancelExperiment}
                onRecordDecision={(exp) => handleOpenRecordDecision(exp.hypothesis_id)}
              />
            )}

            {activeTab === "workloads" && (
              <WorkloadResourceSection
                workloadProfiles={lab.workloadProfiles}
                resourceProfiles={lab.resourceProfiles}
                onAddWorkloadProfile={lab.addWorkloadProfile}
                onAddResourceProfile={lab.addResourceProfile}
              />
            )}

            {activeTab === "evidence" && (
              <EvidenceLedgerTab
                evidence={lab.evidence}
                hypotheses={lab.hypotheses}
                onAddEvidenceItem={lab.addEvidenceItem}
              />
            )}

            {activeTab === "decisions" && (
              <DecisionWorkspace
                decisions={lab.decisions}
                hypotheses={lab.hypotheses}
                experiments={lab.experiments}
                evidence={lab.evidence}
                onOpenRecordDecision={handleOpenRecordDecision}
                onNavigateToHypothesis={(hypId) => {
                  const hyp = lab.hypotheses.find((h) => h.id === hypId);
                  if (hyp) {
                    lab.selectHypothesis(hyp);
                    handleTabChange("hypotheses");
                  }
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Modals & Drawers */}
      <HypothesisModal
        isOpen={showHypothesisModal}
        onClose={() => {
          setShowHypothesisModal(false);
          setPrefillFindingData(null);
        }}
        onSubmit={async (payload: HypothesisCreateRequest) => {
          await lab.addHypothesis(payload);
          setShowHypothesisModal(false);
          setPrefillFindingData(null);
        }}
        prefillData={prefillFindingData}
      />

      {targetHypothesisForIntervention && (
        <InterventionModal
          isOpen={showInterventionModal}
          onClose={() => {
            setShowInterventionModal(false);
            setTargetHypothesisForIntervention(null);
          }}
          onSubmit={async (payload: InterventionCreateRequest) => {
            if (targetHypothesisForIntervention) {
              await lab.addIntervention(targetHypothesisForIntervention.id, payload);
              setShowInterventionModal(false);
              setTargetHypothesisForIntervention(null);
            }
          }}
          hypothesisTitle={targetHypothesisForIntervention.title}
          availableComponents={availableComponents}
        />
      )}

      {targetHypothesisForExperiment && (
        <ExperimentModal
          isOpen={showExperimentModal}
          onClose={() => {
            setShowExperimentModal(false);
            setTargetHypothesisForExperiment(null);
          }}
          onSubmit={async (payload: ExperimentCreateRequest) => {
            await lab.addExperiment(payload);
            setShowExperimentModal(false);
            setTargetHypothesisForExperiment(null);
          }}
          hypothesisId={targetHypothesisForExperiment.id}
          hypothesisTitle={targetHypothesisForExperiment.title}
        />
      )}

      <DecisionModal
        isOpen={showDecisionModal}
        onClose={() => {
          setShowDecisionModal(false);
          setPreselectedDecisionHypothesisId(null);
        }}
        onSubmit={async (payload: DecisionRecordCreateRequest) => {
          await lab.addDecisionRecord(payload);
          setShowDecisionModal(false);
          setPreselectedDecisionHypothesisId(null);
        }}
        hypotheses={lab.hypotheses}
        experiments={lab.experiments}
        evidence={lab.evidence}
        preselectedHypothesisId={preselectedDecisionHypothesisId}
      />

      <ArchitectureContextDrawer
        isOpen={showContextDrawer}
        onClose={() => setShowContextDrawer(false)}
        repoName={safeRepos.find((r) => String(r.id) === selectedRepoId)?.full_name || "Repository"}
        components={availableComponents}
        issues={repoIssues}
        healthScore={currentRepoArchitecture?.summary?.health_score}
        architecturePattern={currentRepoArchitecture?.summary ? "Modular Monolith" : null}
        onFormulateHypothesisFromFinding={handleFormulateFromFinding}
      />
    </div>
  );
}
