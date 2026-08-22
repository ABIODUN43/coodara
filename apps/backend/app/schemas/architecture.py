"""
API schemas for Architecture Intelligence.

These schemas define the HTTP representation of architecture
snapshots and their derived intelligence.

They intentionally do not expose SQLAlchemy persistence models.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ArchitectureGraphNodeResponse(BaseModel):
    """One node in the architecture dependency graph."""

    id: str
    type: str


class ArchitectureGraphEdgeResponse(BaseModel):
    """One dependency relationship in the architecture graph."""

    source: str
    target: str
    kind: str


class ArchitectureGraphResponse(BaseModel):
    """Normalized architecture dependency graph."""

    version: int
    nodes: list[ArchitectureGraphNodeResponse]
    edges: list[ArchitectureGraphEdgeResponse]


class ArchitectureScoreResponse(BaseModel):
    """Architecture health score."""

    score: float = Field(ge=0.0, le=100.0)
    maintainability: float = Field(ge=0.0, le=100.0)
    coupling: float = Field(ge=0.0, le=100.0)
    cohesion: float = Field(ge=0.0, le=100.0)
    complexity: float = Field(ge=0.0, le=100.0)


class ArchitectureIssueResponse(BaseModel):
    """Architectural issue detected during analysis."""

    severity: str
    category: str
    description: str


class ArchitectureRecommendationResponse(BaseModel):
    """Architecture improvement recommendation."""

    recommendation: str
    priority: str


class ArchitectureSnapshotResponse(BaseModel):
    """
    Complete architecture intelligence response.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    repository_id: int
    analysis_result_id: int
    snapshot_version: int
    graph: ArchitectureGraphResponse
    score: ArchitectureScoreResponse
    issues: list[ArchitectureIssueResponse]
    recommendations: list[ArchitectureRecommendationResponse]