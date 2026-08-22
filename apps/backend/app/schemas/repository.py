"""
Repository API schemas.
"""

from __future__ import annotations

from datetime import datetime

from app.models.repository import RepositoryVisibility
from pydantic import BaseModel, ConfigDict, Field, field_validator


class RepositoryImportRequest(BaseModel):
    """
    Request to import a GitHub repository.
    """

    owner: str = Field(
        min_length=1,
        max_length=255,
    )

    name: str = Field(
        min_length=1,
        max_length=255,
    )

    default_branch: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
    )

    @field_validator("owner", "name", "default_branch")
    @classmethod
    def strip_strings(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value:
            raise ValueError("Value cannot be empty.")

        return value


class RepositoryUpdateRequest(BaseModel):
    """
    Mutable repository settings.

    A null value means that the field was not requested for update.
    """

    default_branch: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
    )

    @field_validator("default_branch")
    @classmethod
    def strip_branch(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value:
            raise ValueError(
                "default_branch cannot be empty.",
            )

        return value


class RepositoryResponse(BaseModel):
    """
    Repository API response.
    """

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    organization_id: int
    github_id: int

    name: str
    full_name: str
    description: str | None

    visibility: RepositoryVisibility

    default_branch: str
    primary_language: str | None

    clone_url: str
    html_url: str

    last_synced_at: datetime | None

    created_at: datetime
    updated_at: datetime


class RepositoryListResponse(BaseModel):
    """
    Paginated repository collection response.
    """

    items: list[RepositoryResponse]

    total: int = Field(
        ge=0,
    )

    page: int = Field(
        ge=1,
    )

    per_page: int = Field(
        ge=1,
        le=100,
    )

    pages: int = Field(
        ge=0,
    )