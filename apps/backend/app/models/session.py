"""
Authentication session model.
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


class Session(Base):

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    refresh_token: Mapped[str] = (
        mapped_column(
            String,
            nullable=False,
            unique=True,
        )
    )

    created_at: Mapped[datetime] = (
        mapped_column(
            DateTime(timezone=True),
            server_default=func.now(),
        )
    )

    user = relationship(
        "User",
        back_populates="sessions",
    )