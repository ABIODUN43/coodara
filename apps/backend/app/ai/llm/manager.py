"""
LLM provider manager.

Manages LLM providers (OpenAI, Gemini, Anthropic, Coodara Native),
handles bounded exponential backoff retries for transient errors,
tracks token usage and latency, and provides transparent fallback.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

from app.ai.llm.anthropic import AnthropicProvider
from app.ai.llm.base import (
    LLMAuthenticationError,
    LLMContextLengthExceededError,
    LLMError,
    LLMMessage,
    LLMProvider,
    LLMProviderUnavailableError,
    LLMRateLimitError,
    LLMResponse,
    LLMTimeoutError,
)
from app.ai.llm.gemini import GeminiProvider
from app.ai.llm.openai import OpenAIProvider
from app.ai.llm.reasoning_engine import ArchitectureReasoningProvider
from app.core.config import settings
from app.core.logging import redact_secrets

logger = logging.getLogger(__name__)


class LLMManager:
    """
    Application-facing LLM Gateway.
    """

    def __init__(
        self,
        provider: LLMProvider | None = None,
    ) -> None:
        self.fallback_provider = ArchitectureReasoningProvider()
        self.provider = provider or self._create_provider()

    def _create_provider(self) -> LLMProvider:
        provider_name = (settings.LLM_PROVIDER or "coodara").lower()

        try:
            if provider_name == "openai":
                api_key = settings.OPENAI_API_KEY or settings.LLM_API_KEY
                if api_key and not api_key.startswith("dummy"):
                    return OpenAIProvider(
                        api_key=api_key,
                        timeout_seconds=settings.AI_REQUEST_TIMEOUT_SECONDS,
                    )

            elif provider_name == "gemini":
                api_key = settings.GEMINI_API_KEY or settings.LLM_API_KEY
                if api_key and not api_key.startswith("dummy"):
                    return GeminiProvider(
                        api_key=api_key,
                        timeout_seconds=settings.AI_REQUEST_TIMEOUT_SECONDS,
                    )

            elif provider_name == "anthropic":
                api_key = settings.ANTHROPIC_API_KEY or settings.LLM_API_KEY
                if api_key and not api_key.startswith("dummy"):
                    return AnthropicProvider(
                        api_key=api_key,
                        timeout_seconds=settings.AI_REQUEST_TIMEOUT_SECONDS,
                    )

        except Exception as exc:
            logger.warning(
                "Could not initialize %s provider: %s. Using native reasoning engine.",
                provider_name,
                redact_secrets(str(exc)),
            )

        return self.fallback_provider

    async def generate(
        self,
        *,
        messages: list[LLMMessage],
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> LLMResponse:
        """
        Generate an LLM response with bounded exponential backoff retries.
        """
        target_model = model or settings.LLM_MODEL
        max_retries = settings.AI_MAX_RETRIES

        for attempt in range(max_retries + 1):
            try:
                return await self.provider.generate(
                    messages=messages,
                    model=target_model,
                    temperature=temperature,
                    max_tokens=max_tokens or settings.AI_MAX_TOKENS,
                    **kwargs,
                )

            except (LLMRateLimitError, LLMTimeoutError, LLMProviderUnavailableError) as transient_err:
                if attempt < max_retries:
                    delay = (2 ** attempt) * 1.5
                    logger.warning(
                        "Transient LLM failure (%s). Retrying attempt %d/%d in %.1fs...",
                        transient_err.__class__.__name__,
                        attempt + 1,
                        max_retries,
                        delay,
                    )
                    await asyncio.sleep(delay)
                    continue

                if settings.AI_ALLOW_FALLBACK:
                    logger.warning(
                        "LLM max retries exceeded (%s). Falling back to native architecture engine.",
                        transient_err,
                    )
                    return await self.fallback_provider.generate(
                        messages=messages,
                        model="coodara-reasoning-engine",
                        temperature=temperature,
                        max_tokens=max_tokens,
                    )
                raise

            except (LLMAuthenticationError, LLMContextLengthExceededError) as permanent_err:
                if settings.AI_ALLOW_FALLBACK:
                    logger.warning(
                        "Permanent LLM error (%s). Falling back to native architecture engine.",
                        permanent_err,
                    )
                    return await self.fallback_provider.generate(
                        messages=messages,
                        model="coodara-reasoning-engine",
                        temperature=temperature,
                        max_tokens=max_tokens,
                    )
                raise

            except Exception as unhandled_err:
                if settings.AI_ALLOW_FALLBACK:
                    logger.warning(
                        "Unhandled LLM error (%s). Falling back to native architecture engine.",
                        redact_secrets(str(unhandled_err)),
                    )
                    return await self.fallback_provider.generate(
                        messages=messages,
                        model="coodara-reasoning-engine",
                        temperature=temperature,
                        max_tokens=max_tokens,
                    )
                raise