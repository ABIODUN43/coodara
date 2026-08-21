"""
Analysis API schemas.
"""

from __future__ import annotations

from datetime import datetime

from app.models.analysis import AnalysisStatus
from pydantic import BaseModel, ConfigDict, Field


class AnalysisResponse(BaseModel):
    """
    API representation of an analysis job.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    repository_id: int
    status: AnalysisStatus
    progress: int = Field(ge=0, le=100)
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime


class AnalysisListResponse(BaseModel):
    """
    Paginated analysis list response.
    """

    items: list[AnalysisResponse]
    total: int
    page: int
    per_page: int
    pages: int


class RepositoryMetricsResponse(BaseModel):
    """
    Repository metrics produced by an analysis.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    analysis_result_id: int
    loc: int
    files: int
    classes: int
    functions: int
    complexity: float | None = None
    maintainability: float | None = None


class DetectedTechnologyResponse(BaseModel):
    """
    Technology detected during analysis.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    analysis_result_id: int
    technology: str
    version: str | None = None
    confidence_score: float


class DependencyGraphResponse(BaseModel):
    """
    Dependency graph produced by an analysis.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    analysis_result_id: int
    graph_data: str
    created_at: datetime


class AnalysisResultResponse(BaseModel):
    """
    Complete analysis result.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    analysis_job_id: int
    summary: str | None = None
    created_at: datetime
    metrics: RepositoryMetricsResponse | None = None
    technologies: list[DetectedTechnologyResponse]
    dependency_graph: DependencyGraphResponse | None = None