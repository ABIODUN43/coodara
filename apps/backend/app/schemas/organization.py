"""
Organization schemas.
"""

from datetime import datetime

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field


class CreateOrganizationRequest(BaseModel):

    name: str = Field(
        min_length=2,
        max_length=255,
    )

    slug: str = Field(
        min_length=2,
        max_length=255,
    )

    description: str | None = None


class UpdateOrganizationRequest(BaseModel):

    name: str | None = None

    description: str | None = None

    logo_url: str | None = None


class OrganizationResponse(BaseModel):

    model_config = ConfigDict(
        from_attributes=True
    )

    id: int

    name: str

    slug: str

    description: str | None

    logo_url: str | None

    owner_id: int

    created_at: datetime

    updated_at: datetime