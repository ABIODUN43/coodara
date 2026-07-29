# app/models/organization_member.py

"""
Organization membership model.

Connects users to organizations and
stores organization-specific roles.
"""

from datetime import datetime

from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import UniqueConstraint
from sqlalchemy import func

from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.enums.organization_role import (
    OrganizationRole,
)


class OrganizationMember(Base):
    """
    Organization membership.

    One user may belong to many organizations.

    One organization may contain many users.
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
            f"role='{self.role.value}'"
            f")"
        )