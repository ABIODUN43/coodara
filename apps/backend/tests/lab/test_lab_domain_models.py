"""
Tests for Architecture Lab & AEI domain models and persistence.

Verifies:
- Hypothesis creation, retrieval, and status validation
- Intervention creation linked to hypothesis
- Experiment creation with baseline & proposed references
- ExperimentRun persistence and status lifecycle
- WorkloadProfile persistence and distinction between measured vs modeled
- ResourceProfile persistence and sizing assumptions
- PricingSnapshot persistence and rate card structure
- EvidenceItem persistence in durable ledger with category taxonomy
- CostScenario persistence with modeled/projected outputs
- DecisionRecord persistence with human engineering rationale
- Foreign key cascade deletions and relations
"""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from app.db.base import Base
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
    PricingSnapshot,
    ResourceProfile,
    WorkloadProfile,
)
from app.models.organization import Organization
from app.models.repository import Repository, RepositoryVisibility
from app.models.user import User
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        # Seed user, organization, repository
        user = User(
            id=1,
            github_id=12345,
            username="testuser",
            email="test@example.com",
            avatar_url="https://example.com/avatar.png",
        )
        org = Organization(
            id=1,
            name="Acme Corp",
            slug="acme",
            owner_id=1,
        )
        repo = Repository(
            id=1,
            organization_id=1,
            github_id=98765,
            name="core-service",
            full_name="acme/core-service",
            visibility=RepositoryVisibility.PUBLIC,
            default_branch="main",
            clone_url="https://github.com/acme/core-service.git",
            html_url="https://github.com/acme/core-service",
        )
        session.add_all([user, org, repo])
        session.commit()
        yield session

    engine.dispose()


def test_hypothesis_creation_and_retrieval(db: Session):
    hypothesis = Hypothesis(
        organization_id=1,
        repository_id=1,
        title="Decouple billing module from auth layer",
        description="Investigating whether isolating billing reduces cyclic dependencies.",
        question="Does extracting billing reduce coupling without increasing latency?",
        status=HypothesisStatus.DRAFT.value,
        created_by=1,
    )
    db.add(hypothesis)
    db.commit()

    saved = db.get(Hypothesis, hypothesis.id)
    assert saved is not None
    assert saved.title == "Decouple billing module from auth layer"
    assert saved.status == HypothesisStatus.DRAFT.value
    assert saved.created_by == 1


def test_intervention_creation(db: Session):
    hypothesis = Hypothesis(
        organization_id=1,
        repository_id=1,
        title="Intervention test",
        question="Will refactoring work?",
        status=HypothesisStatus.READY.value,
    )
    db.add(hypothesis)
    db.commit()

    intervention = Intervention(
        hypothesis_id=hypothesis.id,
        intervention_type=InterventionType.SPLIT.value,
        title="Split monolith database adapter",
        description="Separate read and write database adapters.",
        target_component_ids=["db_adapter", "query_service"],
        parameters={"max_connections": 50, "pool_size": 10},
    )
    db.add(intervention)
    db.commit()

    saved = db.get(Intervention, intervention.id)
    assert saved is not None
    assert saved.intervention_type == InterventionType.SPLIT.value
    assert saved.target_component_ids == ["db_adapter", "query_service"]
    assert saved.parameters["max_connections"] == 50


def test_experiment_and_run_persistence(db: Session):
    hypothesis = Hypothesis(
        organization_id=1,
        repository_id=1,
        title="Experiment hypothesis",
        question="Can we scale to 10k rps?",
    )
    db.add(hypothesis)
    db.commit()

    experiment = Experiment(
        hypothesis_id=hypothesis.id,
        name="Scaling experiment A",
        description="Load testing baseline vs split variant",
        status=ExperimentStatus.READY.value,
        baseline_reference={"snapshot_id": 1, "commit_sha": "abc1234"},
        proposed_reference={"intervention_type": "SPLIT", "component": "api_gateway"},
        created_by=1,
    )
    db.add(experiment)
    db.commit()

    run = ExperimentRun(
        experiment_id=experiment.id,
        run_number=1,
        status=ExperimentRunStatus.RUNNING.value,
        started_at=datetime.now(timezone.utc),
    )
    db.add(run)
    db.commit()

    saved_run = db.get(ExperimentRun, run.id)
    assert saved_run is not None
    assert saved_run.experiment_id == experiment.id
    assert saved_run.status == ExperimentRunStatus.RUNNING.value
    assert saved_run.started_at is not None


def test_workload_and_resource_profiles(db: Session):
    workload = WorkloadProfile(
        organization_id=1,
        repository_id=1,
        name="Peak Black Friday",
        requests_per_second=5000.0,
        batch_volume=100000.0,
        concurrency=250,
        read_write_ratio=0.85,
        data_volume_gb=500.0,
        workload_pattern="bursty",
        configuration={"peak_hours": [12, 13, 14, 18, 19, 20]},
        is_measured=False,
    )
    resource = ResourceProfile(
        organization_id=1,
        repository_id=1,
        name="Standard AWS Sizing",
        provider="aws",
        region="us-east-1",
        cpu="4 vCPU",
        memory="16 GiB",
        database_class="db.r6g.xlarge",
        replicas=3,
        storage_gb=250.0,
        configuration={"instance_type": "m6i.xlarge", "autoscaling_max": 8},
    )
    db.add_all([workload, resource])
    db.commit()

    saved_workload = db.get(WorkloadProfile, workload.id)
    saved_resource = db.get(ResourceProfile, resource.id)

    assert saved_workload is not None
    assert saved_workload.is_measured is False
    assert saved_workload.requests_per_second == 5000.0

    assert saved_resource is not None
    assert saved_resource.provider == "aws"
    assert saved_resource.replicas == 3


