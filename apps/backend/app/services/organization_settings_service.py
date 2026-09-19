"""
Organization Settings Service.

Handles persistence, encryption of custom AI model API keys,
and quality gates retrieval for workspaces.
"""

from __future__ import annotations

import base64
import hashlib
import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from app.core.config import settings
from app.models.organization_settings import OrganizationSettings
from app.schemas.settings import OrganizationSettingsResponse, OrganizationSettingsUpdateRequest
from cryptography.fernet import Fernet
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


def _get_fernet() -> Fernet:
    """Get Fernet cipher using configured key or stable derived key."""
    key = getattr(settings, "GITHUB_TOKEN_ENCRYPTION_KEY", None)
    if not key:
        # Stable fallback key derived from SECRET_KEY
        secret = getattr(settings, "SECRET_KEY", "coodara-default-secret-key-32b-length!!")
        derived = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
        return Fernet(derived)
    try:
        return Fernet(key.encode())
    except Exception:
        derived = base64.urlsafe_b64encode(hashlib.sha256(key.encode()).digest())
        return Fernet(derived)


def _mask_key(plain_key: str) -> str:
    """Safely mask key for preview (e.g. sk-****1234)."""
    if len(plain_key) <= 8:
        return "****"
    return f"{plain_key[:3]}****{plain_key[-4:]}"


class OrganizationSettingsService:
    """Service managing organization settings."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._cipher = _get_fernet()

    async def get_or_create_settings(self, organization_id: int) -> OrganizationSettings:
        """Fetch existing settings for organization or create default."""
        stmt = select(OrganizationSettings).where(
            OrganizationSettings.organization_id == organization_id
        )
        res = await self._db.execute(stmt)
        org_settings = res.scalar_one_or_none()

        if org_settings is None:
            org_settings = OrganizationSettings(
                organization_id=organization_id,
                block_on_circular=True,
                auto_scan_on_push=True,
                min_health_threshold=70,
                llm_provider="coodara",
                llm_model="coodara-architecture-engine-v1",
                api_key_ciphertext=None,
            )
            self._db.add(org_settings)
            await self._db.flush()

        return org_settings

    async def update_settings(
        self,
        organization_id: int,
        payload: OrganizationSettingsUpdateRequest,
    ) -> OrganizationSettings:
        """Update settings for organization."""
        org_settings = await self.get_or_create_settings(organization_id)

        if payload.block_on_circular is not None:
            org_settings.block_on_circular = payload.block_on_circular
        if payload.auto_scan_on_push is not None:
            org_settings.auto_scan_on_push = payload.auto_scan_on_push
        if payload.min_health_threshold is not None:
            org_settings.min_health_threshold = payload.min_health_threshold
        if payload.llm_provider is not None:
            org_settings.llm_provider = payload.llm_provider
        if payload.llm_model is not None:
            org_settings.llm_model = payload.llm_model

        if payload.api_key is not None:
            key_clean = payload.api_key.strip()
            if not key_clean:
                org_settings.api_key_ciphertext = None
            else:
                encrypted = self._cipher.encrypt(key_clean.encode()).decode()
                org_settings.api_key_ciphertext = encrypted

        org_settings.updated_at = datetime.now(timezone.utc)
        await self._db.flush()
        return org_settings

    def to_response(self, org_settings: OrganizationSettings) -> OrganizationSettingsResponse:
        """Format database record into safe client response without secret exposure."""
        has_key = bool(org_settings.api_key_ciphertext)
        preview = None
        if has_key and org_settings.api_key_ciphertext:
            try:
                decrypted = self._cipher.decrypt(org_settings.api_key_ciphertext.encode()).decode()
                preview = _mask_key(decrypted)
            except Exception:
                preview = "sk-****"

        return OrganizationSettingsResponse(
            organization_id=org_settings.organization_id,
            block_on_circular=org_settings.block_on_circular,
            auto_scan_on_push=org_settings.auto_scan_on_push,
            min_health_threshold=org_settings.min_health_threshold,
            llm_provider=org_settings.llm_provider,
            llm_model=org_settings.llm_model,
            has_api_key=has_key,
            api_key_preview=preview,
            updated_at=org_settings.updated_at,
        )
