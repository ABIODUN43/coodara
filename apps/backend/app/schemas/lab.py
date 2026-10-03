"""
Pydantic schemas for Coodara Architecture Lab & Architectural Economics Intelligence (AEI).

Defines structured, validated representations for:
- Hypotheses
- Interventions
- Experiments & ExperimentRuns
- WorkloadProfiles & ResourceProfiles
- PricingSnapshots
- Evidence Ledger Items (preserving empirical vs modeled/projected taxonomy)
- CostScenarios (explicitly labeled as modeled/projected estimates)
- DecisionRecords
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from app.models.lab import (
    DecisionStatus,
    EvidenceCategory,
    ExperimentRunStatus,
    ExperimentStatus,
    HypothesisStatus,
    InterventionType,
)
from pydantic import BaseModel, ConfigDict, Field


# ==============================================================================
# Intervention Schemas
# ==============================================================================


class InterventionCreateRequest(BaseModel):
    """Payload to create an architectural intervention."""

    intervention_type: InterventionType
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    target_component_ids: list[str] = Field(default_factory=list)
    parameters: dict[str, Any] = Field(default_factory=dict)


class InterventionResponse(BaseModel):
    """Public representation of an architectural intervention."""

    id: int
    hypothesis_id: int
    intervention_type: InterventionType
    title: str
    description: str | None = None
    target_component_ids: list[str] = Field(default_factory=list)
    parameters: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Hypothesis Schemas
# ==============================================================================


class HypothesisCreateRequest(BaseModel):
    """Payload to initialize a new architectural hypothesis."""

    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    question: str = Field(min_length=1)
    status: HypothesisStatus = HypothesisStatus.DRAFT


class HypothesisUpdateRequest(BaseModel):
    """Payload to partially update an architectural hypothesis."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    question: str | None = Field(default=None, min_length=1)
    status: HypothesisStatus | None = None


