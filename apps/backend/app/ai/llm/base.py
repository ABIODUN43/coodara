"""
LLM provider abstraction.

The application depends on this interface rather than directly
depending on a specific LLM provider.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


class LLMError(Exception):
    """Base exception for LLM provider errors."""


class LLMAuthenticationError(LLMError):
    """Raised when provider API key is missing or invalid."""


class LLMRateLimitError(LLMError):
    """Raised when provider returns a 429 rate limit."""


class LLMTimeoutError(LLMError):
    """Raised when LLM request times out."""


class LLMContextLengthExceededError(LLMError):
    """Raised when prompt exceeds maximum model context window."""


class LLMProviderUnavailableError(LLMError):
    """Raised when provider service is down or returns 502/503."""


@dataclass(frozen=True)
class LLMMessage:
    """One message in an LLM conversation."""

    role: str  # 'system', 'user', 'assistant'
    content: str


@dataclass(frozen=True)
class TokenUsage:
    """Token consumption metrics for cost accounting."""

    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


@dataclass(frozen=True)
class LLMResponse:
    """Normalized response returned by an LLM provider."""

    content: str
    model: str
    usage: TokenUsage | None = None
    latency_ms: float = 0.0
    finish_reason: str | None = None
    structured_reasoning: dict[str, Any] | None = None


class LLMProvider(ABC):
    """Abstract interface implemented by LLM providers."""

    @abstractmethod
    async def generate(
        self,
        *,
        messages: list[LLMMessage],
        model: str,
        temperature: float = 0.2,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> LLMResponse:
        """
        Generate a response from the provider.
        """
        raise NotImplementedError