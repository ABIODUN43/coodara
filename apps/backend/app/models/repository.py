"""
Repository model.
"""

from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
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


class Repository(Base):

    __tablename__ = "repositories"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    github_id: Mapped[int] = mapped_column(
        Integer,
        unique=True,
        nullable=False,
    )

    organization_id: Mapped[int] = (
        mapped_column(
            ForeignKey(
                "organizations.id"
            ),
            nullable=False,
            index=True,
        )
    )

    created_at: Mapped[datetime] = (
        mapped_column(
            DateTime(timezone=True),
            server_default=func.now(),
        )
    )

    organization = relationship(
        "Organization",
        back_populates="repositories",
    )