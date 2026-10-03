"""
Architecture Lab / AEI API router for Coodara.

Endpoints:
/api/v1/organizations/{organization_id}/repositories/{repository_id}/lab
"""

from __future__ import annotations

import logging
from typing import Annotated

from app.api.dependencies import OrganizationMemberDependency, get_current_active_user
from app.db.session import get_db
from app.models.lab import EvidenceCategory, HypothesisStatus
from app.models.user import User
from app.schemas.lab import (
    CostScenarioCreateRequest,
    CostScenarioResponse,
    DecisionRecordCreateRequest,
    DecisionRecordResponse,
    EvidenceItemCreateRequest,
    EvidenceItemResponse,
    ExperimentCreateRequest,
    ExperimentResponse,
    ExperimentRunCreateRequest,
    ExperimentRunResponse,
    HypothesisCreateRequest,
    HypothesisResponse,
    HypothesisUpdateRequest,
    InterventionCreateRequest,
    InterventionResponse,
    LabOverviewResponse,
    PricingSnapshotCreateRequest,
    PricingSnapshotResponse,
    ResourceProfileCreateRequest,
    ResourceProfileResponse,
    WorkloadProfileCreateRequest,
    WorkloadProfileResponse,
)
from app.services.lab_service import (
    LabRepositoryNotFoundError,
    LabResourceNotFoundError,
    LabService,
    LabValidationError,
)
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/organizations/{organization_id}/repositories/{repository_id}/lab",
    tags=["Architecture Lab / AEI"],
)


def _get_lab_service(db: AsyncSession = Depends(get_db)) -> LabService:
    return LabService(db)


