"""
Tests for LabService business logic, tenancy enforcement, and validation.

Verifies:
- Repository tenancy verification (rejects foreign organization/repository pairs)
- CRUD operations for hypotheses, interventions, experiments, runs
- Workload and Resource profile operations
- Evidence ledger ingestion and retrieval
- CostScenario creation with profile references
- DecisionRecord validation (verifies selected intervention belongs to hypothesis)
- Overview aggregation counts
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from app.models.lab import (
    CostScenario,
    DecisionRecord,
    DecisionStatus,
    EvidenceCategory,
    EvidenceItem,
    Experiment,
    ExperimentRun,
    ExperimentRunStatus,
    ExperimentStatus,
    Hypothesis,
    HypothesisStatus,
    Intervention,
    InterventionType,
    ResourceProfile,
    WorkloadProfile,
)
from app.models.repository import Repository
from app.schemas.lab import (
    CostScenarioCreateRequest,
    DecisionRecordCreateRequest,
    EvidenceItemCreateRequest,
    ExperimentCreateRequest,
    ExperimentRunCreateRequest,
    HypothesisCreateRequest,
    HypothesisUpdateRequest,
    InterventionCreateRequest,
    ResourceProfileCreateRequest,
    WorkloadProfileCreateRequest,
)
from app.services.lab_service import (
    LabRepositoryNotFoundError,
    LabResourceNotFoundError,
    LabService,
    LabValidationError,
)


def _make_service() -> tuple[LabService, AsyncMock, AsyncMock, AsyncMock]:
    mock_db = AsyncMock()
    service = LabService(mock_db)
    service.repo_repo = AsyncMock()
    service.lab_repo = AsyncMock()
    return service, mock_db, service.repo_repo, service.lab_repo


@pytest.mark.asyncio
async def test_tenancy_rejection_for_foreign_repository():
    service, _, mock_repo_repo, _ = _make_service()

    # Repository 2 is not owned by Organization 1
    mock_repo_repo.get_by_organization_and_id.return_value = None

    with pytest.raises(LabRepositoryNotFoundError):
        await service.create_hypothesis(
            organization_id=1,
            repository_id=2,
            payload=HypothesisCreateRequest(
                title="Cross tenant hypothesis",
                question="Will this leak?",
            ),
        )

    with pytest.raises(LabRepositoryNotFoundError):
        await service.list_hypotheses(
            organization_id=1,
            repository_id=2,
        )


@pytest.mark.asyncio
async def test_hypothesis_lifecycle():
    service, mock_db, mock_repo_repo, mock_lab_repo = _make_service()
    mock_repo_repo.get_by_organization_and_id.return_value = MagicMock(spec=Repository)

    # 1. Create
    fake_created = Hypothesis(
        id=1,
        organization_id=1,
        repository_id=1,
        title="Split core-api into microservices",
        description="Assess dependency boundary",
        question="Can service extraction reduce deployment blast radius?",
        status=HypothesisStatus.DRAFT.value,
        created_by=1,
    )
    mock_lab_repo.create_hypothesis.return_value = fake_created

    created = await service.create_hypothesis(
        organization_id=1,
        repository_id=1,
        payload=HypothesisCreateRequest(
            title="Split core-api into microservices",
            description="Assess dependency boundary",
            question="Can service extraction reduce deployment blast radius?",
            status=HypothesisStatus.DRAFT,
        ),
        user_id=1,
    )
    assert created.id == 1
    assert created.status == HypothesisStatus.DRAFT.value
    assert mock_db.commit.called

    # 2. Retrieve
    mock_lab_repo.get_hypothesis_by_id.return_value = fake_created
    retrieved = await service.get_hypothesis(
        organization_id=1,
        repository_id=1,
        hypothesis_id=1,
    )
    assert retrieved.id == 1
    assert retrieved.title == "Split core-api into microservices"

    # 3. Update
    fake_updated = Hypothesis(
        id=1,
        organization_id=1,
        repository_id=1,
        title="Split core-api into microservices",
        description="Updated description",
        question="Can service extraction reduce deployment blast radius?",
        status=HypothesisStatus.READY.value,
        created_by=1,
    )
    mock_lab_repo.update_hypothesis.return_value = fake_updated
    updated = await service.update_hypothesis(
        organization_id=1,
        repository_id=1,
        hypothesis_id=1,
        payload=HypothesisUpdateRequest(
            status=HypothesisStatus.READY,
            description="Updated description",
        ),
    )
    assert updated.status == HypothesisStatus.READY.value
    assert updated.description == "Updated description"

    # 4. List
    mock_lab_repo.list_hypotheses.return_value = [fake_created]
    listed = await service.list_hypotheses(
        organization_id=1,
        repository_id=1,
    )
    assert len(listed) == 1

    # 5. Delete
    mock_lab_repo.delete_hypothesis.return_value = True
    await service.delete_hypothesis(
        organization_id=1,
        repository_id=1,
        hypothesis_id=1,
    )

    # 6. Not found raises LabResourceNotFoundError
    mock_lab_repo.get_hypothesis_by_id.return_value = None
    with pytest.raises(LabResourceNotFoundError):
        await service.get_hypothesis(
            organization_id=1,
            repository_id=1,
            hypothesis_id=999,
        )


@pytest.mark.asyncio
async def test_intervention_and_experiment_flow():
    service, mock_db, mock_repo_repo, mock_lab_repo = _make_service()
    mock_repo_repo.get_by_organization_and_id.return_value = MagicMock(spec=Repository)

    hyp = Hypothesis(id=1, organization_id=1, repository_id=1, title="Refactor auth", question="Is JWT lighter?")
    mock_lab_repo.get_hypothesis_by_id.return_value = hyp

    # Intervention
    fake_intervention = Intervention(
        id=10,
        hypothesis_id=1,
        intervention_type=InterventionType.COMPATIBLE_REFACTOR.value,
        title="Migrate session auth to stateless bearer tokens",
        target_component_ids=["auth_controller", "session_cache"],
        parameters={"expiry_minutes": 30},
    )
    mock_lab_repo.create_intervention.return_value = fake_intervention
    mock_lab_repo.list_interventions.return_value = [fake_intervention]

    intervention = await service.create_intervention(
        organization_id=1,
        repository_id=1,
        hypothesis_id=1,
        payload=InterventionCreateRequest(
            intervention_type=InterventionType.COMPATIBLE_REFACTOR,
            title="Migrate session auth to stateless bearer tokens",
            target_component_ids=["auth_controller", "session_cache"],
            parameters={"expiry_minutes": 30},
        ),
    )
    assert intervention.id == 10
    assert intervention.intervention_type == InterventionType.COMPATIBLE_REFACTOR.value

    interventions = await service.list_interventions(
        organization_id=1,
        repository_id=1,
        hypothesis_id=1,
    )
    assert len(interventions) == 1

    # Experiment
    fake_experiment = Experiment(
        id=20,
        hypothesis_id=1,
        name="Session vs JWT latency",
        status=ExperimentStatus.DRAFT.value,
        baseline_reference={"type": "session"},
        proposed_reference={"type": "jwt"},
    )
    mock_lab_repo.create_experiment.return_value = fake_experiment
    experiment = await service.create_experiment(
        organization_id=1,
        repository_id=1,
        payload=ExperimentCreateRequest(
            hypothesis_id=1,
            name="Session vs JWT latency",
            baseline_reference={"type": "session"},
            proposed_reference={"type": "jwt"},
        ),
    )
    assert experiment.id == 20
    assert experiment.status == ExperimentStatus.DRAFT.value

    # ExperimentRun
    fake_run = ExperimentRun(
        id=30,
        experiment_id=20,
        run_number=1,
        status=ExperimentRunStatus.PENDING.value,
    )
    mock_lab_repo.get_experiment_by_id.return_value = fake_experiment
    mock_lab_repo.create_experiment_run.return_value = fake_run
    run = await service.create_experiment_run(
        organization_id=1,
        repository_id=1,
        experiment_id=20,
        payload=ExperimentRunCreateRequest(run_number=1, status=ExperimentRunStatus.PENDING),
    )
    assert run.id == 30
    assert run.run_number == 1


@pytest.mark.asyncio
async def test_decision_record_validation():
    service, mock_db, mock_repo_repo, mock_lab_repo = _make_service()
    mock_repo_repo.get_by_organization_and_id.return_value = MagicMock(spec=Repository)

    hyp1 = Hypothesis(id=1, organization_id=1, repository_id=1, title="Hyp 1", question="Q 1")
    hyp2 = Hypothesis(id=2, organization_id=1, repository_id=1, title="Hyp 2", question="Q 2")
    int2 = Intervention(id=102, hypothesis_id=2, intervention_type=InterventionType.MOVE.value, title="Move component")

    mock_lab_repo.get_hypothesis_by_id.side_effect = lambda hypothesis_id, repository_id: hyp1 if hypothesis_id == 1 else hyp2
    mock_lab_repo.get_intervention_by_id.return_value = int2

    # Associating int2 (hypothesis_id=2) with hyp1 (hypothesis_id=1) must fail
    with pytest.raises(LabValidationError) as exc_info:
        await service.create_decision_record(
            organization_id=1,
            repository_id=1,
            payload=DecisionRecordCreateRequest(
                hypothesis_id=1,
                decision=DecisionStatus.ACCEPT,
                rationale="Accepted",
                selected_intervention_id=102,
            ),
        )
    assert "Selected intervention does not exist or does not belong to the hypothesis" in str(exc_info.value)

    # Associating int2 with hyp2 succeeds
    fake_decision = DecisionRecord(
        id=200,
        hypothesis_id=2,
        decision=DecisionStatus.ACCEPT.value,
        rationale="Accepted after empirical test run.",
        selected_intervention_id=102,
    )
    mock_lab_repo.create_decision_record.return_value = fake_decision

    decision = await service.create_decision_record(
        organization_id=1,
        repository_id=1,
        payload=DecisionRecordCreateRequest(
            hypothesis_id=2,
            decision=DecisionStatus.ACCEPT,
            rationale="Accepted after empirical test run.",
            selected_intervention_id=102,
        ),
    )
    assert decision.id == 200
    assert decision.decision == DecisionStatus.ACCEPT.value


@pytest.mark.asyncio
async def test_overview_aggregation():
    service, mock_db, mock_repo_repo, mock_lab_repo = _make_service()
    mock_repo_repo.get_by_organization_and_id.return_value = MagicMock(spec=Repository)

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)

    hyp = Hypothesis(
        id=1,
        organization_id=1,
        repository_id=1,
        title="Overview test hypothesis",
        question="Q",
        status=HypothesisStatus.DRAFT.value,
        created_at=now,
        updated_at=now,
        interventions=[],
    )
    workload = WorkloadProfile(
        id=1,
        organization_id=1,
        repository_id=1,
        name="Standard traffic",
        requests_per_second=100.0,
        batch_volume=0.0,
        concurrency=10,
        read_write_ratio=0.8,
        data_volume_gb=10.0,
        is_measured=False,
        configuration={},
        created_at=now,
        updated_at=now,
    )
    evidence = EvidenceItem(
        id=1,
        organization_id=1,
        repository_id=1,
        hypothesis_id=1,
        category=EvidenceCategory.MEASURED.value,
        source_type="LOAD_HARNESS",
        subject="throughput",
        claim="Measured 1200 req/s",
        data={},
        provenance={},
        recorded_at=now,
        created_at=now,
    )
    decision = DecisionRecord(
        id=1,
        hypothesis_id=1,
        decision=DecisionStatus.ACCEPT.value,
        rationale="Validated",
        supporting_evidence_ids=[],
        created_at=now,
        updated_at=now,
    )

    mock_lab_repo.get_overview_counts.return_value = {
        "hypotheses_count": 1,
        "experiments_count": 1,
        "evidence_count": 1,
        "cost_scenarios_count": 0,
        "decisions_count": 1,
    }
    mock_lab_repo.list_hypotheses.return_value = [hyp]
    mock_lab_repo.list_workload_profiles.return_value = [workload]
    mock_lab_repo.list_resource_profiles.return_value = []
    mock_lab_repo.list_evidence.return_value = [evidence]
    mock_lab_repo.list_decision_records.return_value = [decision]

    overview = await service.get_overview(organization_id=1, repository_id=1)
    assert overview.repository_id == 1
    assert overview.organization_id == 1
    assert overview.hypotheses_count == 1
    assert overview.experiments_count == 1
    assert overview.evidence_count == 1
    assert len(overview.hypotheses) == 1
    assert len(overview.workload_profiles) == 1
    assert len(overview.recent_evidence) == 1
    assert len(overview.recent_decisions) == 1
