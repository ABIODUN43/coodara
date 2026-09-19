"""
Organization Settings database model.

Stores workspace configuration including:
- Architecture Quality Gates and CI rules
- AI and LLM Engine preferences and encrypted API credentials
- General organization settings
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from app.db.base import Base
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.organization import Organization


class OrganizationSettings(Base):
    """
    Persistent configuration for an organization.
    """

    __tablename__ = "organization_settings"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    organization_id: Mapped[int] = mapped_column(
        ForeignKey(
            "organizations.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        unique=True,
        index=True,
    )

    # Quality Gates & CI
    block_on_circular: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    auto_scan_on_push: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    min_health_threshold: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=70,
        server_default="70",
    )

    # AI & LLM Engine Config
    llm_provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="coodara",
        server_default="coodara",
    )

    llm_model: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="coodara-architecture-engine-v1",
        server_default="coodara-architecture-engine-v1",
    )

    api_key_ciphertext: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    organization: Mapped[Organization] = relationship(
        "Organization",
        back_populates="settings",
    )

    def __repr__(self) -> str:
        return (
            f"OrganizationSettings("
            f"id={self.id}, "
            f"organization_id={self.organization_id}, "
            f"llm_provider={self.llm_provider!r}"
            f")"
        )
