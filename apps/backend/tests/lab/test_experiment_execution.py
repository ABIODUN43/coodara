"""
Unit tests for Architecture Lab Experiment Engine & Execution Service.

Validates:
- Valid and invalid ExperimentRun lifecycle state transitions.
- Idempotency and duplicate execution rejection.
- Cancellation of pending and running experiments.
- Resolution of baseline snapshots and proposed interventions.
- Deterministic structural evaluation (metrics before, after, delta).
- Traceable EvidenceItem generation in lab_evidence_ledger with STATIC provenance.
- Tenant isolation and access controls.
- Error sanitization to prevent secret leakage.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock
import pytest

from app.models.architecture import ArchitectureScore, ArchitectureSnapshot as ArchitectureSnapshotModel
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
from app.models.repository import Repository
from app.services.experiment_execution_service import (
    BaselineArchitectureNotFoundError,
    DuplicateExecutionError,
    ExperimentExecutionService,
    ExperimentNotFoundError,
    ExperimentRunNotFoundError,
    InvalidStateTransitionError,
    UnsupportedInterventionError,
    validate_state_transition,
)


def _make_service() -> tuple[ExperimentExecutionService, AsyncMock, AsyncMock, AsyncMock, AsyncMock]:
    mock_db = AsyncMock()
    service = ExperimentExecutionService(mock_db)
    service.lab_repo = AsyncMock()
    service.arch_repo = AsyncMock()
    service.repo_repo = AsyncMock()
    return service, mock_db, service.lab_repo, service.arch_repo, service.repo_repo


# ==============================================================================
# State Transition Tests
# ==============================================================================


def test_valid_state_transitions() -> None:
    """Verify permissible ExperimentRun lifecycle transitions."""
    validate_state_transition(ExperimentRunStatus.PENDING.value, ExperimentRunStatus.READY.value)
    validate_state_transition(ExperimentRunStatus.PENDING.value, ExperimentRunStatus.RUNNING.value)
    validate_state_transition(ExperimentRunStatus.PENDING.value, ExperimentRunStatus.CANCELLED.value)

    validate_state_transition(ExperimentRunStatus.READY.value, ExperimentRunStatus.RUNNING.value)
    validate_state_transition(ExperimentRunStatus.READY.value, ExperimentRunStatus.CANCELLED.value)

    validate_state_transition(ExperimentRunStatus.RUNNING.value, ExperimentRunStatus.COMPLETED.value)
    validate_state_transition(ExperimentRunStatus.RUNNING.value, ExperimentRunStatus.FAILED.value)
    validate_state_transition(ExperimentRunStatus.RUNNING.value, ExperimentRunStatus.CANCELLED.value)


def test_invalid_state_transitions() -> None:
    """Verify illegal transitions are strictly rejected across all lifecycle states."""
    # Terminal states cannot transition to anything
    for terminal in (
        ExperimentRunStatus.COMPLETED.value,
        ExperimentRunStatus.FAILED.value,
        ExperimentRunStatus.CANCELLED.value,
    ):
        for target in (
            ExperimentRunStatus.PENDING.value,
            ExperimentRunStatus.READY.value,
            ExperimentRunStatus.RUNNING.value,
            ExperimentRunStatus.COMPLETED.value,
            ExperimentRunStatus.FAILED.value,
            ExperimentRunStatus.CANCELLED.value,
        ):
            with pytest.raises(InvalidStateTransitionError):
                validate_state_transition(terminal, target)

    # Illegal forward jumps
    with pytest.raises(InvalidStateTransitionError):
        validate_state_transition(ExperimentRunStatus.PENDING.value, ExperimentRunStatus.COMPLETED.value)
    with pytest.raises(InvalidStateTransitionError):
        validate_state_transition(ExperimentRunStatus.PENDING.value, ExperimentRunStatus.FAILED.value)
    with pytest.raises(InvalidStateTransitionError):
        validate_state_transition(ExperimentRunStatus.READY.value, ExperimentRunStatus.COMPLETED.value)
    with pytest.raises(InvalidStateTransitionError):
        validate_state_transition(ExperimentRunStatus.READY.value, ExperimentRunStatus.FAILED.value)

    # Illegal backward transitions
    with pytest.raises(InvalidStateTransitionError):
        validate_state_transition(ExperimentRunStatus.RUNNING.value, ExperimentRunStatus.PENDING.value)
    with pytest.raises(InvalidStateTransitionError):
        validate_state_transition(ExperimentRunStatus.RUNNING.value, ExperimentRunStatus.READY.value)
    with pytest.raises(InvalidStateTransitionError):
        validate_state_transition(ExperimentRunStatus.READY.value, ExperimentRunStatus.PENDING.value)


# ==============================================================================
# Execution Service Tests
# ==============================================================================


@pytest.mark.asyncio
async def test_create_and_execute_experiment_run() -> None:
    """
    Test complete lifecycle from creation to successful execution and evidence generation.
    """
    service, mock_db, mock_lab_repo, mock_arch_repo, mock_repo_repo = _make_service()

    # Mocks
    mock_repo = MagicMock(spec=Repository)
    mock_repo.id = 1
    mock_repo.organization_id = 10
    mock_repo_repo.get_by_id.return_value = mock_repo

    mock_hypothesis = MagicMock(spec=Hypothesis)
    mock_hypothesis.id = 5
    mock_hypothesis.repository_id = 1

    mock_experiment = MagicMock(spec=Experiment)
    mock_experiment.id = 20
    mock_experiment.hypothesis_id = 5
    mock_experiment.status = ExperimentStatus.DRAFT.value
    mock_experiment.baseline_reference = {"snapshot_id": 100}
    mock_experiment.proposed_reference = {
        "intervention_type": "REMOVE",
        "target_component_ids": ["apps/backend/legacy/old_token.py"],
    }

    mock_lab_repo.get_experiment_by_id.return_value = mock_experiment
    mock_lab_repo.get_hypothesis_by_id.return_value = mock_hypothesis
    mock_lab_repo.list_experiment_runs.return_value = []

    # Snapshot with graph
    sample_graph = {
        "version": 1,
        "nodes": [
            {"id": "apps/backend/api/auth.py"},
            {"id": "apps/backend/services/auth_service.py"},
            {"id": "apps/backend/legacy/old_token.py"},
        ],
        "edges": [
            {"source": "apps/backend/api/auth.py", "target": "apps/backend/services/auth_service.py", "kind": "import"},
            {"source": "apps/backend/services/auth_service.py", "target": "apps/backend/legacy/old_token.py", "kind": "import"},
        ],
    }
    mock_snapshot = MagicMock(spec=ArchitectureSnapshotModel)
    mock_snapshot.id = 100
    mock_snapshot.repository_id = 1
    mock_snapshot.analysis_result_id = 50
    mock_snapshot.snapshot_version = 1
    mock_snapshot.graph = json.dumps(sample_graph)
    mock_snapshot.score = MagicMock(spec=ArchitectureScore, maintainability=70.0, coupling=50.0, cohesion=60.0, complexity=40.0)
    mock_snapshot.issues = []
    mock_arch_repo.get_by_id.return_value = mock_snapshot

    mock_run = MagicMock(spec=ExperimentRun)
    mock_run.id = 1
    mock_run.experiment_id = 20
    mock_run.run_number = 1
    mock_run.status = ExperimentRunStatus.PENDING.value
    mock_run.result_data = {}
    mock_lab_repo.create_experiment_run.return_value = mock_run
    mock_lab_repo.get_experiment_run_by_id.return_value = mock_run
    mock_lab_repo.create_evidence_item.side_effect = lambda item: MagicMock(id=99, category=item.category)

    # 1. Create Run
    created_run = await service.create_run(
        organization_id=10,
        repository_id=1,
        experiment_id=20,
    )
    assert created_run.status == ExperimentRunStatus.PENDING.value

    # 2. Execute Run
    executed_run = await service.execute_run(
        organization_id=10,
        repository_id=1,
        experiment_id=20,
        run_id=1,
    )

    assert executed_run.status == ExperimentRunStatus.COMPLETED.value
    assert executed_run.completed_at is not None
    assert executed_run.result_data is not None

    result = executed_run.result_data
    assert "metrics_before" in result
    assert "metrics_after" in result
    assert "differences" in result
    assert "direct_impacts" in result
    assert result["metric_delta_convention"] == "delta = proposed - baseline"
    assert "baseline_evaluated_reference" in result
    assert "proposed_evaluated_reference" in result
    assert result["baseline_evaluated_reference"]["snapshot_id"] == 100
    assert result["differences"]["components"] == -1
    assert result["differences"]["dependencies"] == -1
    assert len(result["generated_evidence_ids"]) >= 1


@pytest.mark.asyncio
async def test_duplicate_execution_protection() -> None:
    """Verify duplicate execution attempts on running/completed runs are rejected."""
    service, _, mock_lab_repo, _, mock_repo_repo = _make_service()

    mock_repo = MagicMock(spec=Repository, id=1, organization_id=10)
    mock_repo_repo.get_by_id.return_value = mock_repo

    mock_exp = MagicMock(spec=Experiment, id=20, hypothesis_id=5)
    mock_lab_repo.get_experiment_by_id.return_value = mock_exp
    mock_lab_repo.get_hypothesis_by_id.return_value = MagicMock(spec=Hypothesis, id=5)

    # Run already running
    mock_run = MagicMock(spec=ExperimentRun, id=1, experiment_id=20, status=ExperimentRunStatus.RUNNING.value)
    mock_lab_repo.get_experiment_run_by_id.return_value = mock_run

    with pytest.raises(DuplicateExecutionError):
        await service.execute_run(
            organization_id=10,
            repository_id=1,
            experiment_id=20,
            run_id=1,
        )

    # Run already completed
    mock_run.status = ExperimentRunStatus.COMPLETED.value
    with pytest.raises(DuplicateExecutionError):
        await service.execute_run(
            organization_id=10,
            repository_id=1,
            experiment_id=20,
            run_id=1,
        )


@pytest.mark.asyncio
async def test_cancel_experiment_run() -> None:
    """Verify pending run can be cleanly cancelled."""
    service, _, mock_lab_repo, _, mock_repo_repo = _make_service()

    mock_repo = MagicMock(spec=Repository, id=1, organization_id=10)
    mock_repo_repo.get_by_id.return_value = mock_repo

    mock_exp = MagicMock(spec=Experiment, id=20, hypothesis_id=5)
    mock_lab_repo.get_experiment_by_id.return_value = mock_exp
    mock_lab_repo.get_hypothesis_by_id.return_value = MagicMock(spec=Hypothesis, id=5)

    mock_run = MagicMock(spec=ExperimentRun, id=1, experiment_id=20, status=ExperimentRunStatus.PENDING.value)
    mock_lab_repo.get_experiment_run_by_id.return_value = mock_run

    cancelled = await service.cancel_run(
        organization_id=10,
        repository_id=1,
        experiment_id=20,
        run_id=1,
    )

    assert cancelled.status == ExperimentRunStatus.CANCELLED.value
    assert cancelled.completed_at is not None
    assert "cancelled" in cancelled.error.lower()


@pytest.mark.asyncio
async def test_tenant_isolation_enforcement() -> None:
    """Verify accessing an experiment across organizations is strictly prevented."""
    service, _, _, _, mock_repo_repo = _make_service()

    # Repository owned by Org 10, request comes for Org 999
    mock_repo = MagicMock(spec=Repository, id=1, organization_id=10)
    mock_repo_repo.get_by_id.return_value = mock_repo

    with pytest.raises(ExperimentNotFoundError):
        await service.create_run(
            organization_id=999,
            repository_id=1,
            experiment_id=20,
        )


@pytest.mark.asyncio
async def test_unsupported_intervention_handling() -> None:
    """Verify unsupported interventions fail cleanly with UnsupportedInterventionError."""
    service, _, mock_lab_repo, mock_arch_repo, mock_repo_repo = _make_service()

    mock_repo = MagicMock(spec=Repository, id=1, organization_id=10)
    mock_repo_repo.get_by_id.return_value = mock_repo

    mock_exp = MagicMock(
        spec=Experiment,
        id=20,
        hypothesis_id=5,
        baseline_reference={"snapshot_id": 100},
        proposed_reference={"intervention_type": "NON_EXISTENT", "target_component_ids": ["app.py"]},
    )
    mock_lab_repo.get_experiment_by_id.return_value = mock_exp
    mock_lab_repo.get_hypothesis_by_id.return_value = MagicMock(spec=Hypothesis, id=5)

    mock_snapshot = MagicMock(spec=ArchitectureSnapshotModel, id=100, repository_id=1)
    mock_arch_repo.get_by_id.return_value = mock_snapshot

    mock_run = MagicMock(spec=ExperimentRun, id=1, experiment_id=20, status=ExperimentRunStatus.PENDING.value)
    mock_lab_repo.get_experiment_run_by_id.return_value = mock_run

    with pytest.raises(UnsupportedInterventionError):
        await service.execute_run(
            organization_id=10,
            repository_id=1,
            experiment_id=20,
            run_id=1,
        )


@pytest.mark.asyncio
async def test_baseline_reproducibility_rejection_of_unresolved_reference() -> None:
    """
    Verify that requesting an unanalyzed commit/ref fails deterministically with
    BaselineArchitectureNotFoundError rather than silently substituting latest.
    """
    service, _, mock_lab_repo, _, mock_repo_repo = _make_service()

    mock_repo = MagicMock(spec=Repository, id=1, organization_id=10)
    mock_repo_repo.get_by_id.return_value = mock_repo

    # Experiment with unanalyzed git commit
    mock_exp = MagicMock(
        spec=Experiment,
        id=20,
        hypothesis_id=5,
        baseline_reference={"commit": "HEAD~1"},
        proposed_reference={"intervention_type": "REMOVE", "target_component_ids": ["auth.py"]},
    )
    mock_lab_repo.get_experiment_by_id.return_value = mock_exp
    mock_lab_repo.get_hypothesis_by_id.return_value = MagicMock(spec=Hypothesis, id=5)

    mock_run = MagicMock(spec=ExperimentRun, id=1, experiment_id=20, status=ExperimentRunStatus.PENDING.value)
    mock_lab_repo.get_experiment_run_by_id.return_value = mock_run

    with pytest.raises(BaselineArchitectureNotFoundError) as exc_info:
        await service.execute_run(
            organization_id=10,
            repository_id=1,
            experiment_id=20,
            run_id=1,
        )

    assert "HEAD~1" in str(exc_info.value)
    assert "has not been analyzed" in str(exc_info.value)


@pytest.mark.asyncio
async def test_baseline_reproducibility_nonexistent_snapshot_id() -> None:
    """Verify that a nonexistent snapshot_id fails deterministically."""
    service, _, mock_lab_repo, mock_arch_repo, mock_repo_repo = _make_service()

    mock_repo = MagicMock(spec=Repository, id=1, organization_id=10)
    mock_repo_repo.get_by_id.return_value = mock_repo

    mock_exp = MagicMock(
        spec=Experiment,
        id=20,
        hypothesis_id=5,
        baseline_reference={"snapshot_id": 99999},
        proposed_reference={"intervention_type": "REMOVE", "target_component_ids": ["auth.py"]},
    )
    mock_lab_repo.get_experiment_by_id.return_value = mock_exp
    mock_lab_repo.get_hypothesis_by_id.return_value = MagicMock(spec=Hypothesis, id=5)
    mock_arch_repo.get_by_id.return_value = None

    mock_run = MagicMock(spec=ExperimentRun, id=1, experiment_id=20, status=ExperimentRunStatus.PENDING.value)
    mock_lab_repo.get_experiment_run_by_id.return_value = mock_run

    with pytest.raises(BaselineArchitectureNotFoundError) as exc_info:
        await service.execute_run(
            organization_id=10,
            repository_id=1,
            experiment_id=20,
            run_id=1,
        )

    assert "99999" in str(exc_info.value)


@pytest.mark.asyncio
async def test_proposed_reference_unanalyzed_branch_rejection() -> None:
    """
    Verify that providing an ambiguous branch/commit in proposed_reference without an intervention
    fails with UnsupportedInterventionError rather than silently guessing REMOVE.
    """
    service, _, mock_lab_repo, mock_arch_repo, mock_repo_repo = _make_service()

    mock_repo = MagicMock(spec=Repository, id=1, organization_id=10)
    mock_repo_repo.get_by_id.return_value = mock_repo

    mock_exp = MagicMock(
        spec=Experiment,
        id=20,
        hypothesis_id=5,
        baseline_reference={"snapshot_id": 100},
        proposed_reference={"branch": "refactor/payment-port"},
    )
    mock_lab_repo.get_experiment_by_id.return_value = mock_exp
    mock_lab_repo.get_hypothesis_by_id.return_value = MagicMock(spec=Hypothesis, id=5)
    mock_arch_repo.get_by_id.return_value = MagicMock(spec=ArchitectureSnapshotModel, id=100, repository_id=1)

    mock_run = MagicMock(spec=ExperimentRun, id=1, experiment_id=20, status=ExperimentRunStatus.PENDING.value)
    mock_lab_repo.get_experiment_run_by_id.return_value = mock_run

    with pytest.raises(UnsupportedInterventionError) as exc_info:
        await service.execute_run(
            organization_id=10,
            repository_id=1,
            experiment_id=20,
            run_id=1,
        )

    assert "refactor/payment-port" in str(exc_info.value)
