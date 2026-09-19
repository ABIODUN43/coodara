"""
Organization API schemas.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CreateOrganizationRequest(BaseModel):
    """
    Organization creation request.
    """

    name: str = Field(
        min_length=2,
        max_length=255,
    )

    slug: str | None = Field(
        default=None,
        min_length=2,
        max_length=255,
    )

    description: str | None = None


class UpdateOrganizationRequest(BaseModel):
    """
    Mutable organization fields.
    """

    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=255,
    )

    description: str | None = None

    logo_url: str | None = Field(
        default=None,
        max_length=500,
    )


class OrganizationResponse(BaseModel):
    """
    Organization API response.
    """

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    name: str
    slug: str
    description: str | None
    logo_url: str | None
    owner_id: int
    created_at: datetime
    updated_at: datetime
