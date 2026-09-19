"""
Architecture Memory database models for Coodara V2.

Maintains persistent, queryable architectural knowledge and historical evolution
events for repositories across multiple analysis runs.

Persistence hierarchy:

    Repository
        ↓
    ArchitectureMemory
        ├── ArchitectureComponent
        ├── ArchitectureRelationship
        ├── ArchitectureTechnologyMemory
        └── ArchitectureMemoryEntry

    ArchitectureEvent (Immutable historical evolution ledger)
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from app.db.base import Base
from sqlalchemy import (
    DateTime,
    Float,
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
    from app.models.organization import Organization
    from app.models.repository import Repository


class MemoryType(StrEnum):
    """
    Categorization of architectural memory knowledge entries.
    """

    ARCHITECTURE_FACT = "ARCHITECTURE_FACT"
    ARCHITECTURE_DECISION = "ARCHITECTURE_DECISION"
    ARCHITECTURE_PATTERN = "ARCHITECTURE_PATTERN"
    ARCHITECTURE_ISSUE = "ARCHITECTURE_ISSUE"
    ARCHITECTURE_CONSTRAINT = "ARCHITECTURE_CONSTRAINT"
    ARCHITECTURE_CHANGE = "ARCHITECTURE_CHANGE"


class ArchitectureEventType(StrEnum):
    """
    Types of architectural evolution events detected during memory reconciliation.
    """

    COMPONENT_ADDED = "COMPONENT_ADDED"
    COMPONENT_REMOVED = "COMPONENT_REMOVED"
    RELATIONSHIP_ADDED = "RELATIONSHIP_ADDED"
    RELATIONSHIP_REMOVED = "RELATIONSHIP_REMOVED"
    TECHNOLOGY_ADDED = "TECHNOLOGY_ADDED"
    TECHNOLOGY_REMOVED = "TECHNOLOGY_REMOVED"
    TECHNOLOGY_CHANGED = "TECHNOLOGY_CHANGED"
    DEPENDENCY_ADDED = "DEPENDENCY_ADDED"
    DEPENDENCY_REMOVED = "DEPENDENCY_REMOVED"
    ISSUE_DETECTED = "ISSUE_DETECTED"
    ISSUE_RESOLVED = "ISSUE_RESOLVED"
    SCORE_CHANGED = "SCORE_CHANGED"
    ARCHITECTURE_CHANGE = "ARCHITECTURE_CHANGE"


class ComponentStatus(StrEnum):
    """
    Lifecycle status of an architectural component or technology in memory.
    """

    ACTIVE = "active"
    REMOVED = "removed"
    UPGRADED = "upgraded"


class ArchitectureMemory(Base):
    """
    Persistent architectural memory root for one repository.
    1-to-1 relationship with Repository.
    """

    __tablename__ = "architecture_memories"

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
        index=True,
    )

    repository_id: Mapped[int] = mapped_column(
        ForeignKey(
            "repositories.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        unique=True,
        index=True,
    )

    latest_analysis_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "analysis_jobs.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
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

    repository: Mapped[Repository] = relationship(
        "Repository",
        back_populates="architecture_memory",
    )

    components: Mapped[list[ArchitectureComponent]] = relationship(
        "ArchitectureComponent",
        back_populates="memory",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    relationships: Mapped[list[ArchitectureRelationship]] = relationship(
        "ArchitectureRelationship",
        back_populates="memory",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    technologies: Mapped[list[ArchitectureTechnologyMemory]] = relationship(
        "ArchitectureTechnologyMemory",
        back_populates="memory",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    entries: Mapped[list[ArchitectureMemoryEntry]] = relationship(
        "ArchitectureMemoryEntry",
        back_populates="memory",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"ArchitectureMemory("
            f"id={self.id}, "
            f"organization_id={self.organization_id}, "
            f"repository_id={self.repository_id}"
            f")"
        )


class ArchitectureComponent(Base):
    """
    Discovered architectural component (service, module, domain controller, adapter).
    """

    __tablename__ = "architecture_components"

    __table_args__ = (
        UniqueConstraint(
            "memory_id",
            "name",
            name="uq_architecture_component_memory_name",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    memory_id: Mapped[int] = mapped_column(
        ForeignKey(
            "architecture_memories.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    component_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="module",
        server_default="module",
    )

    path: Mapped[str | None] = mapped_column(
        String(1024),
        nullable=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    status: Mapped[ComponentStatus] = mapped_column(
        SQLEnum(
            ComponentStatus,
            name="component_status",
            native_enum=True,
            validate_strings=True,
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
        default=ComponentStatus.ACTIVE,
        server_default=ComponentStatus.ACTIVE.value,
        index=True,
    )

    first_seen_analysis_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    last_seen_analysis_id: Mapped[int | None] = mapped_column(
        Integer,
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

    memory: Mapped[ArchitectureMemory] = relationship(
        "ArchitectureMemory",
        back_populates="components",
    )


class ArchitectureRelationship(Base):
    """
    Structural dependency relationship between two architectural components in memory.
    """

    __tablename__ = "architecture_relationships"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    memory_id: Mapped[int] = mapped_column(
        ForeignKey(
            "architecture_memories.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    source_component_id: Mapped[int] = mapped_column(
        ForeignKey(
            "architecture_components.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    target_component_id: Mapped[int] = mapped_column(
        ForeignKey(
            "architecture_components.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    kind: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="depends_on",
        server_default="depends_on",
    )

    status: Mapped[ComponentStatus] = mapped_column(
        SQLEnum(
            ComponentStatus,
            name="relationship_status",
            native_enum=True,
            validate_strings=True,
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
        default=ComponentStatus.ACTIVE,
        server_default=ComponentStatus.ACTIVE.value,
    )

    first_seen_analysis_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    last_seen_analysis_id: Mapped[int | None] = mapped_column(
        Integer,
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

    memory: Mapped[ArchitectureMemory] = relationship(
        "ArchitectureMemory",
        back_populates="relationships",
    )


class ArchitectureTechnologyMemory(Base):
    """
    Technology stack entity tracked in architectural memory across versions.
    """

    __tablename__ = "architecture_technology_memories"

    __table_args__ = (
        UniqueConstraint(
            "memory_id",
            "technology",
            name="uq_architecture_technology_memory_name",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    memory_id: Mapped[int] = mapped_column(
        ForeignKey(
            "architecture_memories.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    technology: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    version: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    category: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    status: Mapped[ComponentStatus] = mapped_column(
        SQLEnum(
            ComponentStatus,
            name="tech_memory_status",
            native_enum=True,
            validate_strings=True,
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
        default=ComponentStatus.ACTIVE,
        server_default=ComponentStatus.ACTIVE.value,
    )

    first_seen_analysis_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    last_seen_analysis_id: Mapped[int | None] = mapped_column(
        Integer,
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

    memory: Mapped[ArchitectureMemory] = relationship(
        "ArchitectureMemory",
        back_populates="technologies",
    )


class ArchitectureMemoryEntry(Base):
    """
    Discrete higher-level architectural knowledge entry with strict provenance.
    """

    __tablename__ = "architecture_memory_entries"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    memory_id: Mapped[int] = mapped_column(
        ForeignKey(
            "architecture_memories.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    organization_id: Mapped[int] = mapped_column(
        ForeignKey(
            "organizations.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    repository_id: Mapped[int] = mapped_column(
        ForeignKey(
            "repositories.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    analysis_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "analysis_jobs.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    memory_type: Mapped[MemoryType] = mapped_column(
        SQLEnum(
            MemoryType,
            name="memory_type",
            native_enum=True,
            validate_strings=True,
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
        default=MemoryType.ARCHITECTURE_FACT,
        server_default=MemoryType.ARCHITECTURE_FACT.value,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=1.0,
        server_default="1.0",
    )

    source_analyzer: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    source_file: Mapped[str | None] = mapped_column(
        String(1024),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    memory: Mapped[ArchitectureMemory] = relationship(
        "ArchitectureMemory",
        back_populates="entries",
    )


class ArchitectureEvent(Base):
    """
    Immutable historical architectural change ledger.
    """

    __tablename__ = "architecture_events"

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
        index=True,
    )

    repository_id: Mapped[int] = mapped_column(
        ForeignKey(
            "repositories.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    analysis_id: Mapped[int] = mapped_column(
        ForeignKey(
            "analysis_jobs.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    event_type: Mapped[ArchitectureEventType] = mapped_column(
        SQLEnum(
            ArchitectureEventType,
            name="architecture_event_type",
            native_enum=True,
            validate_strings=True,
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    details: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    def __repr__(self) -> str:
        return (
            f"ArchitectureEvent("
            f"id={self.id}, "
            f"repository_id={self.repository_id}, "
            f"analysis_id={self.analysis_id}, "
            f"event_type={self.event_type.value!r}"
            f")"
        )
