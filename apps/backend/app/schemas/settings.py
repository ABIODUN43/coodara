"""
Organization Settings schemas.
"""

from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class OrganizationSettingsResponse(BaseModel):
    """Organization settings response."""

    model_config = ConfigDict(from_attributes=True)

    organization_id: int
    block_on_circular: bool = True
    auto_scan_on_push: bool = True
    min_health_threshold: int = Field(default=70, ge=50, le=100)
    llm_provider: str = "coodara"
    llm_model: str = "coodara-architecture-engine-v1"
    has_api_key: bool = False
    api_key_preview: str | None = None
    updated_at: datetime | None = None


class OrganizationSettingsUpdateRequest(BaseModel):
    """Organization settings update payload."""

    block_on_circular: bool | None = None
    auto_scan_on_push: bool | None = None
    min_health_threshold: int | None = Field(default=None, ge=50, le=100)
    llm_provider: str | None = None
    llm_model: str | None = None
    api_key: str | None = None
