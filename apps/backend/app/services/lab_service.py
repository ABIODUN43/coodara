"""
Architecture Lab & Architectural Economics Intelligence (AEI) service layer.

Encapsulates business operations, validation rules, tenancy enforcement,
and transaction boundaries for Architecture Lab entities.
"""

from __future__ import annotations

import logging
from collections.abc import Sequence
from datetime import datetime, timezone

from app.models.lab import (
    CostScenario,
    DecisionRecord,
    EvidenceCategory,
    EvidenceItem,
    Experiment,
    ExperimentRun,
    Hypothesis,
    HypothesisStatus,
    Intervention,
    PricingSnapshot,
    ResourceProfile,
    WorkloadProfile,
)
from app.repositories.lab_repository import LabRepository
from app.repositories.repository_repository import RepositoryRepository
from app.schemas.lab import (
    ClassifiedAssumptionSchema,
    CostBreakdownSchema,
    CostScenarioCreateRequest,
    CostScenarioResponse,
    DecisionRecordCreateRequest,
    EconomicComparisonRequest,
    EconomicComparisonSchema,
    EconomicEstimateSchema,
    EconomicEvaluationRequest,
    EconomicEvaluationResponse,
    EvidenceItemCreateRequest,
    EvidenceItemResponse,
    ExperimentCreateRequest,
    ExperimentRunCreateRequest,
    HypothesisCreateRequest,
    HypothesisUpdateRequest,
    InterventionCreateRequest,
    LabOverviewResponse,
    PricingSnapshotCreateRequest,
    ResourceProfileCreateRequest,
    WorkloadProfileCreateRequest,
)
from app.services.architectural_economics_service import (
    ArchitecturalEconomicsService,
    EconomicInputValidationError,
)
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class LabError(Exception):
    """Base exception for Architecture Lab operations."""


class LabRepositoryNotFoundError(LabError):
    """Raised when the specified repository is not found or not owned by the organization."""


class LabResourceNotFoundError(LabError):
    """Raised when an entity (hypothesis, experiment, etc.) is not found."""


class LabValidationError(LabError):
    """Raised when a business constraint or invariant is violated."""