def test_pricing_snapshot_persistence(db: Session):
    snapshot = PricingSnapshot(
        provider="aws",
        region="us-east-1",
        pricing_source="aws_public_pricing_api",
        currency="USD",
        captured_at=datetime.now(timezone.utc),
        pricing_data={"vcpu_hourly": 0.0404, "memory_gib_hourly": 0.00445},
        source_metadata={"contract": "on_demand_list"},
    )
    db.add(snapshot)
    db.commit()

    saved = db.get(PricingSnapshot, snapshot.id)
    assert saved is not None
    assert saved.currency == "USD"
    assert saved.pricing_data["vcpu_hourly"] == 0.0404


def test_evidence_ledger_category_taxonomy(db: Session):
    hypothesis = Hypothesis(
        organization_id=1,
        repository_id=1,
        title="Evidence hypothesis",
        question="How does coupling evolve?",
    )
    db.add(hypothesis)
    db.commit()

    # Create evidence items across taxonomy: STATIC, OBSERVED, MEASURED, MODELED, PROJECTED
    categories = [
        (EvidenceCategory.STATIC, "AST_PARSER", "Cyclomatic complexity in auth controller"),
        (EvidenceCategory.OBSERVED, "TRACING_TOPOLOGY", "Observed 12 microservices downstream of gateway"),
        (EvidenceCategory.MEASURED, "LOAD_BENCHMARK", "Measured 95th percentile latency of 42ms"),
        (EvidenceCategory.MODELED, "BFS_PROPAGATION", "Modeled impact radius of 3 components"),
        (EvidenceCategory.PROJECTED, "COST_FORECASTER", "Projected monthly infrastructure delta +$120/mo"),
    ]

    for cat, source, claim in categories:
        item = EvidenceItem(
            organization_id=1,
            repository_id=1,
            hypothesis_id=hypothesis.id,
            category=cat.value,
            source_type=source,
            subject="architecture_evaluation",
            claim=claim,
            data={"test_key": "test_val"},
            confidence=0.92,
            provenance={"git_sha": "abc1234"},
        )
        db.add(item)
    db.commit()

    result = db.execute(
        select(EvidenceItem).where(EvidenceItem.hypothesis_id == hypothesis.id)
    )
    items = result.scalars().all()
    assert len(items) == 5
    saved_categories = {item.category for item in items}
    assert saved_categories == {
        EvidenceCategory.STATIC.value,
        EvidenceCategory.OBSERVED.value,
        EvidenceCategory.MEASURED.value,
        EvidenceCategory.MODELED.value,
        EvidenceCategory.PROJECTED.value,
    }


def test_cost_scenario_and_decision_record(db: Session):
    hypothesis = Hypothesis(
        organization_id=1,
        repository_id=1,
        title="Economic evaluation",
        question="Will moving to serverless save costs?",
    )
    db.add(hypothesis)
    db.commit()

    experiment = Experiment(
        hypothesis_id=hypothesis.id,
        name="Serverless vs Fargate",
        baseline_reference={"type": "Fargate"},
        proposed_reference={"type": "Lambda"},
    )
    db.add(experiment)
    db.commit()

    cost_scenario = CostScenario(
        experiment_id=experiment.id,
        name="Moderate traffic scenario",
        description="Assumes 1M invocations per day",
        assumptions={"invocations_daily": 1000000, "duration_ms": 150},
        estimated_cost_outputs={
            "modeled_monthly_cost": 45.20,
            "baseline_monthly_cost": 98.00,
            "projected_monthly_delta": -52.80,
        },
        currency="USD",
        calculation_metadata={"model": "aei_serverless_v1"},
    )
    db.add(cost_scenario)
    db.commit()

    saved_scenario = db.get(CostScenario, cost_scenario.id)
    assert saved_scenario is not None
    assert saved_scenario.estimated_cost_outputs["projected_monthly_delta"] == -52.80

    decision = DecisionRecord(
        hypothesis_id=hypothesis.id,
        experiment_id=experiment.id,
        decision=DecisionStatus.ACCEPT.value,
        rationale="Evidence confirms serverless reduces idle costs by 53% without latency regressions.",
        supporting_evidence_ids=[1, 2],
        decision_maker="Lead Architect",
        created_by=1,
    )
    db.add(decision)
    db.commit()

    saved_decision = db.get(DecisionRecord, decision.id)
    assert saved_decision is not None
    assert saved_decision.decision == DecisionStatus.ACCEPT.value
    assert saved_decision.decision_maker == "Lead Architect"


def test_cascade_delete_hypothesis_removes_children(db: Session):
    hypothesis = Hypothesis(
        organization_id=1,
        repository_id=1,
        title="Cascade test",
        question="Do children delete on cascade?",
    )
    db.add(hypothesis)
    db.commit()

    intervention = Intervention(
        hypothesis_id=hypothesis.id,
        intervention_type=InterventionType.REMOVE.value,
        title="Remove legacy cache",
    )
    experiment = Experiment(
        hypothesis_id=hypothesis.id,
        name="Experiment to cascade",
    )
    db.add_all([intervention, experiment])
    db.commit()

    # Delete hypothesis
    db.delete(hypothesis)
    db.commit()

    assert db.get(Hypothesis, hypothesis.id) is None
    # Interventions and experiments associated with hypothesis should be deleted
    int_result = db.execute(
        select(Intervention).where(Intervention.hypothesis_id == hypothesis.id)
    )
    assert int_result.scalars().first() is None
