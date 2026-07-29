"""
User model.
"""

from datetime import datetime

from sqlalchemy import (
    DateTime,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.db.base import Base


class User(Base):

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    github_id: Mapped[int] = mapped_column(
        Integer,
        unique=True,
        nullable=False,
    )

    username: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )

    email: Mapped[str | None] = (
        mapped_column(
            String(255),
            unique=True,
            nullable=True,
        )
    )

    avatar_url: Mapped[str | None] = (
        mapped_column(
            String(500),
            nullable=True,
        )
    )

    created_at: Mapped[datetime] = (
        mapped_column(
            DateTime(timezone=True),
            server_default=func.now(),
        )
    )

    updated_at: Mapped[datetime] = (
        mapped_column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
        )
    )

    sessions = relationship(
        "Session",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    organizations = relationship(
        "Organization",
        back_populates="owner",
    )

    organization_members = relationship(
    "OrganizationMember",
    back_populates="user",
    cascade="all, delete-orphan",
    )