class LabService:
    """
    Business service for Architecture Lab domain entities.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.lab_repo = LabRepository(db)
        self.repo_repo = RepositoryRepository(db)

    async def _verify_repository_ownership(
        self,
        *,
        organization_id: int,
        repository_id: int,
    ) -> None:
        repo = await self.repo_repo.get_by_organization_and_id(
            organization_id=organization_id,
            repository_id=repository_id,
        )
        if repo is None:
            raise LabRepositoryNotFoundError(
                f"Repository {repository_id} does not exist in organization {organization_id}."
            )

    # ==========================================================================
    # Hypotheses
    # ==========================================================================

    async def create_hypothesis(
        self,
        *,
        organization_id: int,
        repository_id: int,
        payload: HypothesisCreateRequest,
        user_id: int | None = None,
    ) -> Hypothesis:
        await self._verify_repository_ownership(
            organization_id=organization_id,
            repository_id=repository_id,
        )

        hypothesis = Hypothesis(
            organization_id=organization_id,
            repository_id=repository_id,
            title=payload.title.strip(),
            description=payload.description.strip() if payload.description else None,
            question=payload.question.strip(),
            status=payload.status.value,
            created_by=user_id,
        )

        created = await self.lab_repo.create_hypothesis(hypothesis)
        await self.db.commit()
        return created

    async def get_hypothesis(
        self,
        *,
        organization_id: int,
        repository_id: int,
        hypothesis_id: int,
    ) -> Hypothesis:
        await self._verify_repository_ownership(
            organization_id=organization_id,
            repository_id=repository_id,
        )

        hypothesis = await self.lab_repo.get_hypothesis_by_id(
            hypothesis_id=hypothesis_id,
            repository_id=repository_id,
        )
        if hypothesis is None:
            raise LabResourceNotFoundError(f"Hypothesis {hypothesis_id} not found.")

        return hypothesis

    async def list_hypotheses(
        self,
        *,
        organization_id: int,
        repository_id: int,
        status: HypothesisStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[Hypothesis]:
        await self._verify_repository_ownership(
            organization_id=organization_id,
            repository_id=repository_id,
        )
        return await self.lab_repo.list_hypotheses(
            repository_id=repository_id,
            status=status,
            limit=limit,
            offset=offset,
        )

    async def update_hypothesis(
        self,
        *,
        organization_id: int,
        repository_id: int,
        hypothesis_id: int,
        payload: HypothesisUpdateRequest,
    ) -> Hypothesis:
        hypothesis = await self.get_hypothesis(
            organization_id=organization_id,
            repository_id=repository_id,
            hypothesis_id=hypothesis_id,
        )

        if payload.title is not None:
            hypothesis.title = payload.title.strip()
        if payload.description is not None:
            hypothesis.description = payload.description.strip()
        if payload.question is not None:
            hypothesis.question = payload.question.strip()
        if payload.status is not None:
            hypothesis.status = payload.status.value

        updated = await self.lab_repo.update_hypothesis(hypothesis)
        await self.db.commit()
        return updated

    async def delete_hypothesis(
        self,
        *,
        organization_id: int,
        repository_id: int,
        hypothesis_id: int,
    ) -> None:
        hypothesis = await self.get_hypothesis(
            organization_id=organization_id,
            repository_id=repository_id,
            hypothesis_id=hypothesis_id,
        )
        await self.lab_repo.delete_hypothesis(hypothesis)
        await self.db.commit()

    # ==========================================================================
    # Interventions
    # ==========================================================================

    async def create_intervention(
        self,
        *,
        organization_id: int,
        repository_id: int,
        hypothesis_id: int,
        payload: InterventionCreateRequest,
    ) -> Intervention:
        # Enforces hypothesis ownership and repository tenancy
        await self.get_hypothesis(
            organization_id=organization_id,
            repository_id=repository_id,
            hypothesis_id=hypothesis_id,
        )

        intervention = Intervention(
            hypothesis_id=hypothesis_id,
            intervention_type=payload.intervention_type.value,
            title=payload.title.strip(),
            description=payload.description.strip() if payload.description else None,
            target_component_ids=payload.target_component_ids,
            parameters=payload.parameters,
        )

        created = await self.lab_repo.create_intervention(intervention)
        await self.db.commit()
        return created

    async def list_interventions(
        self,
        *,
        organization_id: int,
        repository_id: int,
        hypothesis_id: int,
    ) -> Sequence[Intervention]:
        await self.get_hypothesis(
            organization_id=organization_id,
            repository_id=repository_id,
            hypothesis_id=hypothesis_id,
        )
        return await self.lab_repo.list_interventions(hypothesis_id=hypothesis_id)

    # ==========================================================================
    # Experiments & Runs
    # ==========================================================================

    async def create_experiment(
        self,
        *,
        organization_id: int,
        repository_id: int,
        payload: ExperimentCreateRequest,
        user_id: int | None = None,
    ) -> Experiment:
        await self.get_hypothesis(
            organization_id=organization_id,
            repository_id=repository_id,
            hypothesis_id=payload.hypothesis_id,
        )

        experiment = Experiment(
            hypothesis_id=payload.hypothesis_id,
            name=payload.name.strip(),
            description=payload.description.strip() if payload.description else None,
            status=payload.status.value,
            baseline_reference=payload.baseline_reference,
            proposed_reference=payload.proposed_reference,
            created_by=user_id,
        )

        created = await self.lab_repo.create_experiment(experiment)
        await self.db.commit()
        return created

    async def get_experiment(
        self,
        *,
        organization_id: int,
        repository_id: int,
        experiment_id: int,
    ) -> Experiment:
        await self._verify_repository_ownership(
            organization_id=organization_id,
            repository_id=repository_id,
        )

        experiment = await self.lab_repo.get_experiment_by_id(experiment_id)
        if experiment is None:
            raise LabResourceNotFoundError(f"Experiment {experiment_id} not found.")

        # Verify hypothesis belongs to repository
        hypothesis = await self.lab_repo.get_hypothesis_by_id(
            hypothesis_id=experiment.hypothesis_id,
            repository_id=repository_id,
        )
        if hypothesis is None:
            raise LabResourceNotFoundError(f"Experiment {experiment_id} not found in repository.")

        return experiment

    async def list_experiments(
        self,
        *,
        organization_id: int,
        repository_id: int,
        hypothesis_id: int | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[Experiment]:
        await self._verify_repository_ownership(
            organization_id=organization_id,
            repository_id=repository_id,
        )
        if hypothesis_id is not None:
            # Verify hypothesis
            await self.get_hypothesis(
                organization_id=organization_id,
                repository_id=repository_id,
                hypothesis_id=hypothesis_id,
            )

        return await self.lab_repo.list_experiments(
            hypothesis_id=hypothesis_id,
            repository_id=repository_id,
            limit=limit,
            offset=offset,
        )

    async def create_experiment_run(
        self,
        *,
        organization_id: int,
        repository_id: int,
        experiment_id: int,
        payload: ExperimentRunCreateRequest,
    ) -> ExperimentRun:
        await self.get_experiment(
            organization_id=organization_id,
            repository_id=repository_id,
            experiment_id=experiment_id,
        )

        run = ExperimentRun(
            experiment_id=experiment_id,
            run_number=payload.run_number,
            status=payload.status.value,
            result_data={},
        )

        created = await self.lab_repo.create_experiment_run(run)
        await self.db.commit()
        return created

    async def get_experiment_run(
        self,
        *,
        organization_id: int,
        repository_id: int,
        experiment_id: int,
        run_id: int,
    ) -> ExperimentRun:
        await self.get_experiment(
            organization_id=organization_id,
            repository_id=repository_id,
            experiment_id=experiment_id,
        )
        run = await self.lab_repo.get_experiment_run_by_id(run_id)
        if run is None or run.experiment_id != experiment_id:
            raise LabResourceNotFoundError(f"Experiment run {run_id} not found.")
        return run

    async def list_experiment_runs(
        self,
        *,
        organization_id: int,
        repository_id: int,
        experiment_id: int,
    ) -> Sequence[ExperimentRun]:
        await self.get_experiment(
            organization_id=organization_id,
            repository_id=repository_id,
            experiment_id=experiment_id,
        )
        return await self.lab_repo.list_experiment_runs(experiment_id=experiment_id)

    async def execute_experiment_run(
        self,
        *,
        organization_id: int,
        repository_id: int,
        experiment_id: int,
        run_id: int,
        run_in_background: bool = False,
    ) -> ExperimentRun:
        await self.get_experiment(
            organization_id=organization_id,
            repository_id=repository_id,
            experiment_id=experiment_id,
        )

        from app.services.experiment_execution_service import ExperimentExecutionService

        if run_in_background:
            try:
                from app.workers.lab_tasks import execute_experiment_task

                execute_experiment_task.delay(
                    organization_id=organization_id,
                    repository_id=repository_id,
                    experiment_id=experiment_id,
                    run_id=run_id,
                )
                run = await self.lab_repo.get_experiment_run_by_id(run_id)
                if run is not None:
                    return run
            except Exception as celery_exc:
                logger.warning(
                    "Celery dispatch failed for experiment run id=%d: %s. Falling back to inline execution.",
                    run_id,
                    celery_exc,
                )

        execution_service = ExperimentExecutionService(self.db)
        return await execution_service.execute_run(
            organization_id=organization_id,
            repository_id=repository_id,
            experiment_id=experiment_id,
            run_id=run_id,
        )

    async def cancel_experiment_run(
        self,
        *,
        organization_id: int,
        repository_id: int,
        experiment_id: int,
        run_id: int,
    ) -> ExperimentRun:
        from app.services.experiment_execution_service import ExperimentExecutionService

        execution_service = ExperimentExecutionService(self.db)
        return await execution_service.cancel_run(
            organization_id=organization_id,
            repository_id=repository_id,
            experiment_id=experiment_id,
            run_id=run_id,
        )

    # ==========================================================================
    # Workload Profiles
    # ==========================================================================

    async def create_workload_profile(
        self,
        *,
        organization_id: int,
        repository_id: int,
        payload: WorkloadProfileCreateRequest,
    ) -> WorkloadProfile:
        await self._verify_repository_ownership(
            organization_id=organization_id,
            repository_id=repository_id,
        )

        profile = WorkloadProfile(
            organization_id=organization_id,
            repository_id=repository_id,
            name=payload.name.strip(),
            description=payload.description.strip() if payload.description else None,
            requests_per_second=payload.requests_per_second,
            batch_volume=payload.batch_volume,
            concurrency=payload.concurrency,
            read_write_ratio=payload.read_write_ratio,
            data_volume_gb=payload.data_volume_gb,
            workload_pattern=payload.workload_pattern,
            configuration=payload.configuration,
            is_measured=payload.is_measured,
        )

        created = await self.lab_repo.create_workload_profile(profile)
        await self.db.commit()
        return created

    async def list_workload_profiles(
        self,
        *,
        organization_id: int,
        repository_id: int,
    ) -> Sequence[WorkloadProfile]:
        await self._verify_repository_ownership(
            organization_id=organization_id,
            repository_id=repository_id,
        )
        return await self.lab_repo.list_workload_profiles(repository_id=repository_id)

    # ==========================================================================
    # Resource Profiles
    # ==========================================================================

    async def create_resource_profile(
        self,
        *,
        organization_id: int,
        repository_id: int,
        payload: ResourceProfileCreateRequest,
    ) -> ResourceProfile:
        await self._verify_repository_ownership(
            organization_id=organization_id,
            repository_id=repository_id,
        )

        profile = ResourceProfile(
            organization_id=organization_id,
            repository_id=repository_id,
            name=payload.name.strip(),
            description=payload.description.strip() if payload.description else None,
            provider=payload.provider.strip(),
            region=payload.region.strip(),
            cpu=payload.cpu.strip() if payload.cpu else None,
            memory=payload.memory.strip() if payload.memory else None,
            database_class=payload.database_class.strip() if payload.database_class else None,
            replicas=payload.replicas,
            storage_gb=payload.storage_gb,
            configuration=payload.configuration,
        )

        created = await self.lab_repo.create_resource_profile(profile)
        await self.db.commit()
        return created

    async def list_resource_profiles(
        self,
        *,
        organization_id: int,
        repository_id: int,
    ) -> Sequence[ResourceProfile]:
        await self._verify_repository_ownership(
            organization_id=organization_id,
            repository_id=repository_id,
        )
        return await self.lab_repo.list_resource_profiles(repository_id=repository_id)

    # ==========================================================================
    # Pricing Snapshots
    # ==========================================================================

    async def create_pricing_snapshot(
        self,
        payload: PricingSnapshotCreateRequest,
    ) -> PricingSnapshot:
        captured_at = payload.captured_at or datetime.utcnow()

        snapshot = PricingSnapshot(
            provider=payload.provider.strip(),
            region=payload.region.strip(),
            pricing_source=payload.pricing_source.strip(),
            currency=payload.currency.strip(),
            captured_at=captured_at,
            pricing_data=payload.pricing_data,
            source_metadata=payload.source_metadata,
        )

        created = await self.lab_repo.create_pricing_snapshot(snapshot)
        await self.db.commit()
        return created

    async def _ensure_default_pricing_snapshots(self) -> None:
        """Seed default reference cloud pricing snapshots if none exist."""
        existing = await self.lab_repo.list_pricing_snapshots(limit=1)
        if existing:
            return

        now = datetime.now(timezone.utc)
        aws_snapshot = PricingSnapshot(
            provider="AWS",
            region="us-east-1",
            pricing_source="AWS Standard On-Demand (2026-Q1)",
            currency="USD",
            captured_at=now,
            pricing_data={
                "vcpu_hour": 0.04048,
                "memory_gib_hour": 0.004445,
                "database_hour": 0.0680,
                "storage_gb_month": 0.0800,
                "network_egress_gb": 0.0900,
            },
            source_metadata={
                "description": "Standard AWS EC2 / RDS General Purpose rates for US East (N. Virginia)",
                "confidence": "high",
            },
        )
        gcp_snapshot = PricingSnapshot(
            provider="GCP",
            region="us-central1",
            pricing_source="Google Cloud Compute Engine (2026-Q1)",
            currency="USD",
            captured_at=now,
            pricing_data={
                "vcpu_hour": 0.0385,
                "memory_gib_hour": 0.0051,
                "database_hour": 0.0650,
                "storage_gb_month": 0.0800,
                "network_egress_gb": 0.0850,
            },
            source_metadata={
                "description": "Standard GCP E2 / Cloud SQL General Purpose rates for US Central (Iowa)",
                "confidence": "high",
            },
        )
        await self.lab_repo.create_pricing_snapshot(aws_snapshot)
        await self.lab_repo.create_pricing_snapshot(gcp_snapshot)
        await self.db.commit()

    async def list_pricing_snapshots(
        self,
        provider: str | None = None,
        region: str | None = None,
    ) -> Sequence[PricingSnapshot]:
        await self._ensure_default_pricing_snapshots()
        return await self.lab_repo.list_pricing_snapshots(
            provider=provider,
            region=region,
        )

    # ==========================================================================
    # Evidence Ledger
    # ==========================================================================

    async def create_evidence_item(
        self,
        *,
        organization_id: int,
        repository_id: int,
        payload: EvidenceItemCreateRequest,
    ) -> EvidenceItem:
        await self._verify_repository_ownership(
            organization_id=organization_id,
            repository_id=repository_id,
        )

        if payload.hypothesis_id is not None:
            await self.get_hypothesis(
                organization_id=organization_id,
                repository_id=repository_id,
                hypothesis_id=payload.hypothesis_id,
            )

        if payload.experiment_id is not None:
            await self.get_experiment(
                organization_id=organization_id,
                repository_id=repository_id,
                experiment_id=payload.experiment_id,
            )

        item = EvidenceItem(
            organization_id=organization_id,
            repository_id=repository_id,
            hypothesis_id=payload.hypothesis_id,
            experiment_id=payload.experiment_id,
            run_id=payload.run_id,
            category=payload.category.value,
            source_type=payload.source_type.strip(),
            subject=payload.subject.strip(),
            claim=payload.claim.strip(),
            data=payload.data,
            confidence=payload.confidence,
            provenance=payload.provenance,
        )

        created = await self.lab_repo.create_evidence_item(item)
        await self.db.commit()
        return created

    async def list_evidence(
        self,
        *,
        organization_id: int,
        repository_id: int,
        experiment_id: int | None = None,
        category: EvidenceCategory | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[EvidenceItem]:
        await self._verify_repository_ownership(
            organization_id=organization_id,
            repository_id=repository_id,
        )
        return await self.lab_repo.list_evidence(
            repository_id=repository_id,
            experiment_id=experiment_id,
            category=category,
            limit=limit,
            offset=offset,
        )

    # ==========================================================================
    # Cost Scenarios
    # ==========================================================================

    async def create_cost_scenario(
        self,
        *,
        organization_id: int,
        repository_id: int,
        payload: CostScenarioCreateRequest,
    ) -> CostScenario:
        await self.get_experiment(
            organization_id=organization_id,
            repository_id=repository_id,
            experiment_id=payload.experiment_id,
        )

        if payload.workload_profile_id is not None:
            profile = await self.lab_repo.get_workload_profile_by_id(
                profile_id=payload.workload_profile_id,
                repository_id=repository_id,
            )
            if profile is None:
                raise LabResourceNotFoundError("Referenced workload profile does not exist.")

        if payload.resource_profile_id is not None:
            r_profile = await self.lab_repo.get_resource_profile_by_id(
                profile_id=payload.resource_profile_id,
                repository_id=repository_id,
            )
            if r_profile is None:
                raise LabResourceNotFoundError("Referenced resource profile does not exist.")

        if payload.pricing_snapshot_id is not None:
            snapshot = await self.lab_repo.get_pricing_snapshot_by_id(
                snapshot_id=payload.pricing_snapshot_id,
            )
            if snapshot is None:
                raise LabResourceNotFoundError("Referenced pricing snapshot does not exist.")

        scenario = CostScenario(
            experiment_id=payload.experiment_id,
            run_id=payload.run_id,
            workload_profile_id=payload.workload_profile_id,
            resource_profile_id=payload.resource_profile_id,
            pricing_snapshot_id=payload.pricing_snapshot_id,
            name=payload.name.strip(),
            description=payload.description.strip() if payload.description else None,
            assumptions=payload.assumptions,
            estimated_cost_outputs=payload.estimated_cost_outputs,
            currency=payload.currency.strip(),
            calculation_metadata=payload.calculation_metadata,
        )

        created = await self.lab_repo.create_cost_scenario(scenario)
        await self.db.commit()
        return created

    async def list_cost_scenarios(
        self,
        *,
        organization_id: int,
        repository_id: int,
        experiment_id: int | None = None,
    ) -> Sequence[CostScenario]:
        await self._verify_repository_ownership(
            organization_id=organization_id,
            repository_id=repository_id,
        )
        if experiment_id is not None:
            await self.get_experiment(
                organization_id=organization_id,
                repository_id=repository_id,
                experiment_id=experiment_id,
            )

        return await self.lab_repo.list_cost_scenarios(experiment_id=experiment_id)

    async def evaluate_economic_scenario(
        self,
        *,
        organization_id: int,
        repository_id: int,
        payload: EconomicEvaluationRequest,
    ) -> EconomicEvaluationResponse:
        """
        Evaluate modeled economic consequence of baseline vs proposed architecture
        under explicit workload, resource, and pricing snapshot assumptions.
        Persists both CostScenario and EvidenceItem (MODELED category).
        """
        await self._verify_repository_ownership(
            organization_id=organization_id,
            repository_id=repository_id,
        )

        econ_service = ArchitecturalEconomicsService(
            self.db,
            lab_repo=self.lab_repo,
            repo_repo=self.repo_repo,
        )
        try:
            scenario, evidence = await econ_service.evaluate_and_persist_scenario(
                organization_id=organization_id,
                repository_id=repository_id,
                experiment_id=payload.experiment_id,
                run_id=payload.run_id,
                workload_profile_id=payload.workload_profile_id,
                resource_profile_id=payload.resource_profile_id,
                pricing_snapshot_id=payload.pricing_snapshot_id,
                scenario_name=payload.scenario_name,
                description=payload.description,
                proposed_resource_profile_id=payload.proposed_resource_profile_id,
            )
        except EconomicInputValidationError as exc:
            raise LabValidationError(str(exc)) from exc

        cost_outputs = scenario.estimated_cost_outputs or {}
        baseline_raw = cost_outputs.get("baseline", {})
        proposed_raw = cost_outputs.get("proposed", {})
        comparison_raw = cost_outputs.get("comparison", {})
        limitations = cost_outputs.get("limitations", [])
        validation_path = cost_outputs.get("validation_path", [])
        assumptions = scenario.assumptions or {}
        assumptions_classified = assumptions.get("assumptions_classified", [])

        baseline_estimate = EconomicEstimateSchema(
            hourly=baseline_raw.get("hourly", 0.0),
            daily=baseline_raw.get("daily", 0.0),
            monthly=baseline_raw.get("monthly", 0.0),
            annual=baseline_raw.get("annual", 0.0),
            currency=scenario.currency,
            breakdown=CostBreakdownSchema(**baseline_raw.get("breakdown", {})),
            formulas=baseline_raw.get("formulas", {}),
            assumptions_classified=[ClassifiedAssumptionSchema(**a) for a in assumptions_classified],
            limitations=limitations,
            validation_path=validation_path,
        )

        proposed_estimate = EconomicEstimateSchema(
            hourly=proposed_raw.get("hourly", 0.0),
            daily=proposed_raw.get("daily", 0.0),
            monthly=proposed_raw.get("monthly", 0.0),
            annual=proposed_raw.get("annual", 0.0),
            currency=scenario.currency,
            breakdown=CostBreakdownSchema(**proposed_raw.get("breakdown", {})),
            formulas=proposed_raw.get("formulas", {}),
            assumptions_classified=[ClassifiedAssumptionSchema(**a) for a in assumptions_classified],
            limitations=limitations,
            validation_path=validation_path,
        )

        comparison_schema = EconomicComparisonSchema(
            baseline_monthly=baseline_estimate.monthly,
            proposed_monthly=proposed_estimate.monthly,
            absolute_difference=comparison_raw.get("absolute_difference", 0.0),
            relative_difference_pct=comparison_raw.get("relative_difference_pct", 0.0),
            currency=scenario.currency,
            baseline_breakdown=baseline_estimate.breakdown,
            proposed_breakdown=proposed_estimate.breakdown,
            explanation=comparison_raw.get("explanation", ""),
            methodology_note=comparison_raw.get("methodology_note", ""),
        )

        return EconomicEvaluationResponse(
            scenario=CostScenarioResponse.model_validate(scenario),
            evidence_item=EvidenceItemResponse.model_validate(evidence),
            baseline=baseline_estimate,
            proposed=proposed_estimate,
            comparison=comparison_schema,
        )

    async def compare_economic_profiles(
        self,
        *,
        organization_id: int,
        repository_id: int,
        payload: EconomicComparisonRequest,
    ) -> EconomicComparisonSchema:
        """Compare baseline and proposed resource profiles under a rate card without persisting."""
        await self._verify_repository_ownership(
            organization_id=organization_id,
            repository_id=repository_id,
        )

        baseline_resource = await self.lab_repo.get_resource_profile_by_id(
            payload.baseline_resource_profile_id, repository_id=repository_id
        )
        if baseline_resource is None:
            raise LabResourceNotFoundError("Baseline resource profile not found.")

        proposed_resource = await self.lab_repo.get_resource_profile_by_id(
            payload.proposed_resource_profile_id, repository_id=repository_id
        )
        if proposed_resource is None:
            raise LabResourceNotFoundError("Proposed resource profile not found.")

        pricing = await self.lab_repo.get_pricing_snapshot_by_id(payload.pricing_snapshot_id)
        if pricing is None:
            raise LabResourceNotFoundError("Pricing snapshot not found.")

        workload = None
        if payload.workload_profile_id is not None:
            workload = await self.lab_repo.get_workload_profile_by_id(
                payload.workload_profile_id, repository_id=repository_id
            )

        econ_service = ArchitecturalEconomicsService(
            self.db,
            lab_repo=self.lab_repo,
            repo_repo=self.repo_repo,
        )
        baseline_est = econ_service.calculate_estimate(
            resource=baseline_resource,
            workload=workload,
            pricing=pricing,
        )
        proposed_est = econ_service.calculate_estimate(
            resource=proposed_resource,
            workload=workload,
            pricing=pricing,
        )
        comparison = econ_service.compare_estimates(baseline_est, proposed_est)

        return EconomicComparisonSchema(
            baseline_monthly=comparison.baseline_monthly,
            proposed_monthly=comparison.proposed_monthly,
            absolute_difference=comparison.absolute_difference,
            relative_difference_pct=comparison.relative_difference_pct,
            currency=comparison.currency,
            baseline_breakdown=CostBreakdownSchema(
                compute=baseline_est.breakdown.compute,
                memory=baseline_est.breakdown.memory,
                database=baseline_est.breakdown.database,
                storage=baseline_est.breakdown.storage,
                network=baseline_est.breakdown.network,
                other=baseline_est.breakdown.other,
                total_monthly=baseline_est.breakdown.total_monthly,
            ),
            proposed_breakdown=CostBreakdownSchema(
                compute=proposed_est.breakdown.compute,
                memory=proposed_est.breakdown.memory,
                database=proposed_est.breakdown.database,
                storage=proposed_est.breakdown.storage,
                network=proposed_est.breakdown.network,
                other=proposed_est.breakdown.other,
                total_monthly=proposed_est.breakdown.total_monthly,
            ),
            explanation=comparison.explanation,
            methodology_note=comparison.methodology_note,
        )


    # ==========================================================================
    # Decision Records
    # ==========================================================================

    async def create_decision_record(
        self,
        *,
        organization_id: int,
        repository_id: int,
        payload: DecisionRecordCreateRequest,
        user_id: int | None = None,
    ) -> DecisionRecord:
        await self.get_hypothesis(
            organization_id=organization_id,
            repository_id=repository_id,
            hypothesis_id=payload.hypothesis_id,
        )

        if payload.experiment_id is not None:
            await self.get_experiment(
                organization_id=organization_id,
                repository_id=repository_id,
                experiment_id=payload.experiment_id,
            )

        if payload.selected_intervention_id is not None:
            intervention = await self.lab_repo.get_intervention_by_id(
                intervention_id=payload.selected_intervention_id,
            )
            if intervention is None or intervention.hypothesis_id != payload.hypothesis_id:
                raise LabValidationError(
                    "Selected intervention does not exist or does not belong to the hypothesis."
                )

        record = DecisionRecord(
            hypothesis_id=payload.hypothesis_id,
            experiment_id=payload.experiment_id,
            decision=payload.decision.value,
            rationale=payload.rationale.strip(),
            selected_intervention_id=payload.selected_intervention_id,
            supporting_evidence_ids=payload.supporting_evidence_ids,
            decision_maker=payload.decision_maker.strip() if payload.decision_maker else None,
            created_by=user_id,
        )

        created = await self.lab_repo.create_decision_record(record)
        await self.db.commit()
        return created

    async def list_decision_records(
        self,
        *,
        organization_id: int,
        repository_id: int,
        hypothesis_id: int | None = None,
    ) -> Sequence[DecisionRecord]:
        await self._verify_repository_ownership(
            organization_id=organization_id,
            repository_id=repository_id,
        )
        if hypothesis_id is not None:
            await self.get_hypothesis(
                organization_id=organization_id,
                repository_id=repository_id,
                hypothesis_id=hypothesis_id,
            )

        return await self.lab_repo.list_decision_records(hypothesis_id=hypothesis_id)

    # ==========================================================================
    # Lab Overview
    # ==========================================================================

    async def get_overview(
        self,
        *,
        organization_id: int,
        repository_id: int,
    ) -> LabOverviewResponse:
        await self._verify_repository_ownership(
            organization_id=organization_id,
            repository_id=repository_id,
        )

        counts = await self.lab_repo.get_overview_counts(repository_id)
        hypotheses = await self.lab_repo.list_hypotheses(repository_id=repository_id, limit=10)
        workloads = await self.lab_repo.list_workload_profiles(repository_id=repository_id)
        resources = await self.lab_repo.list_resource_profiles(repository_id=repository_id)
        evidence = await self.lab_repo.list_evidence(repository_id=repository_id, limit=10)
        decisions = await self.lab_repo.list_decision_records()

        return LabOverviewResponse(
            repository_id=repository_id,
            organization_id=organization_id,
            hypotheses_count=counts["hypotheses_count"],
            experiments_count=counts["experiments_count"],
            evidence_count=counts["evidence_count"],
            cost_scenarios_count=counts["cost_scenarios_count"],
            decisions_count=counts["decisions_count"],
            hypotheses=list(hypotheses),
            workload_profiles=list(workloads),
            resource_profiles=list(resources),
            recent_evidence=list(evidence),
            recent_decisions=[d for d in decisions if any(h.id == d.hypothesis_id for h in hypotheses)],
        )
