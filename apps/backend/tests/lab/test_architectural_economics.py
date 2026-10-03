"""
Unit tests for Stage 5 Architectural Economics Engine and Services.

Verifies:
1. Deterministic cost calculation across compute, memory, database, storage, network egress (730 hrs/month).
2. Sizing parsing for vCPU and memory across various string/numeric formats.
3. Comparative economics neutrality: delta convention (proposed - baseline), absolute/relative difference, no value judgment.
4. Input validation: positive scaling multiplier, currency mismatch rejection.
5. Full scenario evaluation & persistence:
   - CostScenario saved with categorized breakdowns, formulas, limitations, validation paths.
   - EvidenceItem saved with category='MODELED' and complete provenance.
6. Guardrails verifying output claims remain neutral without unsupported promises ("guaranteed savings", "will save $X").
7. LabService integration: default pricing snapshot seeding, evaluate_economic_scenario, compare_economic_profiles.
"""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from app.models.lab import (
    CostScenario,
    EvidenceCategory,
    EvidenceItem,
    Experiment,
    ExperimentRun,
    ExperimentRunStatus,
    ExperimentStatus,
    PricingSnapshot,
    ResourceProfile,
    WorkloadProfile,
)
from app.models.repository import Repository
from app.schemas.lab import (
    EconomicComparisonRequest,
    EconomicEvaluationRequest,
)
from app.services.architectural_economics_service import (
    ArchitecturalEconomicsService,
    CostBreakdown,
    CurrencyMismatchError,
    EconomicEstimate,
    EconomicInputValidationError,
)
from app.services.lab_service import LabService, LabValidationError


# ==============================================================================
# Unit Tests for ArchitecturalEconomicsService Engine
# ==============================================================================


def test_parse_vcpu_various_formats():
    assert ArchitecturalEconomicsService.parse_vcpu(2) == 2.0
    assert ArchitecturalEconomicsService.parse_vcpu("4 vCPU") == 4.0
    assert ArchitecturalEconomicsService.parse_vcpu("2000m") == 2.0
    assert ArchitecturalEconomicsService.parse_vcpu("500m") == 0.5
    assert ArchitecturalEconomicsService.parse_vcpu(None) == 1.0
    assert ArchitecturalEconomicsService.parse_vcpu("invalid") == 1.0


def test_parse_memory_gib_various_formats():
    assert ArchitecturalEconomicsService.parse_memory_gib(4) == 4.0
    assert ArchitecturalEconomicsService.parse_memory_gib("8Gi") == 8.0
    assert ArchitecturalEconomicsService.parse_memory_gib("4096Mi") == 4.0
    assert ArchitecturalEconomicsService.parse_memory_gib("16GB") == 16.0
    assert ArchitecturalEconomicsService.parse_memory_gib(None) == 2.0
    assert ArchitecturalEconomicsService.parse_memory_gib("invalid") == 2.0


