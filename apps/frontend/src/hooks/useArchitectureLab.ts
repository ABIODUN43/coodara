import { useCallback, useEffect, useState } from "react";
import {
  createDecisionRecord,
  createEvidenceItem,
  createExperiment,
  createHypothesis,
  createIntervention,
  createResourceProfile,
  createWorkloadProfile,
  deleteHypothesis,
  getLabOverview,
  listDecisionRecords,
  listEvidence,
  listExperiments,
  listHypotheses,
  listResourceProfiles,
  listWorkloadProfiles,
  updateHypothesis,
} from "@/api/lab";
import type {
  DecisionRecord,
  DecisionRecordCreateRequest,
  EvidenceItem,
  EvidenceItemCreateRequest,
  Experiment,
  ExperimentCreateRequest,
  Hypothesis,
  HypothesisCreateRequest,
  HypothesisUpdateRequest,
  Intervention,
  InterventionCreateRequest,
  LabOverviewResponse,
  ResourceProfile,
  ResourceProfileCreateRequest,
  WorkloadProfile,
  WorkloadProfileCreateRequest,
} from "@/types/lab";

export interface UseArchitectureLabReturn {
  loading: boolean;
  error: string | null;
  overview: LabOverviewResponse | null;
  hypotheses: Hypothesis[];
  experiments: Experiment[];
  workloadProfiles: WorkloadProfile[];
  resourceProfiles: ResourceProfile[];
  evidence: EvidenceItem[];
  decisions: DecisionRecord[];
  selectedHypothesis: Hypothesis | null;
  selectedExperiment: Experiment | null;
  selectHypothesis: (h: Hypothesis | null) => void;
  selectExperiment: (e: Experiment | null) => void;
  refresh: () => Promise<void>;
  addHypothesis: (payload: HypothesisCreateRequest) => Promise<Hypothesis>;
  modifyHypothesis: (hypothesisId: number, payload: HypothesisUpdateRequest) => Promise<Hypothesis>;
  removeHypothesis: (hypothesisId: number) => Promise<void>;
  addIntervention: (hypothesisId: number, payload: InterventionCreateRequest) => Promise<Intervention>;
  addExperiment: (payload: ExperimentCreateRequest) => Promise<Experiment>;
  addWorkloadProfile: (payload: WorkloadProfileCreateRequest) => Promise<WorkloadProfile>;
  addResourceProfile: (payload: ResourceProfileCreateRequest) => Promise<ResourceProfile>;
  addEvidenceItem: (payload: EvidenceItemCreateRequest) => Promise<EvidenceItem>;
  addDecisionRecord: (payload: DecisionRecordCreateRequest) => Promise<DecisionRecord>;
}