class HypothesisResponse(BaseModel):
    """Public representation of an architectural hypothesis."""

    id: int
    organization_id: int
    repository_id: int
    title: str
    description: str | None = None
    question: str
    status: HypothesisStatus
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime
    interventions: list[InterventionResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Experiment & Run Schemas
# ==============================================================================


class ExperimentRunCreateRequest(BaseModel):
    """Payload to record an experiment execution run."""

    run_number: int = 1
    status: ExperimentRunStatus = ExperimentRunStatus.PENDING


class ExperimentRunResponse(BaseModel):
    """Public representation of an individual experiment run."""

    id: int
    experiment_id: int
    run_number: int
    status: ExperimentRunStatus
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExperimentCreateRequest(BaseModel):
    """Payload to define an architecture evaluation experiment."""

    hypothesis_id: int
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    status: ExperimentStatus = ExperimentStatus.DRAFT
    baseline_reference: dict[str, Any] = Field(default_factory=dict)
    proposed_reference: dict[str, Any] = Field(default_factory=dict)


class ExperimentResponse(BaseModel):
    """Public representation of an architecture experiment."""

    id: int
    hypothesis_id: int
    name: str
    description: str | None = None
    status: ExperimentStatus
    baseline_reference: dict[str, Any] = Field(default_factory=dict)
    proposed_reference: dict[str, Any] = Field(default_factory=dict)
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime
    runs: list[ExperimentRunResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Workload & Resource Profiles
# ==============================================================================


class WorkloadProfileCreateRequest(BaseModel):
    """Payload to define workload assumptions or production traffic profiles."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    requests_per_second: float | None = None
    batch_volume: float | None = None
    concurrency: int | None = None
    read_write_ratio: float | None = None
    data_volume_gb: float | None = None
    workload_pattern: str | None = "steady"
    configuration: dict[str, Any] = Field(default_factory=dict)
    is_measured: bool = False


class WorkloadProfileResponse(BaseModel):
    """Public representation of an architecture workload profile."""

    id: int
    organization_id: int
    repository_id: int
    name: str
    description: str | None = None
    requests_per_second: float | None = None
    batch_volume: float | None = None
    concurrency: int | None = None
    read_write_ratio: float | None = None
    data_volume_gb: float | None = None
    workload_pattern: str | None = "steady"
    configuration: dict[str, Any] = Field(default_factory=dict)
    is_measured: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResourceProfileCreateRequest(BaseModel):
    """Payload to specify infrastructure and deployment sizing assumptions."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    provider: str = "generic"
    region: str = "us-east-1"
    cpu: str | None = None
    memory: str | None = None
    database_class: str | None = None
    replicas: int = 1
    storage_gb: float | None = None
    configuration: dict[str, Any] = Field(default_factory=dict)


class ResourceProfileResponse(BaseModel):
    """Public representation of an architecture infrastructure resource profile."""

    id: int
    organization_id: int
    repository_id: int
    name: str
    description: str | None = None
    provider: str
    region: str
    cpu: str | None = None
    memory: str | None = None
    database_class: str | None = None
    replicas: int
    storage_gb: float | None = None
    configuration: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Pricing Snapshots
# ==============================================================================


class PricingSnapshotCreateRequest(BaseModel):
    """Payload to capture rate cards and reference pricing for calculations."""

    provider: str = Field(min_length=1, max_length=50)
    region: str = Field(min_length=1, max_length=50)
    pricing_source: str = Field(min_length=1, max_length=100)
    currency: str = "USD"
    captured_at: datetime | None = None
    pricing_data: dict[str, Any] = Field(default_factory=dict)
    source_metadata: dict[str, Any] = Field(default_factory=dict)


class PricingSnapshotResponse(BaseModel):
    """Public representation of reference cloud pricing data."""

    id: int
    provider: str
    region: str
    pricing_source: str
    currency: str
    captured_at: datetime
    pricing_data: dict[str, Any] = Field(default_factory=dict)
    source_metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Evidence Ledger Schemas
# ==============================================================================


class EvidenceItemCreateRequest(BaseModel):
    """Payload to record an evidence finding in the durable ledger."""

    hypothesis_id: int | None = None
    experiment_id: int | None = None
    run_id: int | None = None
    category: EvidenceCategory
    source_type: str = Field(min_length=1, max_length=100)
    subject: str = Field(min_length=1, max_length=255)
    claim: str = Field(min_length=1)
    data: dict[str, Any] = Field(default_factory=dict)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    provenance: dict[str, Any] = Field(default_factory=dict)


class EvidenceItemResponse(BaseModel):
    """
    Public representation of a durable evidence entry.
    Preserves category (STATIC, OBSERVED, MEASURED, MODELED, PROJECTED) and provenance.
    """

    id: int
    organization_id: int
    repository_id: int
    hypothesis_id: int | None = None
    experiment_id: int | None = None
    run_id: int | None = None
    category: EvidenceCategory
    source_type: str
    subject: str
    claim: str
    data: dict[str, Any] = Field(default_factory=dict)
    confidence: float | None = None
    provenance: dict[str, Any] = Field(default_factory=dict)
    recorded_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Cost Scenario Schemas
# ==============================================================================


class CostScenarioCreateRequest(BaseModel):
    """Payload to define an economic cost projection scenario."""

    experiment_id: int
    run_id: int | None = None
    workload_profile_id: int | None = None
    resource_profile_id: int | None = None
    pricing_snapshot_id: int | None = None
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    assumptions: dict[str, Any] = Field(default_factory=dict)
    estimated_cost_outputs: dict[str, Any] = Field(default_factory=dict)
    currency: str = "USD"
    calculation_metadata: dict[str, Any] = Field(default_factory=dict)


class CostScenarioResponse(BaseModel):
    """
    Public representation of an architectural economics cost scenario.
    Outputs are clearly labeled as modeled/projected estimates.
    """

    id: int
    experiment_id: int
    run_id: int | None = None
    workload_profile_id: int | None = None
    resource_profile_id: int | None = None
    pricing_snapshot_id: int | None = None
    name: str
    description: str | None = None
    assumptions: dict[str, Any] = Field(default_factory=dict)
    estimated_cost_outputs: dict[str, Any] = Field(default_factory=dict)
    currency: str
    calculation_metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Decision Record Schemas
# ==============================================================================


class DecisionRecordCreateRequest(BaseModel):
    """Payload to persist a human engineering decision for a hypothesis."""

    hypothesis_id: int
    experiment_id: int | None = None
    decision: DecisionStatus
    rationale: str = Field(min_length=1)
    selected_intervention_id: int | None = None
    supporting_evidence_ids: list[int] = Field(default_factory=list)
    decision_maker: str | None = None


class DecisionRecordResponse(BaseModel):
    """Public representation of an Architectural Decision Record."""

    id: int
    hypothesis_id: int
    experiment_id: int | None = None
    decision: DecisionStatus
    rationale: str
    selected_intervention_id: int | None = None
    supporting_evidence_ids: list[int] = Field(default_factory=list)
    decision_maker: str | None = None
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Lab Overview Consolidated Summary Schema
# ==============================================================================


class LabOverviewResponse(BaseModel):
    """Consolidated overview of Architecture Lab state for a repository."""

    repository_id: int
    organization_id: int
    hypotheses_count: int
    experiments_count: int
    evidence_count: int
    cost_scenarios_count: int
    decisions_count: int
    hypotheses: list[HypothesisResponse] = Field(default_factory=list)
    workload_profiles: list[WorkloadProfileResponse] = Field(default_factory=list)
    resource_profiles: list[ResourceProfileResponse] = Field(default_factory=list)
    recent_evidence: list[EvidenceItemResponse] = Field(default_factory=list)
    recent_decisions: list[DecisionRecordResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