def test_deterministic_cost_calculation():
    service = ArchitecturalEconomicsService(AsyncMock())

    resource = ResourceProfile(
        id=1,
        repository_id=1,
        name="Standard API Service",
        provider="AWS",
        region="us-east-1",
        cpu="2 vCPU",
        memory="4 GiB",
        database_class="db.t4g.medium",
        replicas=2,
        storage_gb=50.0,
    )

    workload = WorkloadProfile(
        id=1,
        repository_id=1,
        name="Steady Production",
        requests_per_second=50.0,
        data_volume_gb=100.0,
        is_measured=False,
    )

    pricing = PricingSnapshot(
        id=1,
        provider="AWS",
        region="us-east-1",
        pricing_source="AWS Standard On-Demand",
        currency="USD",
        captured_at=datetime.now(timezone.utc),
        pricing_data={
            "vcpu_hour": 0.040,
            "memory_gib_hour": 0.005,
            "database_hour": 0.070,
            "storage_gb_month": 0.100,
            "network_egress_gb": 0.090,
        },
    )

    estimate = service.calculate_estimate(
        resource=resource,
        workload=workload,
        pricing=pricing,
        scaling_multiplier=1.0,
    )

    # Compute: 2 vCPU * 0.040/hr * 2 replicas * 730 hrs = 116.80
    assert estimate.breakdown.compute == 116.80
    # Memory: 4 GiB * 0.005/GiB-hr * 2 replicas * 730 hrs = 29.20
    assert estimate.breakdown.memory == 29.20
    # Database: 0.070/hr * 730 hrs = 51.10
    assert estimate.breakdown.database == 51.10
    # Storage: 50 GB * 0.100 = 5.00
    assert estimate.breakdown.storage == 5.00
    # Network: 100 GB * 0.090 = 9.00
    assert estimate.breakdown.network == 9.00

    expected_monthly = round(116.80 + 29.20 + 51.10 + 5.00 + 9.00, 2)
    assert estimate.monthly == expected_monthly
    assert estimate.annual == round(expected_monthly * 12.0, 2)
    assert estimate.currency == "USD"

    # Verify formula transparency
    assert "compute" in estimate.formulas
    assert "memory" in estimate.formulas
    assert "monthly_total" in estimate.formulas

    # Verify assumptions classified
    types = [a["type"] for a in estimate.assumptions_classified]
    assert "ASSUMED" in types
    assert "MODELED" in types

    # Verify limitations and validation path present
    assert len(estimate.limitations) >= 3
    assert len(estimate.validation_path) >= 3


def test_scaling_multiplier_validation():
    service = ArchitecturalEconomicsService(AsyncMock())
    resource = ResourceProfile(id=1, name="Res", cpu="1", memory="1")
    pricing = PricingSnapshot(id=1, pricing_data={})

    with pytest.raises(EconomicInputValidationError, match="strictly positive"):
        service.calculate_estimate(
            resource=resource,
            workload=None,
            pricing=pricing,
            scaling_multiplier=0.0,
        )

    with pytest.raises(EconomicInputValidationError, match="strictly positive"):
        service.calculate_estimate(
            resource=resource,
            workload=None,
            pricing=pricing,
            scaling_multiplier=-1.5,
        )


def test_neutral_comparative_economics():
    service = ArchitecturalEconomicsService(AsyncMock())

    breakdown_base = CostBreakdown(compute=100.0, memory=40.0, database=50.0, storage=10.0, network=10.0, other=0.0)
    baseline = EconomicEstimate(
        hourly=0.2877,
        daily=6.90,
        monthly=210.0,
        annual=2520.0,
        currency="USD",
        breakdown=breakdown_base,
        formulas={},
        assumptions_classified=[],
        limitations=[],
        validation_path=[],
    )

    breakdown_prop = CostBreakdown(compute=80.0, memory=30.0, database=50.0, storage=10.0, network=10.0, other=0.0)
    proposed = EconomicEstimate(
        hourly=0.2466,
        daily=5.92,
        monthly=180.0,
        annual=2160.0,
        currency="USD",
        breakdown=breakdown_prop,
        formulas={},
        assumptions_classified=[],
        limitations=[],
        validation_path=[],
    )

    comparison = service.compare_estimates(baseline, proposed)

    # Delta convention: proposed - baseline
    assert comparison.absolute_difference == -30.0
    assert comparison.relative_difference_pct == pytest.approx(-14.29, abs=0.01)

    # Neutral explanation check: must NOT contain "guaranteed" or "proven"
    assert "guaranteed" not in comparison.explanation.lower()
    assert "proven" not in comparison.explanation.lower()
    assert "models USD 30.00/month lower cost" in comparison.explanation
    assert "Delta = Proposed - Baseline" in comparison.methodology_note


