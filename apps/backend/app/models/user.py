"""
User database model.
"""

from __future__ import annotations

from datetime import datetime

from app.db.base import Base
from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship


class User(Base):
    """
    Application user.

    A user may own organizations and may belong
    to multiple organizations.

    GitHub OAuth access tokens are stored encrypted
    and are never exposed through API schemas.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    github_id: Mapped[int] = mapped_column(
        Integer,
        unique=True,
        nullable=False,
        index=True,
    )

    username: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )

    email: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        nullable=True,
    )

    avatar_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    github_access_token_encrypted: Mapped[str | None] = mapped_column(
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

    sessions = relationship(
        "Session",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    organizations = relationship(
        "Organization",
        back_populates="owner",
        foreign_keys="Organization.owner_id",
    )

    organization_members = relationship(
        "OrganizationMember",
        back_populates="user",
        cascade="all, delete-orphan",
    )
