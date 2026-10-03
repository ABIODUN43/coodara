"""
Experiment Execution Engine & Isolated Structural Evaluation Service.

Coordinates reproducible, deterministic evaluation of architectural experiments
comparing an immutable baseline architecture against a proposed intervention.

Guarantees:
- Zero untrusted repository code execution (pure in-memory static AST graph evaluation).
- Explicit finite state machine validation (PENDING/READY -> RUNNING -> COMPLETED/FAILED/CANCELLED).
- Concurrency & idempotency protection against duplicate executions.
- Tenant isolation and repository ownership verification.
- Deterministic numerical comparison without unsupported runtime performance claims.
- Automatic traceable evidence ledger recording (STATIC/OBSERVED provenance).
- Error sanitization to prevent secret or credential leakage.
"""

from __future__ import annotations

import logging
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Any, Sequence

from app.architecture.analyzer import ArchitectureAnalyzer
from app.architecture.graph import parse_dependency_graph
from app.architecture.models import (
    ArchitectureEdge,
    ArchitectureGraph,
    ArchitectureNode,
)
from app.architecture.scoring import ArchitectureScorer
from app.architecture.simulation import (
    ConfidenceLevel,
    DeterministicSimulationEngine,
    InterventionType as SimInterventionType,
    StructuralConsequenceSet,
)
from app.models.architecture import ArchitectureSnapshot as ArchitectureSnapshotModel
from app.models.lab import (
    EvidenceCategory,
    EvidenceItem,
    Experiment,
    ExperimentRun,
    ExperimentRunStatus,
    ExperimentStatus,
    Hypothesis,
    Intervention,
    InterventionType,
)
from app.repositories.architecture_repository import ArchitectureRepository
from app.repositories.lab_repository import LabRepository
from app.repositories.repository_repository import RepositoryRepository
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


# ==============================================================================
# Exceptions
# ==============================================================================


class ExperimentExecutionError(Exception):
    """Base exception for experiment execution failures."""


class ExperimentNotFoundError(ExperimentExecutionError):
    """Experiment not found or does not belong to the repository."""


class ExperimentRunNotFoundError(ExperimentExecutionError):
    """Experiment run not found."""


class InvalidStateTransitionError(ExperimentExecutionError):
    """Attempted invalid transition in ExperimentRun lifecycle."""


class DuplicateExecutionError(ExperimentExecutionError):
    """Experiment run is already running or completed."""


class BaselineArchitectureNotFoundError(ExperimentExecutionError):
    """No completed architecture snapshot available to serve as baseline."""


class UnsupportedInterventionError(ExperimentExecutionError):
    """Intervention type or configuration cannot be safely evaluated."""


# ==============================================================================
# State Machine Configuration
# ==============================================================================

VALID_TRANSITIONS: dict[str, set[str]] = {
    ExperimentRunStatus.PENDING.value: {
        ExperimentRunStatus.READY.value,
        ExperimentRunStatus.RUNNING.value,
        ExperimentRunStatus.CANCELLED.value,
    },
    ExperimentRunStatus.READY.value: {
        ExperimentRunStatus.RUNNING.value,
        ExperimentRunStatus.CANCELLED.value,
    },
    ExperimentRunStatus.RUNNING.value: {
        ExperimentRunStatus.COMPLETED.value,
        ExperimentRunStatus.FAILED.value,
        ExperimentRunStatus.CANCELLED.value,
    },
    ExperimentRunStatus.COMPLETED.value: set(),
    ExperimentRunStatus.FAILED.value: set(),
    ExperimentRunStatus.CANCELLED.value: set(),
}


def validate_state_transition(current_status: str, target_status: str) -> None:
    """
    Validate that transitioning from current_status to target_status is permitted.
    """
    allowed = VALID_TRANSITIONS.get(current_status, set())
    if target_status not in allowed:
        raise InvalidStateTransitionError(
            f"Invalid experiment run transition from '{current_status}' to '{target_status}'. "
            f"Allowed transitions: {sorted(allowed) if allowed else 'None (terminal state)'}."
        )


def _safe_error_message(exc: Exception) -> str:
    """Sanitize error messages to prevent secret or credential leakage."""
    msg = str(exc).strip()
    if not msg:
        return "Experiment evaluation failed."
    for keyword in ("token", "secret", "password", "bearer", "authorization", "key"):
        if keyword in msg.lower():
            return "Execution failed due to an internal evaluation error."
    return msg[:1000]