def test_currency_mismatch_rejection():
    service = ArchitecturalEconomicsService(AsyncMock())

    breakdown = CostBreakdown(compute=10.0, memory=5.0, database=0.0, storage=1.0, network=0.0, other=0.0)
    est_usd = EconomicEstimate(0.02, 0.5, 16.0, 192.0, "USD", breakdown, {}, [], [], [])
    est_eur = EconomicEstimate(0.02, 0.5, 16.0, 192.0, "EUR", breakdown, {}, [], [], [])

    with pytest.raises(CurrencyMismatchError, match="different currencies"):
        service.compare_estimates(est_usd, est_eur)


# ==============================================================================
# Integration Tests for Scenario Evaluation & Evidence Persistence
# ==============================================================================


@pytest.mark.asyncio
async def test_evaluate_and_persist_scenario_creates_modeled_evidence():
    mock_db = AsyncMock()
    service = ArchitecturalEconomicsService(mock_db)

    # Mock repository
    mock_repo = MagicMock(spec=Repository)
    mock_repo.organization_id = 1
    service.repo_repo.get_by_id = AsyncMock(return_value=mock_repo)

    # Mock experiment
    experiment = Experiment(
        id=10,
        hypothesis_id=5,
        name="Microservices Migration",
        status=ExperimentStatus.COMPLETED.value,
        baseline_reference={"commit": "abc"},
        proposed_reference={"commit": "def"},
    )
    service.lab_repo.get_experiment_by_id = AsyncMock(return_value=experiment)

    # Mock resources
    baseline_resource = ResourceProfile(
        id=1,
        repository_id=1,
        name="Monolith Baseline",
        provider="AWS",
        region="us-east-1",
        cpu="4 vCPU",
        memory="8 GiB",
        database_class="db.r6g.large",
        replicas=2,
        storage_gb=100.0,
    )
    proposed_resource = ResourceProfile(
        id=2,
        repository_id=1,
        name="Target Microservices",
        provider="AWS",
        region="us-east-1",
        cpu="2 vCPU",
        memory="4 GiB",
        database_class="db.t4g.medium",
        replicas=3,
        storage_gb=80.0,
    )

    async def get_res_by_id(rid):
        if rid == 1:
            return baseline_resource
        if rid == 2:
            return proposed_resource
        return None

    service.lab_repo.get_resource_profile_by_id = AsyncMock(side_effect=get_res_by_id)

    # Mock pricing
    pricing = PricingSnapshot(
        id=1,
        provider="AWS",
        region="us-east-1",
        pricing_source="AWS Rate Card",
        currency="USD",
        captured_at=datetime.now(timezone.utc),
        pricing_data={
            "vcpu_hour": 0.040,
            "memory_gib_hour": 0.005,
            "database_hour": 0.070,
            "storage_gb_month": 0.100,
            "network_egress_gb": 0.090,
        },
    )
    service.lab_repo.get_pricing_snapshot_by_id = AsyncMock(return_value=pricing)

    # Mock workload
    workload = WorkloadProfile(
        id=1,
        repository_id=1,
        name="Measured Q3 Traffic",
        requests_per_second=100.0,
        data_volume_gb=200.0,
        is_measured=True,
    )
    service.lab_repo.get_workload_profile_by_id = AsyncMock(return_value=workload)

    # Mock creation returns
    service.lab_repo.create_cost_scenario = AsyncMock(side_effect=lambda s: setattr(s, "id", 101) or s)
    service.lab_repo.create_evidence_item = AsyncMock(side_effect=lambda e: setattr(e, "id", 201) or e)

    scenario, evidence = await service.evaluate_and_persist_scenario(
        organization_id=1,
        repository_id=1,
        experiment_id=10,
        run_id=None,
        workload_profile_id=1,
        resource_profile_id=1,
        pricing_snapshot_id=1,
        scenario_name="Production Migration Scenario",
        description="Modeled economic footprint of moving from monolith to services",
        proposed_resource_profile_id=2,
    )

    # Verify scenario persisted
    assert scenario.id == 101
    assert scenario.experiment_id == 10
    assert scenario.currency == "USD"
    assert "baseline" in scenario.estimated_cost_outputs
    assert "proposed" in scenario.estimated_cost_outputs
    assert "comparison" in scenario.estimated_cost_outputs

    # Verify EvidenceItem properties
    assert evidence.id == 201
    assert evidence.category == EvidenceCategory.MODELED.value
    assert evidence.category != EvidenceCategory.MEASURED.value
    assert evidence.category != EvidenceCategory.STATIC.value
    assert evidence.source_type == "ARCHITECTURAL_ECONOMICS"
    assert "MODELED category" in evidence.provenance["evidence_category_justification"]
    assert evidence.provenance["cost_scenario_id"] == 101
    assert evidence.provenance["pricing_snapshot_id"] == 1
    assert evidence.confidence == 0.85  # Measured workload confidence


