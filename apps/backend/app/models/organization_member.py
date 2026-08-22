"""
Organization membership database model.

Connects users to organizations and stores
organization-specific roles.
"""

from __future__ import annotations

from datetime import datetime

from app.db.base import Base
from app.models.enums.organization_role import OrganizationRole
from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship


class OrganizationMember(Base):
    """
    Membership connecting a user to an organization.
    """

    __tablename__ = "organization_members"

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "user_id",
            name="uq_organization_member",
        ),
    )

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

    user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    role: Mapped[OrganizationRole] = mapped_column(
        Enum(
            OrganizationRole,
            name="organization_role",
        ),
        nullable=False,
        default=OrganizationRole.MEMBER,
    )

    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    organization = relationship(
        "Organization",
        back_populates="members",
    )

    user = relationship(
        "User",
        back_populates="organization_members",
    )

    def __repr__(self) -> str:
        return (
            f"OrganizationMember("
            f"organization_id={self.organization_id}, "
            f"user_id={self.user_id}, "
            f"role={self.role.value!r}"
            f")"
        )
