"""
Architectural Economics Engine & Economic Calculation Service.

Coordinates reproducible, transparent economic modeling for Coodara Architecture Lab.
Evaluates the modeled economic footprint of baseline vs. proposed architectures
under explicit workload, resource, and pricing assumptions.

Core Architectural Economics Principles:
1. Strict Provenance: Economic estimates are classified as MODELED or PROJECTED;
   never confused with MEASURED telemetry or STATIC AST structures.
2. Assumption Transparency: Every input parameter is explicitly designated as
   ASSUMED, OBSERVED, or MEASURED.
3. Formula Transparency: Every cost output provides the human-readable formula
   and rate card used to produce the estimate.
4. Neutral Language: Never claims "guaranteed savings", "cheaper architecture",
   or "proven reductions" without live cloud billing or empirical telemetry validation.
5. Exact Linkage: Scenarios remain explicitly associated with an Experiment and
   ExperimentRun.
"""

from __future__ import annotations

import logging
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Sequence

from app.models.lab import (
    CostScenario,
    EvidenceCategory,
    EvidenceItem,
    Experiment,
    ExperimentRun,
    PricingSnapshot,
    ResourceProfile,
    WorkloadProfile,
)
from app.repositories.lab_repository import LabRepository
from app.repositories.repository_repository import RepositoryRepository
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Standard industry monthly operational hours (365 days / 12 months * 24 hours = 730 hours)
HOURS_PER_MONTH: float = 730.0
DAYS_PER_MONTH: float = 30.4167
HOURS_PER_DAY: float = 24.0


# ==============================================================================
# Exceptions
# ==============================================================================


class ArchitecturalEconomicsError(Exception):
    """Base exception for economic modeling errors."""


class EconomicInputValidationError(ArchitecturalEconomicsError):
    """Missing or invalid profile or pricing inputs."""


class PricingRateNotFoundError(ArchitecturalEconomicsError):
    """Required unit price rate missing from pricing snapshot."""


class CurrencyMismatchError(ArchitecturalEconomicsError):
    """Inconsistent currencies across compared pricing models."""


# ==============================================================================
# Data Structures
# ==============================================================================


@dataclass(frozen=True)
class CostBreakdown:
    """Detailed category breakdown of modeled infrastructure costs."""

    compute: float
    memory: float
    database: float
    storage: float
    network: float
    other: float

    @property
    def total_monthly(self) -> float:
        return round(
            self.compute + self.memory + self.database + self.storage + self.network + self.other,
            2,
        )


@dataclass(frozen=True)
class EconomicEstimate:
    """Estimated cost over multiple operational time horizons."""

    hourly: float
    daily: float
    monthly: float
    annual: float
    currency: str
    breakdown: CostBreakdown
    formulas: dict[str, str]
    assumptions_classified: list[dict[str, str]]
    limitations: list[str]
    validation_path: list[str]


@dataclass(frozen=True)
class EconomicComparison:
    """Comparative analysis between baseline and proposed economic models."""

    baseline_monthly: float
    proposed_monthly: float
    absolute_difference: float
    relative_difference_pct: float
    currency: str
    baseline_breakdown: CostBreakdown
    proposed_breakdown: CostBreakdown
    explanation: str
    methodology_note: str


# ==============================================================================
# Economics Service
# ==============================================================================