# ==============================================================================
# Unit Tests for LabService Economics Methods
# ==============================================================================


@pytest.mark.asyncio
async def test_lab_service_default_pricing_snapshots_seeded():
    mock_db = AsyncMock()
    service = LabService(mock_db)
    service.lab_repo = AsyncMock()

    # Initial check: no snapshots exist
    service.lab_repo.list_pricing_snapshots.side_effect = [
        [],  # in _ensure_default_pricing_snapshots check
        [MagicMock(spec=PricingSnapshot), MagicMock(spec=PricingSnapshot)],  # final list call
    ]

    snapshots = await service.list_pricing_snapshots()
    assert len(snapshots) == 2
    # Verify two snapshots were inserted into repo
    assert service.lab_repo.create_pricing_snapshot.call_count == 2
    assert mock_db.commit.called


@pytest.mark.asyncio
async def test_lab_service_evaluate_economic_scenario_end_to_end():
    mock_db = AsyncMock()
    service = LabService(mock_db)
    service.repo_repo = AsyncMock()
    service.lab_repo = AsyncMock()

    mock_repo = MagicMock(spec=Repository)
    mock_repo.organization_id = 1
    service.repo_repo.get_by_organization_and_id.return_value = mock_repo
    service.repo_repo.get_by_id.return_value = mock_repo

    experiment = Experiment(
        id=10,
        hypothesis_id=5,
        name="Microservices Migration",
        status=ExperimentStatus.COMPLETED.value,
        baseline_reference={"commit": "abc"},
        proposed_reference={"commit": "def"},
    )
    service.lab_repo.get_experiment_by_id.return_value = experiment

    res = ResourceProfile(
        id=1,
        repository_id=1,
        name="Monolith Baseline",
        provider="AWS",
        region="us-east-1",
        cpu="2 vCPU",
        memory="4 GiB",
        database_class="db.t4g.medium",
        replicas=2,
        storage_gb=50.0,
    )
    service.lab_repo.get_resource_profile_by_id.return_value = res

    pricing = PricingSnapshot(
        id=1,
        provider="AWS",
        region="us-east-1",
        pricing_source="AWS Rate Card",
        currency="USD",
        captured_at=datetime.now(timezone.utc),
        pricing_data={
            "vcpu_hour": 0.040,
            "memory_gib_hour": 0.005,
            "database_hour": 0.070,
            "storage_gb_month": 0.100,
            "network_egress_gb": 0.090,
        },
    )
    service.lab_repo.get_pricing_snapshot_by_id.return_value = pricing
    service.lab_repo.get_workload_profile_by_id.return_value = None

    service.lab_repo.create_cost_scenario.side_effect = lambda s: setattr(s, "id", 501) or setattr(s, "created_at", datetime.now(timezone.utc)) or setattr(s, "updated_at", datetime.now(timezone.utc)) or s
    service.lab_repo.create_evidence_item.side_effect = lambda e: setattr(e, "id", 601) or setattr(e, "created_at", datetime.now(timezone.utc)) or setattr(e, "recorded_at", datetime.now(timezone.utc)) or e

    req = EconomicEvaluationRequest(
        experiment_id=10,
        resource_profile_id=1,
        pricing_snapshot_id=1,
        scenario_name="Evaluation Run 1",
        description="Testing evaluation through LabService",
    )

    response = await service.evaluate_economic_scenario(
        organization_id=1,
        repository_id=1,
        payload=req,
    )

    assert response.scenario.id == 501
    assert response.scenario.name == "Evaluation Run 1"
    assert response.evidence_item.id == 601
    assert response.evidence_item.category == EvidenceCategory.MODELED
    assert response.baseline.monthly > 0
    assert response.proposed.monthly > 0
    assert response.comparison.currency == "USD"
    assert "Delta = Proposed - Baseline" in response.comparison.methodology_note


