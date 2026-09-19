"""
Organization Settings API endpoints.

Exposes REST endpoints to view and update workspace quality gates,
AI reasoning engine settings, and encrypted credentials.
"""

from __future__ import annotations

from typing import Annotated

from app.api.dependencies import OrganizationMemberDependency
from app.db.session import get_db
from app.schemas.settings import (
    OrganizationSettingsResponse,
    OrganizationSettingsUpdateRequest,
)
from app.services.organization_settings_service import (
    OrganizationSettingsService,
)
from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/organizations/{organization_id}/settings",
    tags=["Settings"],
)


@router.get(
    "",
    response_model=OrganizationSettingsResponse,
    status_code=status.HTTP_200_OK,
)
async def get_organization_settings(
    organization_id: Annotated[int, Path(gt=0)],
    member: OrganizationMemberDependency,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganizationSettingsResponse:
    """
    Get organization configuration and quality gate rules.
    """
    service = OrganizationSettingsService(db)
    org_settings = await service.get_or_create_settings(organization_id)
    await db.commit()
    return service.to_response(org_settings)


@router.put(
    "",
    response_model=OrganizationSettingsResponse,
    status_code=status.HTTP_200_OK,
)
async def update_organization_settings(
    organization_id: Annotated[int, Path(gt=0)],
    payload: OrganizationSettingsUpdateRequest,
    member: OrganizationMemberDependency,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganizationSettingsResponse:
    """
    Update organization configuration, quality gates, and AI models.
    """
    service = OrganizationSettingsService(db)
    org_settings = await service.update_settings(organization_id, payload)
    await db.commit()
    return service.to_response(org_settings)