class ArchitecturalEconomicsService:
    """
    Dedicated calculation and persistence service for Architectural Economics.
    """

    def __init__(
        self,
        db: AsyncSession,
        lab_repo: LabRepository | None = None,
        repo_repo: RepositoryRepository | None = None,
    ) -> None:
        self.db = db
        self.lab_repo = lab_repo or LabRepository(db)
        self.repo_repo = repo_repo or RepositoryRepository(db)

    # --------------------------------------------------------------------------
    # Sizing Parsers
    # --------------------------------------------------------------------------

    @staticmethod
    def parse_vcpu(cpu_str: str | float | int | None) -> float:
        """Parse vCPU value from diverse formats (e.g. '2', '2 vCPU', '2000m', 2.0)."""
        if cpu_str is None:
            return 1.0
        if isinstance(cpu_str, (int, float)):
            return max(0.1, float(cpu_str))

        raw = str(cpu_str).strip().lower()
        if raw.endswith("m"):  # Kubernetes millicores
            try:
                return max(0.1, float(raw[:-1]) / 1000.0)
            except ValueError:
                return 1.0

        match = re.search(r"([\d.]+)", raw)
        if match:
            try:
                return max(0.1, float(match.group(1)))
            except ValueError:
                return 1.0
        return 1.0

    @staticmethod
    def parse_memory_gib(mem_str: str | float | int | None) -> float:
        """Parse memory in GiB from diverse formats (e.g. '4Gi', '4096Mi', '4GB', 4.0)."""
        if mem_str is None:
            return 2.0
        if isinstance(mem_str, (int, float)):
            return max(0.25, float(mem_str))

        raw = str(mem_str).strip().lower()
        if "mi" in raw or "mb" in raw:
            match = re.search(r"([\d.]+)", raw)
            if match:
                try:
                    return max(0.25, float(match.group(1)) / 1024.0)
                except ValueError:
                    return 2.0

        match = re.search(r"([\d.]+)", raw)
        if match:
            try:
                return max(0.25, float(match.group(1)))
            except ValueError:
                return 2.0
        return 2.0

    # --------------------------------------------------------------------------
    # Deterministic Cost Model
    # --------------------------------------------------------------------------

    def calculate_estimate(
        self,
        *,
        resource: ResourceProfile,
        workload: WorkloadProfile | None,
        pricing: PricingSnapshot,
        scaling_multiplier: float = 1.0,
    ) -> EconomicEstimate:
        """
        Deterministically calculate infrastructure cost estimates from stored rate card.

        Formulas:
        - compute = vcpus * vcpu_hourly_rate * replicas * scaling_multiplier * 730
        - memory = memory_gib * memory_hourly_rate * replicas * scaling_multiplier * 730
        - database = db_hourly_rate * 730 (if db class configured)
        - storage = storage_gb * storage_monthly_rate
        - network = workload_rps * avg_kb_per_req * 86400 * 30.41 * egress_rate
        """
        if scaling_multiplier <= 0:
            raise EconomicInputValidationError("Scaling multiplier must be strictly positive.")

        rates = pricing.pricing_data or {}
        currency = pricing.currency or "USD"

        # Rate card units with fallback defaults based on standard cloud lists
        vcpu_rate = float(rates.get("vcpu_hour", rates.get("compute_unit_hour", 0.0416)))
        memory_rate = float(rates.get("memory_gib_hour", rates.get("ram_gib_hour", 0.0055)))
        db_rate = float(rates.get("database_hour", rates.get("db_instance_hour", 0.1600)))
        storage_rate = float(rates.get("storage_gb_month", rates.get("disk_gb_month", 0.1000)))
        network_rate = float(rates.get("network_egress_gb", rates.get("egress_per_gb", 0.0800)))

        # Parse resource sizing
        vcpus = self.parse_vcpu(resource.cpu)
        memory_gib = self.parse_memory_gib(resource.memory)
        replicas = max(1, resource.replicas if resource.replicas is not None else 1)
        storage_gb = max(0.0, float(resource.storage_gb or 20.0))
        has_database = bool(resource.database_class and resource.database_class.lower() not in ("none", "null", ""))

        effective_replicas = replicas * scaling_multiplier

        # 1. Compute Cost
        monthly_compute = round(vcpus * vcpu_rate * effective_replicas * HOURS_PER_MONTH, 2)
        compute_formula = (
            f"{vcpus} vCPU × {currency} {vcpu_rate:.4f}/hr × {effective_replicas:.2f} replicas × {HOURS_PER_MONTH} hrs/mo"
        )

        # 2. Memory Cost
        monthly_memory = round(memory_gib * memory_rate * effective_replicas * HOURS_PER_MONTH, 2)
        memory_formula = (
            f"{memory_gib:.1f} GiB × {currency} {memory_rate:.4f}/GiB-hr × {effective_replicas:.2f} replicas × {HOURS_PER_MONTH} hrs/mo"
        )

        # 3. Database Cost
        monthly_database = round(db_rate * HOURS_PER_MONTH, 2) if has_database else 0.0
        db_formula = (
            f"{resource.database_class} × {currency} {db_rate:.4f}/hr × {HOURS_PER_MONTH} hrs/mo"
            if has_database
            else "No dedicated database instance configured in resource profile"
        )

        # 4. Storage Cost
        monthly_storage = round(storage_gb * storage_rate, 2)
        storage_formula = f"{storage_gb:.1f} GB × {currency} {storage_rate:.4f}/GB-mo"

        # 5. Network / Egress Cost (derived from workload assumptions if available)
        rps = float(workload.requests_per_second or 0.0) if workload else 0.0
        data_vol_gb = float(workload.data_volume_gb or 0.0) if workload else 0.0

        if data_vol_gb > 0:
            monthly_egress_gb = data_vol_gb
            monthly_network = round(monthly_egress_gb * network_rate, 2)
            network_formula = f"{monthly_egress_gb:.1f} GB egress × {currency} {network_rate:.4f}/GB"
        elif rps > 0:
            # Model 20 KB average payload per HTTP request
            monthly_requests = rps * 86400 * DAYS_PER_MONTH
            estimated_egress_gb = (monthly_requests * 20.0) / (1024.0 * 1024.0)
            monthly_network = round(estimated_egress_gb * network_rate, 2)
            network_formula = (
                f"{rps:.1f} req/s (~{monthly_requests:,.0f} req/mo @ 20KB avg) = "
                f"{estimated_egress_gb:.1f} GB × {currency} {network_rate:.4f}/GB"
            )
        else:
            monthly_network = 0.0
            network_formula = "No network transfer or egress volume specified"

        breakdown = CostBreakdown(
            compute=monthly_compute,
            memory=monthly_memory,
            database=monthly_database,
            storage=monthly_storage,
            network=monthly_network,
            other=0.0,
        )

        monthly_total = breakdown.total_monthly
        daily_total = round(monthly_total / DAYS_PER_MONTH, 2)
        hourly_total = round(monthly_total / HOURS_PER_MONTH, 4)
        annual_total = round(monthly_total * 12.0, 2)

        # Assumptions Classification
        assumptions_classified = [
            {
                "field": "vCPU Capacity",
                "value": f"{vcpus} vCPU",
                "type": "ASSUMED",
                "source": f"ResourceProfile '{resource.name}'",
            },
            {
                "field": "Memory Capacity",
                "value": f"{memory_gib} GiB",
                "type": "ASSUMED",
                "source": f"ResourceProfile '{resource.name}'",
            },
            {
                "field": "Replica Count",
                "value": f"{effective_replicas:.2f} instances",
                "type": "ASSUMED",
                "source": f"ResourceProfile '{resource.name}' (multiplier: {scaling_multiplier:.2f})",
            },
            {
                "field": "Traffic Throughput",
                "value": f"{rps:.1f} req/sec" if workload else "None",
                "type": "MEASURED" if (workload and workload.is_measured) else "ASSUMED",
                "source": f"WorkloadProfile '{workload.name}'" if workload else "Unspecified",
            },
            {
                "field": "Pricing Rate Card",
                "value": f"{pricing.provider} ({pricing.region})",
                "type": "MODELED",
                "source": f"PricingSnapshot '{pricing.pricing_source}' captured {pricing.captured_at.strftime('%Y-%m-%d')}",
            },
        ]

        limitations = [
            "Modeled estimate based purely on declared resource and workload assumptions.",
            "Does not account for burst autoscaling, spot instance termination, or reserved commitment discounts.",
            "Requires empirical benchmark or production telemetry validation before treating as realized savings.",
            "Network egress assumes steady-state data transfer without cross-region replication fees.",
        ]

        validation_path = [
            "1. Deploy candidate architecture to an isolated performance testing environment.",
            "2. Execute synthetic workload matching the specified WorkloadProfile.",
            "3. Collect Prometheus / CloudWatch telemetry for actual CPU and memory utilization.",
            "4. Validate actual database connection pooling and IOPS saturation.",
            "5. Re-run Architectural Economics with measured telemetry (is_measured=True).",
        ]

        formulas = {
            "compute": compute_formula,
            "memory": memory_formula,
            "database": db_formula,
            "storage": storage_formula,
            "network": network_formula,
            "monthly_total": (
                f"{currency} {monthly_compute:.2f} (compute) + {currency} {monthly_memory:.2f} (memory) + "
                f"{currency} {monthly_database:.2f} (db) + {currency} {monthly_storage:.2f} (storage) + "
                f"{currency} {monthly_network:.2f} (network) = {currency} {monthly_total:.2f}"
            ),
        }

        return EconomicEstimate(
            hourly=hourly_total,
            daily=daily_total,
            monthly=monthly_total,
            annual=annual_total,
            currency=currency,
            breakdown=breakdown,
            formulas=formulas,
            assumptions_classified=assumptions_classified,
            limitations=limitations,
            validation_path=validation_path,
        )

    # --------------------------------------------------------------------------
    # Comparative Economics
    # --------------------------------------------------------------------------

    def compare_estimates(
        self,
        baseline: EconomicEstimate,
        proposed: EconomicEstimate,
    ) -> EconomicComparison:
        """
        Compare baseline and proposed modeled estimates neutrally without value judgment.
        Delta convention: delta = proposed - baseline.
        """
        if baseline.currency != proposed.currency:
            raise CurrencyMismatchError(
                f"Cannot compare scenarios across different currencies: {baseline.currency} vs {proposed.currency}"
            )

        currency = baseline.currency
        diff = round(proposed.monthly - baseline.monthly, 2)
        rel_pct = (
            round((diff / baseline.monthly) * 100.0, 2)
            if baseline.monthly > 0
            else 0.0
        )

        if diff < 0:
            explanation = (
                f"The proposed scenario models {currency} {abs(diff):.2f}/month lower cost "
                f"({abs(rel_pct):.1f}% reduction) under the supplied workload and resource assumptions."
            )
        elif diff > 0:
            explanation = (
                f"The proposed scenario models {currency} {diff:.2f}/month higher cost "
                f"(+{rel_pct:.1f}% increase) under the supplied workload and resource assumptions."
            )
        else:
            explanation = "Both scenarios model identical monthly cost under the supplied assumptions."

        methodology_note = (
            "Delta convention: Delta = Proposed - Baseline. "
            "These modeled differences reflect structural and configuration assumptions. "
            "Architectural fitness and ROI must be interpreted by the engineering decision-maker."
        )

        return EconomicComparison(
            baseline_monthly=baseline.monthly,
            proposed_monthly=proposed.monthly,
            absolute_difference=diff,
            relative_difference_pct=rel_pct,
            currency=currency,
            baseline_breakdown=baseline.breakdown,
            proposed_breakdown=proposed.breakdown,
            explanation=explanation,
            methodology_note=methodology_note,
        )

    # --------------------------------------------------------------------------
    # Scenario Evaluation & Persistence Workflow
    # --------------------------------------------------------------------------

    async def evaluate_and_persist_scenario(
        self,
        *,
        organization_id: int,
        repository_id: int,
        experiment_id: int,
        run_id: int | None,
        workload_profile_id: int | None,
        resource_profile_id: int,
        pricing_snapshot_id: int,
        scenario_name: str,
        description: str | None = None,
        proposed_resource_profile_id: int | None = None,
    ) -> tuple[CostScenario, EvidenceItem]:
        """
        Full workflow:
        1. Validates experiment and profiles tenancy.
        2. Retrieves rate card and profiles.
        3. Computes baseline and proposed estimates.
        4. Calculates comparative differences.
        5. Persists CostScenario in lab_cost_scenarios.
        6. Persists traceable EvidenceItem with MODELED category in lab_evidence_ledger.
        """
        # Verify tenancy
        repo = await self.repo_repo.get_by_id(repository_id)
        if repo is None or repo.organization_id != organization_id:
            raise EconomicInputValidationError("Repository not found or access denied.")

        experiment = await self.lab_repo.get_experiment_by_id(experiment_id)
        if experiment is None:
            raise EconomicInputValidationError(f"Experiment {experiment_id} not found.")

        # Load Resource Profile
        resource = await self.lab_repo.get_resource_profile_by_id(resource_profile_id)
        if resource is None or resource.repository_id != repository_id:
            raise EconomicInputValidationError(f"Resource profile {resource_profile_id} not found for repository.")

        # Load Pricing Snapshot
        pricing = await self.lab_repo.get_pricing_snapshot_by_id(pricing_snapshot_id)
        if pricing is None:
            raise EconomicInputValidationError(f"Pricing snapshot {pricing_snapshot_id} not found.")

        # Load optional Workload Profile
        workload: WorkloadProfile | None = None
        if workload_profile_id is not None:
            workload = await self.lab_repo.get_workload_profile_by_id(workload_profile_id)
            if workload is None or workload.repository_id != repository_id:
                raise EconomicInputValidationError(f"Workload profile {workload_profile_id} not found for repository.")

        # Optional proposed resource profile
        proposed_resource = resource
        if proposed_resource_profile_id is not None:
            pr = await self.lab_repo.get_resource_profile_by_id(proposed_resource_profile_id)
            if pr is not None and pr.repository_id == repository_id:
                proposed_resource = pr

        # Calculate Baseline Estimate
        baseline_estimate = self.calculate_estimate(
            resource=resource,
            workload=workload,
            pricing=pricing,
            scaling_multiplier=1.0,
        )

        # Calculate Proposed Estimate
        # If no explicit proposed profile, model structural refactor effect from experiment run if available
        scaling_multiplier = 1.0
        if proposed_resource_profile_id is None and run_id is not None:
            run = await self.lab_repo.get_experiment_run_by_id(run_id)
            if run and run.result_data:
                diffs = run.result_data.get("differences", {})
                # If dependencies or components reduced, model modest operational footprint reduction
                efferent_diff = diffs.get("efferent_coupling", 0)
                if efferent_diff < 0:
                    scaling_multiplier = max(0.8, 1.0 + (efferent_diff * 0.05))

        proposed_estimate = self.calculate_estimate(
            resource=proposed_resource,
            workload=workload,
            pricing=pricing,
            scaling_multiplier=scaling_multiplier,
        )

        comparison = self.compare_estimates(baseline_estimate, proposed_estimate)

        # Build CostScenario outputs and assumptions
        calc_timestamp = datetime.now(timezone.utc)
        assumptions_payload = {
            "workload_profile_id": workload.id if workload else None,
            "workload_name": workload.name if workload else "Unspecified",
            "workload_is_measured": workload.is_measured if workload else False,
            "resource_profile_id": resource.id,
            "resource_name": resource.name,
            "proposed_resource_profile_id": proposed_resource.id,
            "pricing_snapshot_id": pricing.id,
            "pricing_source": pricing.pricing_source,
            "provider": pricing.provider,
            "region": pricing.region,
            "assumptions_classified": baseline_estimate.assumptions_classified,
        }

        def _breakdown_dict(b: CostBreakdown) -> dict[str, float]:
            d = asdict(b)
            d["total_monthly"] = b.total_monthly
            return d

        cost_outputs_payload = {
            "baseline": {
                "hourly": baseline_estimate.hourly,
                "daily": baseline_estimate.daily,
                "monthly": baseline_estimate.monthly,
                "annual": baseline_estimate.annual,
                "breakdown": _breakdown_dict(baseline_estimate.breakdown),
                "formulas": baseline_estimate.formulas,
            },
            "proposed": {
                "hourly": proposed_estimate.hourly,
                "daily": proposed_estimate.daily,
                "monthly": proposed_estimate.monthly,
                "annual": proposed_estimate.annual,
                "breakdown": _breakdown_dict(proposed_estimate.breakdown),
                "formulas": proposed_estimate.formulas,
            },
            "comparison": {
                "absolute_difference": comparison.absolute_difference,
                "relative_difference_pct": comparison.relative_difference_pct,
                "explanation": comparison.explanation,
                "methodology_note": comparison.methodology_note,
            },
            "limitations": baseline_estimate.limitations,
            "validation_path": baseline_estimate.validation_path,
        }

        calculation_metadata = {
            "calculator": "ArchitecturalEconomicsService",
            "version": "1.0",
            "calculated_at": calc_timestamp.isoformat(),
            "currency": pricing.currency,
            "evidence_category": EvidenceCategory.MODELED.value,
        }

        # 1. Create and persist CostScenario
        scenario = CostScenario(
            experiment_id=experiment_id,
            run_id=run_id,
            workload_profile_id=workload.id if workload else None,
            resource_profile_id=resource.id,
            pricing_snapshot_id=pricing.id,
            name=scenario_name,
            description=description,
            assumptions=assumptions_payload,
            estimated_cost_outputs=cost_outputs_payload,
            currency=pricing.currency,
            calculation_metadata=calculation_metadata,
        )
        saved_scenario = await self.lab_repo.create_cost_scenario(scenario)

        # 2. Persist EvidenceItem in lab_evidence_ledger
        evidence_claim = (
            f"Modeled monthly cost: {pricing.currency} {proposed_estimate.monthly:.2f} "
            f"(difference: {pricing.currency} {comparison.absolute_difference:+.2f} / "
            f"{comparison.relative_difference_pct:+.1f}%) under {resource.name} and {pricing.pricing_source} assumptions."
        )

        evidence_provenance = {
            "cost_scenario_id": saved_scenario.id,
            "experiment_id": experiment_id,
            "run_id": run_id,
            "workload_profile_id": workload.id if workload else None,
            "resource_profile_id": resource.id,
            "pricing_snapshot_id": pricing.id,
            "calculator_version": "ArchitecturalEconomicsService v1.0",
            "calculated_at": calc_timestamp.isoformat(),
            "evidence_category": EvidenceCategory.MODELED.value,
            "evidence_category_justification": (
                "MODELED category: cost projections are derived from configured workload and resource "
                "assumptions applied to a captured pricing rate card. Does not represent observed runtime billing."
            ),
            "confidence_type": "deterministic_formula_projection",
            "confidence_rationale": "Exact arithmetic evaluation of declared rate cards; requires benchmark validation.",
        }

        evidence_item = EvidenceItem(
            organization_id=organization_id,
            repository_id=repository_id,
            hypothesis_id=experiment.hypothesis_id,
            experiment_id=experiment.id,
            run_id=run_id,
            category=EvidenceCategory.MODELED.value,
            source_type="ARCHITECTURAL_ECONOMICS",
            subject=f"Economic Footprint: {scenario_name}",
            claim=evidence_claim,
            data={
                "cost_scenario_id": saved_scenario.id,
                "baseline_monthly": baseline_estimate.monthly,
                "proposed_monthly": proposed_estimate.monthly,
                "monthly_difference": comparison.absolute_difference,
                "relative_difference_pct": comparison.relative_difference_pct,
                "currency": pricing.currency,
                "breakdown": asdict(proposed_estimate.breakdown),
            },
            confidence=0.85 if (workload and workload.is_measured) else 0.65,
            provenance=evidence_provenance,
        )
        saved_evidence = await self.lab_repo.create_evidence_item(evidence_item)
        await self.db.commit()

        logger.info(
            "Architectural Economics scenario id=%d evaluated and persisted for experiment_id=%d",
            saved_scenario.id,
            experiment_id,
        )
        return saved_scenario, saved_evidence
