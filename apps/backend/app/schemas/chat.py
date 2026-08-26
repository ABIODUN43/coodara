"""
API schemas for Coodara AI Chat.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class ChatMessageRequest(BaseModel):
    """Incoming user message."""

    message: str = Field(
        min_length=1,
        max_length=8000,
    )


class ChatMessageResponse(BaseModel):
    """AI response."""

    message: str
    model: str