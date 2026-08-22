"""
Architecture Intelligence API endpoints.

All architecture endpoints are organization-scoped through the
repository.

Authorization:

    authenticated user
        ↓
    organization membership
        ↓
    ArchitectureService

Responsibilities:

    API layer
        - HTTP request/response handling
        - authorization dependency integration
        - response serialization
        - HTTP error mapping

    ArchitectureService
        - repository ownership validation
        - analysis validation
        - architecture generation
        - architecture retrieval
        - persistence coordination

    ArchitectureRepository
        - database access

    ArchitectureAnalyzer
        - architecture computation

Transaction ownership remains with the API/application caller.
"""

from __future__ import annotations

import json
from typing import Annotated

from app.api.dependencies import OrganizationMemberDependency
from app.db.session import get_db
from app.schemas.architecture import (
    ArchitectureGraphEdgeResponse,
    ArchitectureGraphNodeResponse,
    ArchitectureGraphResponse,
    ArchitectureIssueResponse,
    ArchitectureRecommendationResponse,
    ArchitectureScoreResponse,
    ArchitectureSnapshotResponse,
)
from app.services.architecture_service import (
    ArchitectureAlreadyExistsError,
    ArchitectureAnalysisIncompleteError,
    ArchitectureAnalysisNotFoundError,
    ArchitectureAnalysisResultNotFoundError,
    ArchitectureRepositoryNotFoundError,
    ArchitectureService,
    ArchitectureServiceError,
    ArchitectureSnapshotNotFoundError,
)
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Path,
    Query,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix=(
        "/organizations/{organization_id}"
        "/repositories/{repository_id}"
        "/architecture"
    ),
    tags=["Architecture"],
)


def _create_architecture_service(
    db: AsyncSession,
) -> ArchitectureService:
    """
    Create the architecture application service.
    """

    return ArchitectureService(db)


def _parse_graph(
    graph_data: str,
) -> ArchitectureGraphResponse:
    """
    Convert the persisted dependency graph JSON into the API graph
    representation.
    """

    try:
        payload = json.loads(graph_data)
    except json.JSONDecodeError as exc:
        raise ArchitectureServiceError(
            "Stored architecture graph is invalid.",
        ) from exc

    if not isinstance(payload, dict):
        raise ArchitectureServiceError(
            "Stored architecture graph is invalid.",
        )

    version = payload.get("version", 1)
    raw_nodes = payload.get("nodes", [])
    raw_edges = payload.get("edges", [])

    if not isinstance(version, int):
        raise ArchitectureServiceError(
            "Stored architecture graph version is invalid.",
        )

    if not isinstance(raw_nodes, list):
        raise ArchitectureServiceError(
            "Stored architecture graph nodes are invalid.",
        )

    if not isinstance(raw_edges, list):
        raise ArchitectureServiceError(
            "Stored architecture graph edges are invalid.",
        )

    nodes: list[ArchitectureGraphNodeResponse] = []
    for node in raw_nodes:
        if not isinstance(node, dict):
            continue

        node_id = node.get("id")
        node_type = node.get("type", "module")

        if not isinstance(node_id, str):
            continue

        if not isinstance(node_type, str):
            node_type = "module"

        nodes.append(
            ArchitectureGraphNodeResponse(
                id=node_id,
                type=node_type,
            )
        )

    edges: list[ArchitectureGraphEdgeResponse] = []
    for edge in raw_edges:
        if not isinstance(edge, dict):
            continue

        source = edge.get("source")
        target = edge.get("target")
        kind = edge.get("kind", "import")

        if not isinstance(source, str):
            continue

        if not isinstance(target, str):
            continue

        if not isinstance(kind, str):
            kind = "import"

        edges.append(
            ArchitectureGraphEdgeResponse(
                source=source,
                target=target,
                kind=kind,
            )
        )

    return ArchitectureGraphResponse(
        version=version,
        nodes=nodes,
        edges=edges,
    )


def _serialize_snapshot(
    snapshot: object,
) -> ArchitectureSnapshotResponse:
    """
    Convert the persisted architecture snapshot into its API
    representation.
    """

    graph = getattr(snapshot, "graph", None)
    score = getattr(snapshot, "score", None)

    if graph is None:
        raise ArchitectureServiceError(
            "Architecture snapshot graph is missing.",
        )

    if score is None:
        raise ArchitectureServiceError(
            "Architecture snapshot score is missing.",
        )

    return ArchitectureSnapshotResponse(
        id=snapshot.id,
        repository_id=snapshot.repository_id,
        analysis_result_id=snapshot.analysis_result_id,
        snapshot_version=snapshot.snapshot_version,
        graph=_parse_graph(graph),
        score=ArchitectureScoreResponse(
            score=score.score,
            maintainability=score.maintainability,
            coupling=score.coupling,
            cohesion=score.cohesion,
            complexity=score.complexity,
        ),
        issues=[
            ArchitectureIssueResponse(
                severity=issue.severity,
                category=issue.category,
                description=issue.description,
            )
            for issue in snapshot.issues
        ],
        recommendations=[
            ArchitectureRecommendationResponse(
                recommendation=recommendation.recommendation,
                priority=recommendation.priority,
            )
            for recommendation in snapshot.recommendations
        ],
    )


