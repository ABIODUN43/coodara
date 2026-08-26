"""
LLM provider abstraction.

The application depends on this interface rather than directly
depending on a specific LLM provider.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class LLMMessage:
    """One message in an LLM conversation."""

    role: str
    content: str


@dataclass(frozen=True)
class LLMResponse:
    """Normalized response returned by an LLM provider."""

    content: str
    model: str


class LLMProvider(ABC):
    """Abstract interface implemented by LLM providers."""

    @abstractmethod
    async def generate(
        self,
        *,
        messages: list[LLMMessage],
        model: str,
    ) -> LLMResponse:
        """
        Generate a response from the provider.
        """
        raise NotImplementedError