export function useArchitectureLab(
  orgId: string | number | undefined,
  repoId: string | number | undefined
): UseArchitectureLabReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<LabOverviewResponse | null>(null);
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [workloadProfiles, setWorkloadProfiles] = useState<WorkloadProfile[]>([]);
  const [resourceProfiles, setResourceProfiles] = useState<ResourceProfile[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);

  const [selectedHypothesis, setSelectedHypothesis] = useState<Hypothesis | null>(null);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);

  const refresh = useCallback(async () => {
    if (!orgId || !repoId) {
      setOverview(null);
      setHypotheses([]);
      setExperiments([]);
      setWorkloadProfiles([]);
      setResourceProfiles([]);
      setEvidence([]);
      setDecisions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Load consolidated overview first
      const ov = await getLabOverview(orgId, repoId);
      setOverview(ov);

      // 2. Fetch full lists concurrently
      const [allHyp, allExp, allWp, allRp, allEv, allDec] = await Promise.all([
        listHypotheses(orgId, repoId).catch(() => ov.hypotheses || []),
        listExperiments(orgId, repoId).catch(() => []),
        listWorkloadProfiles(orgId, repoId).catch(() => ov.workload_profiles || []),
        listResourceProfiles(orgId, repoId).catch(() => ov.resource_profiles || []),
        listEvidence(orgId, repoId).catch(() => ov.recent_evidence || []),
        listDecisionRecords(orgId, repoId).catch(() => ov.recent_decisions || []),
      ]);

      setHypotheses(allHyp);
      setExperiments(allExp);
      setWorkloadProfiles(allWp);
      setResourceProfiles(allRp);
      setEvidence(allEv);
      setDecisions(allDec);

      // Keep selected items in sync if they still exist
      setSelectedHypothesis((prev) =>
        prev ? allHyp.find((h) => h.id === prev.id) || null : null
      );
      setSelectedExperiment((prev) =>
        prev ? allExp.find((e) => e.id === prev.id) || null : null
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error)?.message ||
        "Failed to load Architecture Lab data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [orgId, repoId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addHypothesis = useCallback(
    async (payload: HypothesisCreateRequest): Promise<Hypothesis> => {
      if (!orgId || !repoId) throw new Error("Missing organization or repository ID");
      const created = await createHypothesis(orgId, repoId, payload);
      setHypotheses((prev) => [created, ...prev]);
      if (overview) {
        setOverview({
          ...overview,
          hypotheses_count: overview.hypotheses_count + 1,
          hypotheses: [created, ...overview.hypotheses],
        });
      }
      setSelectedHypothesis(created);
      return created;
    },
    [orgId, repoId, overview]
  );

  const modifyHypothesis = useCallback(
    async (hypothesisId: number, payload: HypothesisUpdateRequest): Promise<Hypothesis> => {
      if (!orgId || !repoId) throw new Error("Missing organization or repository ID");
      const updated = await updateHypothesis(orgId, repoId, hypothesisId, payload);
      setHypotheses((prev) => prev.map((h) => (h.id === hypothesisId ? updated : h)));
      if (selectedHypothesis?.id === hypothesisId) {
        setSelectedHypothesis(updated);
      }
      return updated;
    },
    [orgId, repoId, selectedHypothesis]
  );

  const removeHypothesis = useCallback(
    async (hypothesisId: number): Promise<void> => {
      if (!orgId || !repoId) throw new Error("Missing organization or repository ID");
      await deleteHypothesis(orgId, repoId, hypothesisId);
      setHypotheses((prev) => prev.filter((h) => h.id !== hypothesisId));
      if (selectedHypothesis?.id === hypothesisId) {
        setSelectedHypothesis(null);
      }
      if (overview) {
        setOverview({
          ...overview,
          hypotheses_count: Math.max(0, overview.hypotheses_count - 1),
          hypotheses: overview.hypotheses.filter((h) => h.id !== hypothesisId),
        });
      }
    },
    [orgId, repoId, selectedHypothesis, overview]
  );

  const addIntervention = useCallback(
    async (hypothesisId: number, payload: InterventionCreateRequest): Promise<Intervention> => {
      if (!orgId || !repoId) throw new Error("Missing organization or repository ID");
      const created = await createIntervention(orgId, repoId, hypothesisId, payload);
      setHypotheses((prev) =>
        prev.map((h) =>
          h.id === hypothesisId
            ? { ...h, interventions: [...(h.interventions || []), created] }
            : h
        )
      );
      if (selectedHypothesis?.id === hypothesisId) {
        setSelectedHypothesis((prev) =>
          prev
            ? { ...prev, interventions: [...(prev.interventions || []), created] }
            : null
        );
      }
      return created;
    },
    [orgId, repoId, selectedHypothesis]
  );

  const addExperiment = useCallback(
    async (payload: ExperimentCreateRequest): Promise<Experiment> => {
      if (!orgId || !repoId) throw new Error("Missing organization or repository ID");
      const created = await createExperiment(orgId, repoId, payload);
      setExperiments((prev) => [created, ...prev]);
      if (overview) {
        setOverview({
          ...overview,
          experiments_count: overview.experiments_count + 1,
        });
      }
      setSelectedExperiment(created);
      return created;
    },
    [orgId, repoId, overview]
  );

  const addWorkloadProfile = useCallback(
    async (payload: WorkloadProfileCreateRequest): Promise<WorkloadProfile> => {
      if (!orgId || !repoId) throw new Error("Missing organization or repository ID");
      const created = await createWorkloadProfile(orgId, repoId, payload);
      setWorkloadProfiles((prev) => [created, ...prev]);
      if (overview) {
        setOverview({
          ...overview,
          workload_profiles: [created, ...overview.workload_profiles],
        });
      }
      return created;
    },
    [orgId, repoId, overview]
  );

  const addResourceProfile = useCallback(
    async (payload: ResourceProfileCreateRequest): Promise<ResourceProfile> => {
      if (!orgId || !repoId) throw new Error("Missing organization or repository ID");
      const created = await createResourceProfile(orgId, repoId, payload);
      setResourceProfiles((prev) => [created, ...prev]);
      if (overview) {
        setOverview({
          ...overview,
          resource_profiles: [created, ...overview.resource_profiles],
        });
      }
      return created;
    },
    [orgId, repoId, overview]
  );

  const addEvidenceItem = useCallback(
    async (payload: EvidenceItemCreateRequest): Promise<EvidenceItem> => {
      if (!orgId || !repoId) throw new Error("Missing organization or repository ID");
      const created = await createEvidenceItem(orgId, repoId, payload);
      setEvidence((prev) => [created, ...prev]);
      if (overview) {
        setOverview({
          ...overview,
          evidence_count: overview.evidence_count + 1,
          recent_evidence: [created, ...overview.recent_evidence],
        });
      }
      return created;
    },
    [orgId, repoId, overview]
  );

  const addDecisionRecord = useCallback(
    async (payload: DecisionRecordCreateRequest): Promise<DecisionRecord> => {
      if (!orgId || !repoId) throw new Error("Missing organization or repository ID");
      const created = await createDecisionRecord(orgId, repoId, payload);
      setDecisions((prev) => [created, ...prev]);
      if (overview) {
        setOverview({
          ...overview,
          decisions_count: overview.decisions_count + 1,
          recent_decisions: [created, ...overview.recent_decisions],
        });
      }
      return created;
    },
    [orgId, repoId, overview]
  );

  return {
    loading,
    error,
    overview,
    hypotheses,
    experiments,
    workloadProfiles,
    resourceProfiles,
    evidence,
    decisions,
    selectedHypothesis,
    selectedExperiment,
    selectHypothesis: setSelectedHypothesis,
    selectExperiment: setSelectedExperiment,
    refresh,
    addHypothesis,
    modifyHypothesis,
    removeHypothesis,
    addIntervention,
    addExperiment,
    addWorkloadProfile,
    addResourceProfile,
    addEvidenceItem,
    addDecisionRecord,
  };
}
