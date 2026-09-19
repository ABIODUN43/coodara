"""
Pydantic schemas for Coodara V2 Architecture Memory.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ArchitectureComponentResponse(BaseModel):
    """Component entity tracked in architectural memory."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    component_type: str
    path: str | None = None
    description: str | None = None
    status: str
    first_seen_analysis_id: int | None = None
    last_seen_analysis_id: int | None = None
    created_at: datetime
    updated_at: datetime


class ArchitectureRelationshipResponse(BaseModel):
    """Component relationship entity tracked in architectural memory."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    source_component_id: int
    target_component_id: int
    kind: str
    status: str
    first_seen_analysis_id: int | None = None
    last_seen_analysis_id: int | None = None
    created_at: datetime
    updated_at: datetime


class ArchitectureTechnologyMemoryResponse(BaseModel):
    """Technology entity tracked in architectural memory across versions."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    technology: str
    version: str | None = None
    category: str | None = None
    status: str
    first_seen_analysis_id: int | None = None
    last_seen_analysis_id: int | None = None
    created_at: datetime
    updated_at: datetime


class ArchitectureMemoryEntryResponse(BaseModel):
    """Discrete architectural knowledge entry with provenance."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    memory_id: int
    organization_id: int
    repository_id: int
    analysis_id: int | None = None
    memory_type: str
    title: str
    content: str
    confidence: float
    source_analyzer: str | None = None
    source_file: str | None = None
    created_at: datetime
    updated_at: datetime


class ArchitectureEventResponse(BaseModel):
    """Historical architectural evolution event."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    repository_id: int
    analysis_id: int
    event_type: str
    title: str
    description: str
    details: str | None = None
    created_at: datetime


class ArchitectureMemoryOverviewResponse(BaseModel):
    """Comprehensive architecture memory overview for a repository."""

    repository_id: int
    organization_id: int
    latest_analysis_id: int | None = None
    components_count: int
    active_components_count: int
    technologies_count: int
    entries_count: int
    events_count: int
    components: list[ArchitectureComponentResponse] = Field(default_factory=list)
    technologies: list[ArchitectureTechnologyMemoryResponse] = Field(default_factory=list)
    entries: list[ArchitectureMemoryEntryResponse] = Field(default_factory=list)
    recent_events: list[ArchitectureEventResponse] = Field(default_factory=list)


class ScoredMemoryEntryResponse(BaseModel):
    """Search match for an architectural memory entry."""

    entry: ArchitectureMemoryEntryResponse
    score: float
    matched_terms: list[str] = Field(default_factory=list)


class MemorySearchResponse(BaseModel):
    """Memory search query response."""

    query: str
    total_matches: int
    results: list[ScoredMemoryEntryResponse]


class ArchitectureHistoryResponse(BaseModel):
    """Chronological architectural evolution timeline."""

    repository_id: int
    organization_id: int
    total_events: int
    events: list[ArchitectureEventResponse] = Field(default_factory=list)
    items: list[ArchitectureEventResponse] = Field(default_factory=list)
