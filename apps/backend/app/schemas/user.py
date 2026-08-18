"""
User API schemas.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    """
    Public representation of an application user.
    """

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    github_id: int
    username: str
    email: str | None
    avatar_url: str | None