@pytest.mark.asyncio
async def test_lab_service_compare_economic_profiles():
    mock_db = AsyncMock()
    service = LabService(mock_db)
    service.repo_repo = AsyncMock()
    service.lab_repo = AsyncMock()

    mock_repo = MagicMock(spec=Repository)
    mock_repo.organization_id = 1
    service.repo_repo.get_by_organization_and_id.return_value = mock_repo

    res1 = ResourceProfile(id=1, repository_id=1, name="Base", cpu="2", memory="4", replicas=2)
    res2 = ResourceProfile(id=2, repository_id=1, name="Prop", cpu="1", memory="2", replicas=2)
    pricing = PricingSnapshot(id=1, provider="AWS", region="us-east-1", currency="USD", captured_at=datetime.now(timezone.utc), pricing_data={"vcpu_hour": 0.04, "memory_gib_hour": 0.005})

    async def get_res(rid, repository_id=None):
        return res1 if rid == 1 else res2

    service.lab_repo.get_resource_profile_by_id = AsyncMock(side_effect=get_res)
    service.lab_repo.get_pricing_snapshot_by_id = AsyncMock(return_value=pricing)
    service.lab_repo.get_workload_profile_by_id = AsyncMock(return_value=None)

    req = EconomicComparisonRequest(
        baseline_resource_profile_id=1,
        proposed_resource_profile_id=2,
        pricing_snapshot_id=1,
    )

    comparison = await service.compare_economic_profiles(
        organization_id=1,
        repository_id=1,
        payload=req,
    )

    assert comparison.proposed_monthly < comparison.baseline_monthly
    assert comparison.absolute_difference < 0
    assert "Delta = Proposed - Baseline" in comparison.methodology_note


def test_unsupported_claims_guardrails():
    """
    Ensure the economics engine and comparison texts NEVER output unsupported marketing claims
    like 'guaranteed savings', 'will save', 'proven cheaper', or 'reduces AWS cost by'.
    """
    service = ArchitecturalEconomicsService(AsyncMock())

    breakdown_base = CostBreakdown(compute=100.0, memory=50.0, database=0.0, storage=10.0, network=0.0, other=0.0)
    breakdown_prop = CostBreakdown(compute=50.0, memory=25.0, database=0.0, storage=10.0, network=0.0, other=0.0)

    est_base = EconomicEstimate(0.2, 5.0, 160.0, 1920.0, "USD", breakdown_base, {}, [], ["Limitation 1"], ["Val 1"])
    est_prop = EconomicEstimate(0.1, 2.5, 85.0, 1020.0, "USD", breakdown_prop, {}, [], ["Limitation 1"], ["Val 1"])

    comparison = service.compare_estimates(est_base, est_prop)

    prohibited_phrases = [
        "guaranteed savings",
        "guaranteed reduction",
        "proven cheaper",
        "will save",
        "proven savings",
        "reduces aws cost by",
        "reduces cloud bill by",
    ]

    for phrase in prohibited_phrases:
        assert phrase not in comparison.explanation.lower(), f"Prohibited phrase '{phrase}' found in explanation"
        assert phrase not in comparison.methodology_note.lower(), f"Prohibited phrase '{phrase}' found in methodology note"