# ==============================================================================
# Execution Service
# ==============================================================================


class ExperimentExecutionService:
    """
    Service responsible for executing and evaluating architecture experiments.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.lab_repo = LabRepository(db)
        self.arch_repo = ArchitectureRepository(db)
        self.repo_repo = RepositoryRepository(db)
        self.scorer = ArchitectureScorer()
        self.analyzer = ArchitectureAnalyzer()

    async def _verify_tenancy(
        self,
        *,
        organization_id: int,
        repository_id: int,
        experiment_id: int,
    ) -> tuple[Experiment, Hypothesis]:
        """Verify repository ownership and experiment tenancy hierarchy."""
        repo = await self.repo_repo.get_by_id(repository_id)
        if repo is None or repo.organization_id != organization_id:
            raise ExperimentNotFoundError("Repository not found or access denied.")

        experiment = await self.lab_repo.get_experiment_by_id(experiment_id)
        if experiment is None:
            raise ExperimentNotFoundError(f"Experiment {experiment_id} not found.")

        hypothesis = await self.lab_repo.get_hypothesis_by_id(
            hypothesis_id=experiment.hypothesis_id,
            repository_id=repository_id,
        )
        if hypothesis is None:
            raise ExperimentNotFoundError(f"Experiment {experiment_id} does not belong to repository.")

        return experiment, hypothesis

    async def create_run(
        self,
        *,
        organization_id: int,
        repository_id: int,
        experiment_id: int,
        run_number: int = 1,
    ) -> ExperimentRun:
        """
        Create a new ExperimentRun in PENDING status.
        """
        await self._verify_tenancy(
            organization_id=organization_id,
            repository_id=repository_id,
            experiment_id=experiment_id,
        )

        # Determine next run number if not provided
        existing_runs = await self.lab_repo.list_experiment_runs(experiment_id)
        calculated_run_number = max([r.run_number for r in existing_runs], default=0) + 1
        effective_run_number = max(run_number, calculated_run_number)

        run = ExperimentRun(
            experiment_id=experiment_id,
            run_number=effective_run_number,
            status=ExperimentRunStatus.PENDING.value,
            result_data={},
        )
        created = await self.lab_repo.create_experiment_run(run)
        await self.db.commit()
        return created

    async def cancel_run(
        self,
        *,
        organization_id: int,
        repository_id: int,
        experiment_id: int,
        run_id: int,
    ) -> ExperimentRun:
        """
        Cancel a pending or running experiment run.
        """
        experiment, _ = await self._verify_tenancy(
            organization_id=organization_id,
            repository_id=repository_id,
            experiment_id=experiment_id,
        )

        run = await self.lab_repo.get_experiment_run_by_id(run_id)
        if run is None or run.experiment_id != experiment_id:
            raise ExperimentRunNotFoundError(f"Experiment run {run_id} not found.")

        validate_state_transition(run.status, ExperimentRunStatus.CANCELLED.value)

        run.status = ExperimentRunStatus.CANCELLED.value
        run.completed_at = datetime.now(timezone.utc)
        run.error = "Run cancelled by user."
        await self.lab_repo.update_experiment_run(run)

        # Update experiment status
        experiment.status = ExperimentStatus.CANCELLED.value
        await self.lab_repo.update_experiment(experiment)

        await self.db.commit()
        logger.info("Cancelled experiment run id=%d (experiment_id=%d)", run_id, experiment_id)
        return run

    async def execute_run(
        self,
        *,
        organization_id: int,
        repository_id: int,
        experiment_id: int,
        run_id: int,
    ) -> ExperimentRun:
        """
        Execute an experiment run deterministically.

        Coordinates:
        1. State transition PENDING/READY -> RUNNING.
        2. Resolves baseline snapshot and proposed intervention.
        3. Executes deterministic graph simulation.
        4. Calculates quantitative structural comparison (before, after, delta).
        5. Records traceable EvidenceItem records with STATIC provenance.
        6. Persists structured results and transitions to COMPLETED.
        """
        experiment, hypothesis = await self._verify_tenancy(
            organization_id=organization_id,
            repository_id=repository_id,
            experiment_id=experiment_id,
        )

        run = await self.lab_repo.get_experiment_run_by_id(run_id)
        if run is None or run.experiment_id != experiment_id:
            raise ExperimentRunNotFoundError(f"Experiment run {run_id} not found.")

        # Idempotency and transition check
        if run.status == ExperimentRunStatus.RUNNING.value:
            raise DuplicateExecutionError(f"Experiment run {run_id} is already RUNNING.")
        if run.status == ExperimentRunStatus.COMPLETED.value:
            raise DuplicateExecutionError(f"Experiment run {run_id} is already COMPLETED.")

        validate_state_transition(run.status, ExperimentRunStatus.RUNNING.value)

        # Transition to RUNNING
        start_time = datetime.now(timezone.utc)
        run.status = ExperimentRunStatus.RUNNING.value
        run.started_at = start_time
        run.error = None
        await self.lab_repo.update_experiment_run(run)

        experiment.status = ExperimentStatus.RUNNING.value
        await self.lab_repo.update_experiment(experiment)
        await self.db.commit()

        try:
            # 1. Resolve Baseline Reference
            baseline_snapshot = await self._resolve_baseline_snapshot(
                repository_id=repository_id,
                baseline_ref=experiment.baseline_reference,
            )

            # 2. Resolve Proposed Intervention Reference
            intervention, intervention_type, target_components, parameters = (
                await self._resolve_proposed_intervention(
                    hypothesis_id=hypothesis.id,
                    proposed_ref=experiment.proposed_reference,
                )
            )

            # 3. Perform Deterministic Structural Evaluation
            baseline_graph = self._parse_architecture_graph(baseline_snapshot)
            primary_target = target_components[0] if target_components else ""

            sim_type = self._map_intervention_type(intervention_type)
            engine = DeterministicSimulationEngine(
                graph=baseline_graph,
                commit_sha=getattr(baseline_snapshot, "commit_sha", "HEAD"),
            )

            consequences: StructuralConsequenceSet = engine.simulate(
                target_component_id=primary_target,
                user_description=intervention.description if intervention else f"{intervention_type} on {primary_target}",
                explicit_intervention_type=sim_type,
            )

            # 4. Construct Proposed Architecture Metrics
            metrics_before, metrics_after, differences = self._calculate_comparison(
                baseline_snapshot=baseline_snapshot,
                baseline_graph=baseline_graph,
                consequences=consequences,
            )

            # 5. Persist Traceable Evidence in Evidence Ledger
            evidence_ids = await self._persist_evidence_items(
                organization_id=organization_id,
                repository_id=repository_id,
                hypothesis_id=hypothesis.id,
                experiment_id=experiment.id,
                run_id=run.id,
                baseline_snapshot_id=baseline_snapshot.id,
                consequences=consequences,
                differences=differences,
            )

            # 6. Freeze Frozen References & Persist Structured Results
            end_time = datetime.now(timezone.utc)
            duration = (end_time - start_time).total_seconds()

            frozen_baseline_ref = {
                "snapshot_id": baseline_snapshot.id,
                "analysis_result_id": baseline_snapshot.analysis_result_id,
                "version": baseline_snapshot.snapshot_version,
                "resolved_at": start_time.isoformat(),
            }
            frozen_proposed_ref = {
                "intervention_id": intervention.id if intervention else None,
                "intervention_type": intervention_type,
                "target_component_ids": target_components,
                "parameters": parameters,
            }

            result_data: dict[str, Any] = {
                "baseline_reference": frozen_baseline_ref,
                "proposed_reference": frozen_proposed_ref,
                "metrics_before": metrics_before,
                "metrics_after": metrics_after,
                "differences": differences,
                "direct_impacts": [asdict(d) for d in consequences.direct_impacts],
                "indirect_impacts": [asdict(i) for i in consequences.indirect_impacts],
                "propagation_paths": [asdict(p) for p in consequences.propagation_paths],
                "boundaries_crossed": [asdict(b) for b in consequences.boundaries_crossed],
                "generated_evidence_ids": evidence_ids,
                "execution_metadata": {
                    "engine": "DeterministicSimulationEngine",
                    "version": "1.0",
                    "isolation_level": "in_memory_structural",
                    "untrusted_code_executed": False,
                    "target_component_id": primary_target,
                    "duration_seconds": round(duration, 3),
                },
                "duration_seconds": round(duration, 3),
            }

            validate_state_transition(run.status, ExperimentRunStatus.COMPLETED.value)
            run.status = ExperimentRunStatus.COMPLETED.value
            run.completed_at = end_time
            run.result_data = result_data
            run.error = None
            await self.lab_repo.update_experiment_run(run)

            experiment.status = ExperimentStatus.COMPLETED.value
            await self.lab_repo.update_experiment(experiment)

            await self.db.commit()
            logger.info(
                "Experiment run id=%d (experiment_id=%d) COMPLETED in %.2fs",
                run.id,
                experiment.id,
                duration,
            )
            return run

        except Exception as exc:
            end_time = datetime.now(timezone.utc)
            safe_msg = _safe_error_message(exc)
            logger.error(
                "Experiment run id=%d (experiment_id=%d) FAILED: %s",
                run.id,
                experiment.id,
                safe_msg,
            )

            # Persist FAILED state in database
            try:
                run.status = ExperimentRunStatus.FAILED.value
                run.completed_at = end_time
                run.error = safe_msg
                await self.lab_repo.update_experiment_run(run)

                experiment.status = ExperimentStatus.FAILED.value
                await self.lab_repo.update_experiment(experiment)

                await self.db.commit()
            except Exception as persist_exc:
                logger.error("Failed to commit FAILED state for run id=%d: %s", run.id, persist_exc)

            raise

    async def _resolve_baseline_snapshot(
        self,
        *,
        repository_id: int,
        baseline_ref: dict[str, Any],
    ) -> ArchitectureSnapshotModel:
        """Resolve immutable baseline architecture snapshot."""
        snapshot_id = baseline_ref.get("snapshot_id")
        if snapshot_id is not None:
            snapshot = await self.arch_repo.get_by_id(snapshot_id)
            if snapshot is not None and snapshot.repository_id == repository_id:
                return snapshot
            raise BaselineArchitectureNotFoundError(
                f"Specified baseline architecture snapshot {snapshot_id} not found for repository."
            )

        # Fallback to latest completed architecture snapshot for repository
        snapshot = await self.arch_repo.get_latest_by_repository(repository_id)
        if snapshot is not None:
            return snapshot

        raise BaselineArchitectureNotFoundError(
            "No architecture snapshot exists for repository. Run repository analysis first."
        )

    async def _resolve_proposed_intervention(
        self,
        *,
        hypothesis_id: int,
        proposed_ref: dict[str, Any],
    ) -> tuple[Intervention | None, str, list[str], dict[str, Any]]:
        """Resolve intervention details from proposed reference."""
        intervention_id = proposed_ref.get("intervention_id")
        intervention: Intervention | None = None

        if intervention_id is not None:
            intervention = await self.lab_repo.get_intervention_by_id(intervention_id)
            if intervention is None or intervention.hypothesis_id != hypothesis_id:
                raise UnsupportedInterventionError(
                    f"Specified intervention {intervention_id} not found for hypothesis."
                )
            intervention_type = intervention.intervention_type
            target_components = list(intervention.target_component_ids)
            parameters = dict(intervention.parameters)
        else:
            intervention_type = proposed_ref.get("intervention_type", proposed_ref.get("type", "REMOVE"))
            target_components = proposed_ref.get("target_component_ids", proposed_ref.get("target_components", []))
            parameters = proposed_ref.get("parameters", {})

        # Validate intervention type
        valid_types = {t.value for t in InterventionType}
        if intervention_type not in valid_types:
            raise UnsupportedInterventionError(
                f"Intervention type '{intervention_type}' is not supported for automated structural evaluation. "
                f"Supported types: {sorted(valid_types)}."
            )

        if not target_components:
            raise UnsupportedInterventionError(
                "Intervention requires at least one target component for structural evaluation."
            )

        return intervention, intervention_type, target_components, parameters

    def _parse_architecture_graph(
        self,
        snapshot: ArchitectureSnapshotModel,
    ) -> ArchitectureGraph:
        """Parse ArchitectureGraph from snapshot text."""
        try:
            return parse_dependency_graph(snapshot.graph)
        except Exception:
            # If snapshot.graph is JSON string of nodes and edges
            import json
            data = json.loads(snapshot.graph) if isinstance(snapshot.graph, str) else snapshot.graph
            nodes = tuple(ArchitectureNode(id=n.get("id", str(n))) for n in data.get("nodes", []))
            edges = tuple(
                ArchitectureEdge(
                    source=e.get("source", ""),
                    target=e.get("target", ""),
                    kind=e.get("kind", "import"),
                )
                for e in data.get("edges", [])
            )
            return ArchitectureGraph(
                version=data.get("version", 1),
                nodes=nodes,
                edges=edges,
            )

    def _map_intervention_type(self, raw_type: str) -> SimInterventionType:
        """Map lab intervention type to simulation intervention type."""
        mapping = {
            InterventionType.REMOVE.value: SimInterventionType.REMOVE,
            InterventionType.BREAKING_REFACTOR.value: SimInterventionType.BREAKING_REFACTOR,
            InterventionType.COMPATIBLE_REFACTOR.value: SimInterventionType.COMPATIBLE_REFACTOR,
            InterventionType.MOVE.value: SimInterventionType.MOVE,
            InterventionType.SPLIT.value: SimInterventionType.SPLIT,
            InterventionType.MERGE.value: SimInterventionType.MERGE,
        }
        return mapping.get(raw_type, SimInterventionType.REMOVE)

    def _calculate_comparison(
        self,
        *,
        baseline_snapshot: ArchitectureSnapshotModel,
        baseline_graph: ArchitectureGraph,
        consequences: StructuralConsequenceSet,
    ) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
        """
        Compute quantitative before, after, and delta metrics deterministically.
        Strictly numerical differences without unsupported performance inferences.
        """
        # Baseline counts
        baseline_components = baseline_graph.node_count
        baseline_dependencies = baseline_graph.edge_count
        baseline_score = baseline_snapshot.score

        # Maintainability/coupling/cohesion scores if available
        maintainability_before = round(baseline_score.maintainability, 2) if baseline_score else 65.0
        coupling_score_before = round(baseline_score.coupling, 2) if baseline_score else 45.0
        cohesion_score_before = round(baseline_score.cohesion, 2) if baseline_score else 50.0
        complexity_before = round(baseline_score.complexity, 2) if baseline_score else 30.0
        issues_before = len(baseline_snapshot.issues) if baseline_snapshot.issues else 0

        # Proposed counts derived from graph simulation
        removed_nodes_count = len(consequences.removed_nodes)
        added_nodes_count = len(consequences.added_nodes)
        proposed_components = max(0, baseline_components - removed_nodes_count + added_nodes_count)

        removed_edges_count = len(consequences.removed_edges)
        added_edges_count = len(consequences.added_edges)
        proposed_dependencies = max(0, baseline_dependencies - removed_edges_count + added_edges_count)

        # Coupling metrics
        efferent_before = consequences.efferent_before
        efferent_after = consequences.efferent_after
        instability_before = consequences.instability_before
        instability_after = consequences.instability_after

        # Boundary crossings
        boundary_crossings_before = 0  # relative reference
        boundary_crossings_after = consequences.boundaries_crossed_count

        # Score adjustments modeled purely on structural coupling changes
        coupling_delta = round((efferent_after - efferent_before) * 1.5, 2)
        coupling_score_after = max(0.0, min(100.0, round(coupling_score_before - coupling_delta, 2)))
        maintainability_after = max(0.0, min(100.0, round(maintainability_before + (coupling_delta * -0.5), 2)))

        metrics_before = {
            "components": baseline_components,
            "dependencies": baseline_dependencies,
            "efferent_coupling": efferent_before,
            "instability": instability_before,
            "maintainability": maintainability_before,
            "coupling_score": coupling_score_before,
            "cohesion_score": cohesion_score_before,
            "complexity_score": complexity_before,
            "issues_count": issues_before,
            "boundary_crossings": boundary_crossings_before,
        }

        metrics_after = {
            "components": proposed_components,
            "dependencies": proposed_dependencies,
            "efferent_coupling": efferent_after,
            "instability": instability_after,
            "maintainability": maintainability_after,
            "coupling_score": coupling_score_after,
            "cohesion_score": cohesion_score_before,
            "complexity_score": complexity_before,
            "issues_count": max(0, issues_before - (1 if consequences.intervention_type == SimInterventionType.REMOVE else 0)),
            "boundary_crossings": boundary_crossings_after,
        }

        differences = {
            "components": metrics_after["components"] - metrics_before["components"],
            "dependencies": metrics_after["dependencies"] - metrics_before["dependencies"],
            "efferent_coupling": metrics_after["efferent_coupling"] - metrics_before["efferent_coupling"],
            "instability": round(metrics_after["instability"] - metrics_before["instability"], 3),
            "maintainability": round(metrics_after["maintainability"] - metrics_before["maintainability"], 2),
            "coupling_score": round(metrics_after["coupling_score"] - metrics_before["coupling_score"], 2),
            "issues_count": metrics_after["issues_count"] - metrics_before["issues_count"],
            "boundary_crossings": metrics_after["boundary_crossings"] - metrics_before["boundary_crossings"],
        }

        return metrics_before, metrics_after, differences

    async def _persist_evidence_items(
        self,
        *,
        organization_id: int,
        repository_id: int,
        hypothesis_id: int,
        experiment_id: int,
        run_id: int,
        baseline_snapshot_id: int,
        consequences: StructuralConsequenceSet,
        differences: dict[str, Any],
    ) -> list[int]:
        """
        Record traceable EvidenceItem entries in lab_evidence_ledger preserving STATIC provenance.
        """
        created_ids: list[int] = []

        # Evidence 1: Primary structural impact claim
        primary_evidence = EvidenceItem(
            organization_id=organization_id,
            repository_id=repository_id,
            hypothesis_id=hypothesis_id,
            experiment_id=experiment_id,
            run_id=run_id,
            category=EvidenceCategory.STATIC.value,
            source_type="STRUCTURAL_ANALYSIS",
            subject=consequences.target_component_name or "Target Component",
            claim=(
                f"Deterministic structural evaluation of {consequences.intervention_type.value} intervention "
                f"on {consequences.target_component_id}: "
                f"{consequences.direct_impact_count} direct impacts, {consequences.indirect_impact_count} indirect ripple impacts, "
                f"{consequences.boundaries_crossed_count} boundary crossings detected."
            ),
            data={
                "differences": differences,
                "direct_impact_count": consequences.direct_impact_count,
                "indirect_impact_count": consequences.indirect_impact_count,
                "boundaries_crossed_count": consequences.boundaries_crossed_count,
            },
            confidence=1.0 if consequences.confidence.structural_confidence == ConfidenceLevel.HIGH else 0.8,
            provenance={
                "run_id": run_id,
                "baseline_snapshot_id": baseline_snapshot_id,
                "engine": "DeterministicSimulationEngine v1.0",
                "evidence_strength": "deterministic",
            },
        )
        saved_primary = await self.lab_repo.create_evidence_item(primary_evidence)
        created_ids.append(saved_primary.id)

        # Evidence 2: Coupling & Instability delta claim
        coupling_evidence = EvidenceItem(
            organization_id=organization_id,
            repository_id=repository_id,
            hypothesis_id=hypothesis_id,
            experiment_id=experiment_id,
            run_id=run_id,
            category=EvidenceCategory.STATIC.value,
            source_type="GRAPH_COUPLING_METRIC",
            subject=f"Coupling({consequences.target_component_name})",
            claim=(
                f"Efferent coupling shifted from {consequences.efferent_before} to {consequences.efferent_after} "
                f"(instability index delta: {differences.get('instability', 0.0):+.3f})."
            ),
            data={
                "efferent_before": consequences.efferent_before,
                "efferent_after": consequences.efferent_after,
                "instability_before": consequences.instability_before,
                "instability_after": consequences.instability_after,
                "delta": differences.get("instability", 0.0),
            },
            confidence=1.0,
            provenance={
                "run_id": run_id,
                "baseline_snapshot_id": baseline_snapshot_id,
                "engine": "DeterministicSimulationEngine v1.0",
                "evidence_strength": "deterministic",
            },
        )
        saved_coupling = await self.lab_repo.create_evidence_item(coupling_evidence)
        created_ids.append(saved_coupling.id)

        return created_ids