def _handle_lab_error(exc: Exception) -> None:
    if isinstance(exc, LabRepositoryNotFoundError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found.",
        )
    if isinstance(exc, LabResourceNotFoundError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    if isinstance(exc, LabValidationError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    from app.services.experiment_execution_service import (
        BaselineArchitectureNotFoundError,
        DuplicateExecutionError,
        ExperimentExecutionError,
        ExperimentNotFoundError,
        ExperimentRunNotFoundError,
        InvalidStateTransitionError,
        UnsupportedInterventionError,
    )

    if isinstance(exc, (ExperimentNotFoundError, ExperimentRunNotFoundError)):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    if isinstance(exc, DuplicateExecutionError):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )
    if isinstance(exc, (InvalidStateTransitionError, BaselineArchitectureNotFoundError, UnsupportedInterventionError, ExperimentExecutionError)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    logger.exception("Unexpected error in Architecture Lab API: %s", exc)
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="An internal error occurred in Architecture Lab.",
    )


# ==============================================================================
# Overview
# ==============================================================================


@router.get(
    "",
    response_model=LabOverviewResponse,
    summary="Get repository Architecture Lab overview and summary",
)
async def get_lab_overview(
    organization_id: int,
    repository_id: int,
    member: OrganizationMemberDependency,
    service: LabService = Depends(_get_lab_service),
) -> LabOverviewResponse:
    try:
        return await service.get_overview(
            organization_id=organization_id,
            repository_id=repository_id,
        )
    except Exception as exc:
        _handle_lab_error(exc)


# ==============================================================================
# Hypotheses
# ==============================================================================


@router.post(
    "/hypotheses",
    response_model=HypothesisResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an architectural hypothesis",
)
async def create_hypothesis(
    organization_id: int,
    repository_id: int,
    payload: HypothesisCreateRequest,
    member: OrganizationMemberDependency,
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: LabService = Depends(_get_lab_service),
) -> HypothesisResponse:
    try:
        hypothesis = await service.create_hypothesis(
            organization_id=organization_id,
            repository_id=repository_id,
            payload=payload,
            user_id=current_user.id,
        )
        return HypothesisResponse.model_validate(hypothesis)
    except Exception as exc:
        _handle_lab_error(exc)


@router.get(
    "/hypotheses",
    response_model=list[HypothesisResponse],
    summary="List architectural hypotheses for repository",
)
async def list_hypotheses(
    organization_id: int,
    repository_id: int,
    member: OrganizationMemberDependency,
    status_filter: HypothesisStatus | None = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service: LabService = Depends(_get_lab_service),
) -> list[HypothesisResponse]:
    try:
        hypotheses = await service.list_hypotheses(
            organization_id=organization_id,
            repository_id=repository_id,
            status=status_filter,
            limit=limit,
            offset=offset,
        )
        return [HypothesisResponse.model_validate(h) for h in hypotheses]
    except Exception as exc:
        _handle_lab_error(exc)


@router.get(
    "/hypotheses/{hypothesis_id}",
    response_model=HypothesisResponse,
    summary="Get hypothesis details by ID",
)
async def get_hypothesis(
    organization_id: int,
    repository_id: int,
    hypothesis_id: int,
    member: OrganizationMemberDependency,
    service: LabService = Depends(_get_lab_service),
) -> HypothesisResponse:
    try:
        hypothesis = await service.get_hypothesis(
            organization_id=organization_id,
            repository_id=repository_id,
            hypothesis_id=hypothesis_id,
        )
        return HypothesisResponse.model_validate(hypothesis)
    except Exception as exc:
        _handle_lab_error(exc)


@router.patch(
    "/hypotheses/{hypothesis_id}",
    response_model=HypothesisResponse,
    summary="Update hypothesis fields",
)
async def update_hypothesis(
    organization_id: int,
    repository_id: int,
    hypothesis_id: int,
    payload: HypothesisUpdateRequest,
    member: OrganizationMemberDependency,
    service: LabService = Depends(_get_lab_service),
) -> HypothesisResponse:
    try:
        hypothesis = await service.update_hypothesis(
            organization_id=organization_id,
            repository_id=repository_id,
            hypothesis_id=hypothesis_id,
            payload=payload,
        )
        return HypothesisResponse.model_validate(hypothesis)
    except Exception as exc:
        _handle_lab_error(exc)


@router.delete(
    "/hypotheses/{hypothesis_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete hypothesis",
)
async def delete_hypothesis(
    organization_id: int,
    repository_id: int,
    hypothesis_id: int,
    member: OrganizationMemberDependency,
    service: LabService = Depends(_get_lab_service),
) -> None:
    try:
        await service.delete_hypothesis(
            organization_id=organization_id,
            repository_id=repository_id,
            hypothesis_id=hypothesis_id,
        )
    except Exception as exc:
        _handle_lab_error(exc)


# ==============================================================================
# Interventions
# ==============================================================================


@router.post(
    "/hypotheses/{hypothesis_id}/interventions",
    response_model=InterventionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create proposed intervention for hypothesis",
)
async def create_intervention(
    organization_id: int,
    repository_id: int,
    hypothesis_id: int,
    payload: InterventionCreateRequest,
    member: OrganizationMemberDependency,
    service: LabService = Depends(_get_lab_service),
) -> InterventionResponse:
    try:
        intervention = await service.create_intervention(
            organization_id=organization_id,
            repository_id=repository_id,
            hypothesis_id=hypothesis_id,
            payload=payload,
        )
        return InterventionResponse.model_validate(intervention)
    except Exception as exc:
        _handle_lab_error(exc)


@router.get(
    "/hypotheses/{hypothesis_id}/interventions",
    response_model=list[InterventionResponse],
    summary="List interventions for hypothesis",
)
async def list_interventions(
    organization_id: int,
    repository_id: int,
    hypothesis_id: int,
    member: OrganizationMemberDependency,
    service: LabService = Depends(_get_lab_service),
) -> list[InterventionResponse]:
    try:
        interventions = await service.list_interventions(
            organization_id=organization_id,
            repository_id=repository_id,
            hypothesis_id=hypothesis_id,
        )
        return [InterventionResponse.model_validate(i) for i in interventions]
    except Exception as exc:
        _handle_lab_error(exc)


# ==============================================================================
# Experiments & Runs
# ==============================================================================


@router.post(
    "/experiments",
    response_model=ExperimentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Define an architecture evaluation experiment",
)
async def create_experiment(
    organization_id: int,
    repository_id: int,
    payload: ExperimentCreateRequest,
    member: OrganizationMemberDependency,
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: LabService = Depends(_get_lab_service),
) -> ExperimentResponse:
    try:
        experiment = await service.create_experiment(
            organization_id=organization_id,
            repository_id=repository_id,
            payload=payload,
            user_id=current_user.id,
        )
        return ExperimentResponse.model_validate(experiment)
    except Exception as exc:
        _handle_lab_error(exc)


@router.get(
    "/experiments",
    response_model=list[ExperimentResponse],
    summary="List experiments for repository or hypothesis",
)
async def list_experiments(
    organization_id: int,
    repository_id: int,
    member: OrganizationMemberDependency,
    hypothesis_id: int | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service: LabService = Depends(_get_lab_service),
) -> list[ExperimentResponse]:
    try:
        experiments = await service.list_experiments(
            organization_id=organization_id,
            repository_id=repository_id,
            hypothesis_id=hypothesis_id,
            limit=limit,
            offset=offset,
        )
        return [ExperimentResponse.model_validate(e) for e in experiments]
    except Exception as exc:
        _handle_lab_error(exc)


@router.get(
    "/experiments/{experiment_id}",
    response_model=ExperimentResponse,
    summary="Get experiment by ID",
)
async def get_experiment(
    organization_id: int,
    repository_id: int,
    experiment_id: int,
    member: OrganizationMemberDependency,
    service: LabService = Depends(_get_lab_service),
) -> ExperimentResponse:
    try:
        experiment = await service.get_experiment(
            organization_id=organization_id,
            repository_id=repository_id,
            experiment_id=experiment_id,
        )
        return ExperimentResponse.model_validate(experiment)
    except Exception as exc:
        _handle_lab_error(exc)


@router.post(
    "/experiments/{experiment_id}/runs",
    response_model=ExperimentRunResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record experiment run",
)
async def create_experiment_run(
    organization_id: int,
    repository_id: int,
    experiment_id: int,
    payload: ExperimentRunCreateRequest,
    member: OrganizationMemberDependency,
    service: LabService = Depends(_get_lab_service),
) -> ExperimentRunResponse:
    try:
        run = await service.create_experiment_run(
            organization_id=organization_id,
            repository_id=repository_id,
            experiment_id=experiment_id,
            payload=payload,
        )
        return ExperimentRunResponse.model_validate(run)
    except Exception as exc:
        _handle_lab_error(exc)


@router.get(
    "/experiments/{experiment_id}/runs",
    response_model=list[ExperimentRunResponse],
    summary="List runs for experiment",
)
async def list_experiment_runs(
    organization_id: int,
    repository_id: int,
    experiment_id: int,
    member: OrganizationMemberDependency,
    service: LabService = Depends(_get_lab_service),
) -> list[ExperimentRunResponse]:
    try:
        runs = await service.list_experiment_runs(
            organization_id=organization_id,
            repository_id=repository_id,
            experiment_id=experiment_id,
        )
        return [ExperimentRunResponse.model_validate(r) for r in runs]
    except Exception as exc:
        _handle_lab_error(exc)


@router.get(
    "/experiments/{experiment_id}/runs/{run_id}",
    response_model=ExperimentRunResponse,
    summary="Get experiment run details",
)
async def get_experiment_run(
    organization_id: int,
    repository_id: int,
    experiment_id: int,
    run_id: int,
    member: OrganizationMemberDependency,
    service: LabService = Depends(_get_lab_service),
) -> ExperimentRunResponse:
    try:
        run = await service.get_experiment_run(
            organization_id=organization_id,
            repository_id=repository_id,
            experiment_id=experiment_id,
            run_id=run_id,
        )
        return ExperimentRunResponse.model_validate(run)
    except Exception as exc:
        _handle_lab_error(exc)


@router.post(
    "/experiments/{experiment_id}/runs/{run_id}/execute",
    response_model=ExperimentRunResponse,
    summary="Execute experiment run",
)
async def execute_experiment_run(
    organization_id: int,
    repository_id: int,
    experiment_id: int,
    run_id: int,
    member: OrganizationMemberDependency,
    run_in_background: bool = Query(False, description="Whether to enqueue execution in Celery worker"),
    service: LabService = Depends(_get_lab_service),
) -> ExperimentRunResponse:
    try:
        run = await service.execute_experiment_run(
            organization_id=organization_id,
            repository_id=repository_id,
            experiment_id=experiment_id,
            run_id=run_id,
            run_in_background=run_in_background,
        )
        return ExperimentRunResponse.model_validate(run)
    except Exception as exc:
        _handle_lab_error(exc)


@router.post(
    "/experiments/{experiment_id}/runs/{run_id}/cancel",
    response_model=ExperimentRunResponse,
    summary="Cancel experiment run",
)
async def cancel_experiment_run(
    organization_id: int,
    repository_id: int,
    experiment_id: int,
    run_id: int,
    member: OrganizationMemberDependency,
    service: LabService = Depends(_get_lab_service),
) -> ExperimentRunResponse:
    try:
        run = await service.cancel_experiment_run(
            organization_id=organization_id,
            repository_id=repository_id,
            experiment_id=experiment_id,
            run_id=run_id,
        )
        return ExperimentRunResponse.model_validate(run)
    except Exception as exc:
        _handle_lab_error(exc)


# ==============================================================================
# Workload Profiles
# ==============================================================================


@router.post(
    "/workload-profiles",
    response_model=WorkloadProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create workload profile",
)
async def create_workload_profile(
    organization_id: int,
    repository_id: int,
    payload: WorkloadProfileCreateRequest,
    member: OrganizationMemberDependency,
    service: LabService = Depends(_get_lab_service),
) -> WorkloadProfileResponse:
    try:
        profile = await service.create_workload_profile(
            organization_id=organization_id,
            repository_id=repository_id,
            payload=payload,
        )
        return WorkloadProfileResponse.model_validate(profile)
    except Exception as exc:
        _handle_lab_error(exc)


@router.get(
    "/workload-profiles",
    response_model=list[WorkloadProfileResponse],
    summary="List workload profiles",
)
async def list_workload_profiles(
    organization_id: int,
    repository_id: int,
    member: OrganizationMemberDependency,
    service: LabService = Depends(_get_lab_service),
) -> list[WorkloadProfileResponse]:
    try:
        profiles = await service.list_workload_profiles(
            organization_id=organization_id,
            repository_id=repository_id,
        )
        return [WorkloadProfileResponse.model_validate(p) for p in profiles]
    except Exception as exc:
        _handle_lab_error(exc)


# ==============================================================================
# Resource Profiles
# ==============================================================================


@router.post(
    "/resource-profiles",
    response_model=ResourceProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create infrastructure resource profile",
)
async def create_resource_profile(
    organization_id: int,
    repository_id: int,
    payload: ResourceProfileCreateRequest,
    member: OrganizationMemberDependency,
    service: LabService = Depends(_get_lab_service),
) -> ResourceProfileResponse:
    try:
        profile = await service.create_resource_profile(
            organization_id=organization_id,
            repository_id=repository_id,
            payload=payload,
        )
        return ResourceProfileResponse.model_validate(profile)
    except Exception as exc:
        _handle_lab_error(exc)


@router.get(
    "/resource-profiles",
    response_model=list[ResourceProfileResponse],
    summary="List infrastructure resource profiles",
)
async def list_resource_profiles(
    organization_id: int,
    repository_id: int,
    member: OrganizationMemberDependency,
    service: LabService = Depends(_get_lab_service),
) -> list[ResourceProfileResponse]:
    try:
        profiles = await service.list_resource_profiles(
            organization_id=organization_id,
            repository_id=repository_id,
        )
        return [ResourceProfileResponse.model_validate(p) for p in profiles]
    except Exception as exc:
        _handle_lab_error(exc)


# ==============================================================================
# Pricing Snapshots
# ==============================================================================


@router.post(
    "/pricing-snapshots",
    response_model=PricingSnapshotResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Capture pricing snapshot",
)
async def create_pricing_snapshot(
    organization_id: int,
    repository_id: int,
    payload: PricingSnapshotCreateRequest,
    member: OrganizationMemberDependency,
    service: LabService = Depends(_get_lab_service),
) -> PricingSnapshotResponse:
    try:
        snapshot = await service.create_pricing_snapshot(payload)
        return PricingSnapshotResponse.model_validate(snapshot)
    except Exception as exc:
        _handle_lab_error(exc)


@router.get(
    "/pricing-snapshots",
    response_model=list[PricingSnapshotResponse],
    summary="List pricing snapshots",
)
async def list_pricing_snapshots(
    organization_id: int,
    repository_id: int,
    member: OrganizationMemberDependency,
    provider: str | None = Query(None),
    region: str | None = Query(None),
    service: LabService = Depends(_get_lab_service),
) -> list[PricingSnapshotResponse]:
    try:
        snapshots = await service.list_pricing_snapshots(
            provider=provider,
            region=region,
        )
        return [PricingSnapshotResponse.model_validate(s) for s in snapshots]
    except Exception as exc:
        _handle_lab_error(exc)


# ==============================================================================
# Evidence Ledger
# ==============================================================================


@router.post(
    "/evidence",
    response_model=EvidenceItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record evidence item in durable ledger",
)
async def create_evidence_item(
    organization_id: int,
    repository_id: int,
    payload: EvidenceItemCreateRequest,
    member: OrganizationMemberDependency,
    service: LabService = Depends(_get_lab_service),
) -> EvidenceItemResponse:
    try:
        item = await service.create_evidence_item(
            organization_id=organization_id,
            repository_id=repository_id,
            payload=payload,
        )
        return EvidenceItemResponse.model_validate(item)
    except Exception as exc:
        _handle_lab_error(exc)


@router.get(
    "/evidence",
    response_model=list[EvidenceItemResponse],
    summary="List evidence ledger entries for repository",
)
async def list_evidence(
    organization_id: int,
    repository_id: int,
    member: OrganizationMemberDependency,
    experiment_id: int | None = Query(None),
    category: EvidenceCategory | None = Query(None),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    service: LabService = Depends(_get_lab_service),
) -> list[EvidenceItemResponse]:
    try:
        items = await service.list_evidence(
            organization_id=organization_id,
            repository_id=repository_id,
            experiment_id=experiment_id,
            category=category,
            limit=limit,
            offset=offset,
        )
        return [EvidenceItemResponse.model_validate(i) for i in items]
    except Exception as exc:
        _handle_lab_error(exc)


# ==============================================================================
# Cost Scenarios
# ==============================================================================


@router.post(
    "/cost-scenarios",
    response_model=CostScenarioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Define architectural economic cost scenario",
)
async def create_cost_scenario(
    organization_id: int,
    repository_id: int,
    payload: CostScenarioCreateRequest,
    member: OrganizationMemberDependency,
    service: LabService = Depends(_get_lab_service),
) -> CostScenarioResponse:
    try:
        scenario = await service.create_cost_scenario(
            organization_id=organization_id,
            repository_id=repository_id,
            payload=payload,
        )
        return CostScenarioResponse.model_validate(scenario)
    except Exception as exc:
        _handle_lab_error(exc)


@router.get(
    "/cost-scenarios",
    response_model=list[CostScenarioResponse],
    summary="List cost scenarios for repository",
)
async def list_cost_scenarios(
    organization_id: int,
    repository_id: int,
    member: OrganizationMemberDependency,
    experiment_id: int | None = Query(None),
    service: LabService = Depends(_get_lab_service),
) -> list[CostScenarioResponse]:
    try:
        scenarios = await service.list_cost_scenarios(
            organization_id=organization_id,
            repository_id=repository_id,
            experiment_id=experiment_id,
        )
        return [CostScenarioResponse.model_validate(s) for s in scenarios]
    except Exception as exc:
        _handle_lab_error(exc)


# ==============================================================================
# Decision Records
# ==============================================================================


@router.post(
    "/decisions",
    response_model=DecisionRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Persist human engineering decision record",
)
async def create_decision_record(
    organization_id: int,
    repository_id: int,
    payload: DecisionRecordCreateRequest,
    member: OrganizationMemberDependency,
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: LabService = Depends(_get_lab_service),
) -> DecisionRecordResponse:
    try:
        record = await service.create_decision_record(
            organization_id=organization_id,
            repository_id=repository_id,
            payload=payload,
            user_id=current_user.id,
        )
        return DecisionRecordResponse.model_validate(record)
    except Exception as exc:
        _handle_lab_error(exc)


@router.get(
    "/decisions",
    response_model=list[DecisionRecordResponse],
    summary="List decision records for repository",
)
async def list_decision_records(
    organization_id: int,
    repository_id: int,
    member: OrganizationMemberDependency,
    hypothesis_id: int | None = Query(None),
    service: LabService = Depends(_get_lab_service),
) -> list[DecisionRecordResponse]:
    try:
        records = await service.list_decision_records(
            organization_id=organization_id,
            repository_id=repository_id,
            hypothesis_id=hypothesis_id,
        )
        return [DecisionRecordResponse.model_validate(r) for r in records]
    except Exception as exc:
        _handle_lab_error(exc)
