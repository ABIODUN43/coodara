"""
LLM provider manager.

Selects and exposes the configured LLM provider.
"""

from __future__ import annotations

from app.ai.llm.base import (
    LLMMessage,
    LLMProvider,
    LLMResponse,
)
from app.ai.llm.openai import OpenAIProvider
from app.core.config import settings


class LLMManager:
    """
    Application-facing LLM gateway.

    The rest of the application should depend on this class
    instead of directly depending on OpenAI, Anthropic, or Gemini.
    """

    def __init__(
        self,
        provider: LLMProvider | None = None,
    ) -> None:
        self.provider = provider or self._create_provider()

    @staticmethod
    def _create_provider() -> LLMProvider:
        provider = settings.LLM_PROVIDER.lower()

        if provider == "openai":
            return OpenAIProvider(
                api_key=settings.LLM_API_KEY,
            )

        raise ValueError(
            f"Unsupported LLM provider: {provider}",
        )

    async def generate(
        self,
        *,
        messages: list[LLMMessage],
    ) -> LLMResponse:
        """
        Generate an LLM response using the configured provider.
        """

        return await self.provider.generate(
            messages=messages,
            model=settings.LLM_MODEL,
        )