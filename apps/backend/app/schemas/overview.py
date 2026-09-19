"""
Organization Overview Telemetry Schemas.

Provides high-speed, aggregated telemetry models for the Coodara
dashboard, risks, recommendations, and reports pages.
"""

from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class OverviewRepositoryItem(BaseModel):
    """Repository snapshot metadata within an organization."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    full_name: str
    description: str | None = None
    default_branch: str
    primary_language: str | None = None
    latest_analysis_status: str | None = None
    latest_analysis_id: int | None = None
    loc: int = 0
    files: int = 0
    health_score: float = 100.0


class OverviewIssueItem(BaseModel):
    """Architectural issue summary item."""

    model_config = ConfigDict(from_attributes=True)

    id: str | int
    repo_name: str
    repo_id: int
    title: str
    description: str
    severity: str
    type: str
    status: str = "open"
    dismissed_reason: str | None = None
    resolved_at: str | None = None


class OverviewRecommendationItem(BaseModel):
    """Architectural recommendation summary item."""

    model_config = ConfigDict(from_attributes=True)

    id: str | int
    repo_name: str
    repo_id: int
    recommendation: str
    priority: str
    component_id: str | None = None
    component_name: str | None = None
    subsystem: str | None = None
    category: str | None = None
    status: str = "open"
    action_plan: str | None = None
    resolved_at: str | None = None


class OverviewRecentActivity(BaseModel):
    """Timeline event item."""

    timestamp: str
    text: str
    tag: Literal["good", "warn", "risk"]


class OverviewTechnology(BaseModel):
    """Aggregated technology item."""

    name: str
    count: int
    confidence: float


class HealthBreakdown(BaseModel):
    """Structural health sub-metrics."""

    maintainability: float = 85.0
    complexity: float = 80.0
    coupling: float = 75.0
    modularity: float = 85.0


class OrganizationOverviewResponse(BaseModel):
    """
    Consolidated, pre-aggregated telemetry for an organization.
    Powers Overview, Risks, Recommendations, Reports, and Sidebar in a single query.
    """

    organization_id: int
    total_repos: int = 0
    analyzed_repos_count: int = 0
    total_loc: int = 0
    total_files: int = 0
    total_classes: int = 0
    total_functions: int = 0
    health_score: float = 100.0
    health_label: Literal["Healthy", "Watch", "At risk"] = "Healthy"
    risk_level: Literal["Low", "Medium", "High"] = "Low"
    critical_findings_count: int = 0
    warning_findings_count: int = 0
    last_snapshot_iso: str | None = None
    health_breakdown: HealthBreakdown = Field(default_factory=HealthBreakdown)
    repos: list[OverviewRepositoryItem] = Field(default_factory=list)
    all_issues: list[OverviewIssueItem] = Field(default_factory=list)
    all_recommendations: list[OverviewRecommendationItem] = Field(default_factory=list)
    recent_activities: list[OverviewRecentActivity] = Field(default_factory=list)
    technologies: list[OverviewTechnology] = Field(default_factory=list)
