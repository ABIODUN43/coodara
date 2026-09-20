"""
Repository database model.

Represents a GitHub repository connected to a
Coodara organization.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from app.db.base import Base
from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.analysis import AnalysisJob
    from app.models.architecture import (
        ArchitectureDecision,
        ArchitectureRule,
        ArchitectureSimulation,
        ArchitectureSnapshot,
    )
    from app.models.memory import ArchitectureEvent, ArchitectureMemory
    from app.models.organization import Organization


class RepositoryVisibility(str, Enum):
    """
    GitHub repository visibility.
    """

    PUBLIC = "public"
    PRIVATE = "private"


class Repository(Base):
    """
    GitHub repository connected to a Coodara organization.
    """

    __tablename__ = "repositories"

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "github_id",
            name="uq_repository_organization_github",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    github_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    organization_id: Mapped[int] = mapped_column(
        ForeignKey(
            "organizations.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    full_name: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    visibility: Mapped[RepositoryVisibility] = mapped_column(
        SQLEnum(
            RepositoryVisibility,
            name="repository_visibility",
            native_enum=True,
            validate_strings=True,
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
    )

    default_branch: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    primary_language: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    clone_url: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )

    html_url: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )

    last_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
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
        back_populates="repositories",
    )

    analysis_jobs: Mapped[list[AnalysisJob]] = relationship(
        "AnalysisJob",
        back_populates="repository",
        cascade="all, delete-orphan",
    )

    architecture_snapshots: Mapped[list[ArchitectureSnapshot]] = relationship(
        "ArchitectureSnapshot",
        back_populates="repository",
        cascade="all, delete-orphan",
    )

    architecture_memory: Mapped[ArchitectureMemory | None] = relationship(
        "ArchitectureMemory",
        back_populates="repository",
        cascade="all, delete-orphan",
        uselist=False,
    )

    architecture_decisions: Mapped[list[ArchitectureDecision]] = relationship(
        "ArchitectureDecision",
        back_populates="repository",
        cascade="all, delete-orphan",
    )

    architecture_rules: Mapped[list[ArchitectureRule]] = relationship(
        "ArchitectureRule",
        back_populates="repository",
        cascade="all, delete-orphan",
    )

    architecture_simulations: Mapped[list[ArchitectureSimulation]] = relationship(
        "ArchitectureSimulation",
        back_populates="repository",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            "Repository("
            f"id={self.id}, "
            f"organization_id={self.organization_id}, "
            f"github_id={self.github_id}, "
            f"full_name={self.full_name!r}"
            ")"
        )