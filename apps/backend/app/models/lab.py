"""
Architecture Lab & Architectural Economics Intelligence (AEI) database models.

Represents the core persistence foundation for architectural hypothesis evaluation,
interventions, experiments, workload & resource profiles, pricing snapshots,
evidence ledger, cost scenarios, and engineering decision records.

Tenancy hierarchy:

    Organization
        ↓
    Repository
        ↓
    Hypothesis
        ├── Intervention (proposed architectural changes)
        ├── Experiment (evaluation definition)
        │   ├── ExperimentRun (evaluation executions)
        │   └── CostScenario (modeled/projected economic estimates)
        ├── EvidenceItem (durable evidence ledger preserving provenance)
        └── DecisionRecord (human engineering decisions: ACCEPT/REJECT/DEFER)

WorkloadProfile & ResourceProfile belong directly to Repository/Organization
and can be associated across experiments and cost scenarios.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING, Any

from app.db.base import Base
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.organization import Organization
    from app.models.repository import Repository
    from app.models.user import User


# ==============================================================================
# Domain Enums
# ==============================================================================


class HypothesisStatus(StrEnum):
    """Lifecycle status of an architectural hypothesis."""

    DRAFT = "DRAFT"
    READY = "READY"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class InterventionType(StrEnum):
    """
    Standard architectural intervention types aligned with Coodara terminology.
    """

    REMOVE = "REMOVE"
    BREAKING_REFACTOR = "BREAKING_REFACTOR"
    COMPATIBLE_REFACTOR = "COMPATIBLE_REFACTOR"
    MOVE = "MOVE"
    SPLIT = "SPLIT"
    MERGE = "MERGE"


class ExperimentStatus(StrEnum):
    """Lifecycle status of an architecture experiment definition."""

    DRAFT = "DRAFT"
    READY = "READY"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class ExperimentRunStatus(StrEnum):
    """Execution status of an individual experiment run."""

    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class EvidenceCategory(StrEnum):
    """
    AEI Evidence Provenance Taxonomy.

    Crucial: STATIC, OBSERVED, MEASURED, MODELED, and PROJECTED represent
    distinct degrees of empirical certainty. Never collapse measured evidence
    and modeled/projected estimates into the same semantic category.
    """

    STATIC = "STATIC"          # Extracted from code AST, manifests, structure
    OBSERVED = "OBSERVED"      # Inferred from runtime traces, configs, deployment topologies
    MEASURED = "MEASURED"      # Quantified from actual benchmarks or telemetry runs
    MODELED = "MODELED"        # Derived from algorithmic models, graph propagation, formulas
    PROJECTED = "PROJECTED"    # Economic or capacity forecasts under scenario assumptions


class DecisionStatus(StrEnum):
    """Engineering decision outcome for a hypothesis/intervention."""

    ACCEPT = "ACCEPT"
    REJECT = "REJECT"
    DEFER = "DEFER"
    NEEDS_VALIDATION = "NEEDS_VALIDATION"


# ==============================================================================
# Domain Entities
# ==============================================================================


class Hypothesis(Base):
    """
    Represents an engineering hypothesis or investigative question regarding
    potential architectural evolution.
    """

    __tablename__ = "lab_hypotheses"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    repository_id: Mapped[int] = mapped_column(
        ForeignKey("repositories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    question: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=HypothesisStatus.DRAFT.value,
        server_default=HypothesisStatus.DRAFT.value,
        index=True,
    )

    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    interventions: Mapped[list[Intervention]] = relationship(
        "Intervention",
        back_populates="hypothesis",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    experiments: Mapped[list[Experiment]] = relationship(
        "Experiment",
        back_populates="hypothesis",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    evidence_items: Mapped[list[EvidenceItem]] = relationship(
        "EvidenceItem",
        back_populates="hypothesis",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    decisions: Mapped[list[DecisionRecord]] = relationship(
        "DecisionRecord",
        back_populates="hypothesis",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"Hypothesis(id={self.id}, title={self.title!r}, status={self.status!r})"


class Intervention(Base):
    """
    Represents a proposed architectural mutation (e.g. SPLIT, MERGE, REFACTOR)
    associated with a hypothesis. References canonical architecture components.
    """

    __tablename__ = "lab_interventions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    hypothesis_id: Mapped[int] = mapped_column(
        ForeignKey("lab_hypotheses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    intervention_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # Identifiers of target components from ArchitectureComponent / ArchitectureGraph
    target_component_ids: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    # Configuration/parameters for this intervention (e.g. boundary configs, interface contracts)
    parameters: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    hypothesis: Mapped[Hypothesis] = relationship(
        "Hypothesis",
        back_populates="interventions",
    )

    def __repr__(self) -> str:
        return (
            f"Intervention(id={self.id}, hypothesis_id={self.hypothesis_id}, "
            f"type={self.intervention_type!r}, title={self.title!r})"
        )


class Experiment(Base):
    """
    Represents an experiment definition comparing a baseline architecture against
    a proposed architecture variant.
    """

    __tablename__ = "lab_experiments"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    hypothesis_id: Mapped[int] = mapped_column(
        ForeignKey("lab_hypotheses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=ExperimentStatus.DRAFT.value,
        server_default=ExperimentStatus.DRAFT.value,
        index=True,
    )

    # Reference to baseline state (e.g. {"snapshot_id": 12, "commit_sha": "abc"})
    baseline_reference: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    # Reference to proposed state (e.g. {"intervention_id": 5, "variant": "split_service"})
    proposed_reference: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    hypothesis: Mapped[Hypothesis] = relationship(
        "Hypothesis",
        back_populates="experiments",
    )

    runs: Mapped[list[ExperimentRun]] = relationship(
        "ExperimentRun",
        back_populates="experiment",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    evidence_items: Mapped[list[EvidenceItem]] = relationship(
        "EvidenceItem",
        back_populates="experiment",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    cost_scenarios: Mapped[list[CostScenario]] = relationship(
        "CostScenario",
        back_populates="experiment",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"Experiment(id={self.id}, name={self.name!r}, status={self.status!r})"


class ExperimentRun(Base):
    """
    Represents an individual execution/evaluation run of an experiment.
    """

    __tablename__ = "lab_experiment_runs"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    experiment_id: Mapped[int] = mapped_column(
        ForeignKey("lab_experiments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    run_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=ExperimentRunStatus.PENDING.value,
        server_default=ExperimentRunStatus.PENDING.value,
        index=True,
    )

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    error: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    experiment: Mapped[Experiment] = relationship(
        "Experiment",
        back_populates="runs",
    )

    evidence_items: Mapped[list[EvidenceItem]] = relationship(
        "EvidenceItem",
        back_populates="run",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    cost_scenarios: Mapped[list[CostScenario]] = relationship(
        "CostScenario",
        back_populates="run",
    )

    def __repr__(self) -> str:
        return f"ExperimentRun(id={self.id}, experiment_id={self.experiment_id}, status={self.status!r})"


class WorkloadProfile(Base):
    """
    Represents workload assumptions or measured production traffic characteristics
    used when evaluating architecture candidates.
    """

    __tablename__ = "lab_workload_profiles"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    repository_id: Mapped[int] = mapped_column(
        ForeignKey("repositories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    requests_per_second: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    batch_volume: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    concurrency: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    read_write_ratio: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    data_volume_gb: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    workload_pattern: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        default="steady",
        server_default="steady",
    )

    # Detailed structured assumptions (rates, peaks, distributions)
    configuration: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    # Crucial AEI distinction: whether numbers are measured telemetry vs modeled assumption
    is_measured: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"WorkloadProfile(id={self.id}, name={self.name!r}, is_measured={self.is_measured})"


class ResourceProfile(Base):
    """
    Represents infrastructure/resource assumptions (e.g. CPU, memory, DB class, replicas)
    used to evaluate system capacity and economic footprint.
    """

    __tablename__ = "lab_resource_profiles"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    repository_id: Mapped[int] = mapped_column(
        ForeignKey("repositories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="generic",
        server_default="generic",
    )

    region: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="us-east-1",
        server_default="us-east-1",
    )

    cpu: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    memory: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    database_class: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    replicas: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default="1",
    )

    storage_gb: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    # Runtime configuration, instance sizes, auto-scale policies
    configuration: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"ResourceProfile(id={self.id}, name={self.name!r}, provider={self.provider!r})"


class PricingSnapshot(Base):
    """
    Represents the pricing rate card and reference data used for economic calculations.
    Models assumptions used for a scenario; does not claim actual cloud billing.
    """

    __tablename__ = "lab_pricing_snapshots"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    region: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    pricing_source: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="USD",
        server_default="USD",
    )

    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    # Unit prices for compute (per vCPU-hour), RAM (per GiB-hour), storage (per GB-month), network egress
    pricing_data: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    # Metadata regarding contract, list prices, discounts, or source links
    source_metadata: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"PricingSnapshot(id={self.id}, provider={self.provider!r}, "
            f"region={self.region!r}, currency={self.currency!r})"
        )


class EvidenceItem(Base):
    """
    Durable entry in the AEI evidence ledger.
    Every evidence item strictly maintains provenance and classification category:
    STATIC, OBSERVED, MEASURED, MODELED, or PROJECTED.
    """

    __tablename__ = "lab_evidence_ledger"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    repository_id: Mapped[int] = mapped_column(
        ForeignKey("repositories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    hypothesis_id: Mapped[int | None] = mapped_column(
        ForeignKey("lab_hypotheses.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    experiment_id: Mapped[int | None] = mapped_column(
        ForeignKey("lab_experiments.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    run_id: Mapped[int | None] = mapped_column(
        ForeignKey("lab_experiment_runs.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Fundamental AEI category: STATIC, OBSERVED, MEASURED, MODELED, PROJECTED
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    # Specific engine/source (e.g. AST_PARSER, TOPOLOGY_INSPECTOR, BENCHMARK_HARNESS, COST_SIMULATION)
    source_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # Subject entity (component name, coupling metric, memory consumption)
    subject: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # Descriptive statement/finding
    claim: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # Quantitative payload (metrics, diffs, observations)
    data: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    confidence: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    # Audit trail (git commit, analysis_job_id, engine version, capture parameters)
    provenance: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    hypothesis: Mapped[Hypothesis | None] = relationship(
        "Hypothesis",
        back_populates="evidence_items",
    )

    experiment: Mapped[Experiment | None] = relationship(
        "Experiment",
        back_populates="evidence_items",
    )

    run: Mapped[ExperimentRun | None] = relationship(
        "ExperimentRun",
        back_populates="evidence_items",
    )

    def __repr__(self) -> str:
        return f"EvidenceItem(id={self.id}, category={self.category!r}, subject={self.subject!r})"


class CostScenario(Base):
    """
    Persistence model for an Architectural Economics scenario.
    Associates workload profiles, resource profiles, and pricing snapshots to produce
    modeled/projected cost estimates. Never claims unsupported certainty.
    """

    __tablename__ = "lab_cost_scenarios"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    experiment_id: Mapped[int] = mapped_column(
        ForeignKey("lab_experiments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    run_id: Mapped[int | None] = mapped_column(
        ForeignKey("lab_experiment_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    workload_profile_id: Mapped[int | None] = mapped_column(
        ForeignKey("lab_workload_profiles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    resource_profile_id: Mapped[int | None] = mapped_column(
        ForeignKey("lab_resource_profiles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    pricing_snapshot_id: Mapped[int | None] = mapped_column(
        ForeignKey("lab_pricing_snapshots.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # Explicit scenario assumptions
    assumptions: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    # Modeled/projected cost outputs (compute, storage, network, monthly_total, delta_vs_baseline)
    estimated_cost_outputs: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="USD",
        server_default="USD",
    )

    # Model parameters, formula versions, calculation timestamp
    calculation_metadata: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    experiment: Mapped[Experiment] = relationship(
        "Experiment",
        back_populates="cost_scenarios",
    )

    run: Mapped[ExperimentRun | None] = relationship(
        "ExperimentRun",
        back_populates="cost_scenarios",
    )

    workload_profile: Mapped[WorkloadProfile | None] = relationship(
        "WorkloadProfile",
    )

    resource_profile: Mapped[ResourceProfile | None] = relationship(
        "ResourceProfile",
    )

    pricing_snapshot: Mapped[PricingSnapshot | None] = relationship(
        "PricingSnapshot",
    )

    def __repr__(self) -> str:
        return f"CostScenario(id={self.id}, name={self.name!r}, currency={self.currency!r})"


class DecisionRecord(Base):
    """
    Captures the human engineering decision regarding a hypothesis and its interventions.
    The engineer remains the decision-maker; the system never makes acceptance decisions automatically.
    """

    __tablename__ = "lab_decision_records"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    hypothesis_id: Mapped[int] = mapped_column(
        ForeignKey("lab_hypotheses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    experiment_id: Mapped[int | None] = mapped_column(
        ForeignKey("lab_experiments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ACCEPT, REJECT, DEFER, NEEDS_VALIDATION
    decision: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    rationale: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    selected_intervention_id: Mapped[int | None] = mapped_column(
        ForeignKey("lab_interventions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Array of evidence ledger item IDs cited in support of this decision
    supporting_evidence_ids: Mapped[list[int]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    decision_maker: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    hypothesis: Mapped[Hypothesis] = relationship(
        "Hypothesis",
        back_populates="decisions",
    )

    selected_intervention: Mapped[Intervention | None] = relationship(
        "Intervention",
    )

    def __repr__(self) -> str:
        return f"DecisionRecord(id={self.id}, hypothesis_id={self.hypothesis_id}, decision={self.decision!r})"
