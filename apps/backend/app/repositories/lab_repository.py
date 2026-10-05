"""
Architecture Lab & AEI persistence layer.

Responsible strictly for database operations involving hypotheses, interventions,
experiments, runs, workload/resource profiles, pricing snapshots, evidence items,
cost scenarios, and decision records.

Transaction ownership belongs to LabService.
"""

from __future__ import annotations

from collections.abc import Sequence

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
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class LabRepository:
    """
    Data-access layer for Architecture Lab domain models.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ==========================================================================
    # Hypotheses
    # ==========================================================================

    async def create_hypothesis(self, hypothesis: Hypothesis) -> Hypothesis:
        self.db.add(hypothesis)
        await self.db.flush()
        await self.db.refresh(hypothesis)
        return hypothesis

    async def get_hypothesis_by_id(
        self,
        hypothesis_id: int,
        repository_id: int | None = None,
    ) -> Hypothesis | None:
        query = (
            select(Hypothesis)
            .options(
                selectinload(Hypothesis.interventions),
                selectinload(Hypothesis.experiments),
                selectinload(Hypothesis.decisions),
            )
            .where(Hypothesis.id == hypothesis_id)
        )
        if repository_id is not None:
            query = query.where(Hypothesis.repository_id == repository_id)

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_hypotheses(
        self,
        repository_id: int,
        status: HypothesisStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[Hypothesis]:
        query = (
            select(Hypothesis)
            .options(selectinload(Hypothesis.interventions))
            .where(Hypothesis.repository_id == repository_id)
            .order_by(Hypothesis.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if status is not None:
            query = query.where(Hypothesis.status == status.value)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def update_hypothesis(self, hypothesis: Hypothesis) -> Hypothesis:
        await self.db.flush()
        await self.db.refresh(hypothesis)
        return hypothesis

    async def delete_hypothesis(self, hypothesis: Hypothesis) -> None:
        await self.db.delete(hypothesis)
        await self.db.flush()

    # ==========================================================================
    # Interventions
    # ==========================================================================

    async def create_intervention(self, intervention: Intervention) -> Intervention:
        self.db.add(intervention)
        await self.db.flush()
        await self.db.refresh(intervention)
        return intervention

    async def get_intervention_by_id(self, intervention_id: int) -> Intervention | None:
        query = select(Intervention).where(Intervention.id == intervention_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_interventions(self, hypothesis_id: int) -> Sequence[Intervention]:
        query = (
            select(Intervention)
            .where(Intervention.hypothesis_id == hypothesis_id)
            .order_by(Intervention.created_at.asc())
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    # ==========================================================================
    # Experiments & Runs
    # ==========================================================================

    async def create_experiment(self, experiment: Experiment) -> Experiment:
        self.db.add(experiment)
        await self.db.flush()
        await self.db.refresh(experiment)
        return experiment

    async def get_experiment_by_id(self, experiment_id: int) -> Experiment | None:
        query = (
            select(Experiment)
            .options(
                selectinload(Experiment.runs),
                selectinload(Experiment.cost_scenarios),
            )
            .where(Experiment.id == experiment_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_experiments(
        self,
        hypothesis_id: int | None = None,
        repository_id: int | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[Experiment]:
        query = (
            select(Experiment)
            .options(selectinload(Experiment.runs))
            .order_by(Experiment.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if hypothesis_id is not None:
            query = query.where(Experiment.hypothesis_id == hypothesis_id)
        elif repository_id is not None:
            query = query.join(Hypothesis).where(Hypothesis.repository_id == repository_id)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def update_experiment(self, experiment: Experiment) -> Experiment:
        await self.db.flush()
        await self.db.refresh(experiment)
        return experiment

    async def create_experiment_run(self, run: ExperimentRun) -> ExperimentRun:
        self.db.add(run)
        await self.db.flush()
        await self.db.refresh(run)
        return run

    async def get_experiment_run_by_id(self, run_id: int) -> ExperimentRun | None:
        query = select(ExperimentRun).where(ExperimentRun.id == run_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_experiment_runs(self, experiment_id: int) -> Sequence[ExperimentRun]:
        query = (
            select(ExperimentRun)
            .where(ExperimentRun.experiment_id == experiment_id)
            .order_by(ExperimentRun.run_number.asc())
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def update_experiment_run(self, run: ExperimentRun) -> ExperimentRun:
        await self.db.flush()
        await self.db.refresh(run)
        return run

    # ==========================================================================
    # Workload Profiles
    # ==========================================================================

    async def create_workload_profile(self, profile: WorkloadProfile) -> WorkloadProfile:
        self.db.add(profile)
        await self.db.flush()
        await self.db.refresh(profile)
        return profile

    async def get_workload_profile_by_id(
        self,
        profile_id: int,
        repository_id: int | None = None,
    ) -> WorkloadProfile | None:
        query = select(WorkloadProfile).where(WorkloadProfile.id == profile_id)
        if repository_id is not None:
            query = query.where(WorkloadProfile.repository_id == repository_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_workload_profiles(self, repository_id: int) -> Sequence[WorkloadProfile]:
        query = (
            select(WorkloadProfile)
            .where(WorkloadProfile.repository_id == repository_id)
            .order_by(WorkloadProfile.created_at.desc())
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    # ==========================================================================
    # Resource Profiles
    # ==========================================================================

    async def create_resource_profile(self, profile: ResourceProfile) -> ResourceProfile:
        self.db.add(profile)
        await self.db.flush()
        await self.db.refresh(profile)
        return profile

    async def get_resource_profile_by_id(
        self,
        profile_id: int,
        repository_id: int | None = None,
    ) -> ResourceProfile | None:
        query = select(ResourceProfile).where(ResourceProfile.id == profile_id)
        if repository_id is not None:
            query = query.where(ResourceProfile.repository_id == repository_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_resource_profiles(self, repository_id: int) -> Sequence[ResourceProfile]:
        query = (
            select(ResourceProfile)
            .where(ResourceProfile.repository_id == repository_id)
            .order_by(ResourceProfile.created_at.desc())
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    # ==========================================================================
    # Pricing Snapshots
    # ==========================================================================

    async def create_pricing_snapshot(self, snapshot: PricingSnapshot) -> PricingSnapshot:
        self.db.add(snapshot)
        await self.db.flush()
        await self.db.refresh(snapshot)
        return snapshot

    async def get_pricing_snapshot_by_id(self, snapshot_id: int) -> PricingSnapshot | None:
        query = select(PricingSnapshot).where(PricingSnapshot.id == snapshot_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_pricing_snapshots(
        self,
        provider: str | None = None,
        region: str | None = None,
        limit: int = 50,
    ) -> Sequence[PricingSnapshot]:
        query = select(PricingSnapshot).order_by(PricingSnapshot.captured_at.desc()).limit(limit)
        if provider:
            query = query.where(PricingSnapshot.provider == provider)
        if region:
            query = query.where(PricingSnapshot.region == region)
        result = await self.db.execute(query)
        return result.scalars().all()

    # ==========================================================================
    # Evidence Ledger
    # ==========================================================================

    async def create_evidence_item(self, item: EvidenceItem) -> EvidenceItem:
        self.db.add(item)
        await self.db.flush()
        return item

    async def get_evidence_item_by_id(
        self,
        item_id: int,
        repository_id: int | None = None,
    ) -> EvidenceItem | None:
        query = select(EvidenceItem).where(EvidenceItem.id == item_id)
        if repository_id is not None:
            query = query.where(EvidenceItem.repository_id == repository_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_evidence(
        self,
        repository_id: int,
        experiment_id: int | None = None,
        category: EvidenceCategory | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[EvidenceItem]:
        query = (
            select(EvidenceItem)
            .where(EvidenceItem.repository_id == repository_id)
            .order_by(EvidenceItem.recorded_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if experiment_id is not None:
            query = query.where(EvidenceItem.experiment_id == experiment_id)
        if category is not None:
            query = query.where(EvidenceItem.category == category.value)

        result = await self.db.execute(query)
        return result.scalars().all()

    # ==========================================================================
    # Cost Scenarios
    # ==========================================================================

    async def create_cost_scenario(self, scenario: CostScenario) -> CostScenario:
        self.db.add(scenario)
        await self.db.flush()
        await self.db.refresh(scenario)
        return scenario

    async def get_cost_scenario_by_id(self, scenario_id: int) -> CostScenario | None:
        query = select(CostScenario).where(CostScenario.id == scenario_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_cost_scenarios(
        self,
        experiment_id: int | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[CostScenario]:
        query = (
            select(CostScenario)
            .order_by(CostScenario.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if experiment_id is not None:
            query = query.where(CostScenario.experiment_id == experiment_id)
        result = await self.db.execute(query)
        return result.scalars().all()

    # ==========================================================================
    # Decision Records
    # ==========================================================================

    async def create_decision_record(self, record: DecisionRecord) -> DecisionRecord:
        self.db.add(record)
        await self.db.flush()
        await self.db.refresh(record)
        return record

    async def get_decision_record_by_id(self, record_id: int) -> DecisionRecord | None:
        query = select(DecisionRecord).where(DecisionRecord.id == record_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_decision_records(
        self,
        hypothesis_id: int | None = None,
    ) -> Sequence[DecisionRecord]:
        query = select(DecisionRecord).order_by(DecisionRecord.created_at.desc())
        if hypothesis_id is not None:
            query = query.where(DecisionRecord.hypothesis_id == hypothesis_id)
        result = await self.db.execute(query)
        return result.scalars().all()

    # ==========================================================================
    # Overview Aggregation
    # ==========================================================================

    async def get_overview_counts(self, repository_id: int) -> dict[str, int]:
        hypotheses_count = await self.db.scalar(
            select(func.count(Hypothesis.id)).where(Hypothesis.repository_id == repository_id)
        ) or 0

        experiments_count = await self.db.scalar(
            select(func.count(Experiment.id))
            .join(Hypothesis)
            .where(Hypothesis.repository_id == repository_id)
        ) or 0

        evidence_count = await self.db.scalar(
            select(func.count(EvidenceItem.id)).where(EvidenceItem.repository_id == repository_id)
        ) or 0

        cost_scenarios_count = await self.db.scalar(
            select(func.count(CostScenario.id))
            .join(Experiment)
            .join(Hypothesis)
            .where(Hypothesis.repository_id == repository_id)
        ) or 0

        decisions_count = await self.db.scalar(
            select(func.count(DecisionRecord.id))
            .join(Hypothesis)
            .where(Hypothesis.repository_id == repository_id)
        ) or 0

        return {
            "hypotheses_count": hypotheses_count,
            "experiments_count": experiments_count,
            "evidence_count": evidence_count,
            "cost_scenarios_count": cost_scenarios_count,
            "decisions_count": decisions_count,
        }
