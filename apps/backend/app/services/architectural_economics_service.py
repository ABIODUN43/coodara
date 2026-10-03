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
    compute_modeled: bool = True
    memory_modeled: bool = True
    database_modeled: bool = True
    storage_modeled: bool = True
    network_modeled: bool = True
    unmodeled_reasons: dict[str, str] = field(default_factory=dict)

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
    calculation_completeness: str = "COMPLETE"  # "COMPLETE" or "PARTIAL"
    modeled_components: list[str] = field(default_factory=list)
    unmodeled_components: list[str] = field(default_factory=list)
    unmodeled_reasons: dict[str, str] = field(default_factory=dict)
    conventions: dict[str, Any] = field(
        default_factory=lambda: {
            "hours_per_month": HOURS_PER_MONTH,
            "days_per_month": DAYS_PER_MONTH,
            "hours_per_day": HOURS_PER_DAY,
        }
    )


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
    baseline_completeness: str = "COMPLETE"  # "COMPLETE" or "PARTIAL"
    proposed_completeness: str = "COMPLETE"  # "COMPLETE" or "PARTIAL"
    comparison_completeness: str = "COMPLETE"  # "COMPLETE" or "PARTIAL"
    common_modeled_components: list[str] = field(default_factory=list)
    unmodeled_components: list[str] = field(default_factory=list)


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
            raise EconomicInputValidationError("vCPU specification is required in ResourceProfile.")
        if isinstance(cpu_str, (int, float)):
            val = float(cpu_str)
            if val <= 0:
                raise EconomicInputValidationError("vCPU must be strictly positive.")
            return val

        raw = str(cpu_str).strip().lower()
        if not raw:
            raise EconomicInputValidationError("vCPU specification cannot be empty.")
        if raw.endswith("m"):  # Kubernetes millicores
            try:
                val = float(raw[:-1]) / 1000.0
                if val <= 0:
                    raise EconomicInputValidationError("vCPU must be strictly positive.")
                return val
            except ValueError:
                raise EconomicInputValidationError(f"Invalid vCPU millicores format: '{cpu_str}'")

        match = re.search(r"^([\d.]+)", raw)
        if match:
            try:
                val = float(match.group(1))
                if val <= 0:
                    raise EconomicInputValidationError("vCPU must be strictly positive.")
                return val
            except ValueError:
                raise EconomicInputValidationError(f"Invalid vCPU format: '{cpu_str}'")
        raise EconomicInputValidationError(f"Unable to parse vCPU from value: '{cpu_str}'")

    @staticmethod
    def parse_memory_gib(mem_str: str | float | int | None) -> float:
        """Parse memory in GiB from diverse formats (e.g. '4Gi', '4096Mi', '4GB', 4.0)."""
        if mem_str is None:
            raise EconomicInputValidationError("Memory specification is required in ResourceProfile.")
        if isinstance(mem_str, (int, float)):
            val = float(mem_str)
            if val <= 0:
                raise EconomicInputValidationError("Memory must be strictly positive.")
            return val

        raw = str(mem_str).strip().lower()
        if not raw:
            raise EconomicInputValidationError("Memory specification cannot be empty.")
        if "mi" in raw or "mb" in raw:
            match = re.search(r"([\d.]+)", raw)
            if match:
                try:
                    val = float(match.group(1)) / 1024.0
                    if val <= 0:
                        raise EconomicInputValidationError("Memory must be strictly positive.")
                    return val
                except ValueError:
                    raise EconomicInputValidationError(f"Invalid memory MiB/MB format: '{mem_str}'")

        match = re.search(r"^([\d.]+)", raw)
        if match:
            try:
                val = float(match.group(1))
                if val <= 0:
                    raise EconomicInputValidationError("Memory must be strictly positive.")
                return val
            except ValueError:
                raise EconomicInputValidationError(f"Invalid memory format: '{mem_str}'")
        raise EconomicInputValidationError(f"Unable to parse memory from value: '{mem_str}'")

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
        Deterministically calculate infrastructure cost estimates from supplied rate card.
        """
        if scaling_multiplier <= 0:
            raise EconomicInputValidationError("Scaling multiplier must be strictly positive.")

        rates = pricing.pricing_data or {}
        currency = pricing.currency or "USD"

        # Rate card units: compute and memory are mandatory
        vcpu_rate_val = rates.get("vcpu_hour") if "vcpu_hour" in rates else rates.get("compute_unit_hour")
        if vcpu_rate_val is None:
            raise PricingRateNotFoundError(
                f"Missing required rate 'vcpu_hour' in PricingSnapshot '{pricing.pricing_source}' (id={pricing.id})"
            )
        vcpu_rate = float(vcpu_rate_val)

        memory_rate_val = rates.get("memory_gib_hour") if "memory_gib_hour" in rates else rates.get("ram_gib_hour")
        if memory_rate_val is None:
            raise PricingRateNotFoundError(
                f"Missing required rate 'memory_gib_hour' in PricingSnapshot '{pricing.pricing_source}' (id={pricing.id})"
            )
        memory_rate = float(memory_rate_val)

        # Parse resource sizing
        vcpus = self.parse_vcpu(resource.cpu)
        memory_gib = self.parse_memory_gib(resource.memory)
        replicas = max(1, resource.replicas if resource.replicas is not None else 1)
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
        database_modeled: bool = True
        monthly_database: float = 0.0
        database_unmodeled_reason: str | None = None
        if has_database:
            db_rate_val = rates.get("database_hour") if "database_hour" in rates else rates.get("db_instance_hour")
            if db_rate_val is None:
                database_modeled = False
                monthly_database = 0.0
                database_unmodeled_reason = (
                    f"Database instance rate 'database_hour' missing from PricingSnapshot rate card for {resource.database_class}"
                )
                db_formula = (
                    f"Database instance cost not modeled: missing 'database_hour' in PricingSnapshot rate card for {resource.database_class}"
                )
            else:
                db_rate = float(db_rate_val)
                monthly_database = round(db_rate * HOURS_PER_MONTH, 2)
                db_formula = f"{resource.database_class} × {currency} {db_rate:.4f}/hr × {HOURS_PER_MONTH} hrs/mo"
        else:
            db_formula = "No dedicated database instance configured in resource profile"

        # 4. Storage Cost
        storage_rate_val = rates.get("storage_gb_month") if "storage_gb_month" in rates else rates.get("disk_gb_month")
        monthly_storage: float = 0.0
        storage_modeled: bool = True
        storage_unmodeled_reason: str | None = None
        if resource.storage_gb is None:
            storage_modeled = False
            monthly_storage = 0.0
            storage_unmodeled_reason = "Persistent storage capacity not specified in ResourceProfile"
            storage_formula = "Storage cost not modeled: persistent storage capacity not specified in ResourceProfile"
        elif float(resource.storage_gb) == 0.0:
            storage_modeled = True
            monthly_storage = 0.0
            storage_formula = "No persistent storage volume configured in resource profile (0 GB)"
        else:
            storage_gb = float(resource.storage_gb)
            if storage_rate_val is None:
                storage_modeled = False
                monthly_storage = 0.0
                storage_unmodeled_reason = "Storage unit rate 'storage_gb_month' missing from PricingSnapshot rate card"
                storage_formula = "Storage cost not modeled: missing 'storage_gb_month' in PricingSnapshot rate card"
            else:
                storage_rate = float(storage_rate_val)
                monthly_storage = round(storage_gb * storage_rate, 2)
                storage_formula = f"{storage_gb:.1f} GB × {currency} {storage_rate:.4f}/GB-mo"

        # 5. Network / Egress Cost (requires explicit network egress inputs; data_volume_gb is working set, not egress)
        workload_cfg = workload.configuration if (workload and isinstance(workload.configuration, dict)) else {}
        monthly_egress_cfg = workload_cfg.get("monthly_egress_gb") or workload_cfg.get("egress_volume_gb")
        avg_kb_cfg = workload_cfg.get("average_egress_kb_per_request")

        monthly_egress_gb: float | None = None
        network_calculation_source = ""

        if monthly_egress_cfg is not None:
            try:
                val = float(monthly_egress_cfg)
                if val >= 0:
                    monthly_egress_gb = val
                    network_calculation_source = f"{monthly_egress_gb:.1f} GB monthly egress from configuration"
            except (ValueError, TypeError):
                pass

        rps = float(workload.requests_per_second or 0.0) if workload else 0.0
        if monthly_egress_gb is None and avg_kb_cfg is not None and rps > 0:
            try:
                avg_kb = float(avg_kb_cfg)
                if avg_kb >= 0:
                    monthly_requests = rps * 86400 * DAYS_PER_MONTH
                    monthly_egress_gb = (monthly_requests * avg_kb) / (1024.0 * 1024.0)
                    network_calculation_source = (
                        f"{rps:.1f} req/s (~{monthly_requests:,.0f} req/mo @ {avg_kb:.1f} KB avg payload)"
                    )
            except (ValueError, TypeError):
                pass

        network_modeled: bool = False
        monthly_network: float = 0.0
        network_unmodeled_reason: str | None = None
        if monthly_egress_gb is not None:
            network_rate_val = rates.get("network_egress_gb") if "network_egress_gb" in rates else rates.get("egress_per_gb")
            if network_rate_val is None:
                network_modeled = False
                monthly_network = 0.0
                network_unmodeled_reason = "Network egress unit rate 'network_egress_gb' missing from PricingSnapshot rate card"
                network_formula = (
                    "Network egress cost not modeled: missing 'network_egress_gb' in PricingSnapshot rate card"
                )
            else:
                network_rate = float(network_rate_val)
                monthly_network = round(monthly_egress_gb * network_rate, 2)
                network_modeled = True
                network_formula = (
                    f"{network_calculation_source} = {monthly_egress_gb:.2f} GB × {currency} {network_rate:.4f}/GB"
                )
        else:
            network_modeled = False
            monthly_network = 0.0
            network_unmodeled_reason = "Explicit egress volume input (monthly_egress_gb or average_egress_kb_per_request) required"
            network_formula = (
                "Network egress cost not modeled: explicit monthly_egress_gb, egress_volume_gb, "
                "or average_egress_kb_per_request with request rate required"
            )

        # Build unmodeled reasons and completeness state
        unmodeled_reasons: dict[str, str] = {}
        modeled_components: list[str] = []
        unmodeled_components: list[str] = []

        for comp, is_modeled, reason in [
            ("compute", True, None),
            ("memory", True, None),
            ("database", database_modeled, database_unmodeled_reason),
            ("storage", storage_modeled, storage_unmodeled_reason),
            ("network", network_modeled, network_unmodeled_reason),
        ]:
            if is_modeled:
                modeled_components.append(comp)
            else:
                unmodeled_components.append(comp)
                if reason:
                    unmodeled_reasons[comp] = reason

        calculation_completeness = "COMPLETE" if not unmodeled_components else "PARTIAL"

        breakdown = CostBreakdown(
            compute=monthly_compute,
            memory=monthly_memory,
            database=monthly_database,
            storage=monthly_storage,
            network=monthly_network,
            other=0.0,
            compute_modeled=True,
            memory_modeled=True,
            database_modeled=database_modeled,
            storage_modeled=storage_modeled,
            network_modeled=network_modeled,
            unmodeled_reasons=unmodeled_reasons,
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
                "type": "SUPPLIED PRICING SNAPSHOT",
                "source": f"PricingSnapshot #{pricing.id} '{pricing.pricing_source}' captured {pricing.captured_at.strftime('%Y-%m-%d') if pricing.captured_at else 'unspecified'}",
            },
        ]
        data_vol_gb = float(workload.data_volume_gb or 0.0) if workload else 0.0
        if data_vol_gb > 0:
            assumptions_classified.append({
                "field": "Data Working Set Size",
                "value": f"{data_vol_gb:.1f} GB",
                "type": "MEASURED" if (workload and workload.is_measured) else "ASSUMED",
                "source": f"WorkloadProfile '{workload.name}' (data_volume_gb, working set/storage size, not network egress)",
            })
        if monthly_egress_gb is not None:
            assumptions_classified.append({
                "field": "Network Egress Volume",
                "value": f"{monthly_egress_gb:.2f} GB/mo",
                "type": "MEASURED" if (workload and workload.is_measured) else "ASSUMED",
                "source": network_calculation_source,
            })

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

        if calculation_completeness == "COMPLETE":
            total_label = "Modeled Monthly Total"
        else:
            unmodeled_str = ", ".join(unmodeled_components)
            total_label = f"Modeled Monthly Total (Partial — excludes {unmodeled_str})"

        parts = [f"{currency} {monthly_compute:.2f} (compute)", f"{currency} {monthly_memory:.2f} (memory)"]
        if database_modeled:
            parts.append(f"{currency} {monthly_database:.2f} (db)")
        else:
            parts.append("[db unmodeled]")
        if storage_modeled:
            parts.append(f"{currency} {monthly_storage:.2f} (storage)")
        else:
            parts.append("[storage unmodeled]")
        if network_modeled:
            parts.append(f"{currency} {monthly_network:.2f} (network)")
        else:
            parts.append("[network unmodeled]")

        formulas = {
            "compute": compute_formula,
            "memory": memory_formula,
            "database": db_formula,
            "storage": storage_formula,
            "network": network_formula,
            "monthly_total": f"{' + '.join(parts)} = {currency} {monthly_total:.2f} ({total_label})",
        }

        return EconomicEstimate(
            hourly=hourly_total,
            daily=daily_total,
            monthly=monthly_total,
            annual=annual_total,
            currency=currency,
            calculation_completeness=calculation_completeness,
            modeled_components=modeled_components,
            unmodeled_components=unmodeled_components,
            unmodeled_reasons=unmodeled_reasons,
            breakdown=breakdown,
            formulas=formulas,
            assumptions_classified=assumptions_classified,
            limitations=limitations,
            validation_path=validation_path,
            conventions={
                "hours_per_month": HOURS_PER_MONTH,
                "days_per_month": DAYS_PER_MONTH,
                "hours_per_day": HOURS_PER_DAY,
            },
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

        all_core = ["compute", "memory", "database", "storage", "network"]
        baseline_set = set(baseline.modeled_components)
        proposed_set = set(proposed.modeled_components)
        common_modeled_components = [c for c in all_core if c in baseline_set and c in proposed_set]
        unmodeled_components = [c for c in all_core if c not in baseline_set or c not in proposed_set]

        baseline_completeness = baseline.calculation_completeness
        proposed_completeness = proposed.calculation_completeness
        comparison_completeness = (
            "COMPLETE"
            if (baseline_completeness == "COMPLETE" and proposed_completeness == "COMPLETE")
            else "PARTIAL"
        )

        if comparison_completeness == "COMPLETE":
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
                "Complete economic model: all infrastructure components (compute, memory, database, storage, network) "
                "are explicitly modeled across both baseline and proposed scenarios."
            )
        else:
            common_str = ", ".join(common_modeled_components) if common_modeled_components else "none"
            unmodeled_str = ", ".join(unmodeled_components) if unmodeled_components else "none"
            if diff < 0:
                explanation = (
                    f"The proposed scenario models {currency} {abs(diff):.2f}/month lower cost "
                    f"({abs(rel_pct):.1f}% reduction) across common modeled components ({common_str}). "
                    f"Note: This comparison is PARTIAL because some components ({unmodeled_str}) are unmodeled."
                )
            elif diff > 0:
                explanation = (
                    f"The proposed scenario models {currency} {diff:.2f}/month higher cost "
                    f"(+{rel_pct:.1f}% increase) across common modeled components ({common_str}). "
                    f"Note: This comparison is PARTIAL because some components ({unmodeled_str}) are unmodeled."
                )
            else:
                explanation = (
                    f"Both scenarios model identical monthly cost across common modeled components ({common_str}). "
                    f"Note: This comparison is PARTIAL because some components ({unmodeled_str}) are unmodeled."
                )

            methodology_note = (
                "Delta convention: Delta = Proposed - Baseline. "
                f"Partial economic comparison: Evaluated across common modeled components ({common_str}). "
                f"Unmodeled components ({unmodeled_str}) are excluded from the comparison delta. "
                "Architectural fitness and ROI must be interpreted with awareness of unmodeled infrastructure categories."
            )

        return EconomicComparison(
            baseline_monthly=baseline.monthly,
            proposed_monthly=proposed.monthly,
            absolute_difference=diff,
            relative_difference_pct=rel_pct,
            currency=currency,
            baseline_completeness=baseline_completeness,
            proposed_completeness=proposed_completeness,
            comparison_completeness=comparison_completeness,
            common_modeled_components=common_modeled_components,
            unmodeled_components=unmodeled_components,
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
            "calculation_completeness": baseline_estimate.calculation_completeness,
            "modeled_components": baseline_estimate.modeled_components,
            "unmodeled_components": baseline_estimate.unmodeled_components,
            "unmodeled_reasons": baseline_estimate.unmodeled_reasons,
            "assumptions_classified": baseline_estimate.assumptions_classified,
        }

        def _breakdown_dict(b: CostBreakdown) -> dict[str, Any]:
            d = asdict(b)
            d["total_monthly"] = b.total_monthly
            return d

        cost_outputs_payload = {
            "baseline": {
                "hourly": baseline_estimate.hourly,
                "daily": baseline_estimate.daily,
                "monthly": baseline_estimate.monthly,
                "annual": baseline_estimate.annual,
                "calculation_completeness": baseline_estimate.calculation_completeness,
                "modeled_components": baseline_estimate.modeled_components,
                "unmodeled_components": baseline_estimate.unmodeled_components,
                "unmodeled_reasons": baseline_estimate.unmodeled_reasons,
                "breakdown": _breakdown_dict(baseline_estimate.breakdown),
                "formulas": baseline_estimate.formulas,
                "conventions": baseline_estimate.conventions,
            },
            "proposed": {
                "hourly": proposed_estimate.hourly,
                "daily": proposed_estimate.daily,
                "monthly": proposed_estimate.monthly,
                "annual": proposed_estimate.annual,
                "calculation_completeness": proposed_estimate.calculation_completeness,
                "modeled_components": proposed_estimate.modeled_components,
                "unmodeled_components": proposed_estimate.unmodeled_components,
                "unmodeled_reasons": proposed_estimate.unmodeled_reasons,
                "breakdown": _breakdown_dict(proposed_estimate.breakdown),
                "formulas": proposed_estimate.formulas,
                "conventions": proposed_estimate.conventions,
            },
            "comparison": {
                "baseline_completeness": comparison.baseline_completeness,
                "proposed_completeness": comparison.proposed_completeness,
                "comparison_completeness": comparison.comparison_completeness,
                "common_modeled_components": comparison.common_modeled_components,
                "unmodeled_components": comparison.unmodeled_components,
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
        if comparison.comparison_completeness == "COMPLETE":
            evidence_claim = (
                f"Modeled monthly cost (COMPLETE): {pricing.currency} {proposed_estimate.monthly:.2f} "
                f"(difference: {pricing.currency} {comparison.absolute_difference:+.2f} / "
                f"{comparison.relative_difference_pct:+.1f}%) calculated from the supplied PricingSnapshot "
                f"'{pricing.pricing_source}' ({pricing.provider} {pricing.region}) and {resource.name} assumptions."
            )
        else:
            unmodeled_str = ", ".join(comparison.unmodeled_components)
            common_str = ", ".join(comparison.common_modeled_components)
            evidence_claim = (
                f"Modeled monthly cost (PARTIAL — excludes {unmodeled_str}): {pricing.currency} {proposed_estimate.monthly:.2f} "
                f"(difference: {pricing.currency} {comparison.absolute_difference:+.2f} / "
                f"{comparison.relative_difference_pct:+.1f}%) calculated from the supplied PricingSnapshot "
                f"'{pricing.pricing_source}' across common modeled components ({common_str})."
            )

        evidence_provenance = {
            "cost_scenario_id": saved_scenario.id,
            "experiment_id": experiment_id,
            "run_id": run_id,
            "workload_profile_id": workload.id if workload else None,
            "resource_profile_id": resource.id,
            "calculation_completeness": proposed_estimate.calculation_completeness,
            "comparison_completeness": comparison.comparison_completeness,
            "modeled_components": proposed_estimate.modeled_components,
            "unmodeled_components": proposed_estimate.unmodeled_components,
            "unmodeled_reasons": proposed_estimate.unmodeled_reasons,
            "pricing_snapshot": {
                "id": pricing.id,
                "provider": pricing.provider,
                "region": pricing.region,
                "currency": pricing.currency,
                "pricing_source": pricing.pricing_source,
                "captured_at": pricing.captured_at.isoformat() if pricing.captured_at else None,
                "source_metadata": pricing.source_metadata,
            },
            "calculator_version": "ArchitecturalEconomicsService v1.0",
            "calculated_at": calc_timestamp.isoformat(),
            "evidence_category": EvidenceCategory.MODELED.value,
            "evidence_category_justification": (
                "MODELED category: cost projections are derived from configured workload and resource "
                "assumptions applied to the supplied PricingSnapshot rate card. Does not represent observed runtime billing."
            ),
            "confidence_type": "deterministic_formula_projection",
            "confidence_rationale": "Exact arithmetic evaluation of declared rate cards; requires benchmark validation.",
            "conventions": baseline_estimate.conventions,
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
                "calculation_completeness": proposed_estimate.calculation_completeness,
                "comparison_completeness": comparison.comparison_completeness,
                "modeled_components": proposed_estimate.modeled_components,
                "unmodeled_components": proposed_estimate.unmodeled_components,
                "unmodeled_reasons": proposed_estimate.unmodeled_reasons,
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