@router.post(
    "",
    response_model=ArchitectureSnapshotResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_architecture(
    organization_id: Annotated[
        int,
        Path(gt=0),
    ],
    repository_id: Annotated[
        int,
        Path(gt=0),
    ],
    analysis_id: Annotated[
        int,
        Query(gt=0),
    ],
    member: OrganizationMemberDependency,
    db: AsyncSession = Depends(get_db),
) -> ArchitectureSnapshotResponse:
    """
    Generate architecture intelligence from a completed analysis.
    """

    service = _create_architecture_service(db)

    try:
        snapshot = await service.generate_architecture(
            organization_id=organization_id,
            repository_id=repository_id,
            analysis_id=analysis_id,
        )

        await db.commit()

        return _serialize_snapshot(snapshot)

    except ArchitectureRepositoryNotFoundError as exc:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found.",
        ) from exc

    except ArchitectureAnalysisNotFoundError as exc:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found.",
        ) from exc

    except ArchitectureAnalysisIncompleteError as exc:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    except ArchitectureAnalysisResultNotFoundError as exc:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis result not found.",
        ) from exc

    except ArchitectureAlreadyExistsError as exc:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    except ArchitectureServiceError:
        await db.rollback()
        raise

    except Exception:
        await db.rollback()
        raise


@router.get(
    "",
    response_model=ArchitectureSnapshotResponse,
)
async def get_architecture(
    organization_id: Annotated[
        int,
        Path(gt=0),
    ],
    repository_id: Annotated[
        int,
        Path(gt=0),
    ],
    member: OrganizationMemberDependency,
    db: AsyncSession = Depends(get_db),
) -> ArchitectureSnapshotResponse:
    """
    Retrieve the latest architecture snapshot for a repository.
    """

    service = _create_architecture_service(db)

    try:
        snapshot = await service.get_architecture(
            organization_id=organization_id,
            repository_id=repository_id,
        )

        return _serialize_snapshot(snapshot)

    except ArchitectureRepositoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found.",
        ) from exc

    except ArchitectureSnapshotNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Architecture snapshot not found.",
        ) from exc


@router.get(
    "/snapshots",
    response_model=list[ArchitectureSnapshotResponse],
)
async def list_architecture_snapshots(
    organization_id: Annotated[
        int,
        Path(gt=0),
    ],
    repository_id: Annotated[
        int,
        Path(gt=0),
    ],
    member: OrganizationMemberDependency,
    offset: Annotated[
        int,
        Query(ge=0),
    ] = 0,
    limit: Annotated[
        int,
        Query(ge=1, le=100),
    ] = 20,
    db: AsyncSession = Depends(get_db),
) -> list[ArchitectureSnapshotResponse]:
    """
    List architecture snapshots for a repository.
    """

    service = _create_architecture_service(db)

    try:
        snapshots = await service.list_snapshots(
            organization_id=organization_id,
            repository_id=repository_id,
            offset=offset,
            limit=limit,
        )

        return [
            _serialize_snapshot(snapshot)
            for snapshot in snapshots
        ]

    except ArchitectureRepositoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found.",
        ) from exc


@router.get(
    "/snapshots/{snapshot_id}",
    response_model=ArchitectureSnapshotResponse,
)
async def get_architecture_snapshot(
    organization_id: Annotated[
        int,
        Path(gt=0),
    ],
    repository_id: Annotated[
        int,
        Path(gt=0),
    ],
    snapshot_id: Annotated[
        int,
        Path(gt=0),
    ],
    member: OrganizationMemberDependency,
    db: AsyncSession = Depends(get_db),
) -> ArchitectureSnapshotResponse:
    """
    Retrieve one architecture snapshot.
    """

    service = _create_architecture_service(db)

    try:
        snapshot = await service.get_snapshot(
            organization_id=organization_id,
            repository_id=repository_id,
            snapshot_id=snapshot_id,
        )

        return _serialize_snapshot(snapshot)

    except ArchitectureRepositoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found.",
        ) from exc

    except ArchitectureSnapshotNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Architecture snapshot not found.",
        ) from exc